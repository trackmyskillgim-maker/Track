export const dynamic = 'force-dynamic';
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
    const sortBy = searchParams.get('sortBy') || 'studentsAttempted'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const difficultyFilter = searchParams.get('difficulty') || 'all'
    const yearFilter = searchParams.get('year')
    const courseFilter = searchParams.get('course')
    const sectionFilter = searchParams.get('section')

    // Calculate offset for pagination
    const offset = (page - 1) * limit

    // Get total student count with filters
    let studentsQuery = supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'student')

    if (yearFilter && yearFilter !== 'all') {
      studentsQuery = studentsQuery.eq('year', yearFilter)
    }
    if (courseFilter && courseFilter !== 'all') {
      studentsQuery = studentsQuery.eq('course', courseFilter)
    }
    if (sectionFilter && sectionFilter !== 'all') {
      studentsQuery = studentsQuery.eq('section', sectionFilter)
    }

    const { count: totalStudents, data: filteredStudents } = await studentsQuery

    // Get filtered student IDs
    let filteredStudentIds: Set<string> | null = null
    if (yearFilter || courseFilter || sectionFilter) {
      const { data: students } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'student')
        .then(result => {
          let query = supabase
            .from('users')
            .select('id')
            .eq('role', 'student')

          if (yearFilter && yearFilter !== 'all') {
            query = query.eq('year', yearFilter)
          }
          if (courseFilter && courseFilter !== 'all') {
            query = query.eq('course', courseFilter)
          }
          if (sectionFilter && sectionFilter !== 'all') {
            query = query.eq('section', sectionFilter)
          }

          return query
        })

      filteredStudentIds = new Set(students?.map(s => s.id) || [])
    }

    // Build base query for quests
    let baseQuery = supabase
      .from('quests')
      .select('id, title, difficulty, created_at, is_active')
      .order('created_at', { ascending: false })

    let countQuery = supabase
      .from('quests')
      .select('*', { count: 'exact', head: true })

    // Apply difficulty filter with exact matching for enum values
    if (difficultyFilter !== 'all') {
      baseQuery = baseQuery.eq('difficulty', difficultyFilter)
      countQuery = countQuery.eq('difficulty', difficultyFilter)
    }

    // Get total count first
    const { count: totalCount, error: countError } = await countQuery

    if (countError) {
      throw new Error(`Count query error: ${countError.message}`)
    }

    // Get quests data
    const { data: quests, error: questsError } = await baseQuery

    if (questsError) {
      throw new Error(`Database error: ${questsError.message}`)
    }

    // For each quest, calculate participation metrics
    const questsWithMetrics = await Promise.all(
      (quests || []).map(async (quest) => {
        // Get question count for this quest
        const { count: totalQuestions } = await supabase
          .from('questions')
          .select('*', { count: 'exact', head: true })
          .eq('quest_id', quest.id)
          .eq('is_active', true)

        // Get participation stats from attempt_logs
        let attemptQuery = supabase
          .from('attempt_logs')
          .select(`
            user_id,
            question_id,
            is_correct,
            submitted_at,
            questions!inner(quest_id, points)
          `)
          .eq('questions.quest_id', quest.id)

        const { data: attemptData } = await attemptQuery

        // Filter attempts by student IDs if filters are applied
        const filteredAttemptData = filteredStudentIds
          ? attemptData?.filter(a => filteredStudentIds.has(a.user_id)) || []
          : attemptData || []

        const uniqueStudents = new Set(filteredAttemptData.map(a => a.user_id)).size
        const correctAttempts = filteredAttemptData.filter(a => a.is_correct)

        // Calculate unique completed questions per student (only first correct attempts)
        const completedQuestionsByStudent = new Map()
        const firstCorrectAttempts: any[] = []
        const userQuestionTracker = new Set()

        // Sort attempts by submission time to identify first correct attempts
        const sortedAttempts = correctAttempts.sort((a, b) =>
          new Date(a.submitted_at || 0).getTime() - new Date(b.submitted_at || 0).getTime()
        )

        sortedAttempts.forEach(attempt => {
          const key = `${attempt.user_id}_${attempt.question_id}`
          const isFirstCorrect = !userQuestionTracker.has(key)

          if (isFirstCorrect) {
            userQuestionTracker.add(key)
            firstCorrectAttempts.push(attempt)

            if (!completedQuestionsByStudent.has(attempt.user_id)) {
              completedQuestionsByStudent.set(attempt.user_id, new Set())
            }
            completedQuestionsByStudent.get(attempt.user_id).add(attempt.question_id)
          }
        })

        // Calculate metrics based on first correct attempts only
        const totalCompletedQuestions = Array.from(completedQuestionsByStudent.values())
          .reduce((sum, questionSet) => sum + questionSet.size, 0)

        // Use students who made correct attempts for completion rate calculation
        const studentsWithCorrectAttempts = completedQuestionsByStudent.size
        const questionCount = totalQuestions || 0
        const completionRate = studentsWithCorrectAttempts > 0 && questionCount > 0
          ? (totalCompletedQuestions / (studentsWithCorrectAttempts * questionCount) * 100)
          : 0

        // Calculate average score from first correct attempts only
        const totalScore = firstCorrectAttempts.reduce((sum, attempt) =>
          sum + ((attempt.questions as any)?.points || 0), 0)
        // Average score per student who participated (more intuitive for quest analysis)
        const averageScore = studentsWithCorrectAttempts > 0 ? totalScore / studentsWithCorrectAttempts : 0

        return {
          id: quest.id,
          title: quest.title,
          difficulty: quest.difficulty,
          totalQuestions: questionCount,
          studentsAttempted: uniqueStudents,
          totalStudents: totalStudents || 0,
          completionRate,
          averageScore,
          createdAt: quest.created_at,
          isActive: quest.is_active
        }
      })
    )

    // Sort the results based on sortBy and sortOrder
    questsWithMetrics.sort((a, b) => {
      let aValue, bValue

      switch (sortBy) {
        case 'studentsAttempted':
          aValue = a.studentsAttempted
          bValue = b.studentsAttempted
          break
        case 'completionRate':
          aValue = a.completionRate
          bValue = b.completionRate
          break
        case 'averageScore':
          aValue = a.averageScore
          bValue = b.averageScore
          break
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime()
          bValue = new Date(b.createdAt).getTime()
          break
        default:
          aValue = a.studentsAttempted
          bValue = b.studentsAttempted
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    // Apply pagination
    const paginatedQuests = questsWithMetrics.slice(offset, offset + limit)

    // Calculate pagination info
    const totalPages = Math.ceil((totalCount || 0) / limit)
    const hasNextPage = page < totalPages
    const hasPreviousPage = page > 1

    return NextResponse.json({
      success: true,
      data: {
        quests: paginatedQuests,
        pagination: {
          currentPage: page,
          limit,
          totalCount: totalCount || 0,
          totalPages,
          hasNextPage,
          hasPreviousPage
        },
        filters: {
          sortBy,
          sortOrder,
          difficultyFilter
        }
      }
    })

  } catch (error) {
    console.error('Quest participation API error:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
