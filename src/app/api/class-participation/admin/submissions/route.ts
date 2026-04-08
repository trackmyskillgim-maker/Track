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
        message: reason || 'Not authorized to view submissions'
      }, { status: 403 })
    }

    // Get submissions using RPC function
    const { data: submissions, error: submissionsError } = await supabase
      .rpc('get_session_submissions', { p_session_id: sessionId })

    if (submissionsError) {
      console.error('[ClassParticipation] Submissions fetch error:', submissionsError)
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch submissions'
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

    // Group by question first, then by result (3 categories: fail, eval_pending, pass)
    const questionMap = new Map()

    submissions?.forEach((sub: any) => {
      const qId = sub.question_id || 'no_question'

      if (!questionMap.has(qId)) {
        questionMap.set(qId, {
          question_id: sub.question_id,
          question_text: sub.question_text || 'No question available',
          question_order: sub.question_order || 0,
          fail: [],
          eval_pending: [],
          pass: []
        })
      }

      const questionGroup = questionMap.get(qId)
      const resultGroup = sub.result || 'eval_pending'

      // Add submission count to each submission
      const enhancedSub = {
        ...sub,
        session_submission_count: submissionCountMap.get(sub.user_id) || 1
      }

      // Map evaluation_pending to eval_pending for consistency
      const normalizedResult = resultGroup === 'evaluation_pending' ? 'eval_pending' : resultGroup

      if (questionGroup[normalizedResult]) {
        questionGroup[normalizedResult].push(enhancedSub)
      } else {
        // Default to eval_pending if unknown result
        questionGroup.eval_pending.push(enhancedSub)
      }
    })

    // Convert map to sorted array (latest questions first)
    const groupedSubmissions = Array.from(questionMap.values())
      .sort((a, b) => (b.question_order || 0) - (a.question_order || 0))

    return NextResponse.json({
      success: true,
      submissions: groupedSubmissions
    })

  } catch (error: any) {
    console.error('[ClassParticipation] Submissions error:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
}
