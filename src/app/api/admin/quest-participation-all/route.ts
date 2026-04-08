import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'admin') {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 })
    }

    // Get filters from URL
    const { searchParams } = new URL(request.url)
    const batchFilter = searchParams.get('batch')
    const courseFilter = searchParams.get('course')
    const sectionFilter = searchParams.get('section')

    // Get total student count with filters
    let studentsQuery = supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'student')

    if (batchFilter && batchFilter !== 'all') {
      studentsQuery = studentsQuery.eq('batch', batchFilter)
    }
    if (courseFilter && courseFilter !== 'all') {
      studentsQuery = studentsQuery.eq('course', courseFilter)
    }
    if (sectionFilter && sectionFilter !== 'all') {
      studentsQuery = studentsQuery.eq('section', sectionFilter)
    }

    const { count: totalStudents } = await studentsQuery

    // Get filtered student IDs
    let filteredStudentIds: Set<string> | null = null
    if (batchFilter || courseFilter || sectionFilter) {
      let studentIdsQuery = supabase
        .from('users')
        .select('id')
        .eq('role', 'student')

      if (batchFilter && batchFilter !== 'all') {
        studentIdsQuery = studentIdsQuery.eq('batch', batchFilter)
      }
      if (courseFilter && courseFilter !== 'all') {
        studentIdsQuery = studentIdsQuery.eq('course', courseFilter)
      }
      if (sectionFilter && sectionFilter !== 'all') {
        studentIdsQuery = studentIdsQuery.eq('section', sectionFilter)
      }

      const { data: students } = await studentIdsQuery
      filteredStudentIds = new Set(students?.map(s => s.id) || [])
    }

    // Get ALL quests without any filtering or pagination
    const { data: quests, error: questError } = await supabase
      .from('quests')
      .select('id, title, difficulty, created_at, is_active')
      .order('created_at', { ascending: false })

    if (questError) {
      console.error('Quest fetch error:', questError)
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch quests',
        error: questError.message
      }, { status: 500 })
    }

    // Calculate participation metrics for each quest
    const questsWithMetrics = await Promise.all(
      quests.map(async (quest) => {
        // Get total questions for this quest
        const { count: totalQuestions } = await supabase
          .from('questions')
          .select('*', { count: 'exact', head: true })
          .eq('quest_id', quest.id)

        // Get unique students who attempted this quest (via questions)
        const { data: attempts } = await supabase
          .from('attempt_logs')
          .select(`
            user_id,
            is_correct,
            questions!inner(quest_id, points)
          `)
          .eq('questions.quest_id', quest.id)
          .eq('is_correct', true)

        // Filter attempts by student IDs if filters are applied
        const filteredAttempts = filteredStudentIds
          ? attempts?.filter(a => filteredStudentIds.has(a.user_id)) || []
          : attempts || []

        const uniqueStudents = new Set()
        let totalScore = 0

        if (filteredAttempts) {
          filteredAttempts.forEach((attempt: any) => {
            uniqueStudents.add(attempt.user_id)
            totalScore += attempt.questions?.points || 0
          })
        }

        const studentsAttempted = uniqueStudents.size
        const averageScore = studentsAttempted > 0 ? totalScore / studentsAttempted : 0

        // Calculate completion rate: percentage of students who completed ALL questions in quest
        const { data: allQuestAttempts } = await supabase
          .from('attempt_logs')
          .select(`
            user_id,
            question_id,
            is_correct,
            questions!inner(quest_id, is_active)
          `)
          .eq('questions.quest_id', quest.id)
          .eq('questions.is_active', true)
          .eq('is_correct', true)

        // Get active questions count for this quest
        const { count: activeQuestionsCount } = await supabase
          .from('questions')
          .select('*', { count: 'exact', head: true })
          .eq('quest_id', quest.id)
          .eq('is_active', true)

        // Count students who completed ALL active questions in this quest
        const studentQuestionCompletions = new Map()
        if (allQuestAttempts) {
          allQuestAttempts.forEach((attempt: any) => {
            const userId = attempt.user_id
            const questionId = attempt.question_id

            if (!studentQuestionCompletions.has(userId)) {
              studentQuestionCompletions.set(userId, new Set())
            }
            studentQuestionCompletions.get(userId).add(questionId)
          })
        }

        // Count students who completed all questions (full quest completion)
        let studentsCompletedAllQuestions = 0
        studentQuestionCompletions.forEach((completedQuestions) => {
          if (completedQuestions.size === activeQuestionsCount) {
            studentsCompletedAllQuestions++
          }
        })

        const completionRate = studentsAttempted > 0
          ? (studentsCompletedAllQuestions / studentsAttempted) * 100
          : 0

        return {
          id: quest.id,
          title: quest.title,
          difficulty: quest.difficulty || 'Unknown',
          totalQuestions: totalQuestions || 0,
          studentsAttempted,
          totalStudents: totalStudents || 0,
          completionRate,
          averageScore,
          createdAt: quest.created_at,
          isActive: quest.is_active || false
        }
      })
    )

    const response = {
      success: true,
      data: {
        quests: questsWithMetrics,
        totalCount: questsWithMetrics.length,
        lastUpdated: new Date().toISOString()
      }
    }

    console.log('🔍 [DEBUG] Quest Participation API - Final response:', response)
    console.log('🔍 [DEBUG] Quest Participation API - Quest count:', questsWithMetrics.length)

    return NextResponse.json(response)

  } catch (error) {
    console.error('Quest participation API error:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}