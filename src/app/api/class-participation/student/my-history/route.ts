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

    // Get all sessions where this student has participated (has queue entry or submission)
    const { data: queueEntries } = await supabase
      .from('participation_queue')
      .select('session_id')
      .eq('user_id', userId)

    const { data: submissions } = await supabase
      .from('session_submissions')
      .select('session_id')
      .eq('user_id', userId)

    // Get unique session IDs
    const sessionIds = new Set([
      ...(queueEntries?.map(q => q.session_id) || []),
      ...(submissions?.map(s => s.session_id) || [])
    ])

    if (sessionIds.size === 0) {
      return NextResponse.json({
        success: true,
        sessions: []
      })
    }

    // Get session details for all sessions
    const { data: sessions, error: sessionsError } = await supabase
      .from('class_sessions')
      .select('*')
      .in('id', Array.from(sessionIds))
      .eq('status', 'closed')
      .order('ended_at', { ascending: false })

    if (sessionsError) {
      console.error('[ClassParticipation] Student history sessions error:', sessionsError)
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch session history'
      }, { status: 500 })
    }

    // For each session, get the student's participation details
    const sessionsWithDetails = await Promise.all(
      (sessions || []).map(async (sess) => {
        // Get all questions for this session
        const { data: questions } = await supabase
          .from('session_questions')
          .select('*')
          .eq('session_id', sess.id)
          .order('order_index', { ascending: true })

        // For each question, get student's queue entry and submissions
        const questionsWithMyData = await Promise.all(
          (questions || []).map(async (question) => {
            const { data: myQueue } = await supabase
              .from('participation_queue')
              .select('*')
              .eq('question_id', question.id)
              .eq('user_id', userId)
              .single()

            const { data: mySubmissions } = await supabase
              .from('session_submissions')
              .select('*')
              .eq('question_id', question.id)
              .eq('user_id', userId)
              .order('submitted_at', { ascending: true })

            return {
              ...question,
              my_queue_entry: myQueue,
              my_submissions: mySubmissions || [],
              participated: !!myQueue || (mySubmissions && mySubmissions.length > 0)
            }
          })
        )

        // Filter to only questions where student participated
        const participatedQuestions = questionsWithMyData.filter(q => q.participated)

        return {
          ...sess,
          questions: participatedQuestions,
          total_questions_attempted: participatedQuestions.length,
          total_submissions: participatedQuestions.reduce((sum, q) => sum + q.my_submissions.length, 0),
          passed_questions: participatedQuestions.filter(q =>
            q.my_submissions.some((s: any) => s.result === 'pass')
          ).length
        }
      })
    )

    return NextResponse.json({
      success: true,
      sessions: sessionsWithDetails
    })

  } catch (error: any) {
    console.error('[ClassParticipation] Student history error:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
}