import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: { questId: string } }
) {
  try {
    const session = await getSession()
    if (!session || (session.role !== 'student' && session.role !== 'admin')) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 })
    }

    const { questId } = params

    // Get quest details with prerequisite info
    const { data: quest, error: questError } = await supabase
      .from('quests')
      .select(`
        id,
        title,
        description,
        difficulty,
        estimated_time,
        total_points,
        required_quest_id,
        required_points
      `)
      .eq('id', questId)
      .eq('is_active', true)
      .single()

    if (questError || !quest) {
      return NextResponse.json({
        success: false,
        message: 'Quest not found'
      }, { status: 404 })
    }

    // Check if quest is unlocked for this user
    if (quest.required_quest_id || (quest.required_points && quest.required_points > 0)) {
      // Get user's total points
      const { data: userData } = await supabase
        .from('users')
        .select('total_points')
        .eq('id', session.id)
        .single()

      const userTotalPoints = userData?.total_points || 0

      // Check prerequisite quest completion if required
      if (quest.required_quest_id) {
        // Get prerequisite quest and check if it's completed
        const { data: prerequisiteQuest } = await supabase
          .from('quests')
          .select('id, title, questions(id)')
          .eq('id', quest.required_quest_id)
          .single()

        if (prerequisiteQuest) {
          const prereqQuestionIds = prerequisiteQuest.questions.map(q => q.id)
          const { data: prereqCorrectAttempts } = await supabase
            .from('attempt_logs')
            .select('question_id')
            .eq('user_id', session.id)
            .eq('is_correct', true)
            .in('question_id', prereqQuestionIds)

          const prereqCompletedQuestions = new Set(prereqCorrectAttempts?.map(a => a.question_id) || [])
          const isPrereqCompleted = prereqQuestionIds.every(id => prereqCompletedQuestions.has(id))

          if (!isPrereqCompleted) {
            return NextResponse.json({
              success: false,
              message: `Complete "${prerequisiteQuest.title}" first to unlock this quest`
            }, { status: 403 })
          }
        }
      }

      // Check prerequisite points if required
      if (quest.required_points && quest.required_points > 0 && userTotalPoints < quest.required_points) {
        const pointsNeeded = quest.required_points - userTotalPoints
        return NextResponse.json({
          success: false,
          message: `You need ${pointsNeeded} more XP to unlock this quest`
        }, { status: 403 })
      }
    }

    // Get all questions for this quest
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select(`
        id,
        title,
        description,
        task,
        difficulty,
        points,
        order_index
      `)
      .eq('quest_id', questId)
      .eq('is_active', true)
      .order('order_index', { ascending: true })

    if (questionsError) {
      throw new Error(`Failed to fetch questions: ${questionsError.message}`)
    }

    // Get completed questions from attempt_logs
    const { data: correctAttempts } = await supabase
      .from('attempt_logs')
      .select('question_id')
      .eq('user_id', session.id)
      .eq('is_correct', true)
      .in('question_id', questions?.map(q => q.id) || [])

    // Create set of completed question IDs
    const completedQuestionIds = new Set(
      correctAttempts?.map(q => String(q.question_id)) || []
    )


    // Combine questions with completion status
    const questionsWithProgress = questions?.map(question => {
      const isCompleted = completedQuestionIds.has(String(question.id))

      return {
        id: question.id,
        title: question.title,
        description: question.description,
        task: question.task,
        difficulty: question.difficulty,
        points: question.points,
        orderIndex: question.order_index,
        isCompleted,
        userScore: isCompleted ? question.points : 0 // Full points if completed
      }
    }) || []

    // Calculate completion stats
    const completedQuestions = questionsWithProgress.filter(q => q.isCompleted).length
    const totalQuestions = questionsWithProgress.length

    return NextResponse.json({
      success: true,
      data: {
        id: quest.id,
        title: quest.title,
        description: quest.description,
        difficulty: quest.difficulty,
        estimatedTime: quest.estimated_time,
        totalQuestions,
        completedQuestions,
        questions: questionsWithProgress
      }
    })

  } catch (error) {
    console.error('Quest detail API error:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
}