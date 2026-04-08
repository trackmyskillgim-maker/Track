import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { getUserId } from '@/lib/session-utils'

export async function GET(request: NextRequest) {
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

    // Get all closed sessions, ordered by ended_at (with fallback to created_at)
    const { data: sessions, error } = await supabase
      .from('class_sessions')
      .select('*')
      .eq('created_by', userId)
      .eq('status', 'closed')
      .order('ended_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[ClassParticipation] Past sessions error:', error)
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch past sessions'
      }, { status: 500 })
    }

    // Get question counts and participant counts for each session
    const sessionsWithStats = await Promise.all(
      (sessions || []).map(async (sess) => {
        const { data: questions } = await supabase
          .from('session_questions')
          .select('id')
          .eq('session_id', sess.id)

        const { data: participants } = await supabase
          .from('participation_queue')
          .select('user_id')
          .eq('session_id', sess.id)

        const uniqueParticipants = new Set(participants?.map(p => p.user_id) || [])

        return {
          ...sess,
          total_questions: questions?.length || 0,
          total_participants: uniqueParticipants.size,
          display_name: `${sess.course} ${sess.year} ${sess.section} - ${sess.topic} - ${new Date(sess.ended_at).toLocaleDateString()}`
        }
      })
    )

    return NextResponse.json({
      success: true,
      sessions: sessionsWithStats
    })

  } catch (error: any) {
    console.error('[ClassParticipation] Past sessions error:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
}