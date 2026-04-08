import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { getUserId } from '@/lib/session-utils'
import { canManageSession } from '@/lib/cr-permissions'
import { evaluateCode } from '@/lib/gemini'
import { z } from 'zod'

const retryEvaluationSchema = z.object({
  sessionId: z.string().uuid(),
  submissionId: z.string().uuid()
})

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized - Authentication required'
      }, { status: 401 })
    }

    const userId = getUserId(session)
    if (!userId) {
      return NextResponse.json({
        success: false,
        message: 'Invalid session'
      }, { status: 401 })
    }

    const body = await request.json()
    const { sessionId, submissionId } = retryEvaluationSchema.parse(body)

    // Check if user can manage this session (admin creator OR CR for subject)
    const { canManage, reason } = await canManageSession(
      userId,
      session.role,
      sessionId
    )

    if (!canManage) {
      return NextResponse.json({
        success: false,
        message: reason || 'Not authorized to retry evaluations'
      }, { status: 403 })
    }

    // Get submission
    const { data: submission, error: submissionError } = await supabase
      .from('session_submissions')
      .select('*')
      .eq('id', submissionId)
      .eq('session_id', sessionId)
      .single()

    if (submissionError || !submission) {
      return NextResponse.json({
        success: false,
        message: 'Submission not found'
      }, { status: 404 })
    }

    // Get question
    const { data: question } = await supabase
      .from('session_questions')
      .select('question_text')
      .eq('session_id', sessionId)
      .eq('is_published', true)
      .single()

    if (!question) {
      return NextResponse.json({
        success: false,
        message: 'Question not found'
      }, { status: 404 })
    }

    // Retry evaluation
    const result = await evaluateCode(question.question_text, submission.code)

    if (!result.success) {
      // Still failing - update retry count
      await supabase
        .from('session_submissions')
        .update({
          retry_count: submission.retry_count + 1
        })
        .eq('id', submissionId)

      return NextResponse.json({
        success: false,
        message: 'Evaluation failed again. Please try later.'
      }, { status: 500 })
    }

    // Evaluation succeeded - update submission
    const updateData: any = {
      result: result.review?.toLowerCase() || 'fail',
      gemini_feedback: result.comment,
      evaluated_at: new Date().toISOString(),
      retry_count: submission.retry_count + 1
    }

    // Award XP if pass
    if (result.review === 'Pass') {
      updateData.xp_awarded = 100

      // Update user's total points
      await supabase
        .from('users')
        .update({
          total_points: supabase.rpc('increment', { x: 100 })
        })
        .eq('id', submission.user_id)
    }

    const { error: updateError } = await supabase
      .from('session_submissions')
      .update(updateData)
      .eq('id', submissionId)

    if (updateError) {
      console.error('[ClassParticipation] Update submission error:', updateError)
      return NextResponse.json({
        success: false,
        message: 'Failed to update submission'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      result: result.review,
      comment: result.comment,
      xpAwarded: result.review === 'Pass' ? 100 : 0
    })

  } catch (error: any) {
    console.error('[ClassParticipation] Retry evaluation error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        message: 'Invalid input data',
        errors: error.errors
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
}
