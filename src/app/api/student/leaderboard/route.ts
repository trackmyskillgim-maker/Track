import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || (session.role !== 'student' && session.role !== 'admin')) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 })
    }

    // For students: get their batch, course, and section to filter leaderboard
    // For professors: get students enrolled in their subjects
    let studentBatch = null
    let studentCourse = null
    let studentSection = null
    let professorStudentIds: string[] = []
    let isSuperAdmin = false

    if (session.role === 'student') {
      const { data: currentUser } = await supabase
        .from('users')
        .select('batch, course, section')
        .eq('username', session.username)
        .single()

      if (currentUser) {
        studentBatch = currentUser.batch
        studentCourse = currentUser.course
        studentSection = currentUser.section
      }
    } else if (session.role === 'admin') {
      // Check if user is super admin
      const { data: adminUser } = await supabase
        .from('users')
        .select('is_super_admin')
        .eq('id', session.id)
        .single()

      isSuperAdmin = adminUser?.is_super_admin === true

      // For professors (non-super admins), get students in their subjects
      if (!isSuperAdmin) {
        const { data: subjectEnrollments } = await supabase
          .from('student_subjects')
          .select('student_id, subjects!inner(created_by)')
          .eq('subjects.created_by', session.id)

        professorStudentIds = subjectEnrollments?.map(e => e.student_id) || []
      }
    }

    // Get filters from URL parameters (only used for admin)
    const { searchParams } = new URL(request.url)
    const batchFilter = searchParams.get('batch')
    const courseFilter = searchParams.get('course')
    const sectionFilter = searchParams.get('section')
    const subjectFilter = searchParams.get('subject')

    // Use the optimized RPC function that includes achievement points
    const { data, error } = await supabase
      .rpc('get_leaderboard_optimized')

    if (error) {
      console.error('Leaderboard RPC error:', error)
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch leaderboard data'
      }, { status: 500 })
    }

    if (!data || !data.leaderboard) {
      return NextResponse.json({
        success: false,
        message: 'No leaderboard data available'
      }, { status: 500 })
    }

    // Get user details for filtering and additional data
    // Note: RPC only returns username, not user ID, so we need to look up by username
    const usernames = data.leaderboard.map((u: any) => u.username)
    const { data: users } = await supabase
      .from('users')
      .select('id, username, batch, course, section, current_streak, max_streak')
      .in('username', usernames)

    // Create a map for quick lookup by username
    const userMap = new Map(users?.map((u: any) => [u.username, u]) || [])

    // Fetch achievements count for all users
    const userIds = users?.map(u => u.id) || []
    const { data: achievementsData } = await supabase
      .from('user_achievements')
      .select('user_id')
      .in('user_id', userIds)

    // Count achievements per user ID
    const achievementCounts = new Map<string, number>()
    achievementsData?.forEach(ach => {
      achievementCounts.set(ach.user_id, (achievementCounts.get(ach.user_id) || 0) + 1)
    })

    // Add isCurrentUser flag and rank to each user, and filter
    let leaderboard = data.leaderboard
      .map((user: any) => {
        const userDetails = userMap.get(user.username)
        const userId = userDetails?.id
        return {
          ...user,
          id: userId, // Add user ID to the response
          batch: userDetails?.batch,
          course: userDetails?.course,
          section: userDetails?.section,
          isCurrentUser: user.username === session.username,
          // Map the RPC fields to expected frontend fields
          total_points: user.combinedscore || user.combinedScore || user.totalpoints || user.totalPoints || 0,
          current_level: user.combinedlevel || user.combinedLevel || user.level || 1,
          completedQuestions: user.questionscompleted || user.questionsCompleted || 0,
          completedQuests: user.questscompleted || user.questsCompleted || 0,
          current_streak: userDetails?.current_streak || 0,
          max_streak: userDetails?.max_streak || 0,
          achievements: achievementCounts.get(userId) || 0,
          last_active: user.lastactive || user.lastActive || null
        }
      })

    // Apply filters
    // For students: always filter by their own batch, course, and section
    // For admins: use URL parameters
    if (session.role === 'student') {
      // Students see only their section's leaderboard
      if (studentBatch) {
        leaderboard = leaderboard.filter((user: any) => user.batch === studentBatch)
      }
      if (studentCourse) {
        leaderboard = leaderboard.filter((user: any) => user.course === studentCourse)
      }
      if (studentSection) {
        leaderboard = leaderboard.filter((user: any) => user.section === studentSection)
      }
    } else {
      // For professors (non-super admin), filter to show only their students
      if (!isSuperAdmin && professorStudentIds.length > 0) {
        const professorStudentIdSet = new Set(professorStudentIds)
        leaderboard = leaderboard.filter((user: any) => professorStudentIdSet.has(user.id))
      }

      // Admins can use URL filters
      if (batchFilter && batchFilter !== 'all') {
        leaderboard = leaderboard.filter((user: any) => user.batch === batchFilter)
      }
      if (courseFilter && courseFilter !== 'all') {
        leaderboard = leaderboard.filter((user: any) => user.course === courseFilter)
      }
      if (sectionFilter && sectionFilter !== 'all') {
        leaderboard = leaderboard.filter((user: any) => user.section === sectionFilter)
      }

      // Subject filter: Only show students enrolled in the selected subject
      if (subjectFilter && subjectFilter !== 'all') {
        const { data: enrolledStudents } = await supabase
          .from('student_subjects')
          .select('student_id')
          .eq('subject_id', subjectFilter)

        const enrolledStudentIds = new Set(enrolledStudents?.map(e => e.student_id) || [])
        leaderboard = leaderboard.filter((user: any) => enrolledStudentIds.has(user.id))
      }
    }

    // Re-rank after filtering with tie handling
    // Sort by total points descending
    leaderboard.sort((a: any, b: any) => b.total_points - a.total_points)

    // Assign ranks with tie handling
    let currentRank = 1
    leaderboard = leaderboard.map((user: any, index: number) => {
      // If not the first user and has same points as previous, use same rank
      if (index > 0 && user.total_points === leaderboard[index - 1].total_points) {
        return {
          ...user,
          rank: leaderboard[index - 1].rank
        }
      }
      // Otherwise, use current position + 1 as rank
      const rank = index + 1
      return {
        ...user,
        rank
      }
    })

    // Find current user's position
    const currentUser = leaderboard.find((user: any) => user.isCurrentUser)

    // Calculate platform stats from the leaderboard data
    const totalStudents = leaderboard.length
    const averagePoints = totalStudents > 0
      ? Math.round(leaderboard.reduce((sum: number, user: any) => sum + user.total_points, 0) / totalStudents)
      : 0
    const topStreak = Math.max(...leaderboard.map((user: any) => user.current_streak), 0)

    // Count active users today (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const mostActiveToday = leaderboard.filter((user: any) =>
      user.last_active && new Date(user.last_active) > oneDayAgo
    ).length

    return NextResponse.json({
      success: true,
      data: {
        currentUser: currentUser || null,
        topPerformers: leaderboard,
        stats: {
          totalStudents,
          averagePoints,
          topStreak,
          mostActiveToday
        }
      }
    }, {
      headers: {
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'Vary': 'Cookie'
      }
    })

  } catch (error) {
    console.error('Leaderboard API error:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
}