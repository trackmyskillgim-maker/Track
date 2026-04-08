
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getSession()

    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    // Get filters from URL parameters
    const { searchParams } = new URL(request.url)
    const questFilter = searchParams.get('quest')
    const subjectFilter = searchParams.get('subject')
    const batchFilter = searchParams.get('batch')
    const courseFilter = searchParams.get('course')
    const sectionFilter = searchParams.get('section')
    const forEnrollment = searchParams.get('for_enrollment') === 'true'

    // Check if user is super admin or professor
    const isSuperAdmin = currentUser.is_super_admin === true

    // If professor (not super admin) AND not fetching for enrollment, only show enrolled students
    let enrolledStudentIds: string[] = []
    if (!isSuperAdmin && !forEnrollment) {
      // Get all subjects where this admin is the creator or has permissions
      // For professors, we'll get students enrolled in subjects they teach
      const { data: subjectEnrollments } = await supabase
        .from('student_subjects')
        .select('student_id, subjects!inner(created_by)')
        .eq('subjects.created_by', currentUser.id)

      enrolledStudentIds = subjectEnrollments?.map(e => e.student_id) || []

      // If professor has no students, return empty list
      if (enrolledStudentIds.length === 0) {
        return NextResponse.json({ success: true, data: [] })
      }
    }

    // Use centralized scoring RPC function for consistent scoring across all endpoints
    const { data: studentScores, error: scoresError } = await supabase
      .rpc('get_student_scores')

    if (scoresError) {
      throw new Error(`Failed to fetch student scores: ${scoresError.message}`)
    }

    // If subject filter is specified, get students enrolled in that subject
    let subjectFilteredStudentIds: string[] = []
    if (subjectFilter && subjectFilter !== 'all') {
      const { data: subjectEnrollments } = await supabase
        .from('student_subjects')
        .select('student_id')
        .eq('subject_id', subjectFilter)

      subjectFilteredStudentIds = subjectEnrollments?.map(e => e.student_id) || []

      // If no students in subject, return empty
      if (subjectFilteredStudentIds.length === 0) {
        return NextResponse.json({ success: true, data: [] })
      }
    }

    // Fetch basic student info with filters - include streak data
    let studentsQuery = supabase
      .from('users')
      .select('id, username, email, roll_number, role, batch, course, section, last_active, created_at, current_streak, max_streak')
      .eq('role', 'student')

    // For professors, only show enrolled students
    if (!isSuperAdmin && enrolledStudentIds.length > 0) {
      studentsQuery = studentsQuery.in('id', enrolledStudentIds)
    }

    // Apply subject filter if specified
    if (subjectFilter && subjectFilter !== 'all' && subjectFilteredStudentIds.length > 0) {
      // If there's also a professor filter, intersect the two
      if (!isSuperAdmin && enrolledStudentIds.length > 0) {
        const intersectedIds = enrolledStudentIds.filter(id => subjectFilteredStudentIds.includes(id))
        studentsQuery = studentsQuery.in('id', intersectedIds)
      } else {
        studentsQuery = studentsQuery.in('id', subjectFilteredStudentIds)
      }
    }

    // Apply batch filter
    if (batchFilter && batchFilter !== 'all') {
      studentsQuery = studentsQuery.eq('batch', batchFilter)
    }

    // Apply course filter
    if (courseFilter && courseFilter !== 'all') {
      studentsQuery = studentsQuery.eq('course', courseFilter)
    }

    // Apply section filter
    if (sectionFilter && sectionFilter !== 'all') {
      studentsQuery = studentsQuery.eq('section', sectionFilter)
    }

    const { data: students, error: studentsError } = await studentsQuery.order('created_at', { ascending: false })

    if (studentsError) {
      throw new Error(`Failed to fetch students: ${studentsError.message}`)
    }

    // Fetch achievements count for all students
    const { data: achievementsData } = await supabase
      .from('user_achievements')
      .select('user_id')
      .in('user_id', students?.map(s => s.id) || [])

    // Count achievements per user
    const achievementCounts = new Map<string, number>()
    achievementsData?.forEach(ach => {
      achievementCounts.set(ach.user_id, (achievementCounts.get(ach.user_id) || 0) + 1)
    })

    // Fetch CP submissions count for all students
    const { data: cpSubmissions } = await supabase
      .from('session_submissions')
      .select('user_id')
      .in('user_id', students?.map(s => s.id) || [])

    // Count CP attempts per user
    const cpAttemptCounts = new Map<string, number>()
    cpSubmissions?.forEach(sub => {
      cpAttemptCounts.set(sub.user_id, (cpAttemptCounts.get(sub.user_id) || 0) + 1)
    })

    // If quest filter is specified, we need to calculate quest-specific stats
    if (questFilter && questFilter !== 'all') {
      // Fetch attempts for the specific quest
      const { data: attemptData } = await supabase
        .from('attempt_logs')
        .select('user_id, question_id, is_correct, submitted_at, attempt_type, questions!inner(points, quest_id)')
        .eq('is_correct', true)
        .eq('attempt_type', 'submission')
        .eq('questions.quest_id', questFilter)
        .in('user_id', students?.map(s => s.id) || [])

      // Fetch questions for the quest
      const { data: questionData } = await supabase
        .from('questions')
        .select('id, quest_id, points')
        .eq('is_active', true)
        .eq('quest_id', questFilter)

      // Fetch quest completion dates from quest_progress
      const { data: progressData } = await supabase
        .from('quest_progress')
        .select('user_id, completed_at')
        .eq('quest_id', questFilter)
        .eq('status', 'completed')
        .in('user_id', students?.map(s => s.id) || [])

      // Map completion dates by user_id
      const completionDates = new Map<string, string>()
      progressData?.forEach(p => {
        if (p.completed_at) {
          completionDates.set(p.user_id, p.completed_at)
        }
      })

      // Calculate quest-specific stats
      const studentData = students?.map((student) => {
        const userAttempts = attemptData?.filter(a => a.user_id === student.id) || []
        const uniqueQuestions = new Set(userAttempts.map(a => a.question_id))
        const completedChallenges = uniqueQuestions.size

        // Get total score from centralized function
        const scoreData = studentScores?.find((s: any) => s.student_id === student.id)

        // Check if quest is completed
        const questQuestions = questionData || []
        const completedQuests = (questQuestions.length > 0 && uniqueQuestions.size === questQuestions.length) ? 1 : 0

        // Get CP data
        const cpAttempts = cpAttemptCounts.get(student.id) || 0
        const cpPoints = scoreData?.cp_points || 0

        return {
          id: student.id,
          username: student.username,
          email: student.email,
          role: student.role,
          batch: student.batch,
          course: student.course,
          section: student.section,
          totalPoints: scoreData?.total_score || 0,
          completedChallenges,
          completedQuests,
          cpAttempts,
          cpPoints,
          badges: achievementCounts.get(student.id) || 0,
          currentStreak: student.current_streak || 0,
          maxStreak: student.max_streak || 0,
          lastActive: student.last_active || student.created_at,
          createdAt: student.created_at,
          questCompletedAt: completionDates.get(student.id) || null
        }
      }) || []

      // Sort by totalPoints descending
      studentData.sort((a, b) => b.totalPoints - a.totalPoints)

      return NextResponse.json({ success: true, data: studentData })
    }

    // No quest filter - use centralized scores directly
    const studentData = students?.map((student) => {
      const scoreData = studentScores?.find((s: any) => s.student_id === student.id)

      return {
        id: student.id,
        username: student.username,
        email: student.email,
        roll_number: student.roll_number,
        role: student.role,
        batch: student.batch,
        course: student.course,
        section: student.section,
        totalPoints: scoreData?.total_score || 0,
        completedChallenges: scoreData?.questions_completed || 0,
        completedQuests: scoreData?.quests_completed || 0,
        cpAttempts: cpAttemptCounts.get(student.id) || 0,
        cpPoints: scoreData?.cp_points || 0,
        badges: achievementCounts.get(student.id) || 0,
        currentStreak: student.current_streak || 0,
        maxStreak: student.max_streak || 0,
        lastActive: student.last_active || student.created_at,
        createdAt: student.created_at,
        questCompletedAt: null
      }
    }) || []

    // Sort by totalPoints descending
    studentData.sort((a, b) => b.totalPoints - a.totalPoints)

    return NextResponse.json({ success: true, data: studentData })
  } catch (error) {
    console.error('Error fetching students:', error)
    return NextResponse.json({ success: false, message: 'An unexpected error occurred' }, { status: 500 })
  }
}
