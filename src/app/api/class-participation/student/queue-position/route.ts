import { getUserId } from "@/lib/session-utils"
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

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

    if (!sessionId) {
      return NextResponse.json({
        success: false,
        message: 'Session ID required'
      }, { status: 400 })
    }

    if (!questionId) {
      return NextResponse.json({
        success: false,
        message: 'Question ID required'
      }, { status: 400 })
    }

    // Get user's queue entry for the CURRENT question
    const { data: queueEntry } = await supabase
      .from('participation_queue')
      .select('*')
      .eq('session_id', sessionId)
      .eq('question_id', questionId)
      .eq('user_id', userId)
      .single()

    if (!queueEntry) {
      return NextResponse.json({
        success: true,
        inQueue: false,
        message: 'You are not in the queue'
      })
    }

    // Get total queue size for this question (excluding skipped)
    const { count: totalInQueue } = await supabase
      .from('participation_queue')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId)
      .eq('question_id', questionId)
      .neq('status', 'skipped')

    return NextResponse.json({
      success: true,
      inQueue: true,
      position: queueEntry.position,
      status: queueEntry.status,
      accessGranted: !!queueEntry.access_granted_at,
      totalInQueue: totalInQueue || 0
    })

  } catch (error: any) {
    console.error('[ClassParticipation] Queue position error:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
}