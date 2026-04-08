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
        message: reason || 'Not authorized to view this queue'
      }, { status: 403 })
    }

    // Get current question ID from session
    const { data: sessionData } = await supabase
      .from('class_sessions')
      .select('current_question_id')
      .eq('id', sessionId)
      .single()

    const currentQuestionId = sessionData?.current_question_id

    // If no current question, return empty queue
    if (!currentQuestionId) {
      return NextResponse.json({
        success: true,
        queue: []
      })
    }

    // Query participation_queue directly with joins to get user details
    // This replaces the RPC function to enable filtering by question_id
    const { data: queueData, error: queueError } = await supabase
      .from('participation_queue')
      .select(`
        id,
        user_id,
        position,
        status,
        joined_at,
        access_granted_at,
        question_id,
        users!inner (
          username,
          email,
          year,
          batch,
          course,
          section
        )
      `)
      .eq('session_id', sessionId)
      .eq('question_id', currentQuestionId)
      .order('position', { ascending: true })

    if (queueError) {
      console.error('[ClassParticipation] Queue fetch error:', queueError)
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch queue'
      }, { status: 500 })
    }

    // Get submission counts for all students in this session (for indicators)
    const { data: allSubmissionsCount } = await supabase
      .from('session_submissions')
      .select('user_id')
      .eq('session_id', sessionId)

    const submissionCountMap = new Map()
    allSubmissionsCount?.forEach((s: any) => {
      const count = submissionCountMap.get(s.user_id) || 0
      submissionCountMap.set(s.user_id, count + 1)
    })

    // Transform to match expected format
    const formattedQueue = (queueData || []).map((entry: any) => ({
      queue_id: entry.id,
      user_id: entry.user_id,
      username: entry.users.username,
      email: entry.users.email,
      year: entry.users.batch || entry.users.year,
      course: entry.users.course,
      section: entry.users.section,
      queue_position: entry.position,
      queue_status: entry.status,
      joined_at: entry.joined_at,
      access_granted_at: entry.access_granted_at,
      session_submission_count: submissionCountMap.get(entry.user_id) || 0
    }))

    return NextResponse.json({
      success: true,
      queue: formattedQueue
    })

  } catch (error: any) {
    console.error('[ClassParticipation] Queue error:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
}
