import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function GET(
  request: Request,
  { params }: { params: { studentId: string } }
) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'admin') {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 })
    }

    const { studentId } = params

    if (!studentId) {
      return NextResponse.json({
        success: false,
        message: 'Student ID is required'
      }, { status: 400 })
    }

    // Get student basic info
    const { data: student, error: studentError } = await supabase
      .from('users')
      .select('id, username, email, total_points, created_at, last_active')
      .eq('id', studentId)
      .eq('role', 'student')
      .single()

    if (studentError || !student) {
      return NextResponse.json({
        success: false,
        message: 'Student not found'
      }, { status: 404 })
    }

    // Get detailed attempt history with question and quest information
    // NOTE: This fetches ALL attempts (both test_run and submission) for attempt tracking
    const { data: attemptHistory, error: attemptError } = await supabase
      .from('attempt_logs')
      .select(`
        id,
        submitted_at,
        is_correct,
        attempt_type,
        questions!inner(
          id,
          title,
          points,
          quest_id,
          quests!inner(
            id,
            title,
            difficulty
          )
        )
      `)
      .eq('user_id', studentId)
      .order('submitted_at', { ascending: false })

    if (attemptError) {
      console.error('Error fetching attempt history:', attemptError)
      throw new Error(`Failed to fetch attempt history: ${attemptError.message}`)
    }

    // FIXED: Supabase doesn't always honor .order() with joins, so sort client-side
    // Sort descending (newest first)
    const sortedAttemptHistory = (attemptHistory || []).slice().sort((a, b) =>
      new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
    )

    // Calculate quest completion status
    const { data: questData, error: questError } = await supabase
      .from('quests')
      .select(`
        id,
        title,
        difficulty,
        created_at,
        questions!inner(id, title, points)
      `)
      .eq('is_active', true)
      .eq('questions.is_active', true)

    if (questError) {
      console.warn('Error fetching quest data:', questError)
    }

    // Track first correct SUBMISSIONS (not test runs) to calculate actual points earned
    const firstCorrectAttempts = new Map()
    const sortedAttempts = sortedAttemptHistory.sort((a, b) =>
      new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime()
    )

    // FIXED: Only track submissions for points, not test runs
    sortedAttempts.forEach(attempt => {
      if (attempt.is_correct && (attempt as any).attempt_type === 'submission') {
        const key = `${studentId}_${(attempt.questions as any)?.id}`
        if (!firstCorrectAttempts.has(key)) {
          firstCorrectAttempts.set(key, attempt)
        }
      }
    })

    // Process quest completion data
    const questCompletionStatus = questData?.map(quest => {
      const questQuestions = quest.questions || []
      // FIXED: Only count submissions (not test runs) for quest completion
      const userQuestAttempts = sortedAttemptHistory.filter(attempt =>
        questQuestions.some(q => q.id === (attempt.questions as any)?.id) &&
        attempt.is_correct &&
        (attempt as any).attempt_type === 'submission'
      ) || []

      const completedQuestions = new Set(userQuestAttempts.map(attempt => (attempt.questions as any)?.id))
      const isCompleted = questQuestions.length > 0 && completedQuestions.size === questQuestions.length
      const progress = questQuestions.length > 0 ? (completedQuestions.size / questQuestions.length) * 100 : 0

      // Calculate points only from first correct attempts
      const totalPoints = Array.from(firstCorrectAttempts.values())
        .filter(attempt => questQuestions.some(q => q.id === (attempt.questions as any)?.id))
        .reduce((sum, attempt) => sum + ((attempt.questions as any)?.points || 0), 0)

      return {
        questId: quest.id,
        questTitle: quest.title,
        difficulty: quest.difficulty,
        totalQuestions: questQuestions.length,
        completedQuestions: completedQuestions.size,
        isCompleted,
        progress: Math.round(progress),
        pointsEarned: totalPoints,
        lastAttempt: userQuestAttempts.length > 0 ? userQuestAttempts[0].submitted_at : null
      }
    }) || []

    // Calculate summary statistics
    // totalAttempts: ALL attempts (test_run + submission)
    // correctAttempts: ANY attempt where both test cases passed (test_run OR submission)
    const totalAttempts = sortedAttemptHistory.length
    const correctAttempts = sortedAttemptHistory.filter(a => a.is_correct).length
    const totalPointsEarned = Array.from(firstCorrectAttempts.values())
      .reduce((sum, attempt) => sum + ((attempt.questions as any)?.points || 0), 0)
    // FIXED: Only count submissions (not test runs) for questions completed
    const uniqueQuestionsCompleted = new Set(
      sortedAttemptHistory.filter(a =>
        a.is_correct && (a as any).attempt_type === 'submission'
      ).map(a => (a.questions as any)?.id)
    ).size
    const completedQuests = questCompletionStatus.filter(q => q.isCompleted).length

    // Group attempt history by date for timeline view
    const timelineData = sortedAttemptHistory.reduce((acc, attempt) => {
      const date = new Date(attempt.submitted_at).toLocaleDateString()
      if (!acc[date]) {
        acc[date] = []
      }

      // Check if this is a first correct attempt for points calculation
      const key = `${studentId}_${(attempt.questions as any)?.id}`
      const isFirstCorrect = firstCorrectAttempts.has(key) &&
        firstCorrectAttempts.get(key).id === attempt.id

      acc[date].push({
        time: attempt.submitted_at,
        questTitle: (attempt.questions as any)?.quests?.title,
        questionTitle: (attempt.questions as any)?.title,
        isCorrect: attempt.is_correct,
        points: attempt.is_correct && isFirstCorrect ? (attempt.questions as any)?.points || 0 : 0
      })
      return acc
    }, {} as Record<string, any[]>) || {}

    const response = {
      student: {
        id: student.id,
        username: student.username,
        email: student.email,
        totalPoints: totalPointsEarned,
        joinedAt: student.created_at,
        lastActive: student.last_active
      },
      summary: {
        totalAttempts,
        correctAttempts,
        accuracyRate: totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0,
        totalPointsEarned,
        uniqueQuestionsCompleted,
        completedQuests,
        totalQuests: questData?.length || 0
      },
      questProgress: questCompletionStatus,
      timeline: timelineData,
      recentActivity: sortedAttemptHistory.slice(0, 20).map(attempt => {
        // Check if this is a first correct attempt for points calculation
        const key = `${studentId}_${(attempt.questions as any)?.id}`
        const isFirstCorrect = firstCorrectAttempts.has(key) &&
          firstCorrectAttempts.get(key).id === attempt.id

        return {
          id: attempt.id,
          date: attempt.submitted_at,
          questTitle: (attempt.questions as any)?.quests?.title,
          questionTitle: (attempt.questions as any)?.title,
          isCorrect: attempt.is_correct,
          points: attempt.is_correct && isFirstCorrect ? (attempt.questions as any)?.points || 0 : 0
        }
      }) || []
    }

    return NextResponse.json({
      success: true,
      data: response
    })

  } catch (error) {
    console.error('Get student history error:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch student history'
    }, { status: 500 })
  }
}