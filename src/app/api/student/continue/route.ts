import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const session = await getSession()
    if (!session || (session.role !== 'student' && session.role !== 'admin')) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 })
    }

    // Get all active quests ordered by sequence
    const { data: quests, error: questsError } = await supabase
      .from('quests')
      .select(`
        id,
        title,
        order_index,
        questions (
          id,
          order_index
        )
      `)
      .eq('is_active', true)
      .order('order_index', { ascending: true })

    if (questsError) {
      throw new Error(`Failed to fetch quests: ${questsError.message}`)
    }

    // Get user's completed questions from attempt_logs (since user_progress has issues)
    const { data: correctAttempts } = await supabase
      .from('attempt_logs')
      .select('question_id')
      .eq('user_id', session.id)
      .eq('is_correct', true)

    // Get unique completed question IDs
    const completedQuestionIds = new Set(
      correctAttempts?.map(q => String(q.question_id)) || []
    )


    // Find the first incomplete question in the first unlocked quest
    for (const quest of quests || []) {
      const sortedQuestions = quest.questions.sort((a, b) => a.order_index - b.order_index)

      // Check if this quest is unlocked (first quest or previous quest completed)
      const questIndex = quests?.findIndex(q => q.id === quest.id) || 0
      let isUnlocked = questIndex === 0 // First quest is always unlocked

      if (questIndex > 0) {
        // Check if previous quest is completed
        const previousQuest = quests[questIndex - 1]
        const previousQuestCompleted = previousQuest.questions.every(q =>
          completedQuestionIds.has(String(q.id))
        )
        isUnlocked = previousQuestCompleted
      }

      if (isUnlocked) {

        // Find first incomplete question in this quest
        for (const question of sortedQuestions) {
          const isCompleted = completedQuestionIds.has(String(question.id))

          if (!isCompleted) {
            return NextResponse.json({
              success: true,
              data: {
                questId: quest.id,
                questionId: question.id,
                questTitle: quest.title,
                url: `/student/challenge/${quest.id}/${question.id}`
              }
            })
          }
        }
      } else {
      }
    }

    // All questions completed
    return NextResponse.json({
      success: true,
      data: {
        allCompleted: true,
        message: 'Congratulations! All quests completed!',
        url: '/student/quests'
      }
    })

  } catch (error) {
    console.error('Continue learning API error:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
}