import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'admin') {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const dateFilter = searchParams.get('dateFilter') || 'all'
    const customStartDate = searchParams.get('startDate')
    const customEndDate = searchParams.get('endDate')

    // Calculate offset for pagination
    const offset = (page - 1) * limit

    // Build base query - exactly like analytics API does it
    let baseQuery = supabase
      .from('attempt_logs')
      .select(`
        submitted_at,
        is_correct,
        users!inner(username),
        questions!inner(title, points, quests!inner(title))
      `)
      .eq('is_correct', true)
      .order('submitted_at', { ascending: false })

    let countQuery = supabase
      .from('attempt_logs')
      .select('*', { count: 'exact', head: true })
      .eq('is_correct', true)

    // Apply date filters if specified
    const now = new Date()
    if (dateFilter === 'today') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      baseQuery = baseQuery.gte('submitted_at', today.toISOString())
      countQuery = countQuery.gte('submitted_at', today.toISOString())
    } else if (dateFilter === 'week') {
      const weekAgo = new Date()
      weekAgo.setDate(now.getDate() - 7)
      baseQuery = baseQuery.gte('submitted_at', weekAgo.toISOString())
      countQuery = countQuery.gte('submitted_at', weekAgo.toISOString())
    } else if (dateFilter === 'month') {
      const monthAgo = new Date()
      monthAgo.setDate(now.getDate() - 30)
      baseQuery = baseQuery.gte('submitted_at', monthAgo.toISOString())
      countQuery = countQuery.gte('submitted_at', monthAgo.toISOString())
    } else if (dateFilter === 'custom' && customStartDate && customEndDate) {
      const startDate = new Date(customStartDate)
      startDate.setHours(0, 0, 0, 0)
      const endDate = new Date(customEndDate)
      endDate.setHours(23, 59, 59, 999)
      baseQuery = baseQuery.gte('submitted_at', startDate.toISOString()).lte('submitted_at', endDate.toISOString())
      countQuery = countQuery.gte('submitted_at', startDate.toISOString()).lte('submitted_at', endDate.toISOString())
    }

    // Add pagination to data query
    const dataQuery = baseQuery.range(offset, offset + limit - 1)

    // Execute queries
    const [{ count }, { data: activities, error: activityError }] = await Promise.all([
      countQuery,
      dataQuery
    ])

    if (activityError) {
      throw new Error(`Database error: ${activityError.message}`)
    }

    // Transform data exactly like analytics API does
    const transformedActivities = (activities || []).map((activity: any, index: number) => ({
      id: `${activity.user_id}-${activity.question_id}-${activity.submitted_at}-${index}`, // Generate unique ID
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
      points: activity.questions?.points || 0, // Use points instead of score
      submittedAt: activity.submitted_at,
      isCorrect: activity.is_correct
    }))

    // Calculate pagination info
    const totalCount = count || 0
    const totalPages = Math.ceil(totalCount / limit)
    const hasNextPage = page < totalPages
    const hasPreviousPage = page > 1

    return NextResponse.json({
      success: true,
      data: {
        activities: transformedActivities,
        pagination: {
          currentPage: page,
          limit,
          totalCount,
          totalPages,
          hasNextPage,
          hasPreviousPage
        },
        filters: {
          dateFilter,
          customStartDate,
          customEndDate
        }
      }
    })

  } catch (error) {
    console.error('Admin activity API error:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}