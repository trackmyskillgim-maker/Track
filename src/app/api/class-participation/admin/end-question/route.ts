import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { getUserId } from '@/lib/session-utils'
import { z } from 'zod'

const endQuestionSchema = z.object({
  sessionId: z.string().uuid(),
  questionId: z.string().uuid()
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
    const { sessionId, questionId } = endQuestionSchema.parse(body)

    // Verify session ownership
    const { data: classSession, error: sessionError } = await supabase
      .from('class_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('created_by', userId)
      .single()

    if (sessionError || !classSession) {
      return NextResponse.json({
        success: false,
        message: 'Session not found or access denied'
      }, { status: 404 })
    }

    // Verify question belongs to session
    const { data: question, error: questionError } = await supabase
      .from('session_questions')
      .select('*')
      .eq('id', questionId)
      .eq('session_id', sessionId)
      .single()

    if (questionError || !question) {
      return NextResponse.json({
        success: false,
        message: 'Question not found'
      }, { status: 404 })
    }

    // Mark question as closed
    await supabase
      .from('session_questions')
      .update({
        status: 'closed',
        closed_at: new Date().toISOString()
      })
      .eq('id', questionId)

    // Mark all remaining queue entries for this question as 'skipped'
    await supabase
      .from('participation_queue')
      .update({ status: 'skipped' })
      .eq('session_id', sessionId)
      .eq('question_id', questionId)
      .in('status', ['waiting', 'attempting'])

    // Clear current_question_id so students see "no question available" until next one is published
    await supabase
      .from('class_sessions')
      .update({ current_question_id: null })
      .eq('id', sessionId)

    return NextResponse.json({
      success: true,
      message: 'Question ended successfully'
    })

  } catch (error: any) {
    console.error('[ClassParticipation] End question error:', error)

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