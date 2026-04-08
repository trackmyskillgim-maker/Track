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

    // Get filters from URL parameters
    const { searchParams } = new URL(request.url)
    const batchFilter = searchParams.get('batch')
    const courseFilter = searchParams.get('course')
    const sectionFilter = searchParams.get('section')
    const subjectFilter = searchParams.get('subject')

    const hasFilters = (batchFilter && batchFilter !== 'all') ||
                       (courseFilter && courseFilter !== 'all') ||
                       (sectionFilter && sectionFilter !== 'all') ||
                       (subjectFilter && subjectFilter !== 'all')

    // Check if user is super admin or professor
    const isSuperAdmin = session.is_super_admin === true

    // If professor, get their subjects and enrolled students
    let professorStudentIds: string[] = []
    let professorSubjectIds: string[] = []
    if (!isSuperAdmin) {
      // Get professor's subjects
      const { data: professorSubjects } = await supabase
        .from('subjects')
        .select('id')
        .eq('created_by', session.id)

      professorSubjectIds = professorSubjects?.map(s => s.id) || []

      // Get enrolled students for those subjects
      const { data: subjectEnrollments } = await supabase
        .from('student_subjects')
        .select('student_id')
        .in('subject_id', professorSubjectIds)

      professorStudentIds = Array.from(new Set(subjectEnrollments?.map(e => e.student_id) || []))

      // If professor has no students, return empty analytics
      if (professorStudentIds.length === 0) {
        return NextResponse.json({
          success: true,
          data: {
            overview: {
              totalStudents: 0,
              total_students: 0,
              totalQuests: 0,
              totalQuestions: 0,
              totalSubmissions: 0,
              averageParticipationRate: 0,
              averageCompletionRate: 0
            },
            questAnalytics: [],
            highParticipationQuests: [],
            lowParticipationQuests: [],
            topPerformers: [],
            recentActivity: [],
            dailyActivity: [],
            classInsights: { students_not_started: 0, avg_questions_per_active_student: 0 },
            participationStats: { avg_participation_rate: 0, median_participation_rate: 0 }
          }
        })
      }
    }

    // If no filters AND super admin, use the RPC function for fast response
    if (!hasFilters && isSuperAdmin) {
      const { data, error } = await supabase.rpc('get_admin_analytics_optimized')

      if (error) {
        console.error('Analytics RPC error:', error)
        throw new Error('Failed to fetch analytics')
      }

      // Process enhanced analytics data for frontend
      const processedData = {
        overview: {
          totalStudents: data.overview?.total_students || 0,
          totalQuests: data.overview?.total_quests || 0,
          totalQuestions: data.overview?.total_questions || 0,
          totalSubmissions: data.overview?.total_submissions || 0,
          averageParticipationRate: data.participationStats?.avg_participation_rate
            ? Math.round(data.participationStats.avg_participation_rate)
            : 0,
          averageCompletionRate: data.questAnalytics?.length > 0
            ? Math.round(data.questAnalytics.reduce((sum: number, quest: any) =>
                sum + (quest.true_completion_rate || quest.completion_rate || 0), 0) / data.questAnalytics.length)
            : 0
        },
        questAnalytics: (data.questAnalytics || []).map((quest: any) => ({
          ...quest,
          completion_rate: quest.true_completion_rate || 0,
          completionRate: quest.true_completion_rate || 0,
          question_completion_rate: quest.question_completion_rate || 0,
          true_completion_rate: quest.true_completion_rate || 0,
          participation_rate: quest.participation_rate || 0,
          students_completed_quest: quest.students_completed_quest || 0
        })),
        highParticipationQuests: data.highParticipationQuests ||
          (data.questAnalytics || [])
            .filter((quest: any) => (quest.participation_rate || 0) >= 50)
            .map((quest: any) => ({
              ...quest,
              participation_category: 'high',
              difficulty_assessment: (quest.true_completion_rate || 0) >= 80 ? 'appropriate' :
                                    (quest.true_completion_rate || 0) >= 50 ? 'moderate' : 'challenging'
            }))
            .slice(0, 5),
        lowParticipationQuests: data.lowParticipationQuests ||
          (data.questAnalytics || [])
            .filter((quest: any) => (quest.participation_rate || 0) < 50)
            .map((quest: any) => ({
              ...quest,
              participation_category: 'low',
              difficulty_assessment: (quest.true_completion_rate || 0) >= 80 ? 'too_easy' :
                                    (quest.true_completion_rate || 0) >= 50 ? 'needs_promotion' : 'needs_review'
            }))
            .slice(0, 5),
        topPerformers: data.topPerformers || [],
        recentActivity: data.recentActivity || [],
        dailyActivity: data.dailyActivity || [],
        classInsights: data.classInsights || {},
        participationStats: data.participationStats || {}
      }

      return NextResponse.json(
        { success: true, data: processedData },
        {
          headers: {
            'Cache-Control': 'private, max-age=60, stale-while-revalidate=120',
            'CDN-Cache-Control': 'max-age=60'
          }
        }
      )
    }

    // FILTERED MODE: Recalculate everything client-side (or professor mode)
    console.log('🔍 [FILTER MODE] Recalculating analytics for filters:', { batchFilter, courseFilter, sectionFilter, subjectFilter, isProfessor: !isSuperAdmin })

    // Step 1: Get filtered students
    let studentsQuery = supabase
      .from('users')
      .select('id, username, batch, course, section')
      .eq('role', 'student')

    // For professors, only include their enrolled students
    if (!isSuperAdmin && professorStudentIds.length > 0) {
      studentsQuery = studentsQuery.in('id', professorStudentIds)
    }

    if (batchFilter && batchFilter !== 'all') {
      studentsQuery = studentsQuery.eq('batch', batchFilter)
    }
    if (courseFilter && courseFilter !== 'all') {
      studentsQuery = studentsQuery.eq('course', courseFilter)
    }
    if (sectionFilter && sectionFilter !== 'all') {
      studentsQuery = studentsQuery.eq('section', sectionFilter)
    }

    const { data: filteredStudents } = await studentsQuery
    let filteredStudentIds = filteredStudents?.map(s => s.id) || []

    // Filter by subject enrollment if subject filter is applied
    if (subjectFilter && subjectFilter !== 'all') {
      const { data: subjectEnrollments } = await supabase
        .from('student_subjects')
        .select('student_id')
        .eq('subject_id', subjectFilter)

      const enrolledStudentIds = new Set(subjectEnrollments?.map(e => e.student_id) || [])
      filteredStudentIds = filteredStudentIds.filter(id => enrolledStudentIds.has(id))
    }

    const totalFilteredStudents = filteredStudentIds.length

    if (totalFilteredStudents === 0) {
      // Return empty analytics if no students match filter
      return NextResponse.json({
        success: true,
        data: {
          overview: {
            totalStudents: 0,
            total_students: 0, // Snake case for backward compatibility
            totalQuests: 0,
            totalQuestions: 0,
            totalSubmissions: 0,
            averageParticipationRate: 0,
            averageCompletionRate: 0
          },
          questAnalytics: [],
          highParticipationQuests: [],
          lowParticipationQuests: [],
          topPerformers: [],
          recentActivity: [],
          dailyActivity: [],
          classInsights: { students_not_started: 0, avg_questions_per_active_student: 0 },
          participationStats: { avg_participation_rate: 0, median_participation_rate: 0 }
        }
      })
    }

    // Step 2: Fetch all attempt logs for filtered students
    const { data: attemptLogs } = await supabase
      .from('attempt_logs')
      .select('*, questions!inner(id, quest_id, points)')
      .in('user_id', filteredStudentIds)
      .eq('is_correct', true)
      .eq('attempt_type', 'submission')

    // Step 3: Fetch ONLY active quests (filtered by professor's subjects or subject filter)
    let questsQuery = supabase
      .from('quests')
      .select('id, title, difficulty, subject_id')
      .eq('is_active', true)

    // For professors, only include quests from their subjects
    if (!isSuperAdmin && professorSubjectIds.length > 0) {
      questsQuery = questsQuery.in('subject_id', professorSubjectIds)
    }

    // If subject filter is applied, filter quests by subject
    if (subjectFilter && subjectFilter !== 'all') {
      questsQuery = questsQuery.eq('subject_id', subjectFilter)
    }

    const { data: quests } = await questsQuery

    // Step 4: Fetch ONLY active questions for the filtered quests
    const questIds = quests?.map(q => q.id) || []
    let questions: any[] = []

    // Only fetch questions if there are quests
    if (questIds.length > 0) {
      const questionsQuery = supabase
        .from('questions')
        .select('id, quest_id, points')
        .eq('is_active', true)
        .in('quest_id', questIds)

      const { data } = await questionsQuery
      questions = data || []
    }

    const totalQuests = quests?.length || 0
    const totalQuestions = questions?.length || 0

    // Filter attemptLogs to only include questions from filtered quests
    const questionIds = new Set(questions?.map(q => q.id) || [])
    const filteredAttemptLogs = attemptLogs?.filter(log =>
      log.questions?.id && questionIds.has(log.questions.id)
    ) || []

    const totalSubmissions = filteredAttemptLogs.length

    // Step 5: Fetch quest progress for filtered students
    const { data: questProgress } = await supabase
      .from('quest_progress')
      .select('user_id, quest_id, status, questions_completed, total_questions, completed_at')
      .in('user_id', filteredStudentIds)

    // Step 5.5: Fetch subject enrollments to get students per subject
    const { data: subjectEnrollments } = await supabase
      .from('student_subjects')
      .select('student_id, subject_id')
      .in('student_id', filteredStudentIds)

    // Step 6: Calculate quest-level analytics
    const questAnalytics = quests?.map(quest => {
      const questQuestions = questions?.filter(q => q.quest_id === quest.id) || []
      const totalQuestQuestions = questQuestions.length

      // Get students enrolled in THIS quest's subject (not all students)
      const studentsInSubject = subjectEnrollments
        ?.filter(e => e.subject_id === quest.subject_id)
        .map(e => e.student_id) || []
      const totalStudentsInSubject = studentsInSubject.length

      // Students who attempted at least one question in this quest
      const studentsAttempted = new Set(
        filteredAttemptLogs?.filter(log => log.questions?.quest_id === quest.id)
          .map(log => log.user_id)
      ).size

      // Get quest progress records for this quest
      const questProgressRecords = questProgress?.filter(qp => qp.quest_id === quest.id) || []

      // Students who completed ALL questions in this quest
      const studentsCompleted = questProgressRecords.filter(qp => qp.status === 'completed').length

      const participationRate = totalStudentsInSubject > 0
        ? (studentsAttempted / totalStudentsInSubject) * 100
        : 0

      // Calculate question completion rate based on quest_progress.questions_completed
      // Sum of questions_completed / (students in THIS subject × total questions in quest)
      const totalCompletedQuestions = questProgressRecords.reduce((sum, qp) =>
        sum + (qp.questions_completed || 0), 0)
      const totalPossibleQuestions = totalStudentsInSubject * totalQuestQuestions

      const questionCompletionRate = totalPossibleQuestions > 0
        ? (totalCompletedQuestions / totalPossibleQuestions) * 100
        : 0

      const trueCompletionRate = totalStudentsInSubject > 0
        ? (studentsCompleted / totalStudentsInSubject) * 100
        : 0

      return {
        id: quest.id,
        title: quest.title,
        difficulty: quest.difficulty,
        subject_id: quest.subject_id,
        total_questions: totalQuestQuestions,
        students_attempted: studentsAttempted,
        students_completed_quest: studentsCompleted,
        total_students_in_subject: totalStudentsInSubject, // NEW: for UI to show "X of Y students"
        participation_rate: participationRate,
        question_completion_rate: questionCompletionRate,
        true_completion_rate: trueCompletionRate,
        completion_rate: trueCompletionRate,
        completionRate: trueCompletionRate
      }
    }) || []

    // Step 7: Calculate top performers using centralized scoring function
    const { data: allStudentScores } = await supabase.rpc('get_student_scores')

    // Filter to only include filtered students
    const topPerformers = allStudentScores
      ?.filter((student: any) => filteredStudentIds.includes(student.student_id))
      .map((student: any) => ({
        user_id: student.student_id,
        userId: student.student_id,
        username: student.student_name,
        total_score: student.total_score,
        completed_questions: student.questions_completed,
        quests_participated: 0, // Can be calculated if needed
        quests_completed: student.quests_completed
      }))
      .sort((a: any, b: any) => b.total_score - a.total_score) || []

    // Step 8: Calculate recent activity
    const recentActivity = filteredAttemptLogs?.slice(-10).reverse().map(log => ({
      user_id: log.user_id,
      userId: log.user_id,
      username: filteredStudents?.find(s => s.id === log.user_id)?.username || 'Unknown',
      questTitle: quests?.find(q => q.id === log.questions?.quest_id)?.title || 'Unknown Quest',
      questionTitle: 'Question', // Would need to join questions table for full title
      points: log.questions?.points || 0,
      timestamp: log.submitted_at,
      isCorrect: log.is_correct
    })) || []

    // Step 9: Calculate daily activity
    const activityByDate = new Map<string, number>()
    filteredAttemptLogs?.forEach(log => {
      const date = new Date(log.submitted_at).toISOString().split('T')[0]
      activityByDate.set(date, (activityByDate.get(date) || 0) + 1)
    })

    const dailyActivity = Array.from(activityByDate.entries())
      .map(([date, completions]) => ({ date, completions }))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 7)

    // Step 10: Calculate class insights
    const studentsWithAttempts = new Set(filteredAttemptLogs?.map(log => log.user_id)).size
    const studentsNotStarted = totalFilteredStudents - studentsWithAttempts

    // Calculate avg questions per active student based on UNIQUE questions answered
    // Count distinct questions answered across all students (not per student)
    const uniqueQuestionsAnswered = new Set<string>()
    filteredAttemptLogs?.forEach(log => {
      uniqueQuestionsAnswered.add(log.question_id)
    })

    const totalUniqueQuestionsAnswered = uniqueQuestionsAnswered.size

    // Divide by ACTIVE students (students who actually attempted at least one question)
    const avgQuestionsPerActiveStudent = studentsWithAttempts > 0
      ? totalUniqueQuestionsAnswered / studentsWithAttempts
      : 0

    // Step 11: Calculate participation stats
    // Average Participation Rate = Average of participation rates across all quests
    const participationRates = questAnalytics.map(q => q.participation_rate)
    const avgParticipationRate = participationRates.length > 0
      ? participationRates.reduce((sum, rate) => sum + rate, 0) / participationRates.length
      : 0

    // Median participation rate across quests
    const sortedRates = [...participationRates].sort((a, b) => a - b)
    const medianParticipationRate = sortedRates.length > 0
      ? sortedRates[Math.floor(sortedRates.length / 2)]
      : 0

    // Step 12: Calculate average completion rate
    const completionRates = questAnalytics.map(q => q.true_completion_rate)
    const averageCompletionRate = completionRates.length > 0
      ? Math.round(completionRates.reduce((sum, rate) => sum + rate, 0) / completionRates.length)
      : 0

    // Step 13: Build final response
    const processedData = {
      overview: {
        totalStudents: totalFilteredStudents,
        total_students: totalFilteredStudents, // Snake case for backward compatibility
        totalQuests,
        totalQuestions,
        totalSubmissions,
        averageParticipationRate: Math.round(avgParticipationRate),
        averageCompletionRate
      },
      questAnalytics,
      highParticipationQuests: questAnalytics
        .filter(q => q.participation_rate >= 50)
        .map(q => ({
          ...q,
          participation_category: 'high',
          difficulty_assessment: q.true_completion_rate >= 80 ? 'appropriate' :
                                q.true_completion_rate >= 50 ? 'moderate' : 'challenging'
        }))
        .slice(0, 5),
      lowParticipationQuests: questAnalytics
        .filter(q => q.participation_rate < 50)
        .map(q => ({
          ...q,
          participation_category: 'low',
          difficulty_assessment: q.true_completion_rate >= 80 ? 'too_easy' :
                                q.true_completion_rate >= 50 ? 'needs_promotion' : 'needs_review'
        }))
        .slice(0, 5),
      topPerformers,
      recentActivity,
      dailyActivity,
      classInsights: {
        students_not_started: studentsNotStarted,
        avg_questions_per_active_student: avgQuestionsPerActiveStudent
      },
      participationStats: {
        avg_participation_rate: avgParticipationRate,
        median_participation_rate: medianParticipationRate
      }
    }

    console.log('🔍 [FILTER MODE] Recalculated analytics:', processedData)

    return NextResponse.json(
      { success: true, data: processedData },
      {
        headers: {
          'Cache-Control': 'private, max-age=60, stale-while-revalidate=120',
          'CDN-Cache-Control': 'max-age=60'
        }
      }
    )

  } catch (error) {
    console.error('Admin analytics API error:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
}
