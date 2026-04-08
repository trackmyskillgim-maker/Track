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
        message: reason || 'Not authorized to view session details'
      }, { status: 403 })
    }

    // Get session
    const { data: classSession, error: sessionError } = await supabase
      .from('class_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (sessionError || !classSession) {
      return NextResponse.json({
        success: false,
        message: 'Session not found'
      }, { status: 404 })
    }

    // Get ALL questions for this session
    const { data: questions } = await supabase
      .from('session_questions')
      .select('*')
      .eq('session_id', sessionId)
      .order('order_index', { ascending: true })

    // For each question, get queue and submissions with user details
    const questionsWithDetails = await Promise.all(
      (questions || []).map(async (question) => {
        const { data: queue } = await supabase
          .from('participation_queue')
          .select(`
            *,
            users:user_id (username, email, year, course, section)
          `)
          .eq('question_id', question.id)
          .order('position', { ascending: true })

        const { data: submissions } = await supabase
          .from('session_submissions')
          .select(`
            *,
            users:user_id (username, email, year, course, section)
          `)
          .eq('question_id', question.id)

        return {
          ...question,
          queue: queue || [],
          submissions: submissions || [],
          stats: {
            total_participants: queue?.length || 0,
            total_submissions: submissions?.length || 0,
            passed: submissions?.filter(s => s.result === 'pass').length || 0,
            failed: submissions?.filter(s => s.result === 'fail').length || 0,
            pending: submissions?.filter(s => s.result === 'evaluation_pending').length || 0
          }
        }
      })
    )

    return NextResponse.json({
      success: true,
      session: classSession,
      questions: questionsWithDetails
    })

  } catch (error: any) {
    console.error('[ClassParticipation] Session details error:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
}
