import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { getUserId } from '@/lib/session-utils'
import { z } from 'zod'

const evaluateSubmissionSchema = z.object({
  submissionId: z.string().uuid(),
  approved: z.boolean(),
  points: z.number().min(0).max(100),
  sessionId: z.string().uuid()
})

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'admin') {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized - Admin access required'
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
    const { submissionId, approved, points, sessionId } = evaluateSubmissionSchema.parse(body)

    // Get submission details
    const { data: submission, error: submissionError } = await supabase
      .from('session_submissions')
      .select('*, users!session_submissions_user_id_fkey(id, total_points)')
      .eq('id', submissionId)
      .eq('session_id', sessionId)
      .single()

    if (submissionError || !submission) {
      return NextResponse.json({
        success: false,
        message: 'Submission not found'
      }, { status: 404 })
    }

    const now = new Date().toISOString()
    const newResult = approved ? 'pass' : 'fail'
    const xpToAward = approved ? points : 0

    // Calculate XP difference (in case of re-evaluation)
    const xpDifference = xpToAward - (submission.xp_awarded || 0)

    // Update submission
    const { error: updateError } = await supabase
      .from('session_submissions')
      .update({
        result: newResult,
        xp_awarded: xpToAward,
        evaluated_by: userId,
        evaluated_at: now
      })
      .eq('id', submissionId)

    if (updateError) {
      console.error('[ClassParticipation] Evaluation update error:', updateError)
      return NextResponse.json({
        success: false,
        message: 'Failed to update submission'
      }, { status: 500 })
    }

    // Update user's total points if XP changed
    if (xpDifference !== 0 && submission.users) {
      const currentPoints = (submission.users as any).total_points || 0
      const newTotalPoints = currentPoints + xpDifference

      await supabase
        .from('users')
        .update({
          total_points: Math.max(0, newTotalPoints) // Ensure non-negative
        })
        .eq('id', submission.user_id)
    }

    return NextResponse.json({
      success: true,
      message: approved ? `Approved with ${points} XP` : 'Marked as failed',
      data: {
        result: newResult,
        xpAwarded: xpToAward,
        studentId: submission.user_id
      }
    })

  } catch (error: any) {
    console.error('[ClassParticipation] Evaluate submission error:', error)

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
