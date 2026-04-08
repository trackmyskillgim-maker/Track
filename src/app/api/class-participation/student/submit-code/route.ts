import { getUserId } from "@/lib/session-utils"
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { evaluateCode } from '@/lib/gemini'
import { z } from 'zod'

const submitCodeSchema = z.object({
  sessionId: z.string().uuid(),
  code: z.string().min(1)
})

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'student') {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized - Student access required'
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
    const { sessionId, code } = submitCodeSchema.parse(body)

    // Get session and current question
    const { data: classSession } = await supabase
      .from('class_sessions')
      .select('current_question_id, auto_advance_enabled')
      .eq('id', sessionId)
      .single()

    if (!classSession?.current_question_id) {
      return NextResponse.json({
        success: false,
        message: 'No active question in this session'
      }, { status: 400 })
    }

    const currentQuestionId = classSession.current_question_id

    // Verify student has access
    const { data: queueEntry } = await supabase
      .from('participation_queue')
      .select('*')
      .eq('session_id', sessionId)
      .eq('question_id', currentQuestionId)
      .eq('user_id', userId)
      .single()

    if (!queueEntry) {
      return NextResponse.json({
        success: false,
        message: 'You are not in the queue'
      }, { status: 403 })
    }

    if (queueEntry.status !== 'attempting' || !queueEntry.access_granted_at) {
      return NextResponse.json({
        success: false,
        message: 'You do not have access to submit yet'
      }, { status: 403 })
    }

    // Check if already submitted for THIS question
    const { data: existingSubmission } = await supabase
      .from('session_submissions')
      .select('*')
      .eq('session_id', sessionId)
      .eq('question_id', currentQuestionId)
      .eq('user_id', userId)
      .single()

    if (existingSubmission) {
      return NextResponse.json({
        success: false,
        message: 'You have already submitted'
      }, { status: 400 })
    }

    // Get question
    const { data: question } = await supabase
      .from('session_questions')
      .select('question_text')
      .eq('id', currentQuestionId)
      .eq('session_id', sessionId)
      .eq('is_published', true)
      .single()

    if (!question) {
      return NextResponse.json({
        success: false,
        message: 'Question not found'
      }, { status: 404 })
    }

    // Evaluate code using Gemini
    const evaluation = await evaluateCode(question.question_text, code)

    const submissionData: any = {
      session_id: sessionId,
      user_id: userId,
      question_id: currentQuestionId,
      code,
      retry_count: 0
    }

    if (!evaluation.success) {
      // Evaluation failed - mark as evaluation_pending
      submissionData.result = 'evaluation_pending'
      submissionData.gemini_feedback = 'Evaluation temporarily unavailable. Please wait.'
      submissionData.xp_awarded = 0
    } else {
      // Evaluation succeeded
      submissionData.gemini_feedback = evaluation.comment
      submissionData.evaluated_at = new Date().toISOString()

      // NEW LOGIC: If Gemini thinks it's correct, mark as eval_pending for professor review
      // If Gemini thinks it's wrong, mark as fail directly
      if (evaluation.review === 'Pass') {
        submissionData.result = 'eval_pending' // Wait for professor evaluation
        submissionData.xp_awarded = 0 // No XP yet - professor will award
      } else {
        submissionData.result = 'fail' // Direct fail
        submissionData.xp_awarded = 0
      }
    }

    // Save submission
    const { error: submissionError } = await supabase
      .from('session_submissions')
      .insert(submissionData)

    if (submissionError) {
      console.error('[ClassParticipation] Submission error:', submissionError)
      return NextResponse.json({
        success: false,
        message: 'Failed to save submission'
      }, { status: 500 })
    }

    // Update queue status
    await supabase
      .from('participation_queue')
      .update({ status: 'completed' })
      .eq('session_id', sessionId)
      .eq('question_id', currentQuestionId)
      .eq('user_id', userId)

    if (classSession?.auto_advance_enabled) {
      // Get next student in queue for THIS question
      const { data: nextInQueue } = await supabase
        .from('participation_queue')
        .select('id, user_id')
        .eq('session_id', sessionId)
        .eq('question_id', currentQuestionId)
        .eq('status', 'waiting')
        .order('position', { ascending: true })
        .limit(1)
        .single()

      if (nextInQueue) {
        // Grant access to next student
        await supabase
          .from('participation_queue')
          .update({
            status: 'attempting',
            access_granted_at: new Date().toISOString()
          })
          .eq('id', nextInQueue.id)
      }
    }

    return NextResponse.json({
      success: true,
      result: submissionData.result,
      feedback: submissionData.gemini_feedback,
      xpAwarded: submissionData.xp_awarded
    })

  } catch (error: any) {
    console.error('[ClassParticipation] Submit code error:', error)

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