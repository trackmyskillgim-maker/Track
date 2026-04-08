import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { getUserId } from '@/lib/session-utils'
import { z } from 'zod'

const endSessionSchema = z.object({
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
    const { sessionId } = endSessionSchema.parse(body)

    // Verify session ownership and get full data
    const { data: classSession } = await supabase
      .from('class_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('created_by', userId)
      .single()

    if (!classSession) {
      return NextResponse.json({
        success: false,
        message: 'Session not found or access denied'
      }, { status: 404 })
    }

    // Update session status to closed
    const { error: updateError } = await supabase
      .from('class_sessions')
      .update({
        status: 'closed',
        ended_at: new Date().toISOString()
      })
      .eq('id', sessionId)

    if (updateError) {
      console.error('[ClassParticipation] End session error:', updateError)
      return NextResponse.json({
        success: false,
        message: 'Failed to end session'
      }, { status: 500 })
    }

    // Get all questions for this session
    const { data: questions } = await supabase
      .from('session_questions')
      .select('*')
      .eq('session_id', sessionId)
      .order('order_index', { ascending: true })

    // For each question, get queue and submissions
    const questionsWithData = await Promise.all(
      (questions || []).map(async (question: any) => {
        const { data: queueData } = await supabase
          .from('participation_queue')
          .select(`
            *,
            user:users(username, email)
          `)
          .eq('session_id', sessionId)
          .eq('question_id', question.id)
          .order('position', { ascending: true })

        const { data: submissionsData } = await supabase
          .from('session_submissions')
          .select(`
            *,
            user:users(username, email)
          `)
          .eq('session_id', sessionId)
          .eq('question_id', question.id)

        return {
          question: {
            id: question.id,
            text: question.question_text,
            difficulty: question.difficulty,
            order_index: question.order_index,
            status: question.status,
            published_at: question.published_at,
            closed_at: question.closed_at
          },
          queue: queueData || [],
          submissions: submissionsData || [],
          stats: {
            totalParticipants: queueData?.length || 0,
            totalSubmissions: submissionsData?.length || 0,
            passed: submissionsData?.filter((s: any) => s.result === 'pass').length || 0,
            failed: submissionsData?.filter((s: any) => s.result === 'fail').length || 0,
            pending: submissionsData?.filter((s: any) => s.result === 'evaluation_pending').length || 0
          }
        }
      })
    )

    // Calculate overall stats
    const overallStats = {
      totalQuestions: questions?.length || 0,
      totalParticipants: new Set(
        questionsWithData.flatMap(q => q.queue.map((entry: any) => entry.user_id))
      ).size,
      totalSubmissions: questionsWithData.reduce((sum, q) => sum + q.submissions.length, 0),
      passed: questionsWithData.reduce((sum, q) => sum + q.stats.passed, 0),
      failed: questionsWithData.reduce((sum, q) => sum + q.stats.failed, 0),
      pending: questionsWithData.reduce((sum, q) => sum + q.stats.pending, 0)
    }

    // Generate report data
    const report = {
      session: {
        topic: classSession.topic,
        difficulty: classSession.difficulty,
        year: classSession.year,
        course: classSession.course,
        section: classSession.section,
        started: classSession.created_at,
        ended: new Date().toISOString()
      },
      questions: questionsWithData,
      overallStats
    }

    return NextResponse.json({
      success: true,
      message: 'Session ended successfully',
      report
    })

  } catch (error: any) {
    console.error('[ClassParticipation] End session error:', error)

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