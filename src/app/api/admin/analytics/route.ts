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

    // Get platform statistics
    const [
      { count: totalStudents },
      { count: totalQuests },
      { count: totalQuestions },
      { data: submissionData },
      { data: recentActivityData }
    ] = await Promise.all([
      // Total students
      supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'student'),

      // Total quests
      supabase
        .from('quests')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true),

      // Total questions
      supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true),

      // Total submissions from attempt_logs (count unique user-question combinations only, exclude reviews)
      supabase
        .from('attempt_logs')
        .select('user_id, question_id')
        .eq('is_correct', true),

      // Recent activity (last 10 correct submissions with timing info for first/review detection)
      supabase
        .from('attempt_logs')
        .select(`
          user_id,
          question_id,
          submitted_at,
          is_correct,
          users!inner(username),
          questions!inner(title, points, quests!inner(title))
        `)
        .eq('is_correct', true)
        .order('submitted_at', { ascending: false })
        .limit(30)
    ])

    // Calculate unique submissions (first attempts only, exclude reviews)
    const uniqueSubmissions = new Set()
    submissionData?.forEach(submission => {
      const key = `${submission.user_id}_${submission.question_id}`
      uniqueSubmissions.add(key)
    })
    const totalSubmissions = uniqueSubmissions.size

    // Process recent activity to detect first attempts vs reviews
    const userQuestionTracker = new Map()

    // Sort by submission time (oldest first) to properly identify first attempts
    const sortedActivityData = recentActivityData?.sort((a, b) =>
      new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime()
    ) || []

    // First pass: mark all first attempts
    sortedActivityData.forEach(activity => {
      const key = `${activity.user_id}_${activity.question_id}`
      if (!userQuestionTracker.has(key)) {
        userQuestionTracker.set(key, true)
      }
    })

    // Second pass: create activity list with proper XP (reverse order for recent first)
    const recentActivity = sortedActivityData
      .reverse()
      .slice(0, 10)
      .map((activity: any) => {
        const key = `${activity.user_id}_${activity.question_id}`
        const isFirstAttempt = activity.submitted_at === sortedActivityData
          .filter(a => `${a.user_id}_${a.question_id}` === key)
          .sort((a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime())[0]?.submitted_at

        return {
          student: activity.users?.username,
          quest: activity.questions?.quests?.title,
          question: activity.questions?.title,
          score: isFirstAttempt ? (activity.questions?.points || 0) : 0, // 0 XP for reviews
          completedAt: activity.submitted_at
        }
      })

    // Get all active quests with difficulty
    const { data: allQuests } = await supabase
      .from('quests')
      .select('id, title, difficulty')
      .eq('is_active', true)

    // Calculate quest completion rates for each quest
    const questAnalytics = await Promise.all(
      (allQuests || []).map(async (quest) => {
        // Get question count for this quest
        const { count: totalQuestions } = await supabase
          .from('questions')
          .select('*', { count: 'exact', head: true })
          .eq('quest_id', quest.id)
          .eq('is_active', true)

        // Get completion stats from attempt_logs
        const { data: attemptData } = await supabase
          .from('attempt_logs')
          .select(`
            user_id,
            question_id,
            is_correct,
            questions!inner(quest_id)
          `)
          .eq('is_correct', true)
          .eq('questions.quest_id', quest.id)

        const uniqueStudents = new Set(attemptData?.map(a => a.user_id)).size

        // Calculate unique completed questions per student
        const completedQuestionsByStudent = new Map()
        attemptData?.forEach(attempt => {
          if (!completedQuestionsByStudent.has(attempt.user_id)) {
            completedQuestionsByStudent.set(attempt.user_id, new Set())
          }
          completedQuestionsByStudent.get(attempt.user_id).add(attempt.question_id)
        })

        // Calculate average completion rate per student
        const totalCompletedQuestions = Array.from(completedQuestionsByStudent.values())
          .reduce((sum, questionSet) => sum + questionSet.size, 0)

        const questionCount = totalQuestions || 0
        return {
          id: quest.id,
          title: quest.title,
          difficulty: quest.difficulty,
          totalQuestions: questionCount,
          completionRate: uniqueStudents > 0 && questionCount > 0
            ? (totalCompletedQuestions / (uniqueStudents * questionCount) * 100)
            : 0,
          studentsAttempted: uniqueStudents
        }
      })
    )

    // Get top performing students from attempt_logs
    const { data: topStudentsAttempts } = await supabase
      .from('attempt_logs')
      .select(`
        user_id,
        question_id,
        users!inner(id, username),
        questions!inner(points)
      `)
      .eq('is_correct', true)

    // Calculate top students with total scores and unique questions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const studentScores: any = {}
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    topStudentsAttempts?.forEach((attempt: any) => {
      const userId = attempt.users?.id
      const username = attempt.users?.username
      const questionId = attempt.question_id
      const points = attempt.questions?.points || 0

      if (userId && !studentScores[userId]) {
        studentScores[userId] = {
          username,
          totalScore: 0,
          completedChallenges: 0,
          completedQuestions: new Set()
        }
      }

      if (userId && !studentScores[userId].completedQuestions.has(questionId)) {
        studentScores[userId].completedQuestions.add(questionId)
        studentScores[userId].totalScore += points
        studentScores[userId].completedChallenges += 1
      }
    })

    const topPerformers = Object.values(studentScores)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .sort((a: any, b: any) => b.totalScore - a.totalScore)
      .slice(0, 5)

    // Get daily activity for the last 7 days from attempt_logs (first attempts only)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { data: dailyActivityRaw } = await supabase
      .from('attempt_logs')
      .select('user_id, question_id, submitted_at')
      .eq('is_correct', true)
      .gte('submitted_at', sevenDaysAgo.toISOString())
      .order('submitted_at', { ascending: true })

    // Track first attempts only for daily activity
    const dailyFirstAttempts = new Map()
    const dailyStats: any = {}

    dailyActivityRaw?.forEach(activity => {
      const key = `${activity.user_id}_${activity.question_id}`
      if (!dailyFirstAttempts.has(key)) {
        dailyFirstAttempts.set(key, true)
        const date = new Date(activity.submitted_at).toISOString().split('T')[0]
        dailyStats[date] = (dailyStats[date] || 0) + 1
      }
    })

    const dailyActivityChart = Object.entries(dailyStats)
      .map(([date, completions]) => ({ date, completions }))
      .sort((a, b) => a.date.localeCompare(b.date))

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalStudents: totalStudents || 0,
          totalQuests: totalQuests || 0,
          totalQuestions: totalQuestions || 0,
          totalSubmissions: totalSubmissions || 0,
          averageCompletionRate: questAnalytics.length > 0
            ? Math.round(questAnalytics.reduce((sum, quest) => sum + quest.completionRate, 0) / questAnalytics.length)
            : 0
        },
        questAnalytics: questAnalytics
          .sort((a, b) => b.studentsAttempted - a.studentsAttempted)
          .slice(0, 10), // Top 10 by participation for display flexibility
        topPerformers,
        recentActivity: recentActivity || [],
        dailyActivity: dailyActivityChart
      }
    })

  } catch (error) {
    console.error('Admin analytics API error:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
}