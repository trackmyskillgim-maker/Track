import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { getUserId } from '@/lib/session-utils'

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    const questionId = searchParams.get('questionId')

    if (!sessionId || !questionId) {
      return NextResponse.json({
        success: false,
        message: 'Session ID and Question ID required'
      }, { status: 400 })
    }

    // Get the latest submission for this student, session, and question
    const { data: submission, error } = await supabase
      .from('session_submissions')
      .select('result, gemini_feedback, xp_awarded, evaluated_at')
      .eq('session_id', sessionId)
      .eq('question_id', questionId)
      .eq('user_id', userId)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !submission) {
      return NextResponse.json({
        success: false,
        message: 'No submission found'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      result: submission.result,
      feedback: submission.gemini_feedback,
      xpAwarded: submission.xp_awarded,
      evaluatedAt: submission.evaluated_at
    })

  } catch (error: any) {
    console.error('[ClassParticipation] Submission status error:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
}
