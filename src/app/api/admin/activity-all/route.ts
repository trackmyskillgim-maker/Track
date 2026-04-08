import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const session = await getSession()
    if (!session || session.role !== 'admin') {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 })
    }

    // Fetch ALL activity data without any filtering or pagination - for client-side filtering
    const { data: activities, error: activityError } = await supabase
      .from('attempt_logs')
      .select(`
        submitted_at,
        is_correct,
        attempt_type,
        users!inner(username),
        questions!inner(title, points, quests!inner(title))
      `)
      .eq('attempt_type', 'submission')  // Only show submissions, not test runs
      .order('submitted_at', { ascending: false })

    if (activityError) {
      console.error('Activity fetch error:', activityError)
      throw new Error(`Database error: ${activityError.message}`)
    }

    // Transform data to expected format
    const transformedActivities = (activities || []).map((activity: any, index: number) => ({
      id: `${activity.submitted_at}-${index}`, // Generate unique ID
      student: {
        username: activity.users?.username
      },
      quest: {
        title: activity.questions?.quests?.title
      },
      question: {
        title: activity.questions?.title,
        points: activity.questions?.points
      },
      points: activity.questions?.points || 0,
      submittedAt: activity.submitted_at,
      isCorrect: activity.is_correct
    }))

    const response = {
      success: true,
      data: {
        activities: transformedActivities,
        totalCount: transformedActivities.length,
        lastUpdated: new Date().toISOString()
      }
    }

    console.log('🔍 [DEBUG] Activity All API - Final response:', response)
    console.log('🔍 [DEBUG] Activity All API - Activity count:', transformedActivities.length)

    return NextResponse.json(response)

  } catch (error) {
    console.error('Admin activity-all API error:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}