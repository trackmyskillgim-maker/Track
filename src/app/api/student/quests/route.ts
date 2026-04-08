import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const session = await getSession()
    if (!session || (session.role !== 'student' && session.role !== 'admin')) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 })
    }

    // Step 1: Get student's enrolled subjects
    const { data: enrollments } = await supabase
      .from('student_subjects')
      .select('subject_id')
      .eq('student_id', session.id)

    const enrolledSubjectIds = enrollments?.map(e => e.subject_id) || []

    // If student has no enrollments, return empty list with helpful message
    if (enrolledSubjectIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          quests: [],
          message: 'No quests available. You are not enrolled in any subjects yet.'
        }
      })
    }

    // Step 2: Get all active quests for enrolled subjects with their progress and prerequisite info
    const { data: quests, error: questsError } = await supabase
      .from('quests')
      .select(`
        id,
        title,
        description,
        difficulty,
        estimated_time,
        total_points,
        order_index,
        required_quest_id,
        required_points,
        subject_id,
        subjects (
          id,
          name,
          subject_code
        ),
        questions (
          id,
          points
        )
      `)
      .eq('is_active', true)
      .in('subject_id', enrolledSubjectIds)
      .order('order_index', { ascending: true })

    if (questsError) {
      throw new Error(`Failed to fetch quests: ${questsError.message}`)
    }

    // Get user's quest progress
    const { data: questProgress } = await supabase
      .from('quest_progress')
      .select('*')
      .eq('user_id', session.id)

    // Get user's completed questions from attempt_logs
    const { data: correctAttempts } = await supabase
      .from('attempt_logs')
      .select(`
        question_id,
        questions (
          quest_id,
          points
        )
      `)
      .eq('user_id', session.id)
      .eq('is_correct', true)

    // Get user's total points for prerequisite checking
    const { data: userData } = await supabase
      .from('users')
      .select('total_points')
      .eq('id', session.id)
      .single()

    const userTotalPoints = userData?.total_points || 0

    // Get admin unlocks for this user
    const { data: adminUnlocks } = await supabase
      .from('admin_quest_unlocks')
      .select('quest_id')
      .eq('user_id', session.id)

    // Create a set of admin-unlocked quest IDs
    const adminUnlockedQuestIds = new Set(adminUnlocks?.map(unlock => unlock.quest_id) || [])

    // Create a map of unique completed questions with their points
    const completedQuestionsMap = new Map()
    correctAttempts?.forEach(attempt => {
      if (attempt.questions && typeof attempt.questions === 'object' && !Array.isArray(attempt.questions) && !completedQuestionsMap.has(attempt.question_id)) {
        const questionData = attempt.questions as { quest_id: string; points: number }
        completedQuestionsMap.set(attempt.question_id, {
          quest_id: questionData.quest_id,
          points: questionData.points
        })
      }
    })

    // Create a map to track which quests are completed
    const completedQuestsMap = new Map()
    quests?.forEach(quest => {
      const totalQuestions = quest.questions.length
      // Fix: Count unique completed questions for THIS specific quest only
      const completedQuestionsForThisQuest = quest.questions.filter(q =>
        completedQuestionsMap.has(q.id)
      ).length
      const isCompleted = totalQuestions > 0 && completedQuestionsForThisQuest === totalQuestions
      completedQuestsMap.set(quest.id, isCompleted)
    })

    // Process quest data with progress information and subject-scoped unlocking
    const questsWithProgress = quests?.map((quest) => {
      const totalQuestions = quest.questions.length
      const maxPossiblePoints = quest.questions.reduce((sum, q) => sum + q.points, 0)

      // Check if we have stored quest progress for this quest
      const storedProgress = questProgress?.find(qp => qp.quest_id === quest.id)

      let completedQuestions: number
      let earnedPoints: number

      if (storedProgress) {
        // Use stored quest progress (more accurate and faster)
        completedQuestions = storedProgress.questions_completed
        earnedPoints = storedProgress.total_score
      } else {
        // Fallback to dynamic calculation from attempt_logs
        // Fix: Count only completed questions that belong to THIS quest
        const completedQuestionsForThisQuest = quest.questions.filter(q =>
          completedQuestionsMap.has(q.id)
        )
        completedQuestions = completedQuestionsForThisQuest.length
        earnedPoints = completedQuestionsForThisQuest.reduce((sum, q) => sum + q.points, 0)
      }

      // Determine quest status and unlock state based on sequential completion
      // NEW: Per-subject scoping - only check prerequisites within same subject
      let status: 'locked' | 'available' | 'in_progress' | 'completed'
      let isUnlocked = false
      let lockReason = ''
      let isAdminUnlocked = false

      // Check if this quest was admin-unlocked for this user
      if (adminUnlockedQuestIds.has(quest.id)) {
        isUnlocked = true
        isAdminUnlocked = true
      } else {
        // Sequential unlock logic: All previous quests IN THE SAME SUBJECT (lower order_index) must be completed
        const previousQuestsInSubject = quests.filter(q =>
          q.subject_id === quest.subject_id && q.order_index < quest.order_index
        )
        const incompletePreviousQuests = previousQuestsInSubject.filter(q => !completedQuestsMap.get(q.id))

        if (incompletePreviousQuests.length === 0) {
          // All previous quests in this subject completed, check points requirement
          if (!quest.required_points || quest.required_points <= userTotalPoints) {
            isUnlocked = true
          } else {
            const pointsNeeded = quest.required_points - userTotalPoints
            lockReason = `Earn ${pointsNeeded} more XP to unlock`
          }
        } else {
          // Some previous quests in this subject not completed
          const firstIncomplete = incompletePreviousQuests[0]
          lockReason = `Complete "${firstIncomplete.title}" first`
        }
      }

      // Determine status based on completion and unlock state
      if (isUnlocked) {
        status = completedQuestions === 0 ? 'available' :
                 completedQuestions === totalQuestions ? 'completed' : 'in_progress'
      } else {
        status = 'locked'
      }

      // Extract subject info for grouping in UI
      const subjectInfo = quest.subjects && typeof quest.subjects === 'object' && !Array.isArray(quest.subjects)
        ? {
            id: (quest.subjects as any).id,
            name: (quest.subjects as any).name,
            subjectCode: (quest.subjects as any).subject_code
          }
        : null

      return {
        id: quest.id,
        title: quest.title,
        description: quest.description,
        difficulty: quest.difficulty,
        estimatedTime: quest.estimated_time,
        totalQuestions,
        completedQuestions,
        maxPossiblePoints,
        earnedPoints,
        completionPercentage: totalQuestions > 0 ? Math.round((completedQuestions / totalQuestions) * 100) : 0,
        status,
        isUnlocked,
        lockReason,
        orderIndex: quest.order_index,
        isAdminUnlocked,
        subjectId: quest.subject_id,
        subject: subjectInfo
      }
    }) || []

    return NextResponse.json({
      success: true,
      data: {
        quests: questsWithProgress
      }
    }, {
      headers: {
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'Vary': 'Cookie'
      }
    })

  } catch (error) {
    console.error('Quests API error:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
}