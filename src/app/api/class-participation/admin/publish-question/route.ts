import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { getUserId } from '@/lib/session-utils'
import { z } from 'zod'

const publishQuestionSchema = z.object({
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
    const { sessionId, questionId } = publishQuestionSchema.parse(body)

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

    // Get count of existing questions to determine order_index
    const { data: existingQuestions } = await supabase
      .from('session_questions')
      .select('order_index')
      .eq('session_id', sessionId)
      .order('order_index', { ascending: false })
      .limit(1)

    const nextOrderIndex = existingQuestions && existingQuestions.length > 0
      ? existingQuestions[0].order_index + 1
      : 1

    // Publish question with status and order_index
    const { data: publishedQuestion, error: publishError } = await supabase
      .from('session_questions')
      .update({
        is_published: true,
        status: 'published',
        published_at: new Date().toISOString(),
        order_index: nextOrderIndex
      })
      .eq('id', questionId)
      .eq('session_id', sessionId)
      .select('*')
      .single()

    if (publishError) {
      console.error('[ClassParticipation] Publish error:', publishError)
      return NextResponse.json({
        success: false,
        message: 'Failed to publish question'
      }, { status: 500 })
    }

    // Update session status to active and set current_question_id
    await supabase
      .from('class_sessions')
      .update({
        status: 'active',
        current_question_id: questionId
      })
      .eq('id', sessionId)

    // If auto-advance is enabled, grant access to first waiting student for THIS question
    if (classSession.auto_advance_enabled) {
      const { data: firstWaiting } = await supabase
        .from('participation_queue')
        .select('id, user_id')
        .eq('session_id', sessionId)
        .eq('question_id', questionId)
        .eq('status', 'waiting')
        .order('position', { ascending: true })
        .limit(1)
        .single()

      if (firstWaiting) {
        await supabase
          .from('participation_queue')
          .update({
            status: 'attempting',
            access_granted_at: new Date().toISOString()
          })
          .eq('id', firstWaiting.id)
      }
    }

    return NextResponse.json({
      success: true,
      question: publishedQuestion
    })

  } catch (error: any) {
    console.error('[ClassParticipation] Publish question error:', error)

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