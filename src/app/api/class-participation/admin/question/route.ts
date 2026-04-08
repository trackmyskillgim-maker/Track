import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { getUserId } from '@/lib/session-utils'
import { canManageSession } from '@/lib/cr-permissions'

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json({
        success: false,
        message: 'Session ID required'
      }, { status: 400 })
    }

    // Check if user can manage this session (admin creator OR CR for subject)
    const { canManage, reason } = await canManageSession(
      userId,
      session.role,
      sessionId
    )

    if (!canManage) {
      return NextResponse.json({
        success: false,
        message: reason || 'Not authorized to view question'
      }, { status: 403 })
    }

    // Get session
    const { data: classSession } = await supabase
      .from('class_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (!classSession) {
      return NextResponse.json({
        success: false,
        message: 'Session not found'
      }, { status: 404 })
    }

    // Get current question - try current_question_id first, then latest draft
    let question = null

    if (classSession.current_question_id) {
      // Fetch the currently active/published question
      const { data: activeQuestion } = await supabase
        .from('session_questions')
        .select('*')
        .eq('id', classSession.current_question_id)
        .single()
      question = activeQuestion
    } else {
      // No current_question_id, check for draft questions
      const { data: draftQuestion } = await supabase
        .from('session_questions')
        .select('*')
        .eq('session_id', sessionId)
        .eq('is_published', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      question = draftQuestion
    }

    return NextResponse.json({
      success: true,
      question: question || null
    })

  } catch (error: any) {
    console.error('[ClassParticipation] Question error:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
}
