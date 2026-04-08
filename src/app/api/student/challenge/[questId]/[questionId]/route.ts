import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: { questId: string; questionId: string } }
) {
  try {
    const session = await getSession()
    if (!session || (session.role !== 'student' && session.role !== 'admin')) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 })
    }

    const { questId, questionId } = params

    // Get quest details
    const { data: quest, error: questError } = await supabase
      .from('quests')
      .select('id, title')
      .eq('id', questId)
      .eq('is_active', true)
      .single()

    if (questError || !quest) {
      return NextResponse.json({
        success: false,
        message: 'Quest not found'
      }, { status: 404 })
    }

    // Get question details
    const { data: question, error: questionError } = await supabase
      .from('questions')
      .select(`
        id,
        title,
        description,
        task,
        hint,
        points,
        difficulty,
        starter_code,
        expected_output,
        function_name,
        order_index
      `)
      .eq('id', questionId)
      .eq('quest_id', questId)
      .eq('is_active', true)
      .single()

    if (questionError || !question) {
      return NextResponse.json({
        success: false,
        message: 'Question not found'
      }, { status: 404 })
    }

    // Get all questions for navigation
    const { data: allQuestions, error: allQuestionsError } = await supabase
      .from('questions')
      .select('id, order_index')
      .eq('quest_id', questId)
      .eq('is_active', true)
      .order('order_index', { ascending: true })

    if (allQuestionsError) {
      throw new Error(`Failed to fetch navigation data: ${allQuestionsError.message}`)
    }

    // Get user's progress for this question
    const { data: userProgress } = await supabase
      .from('user_progress')
      .select('completed, score')
      .eq('user_id', session.id)
      .eq('question_id', questionId)
      .single()

    // Find current question index and navigation
    const currentIndex = allQuestions?.findIndex(q => q.id === questionId) ?? 0
    const previousQuestion = currentIndex > 0 ? allQuestions?.[currentIndex - 1] : null
    const nextQuestion = currentIndex < (allQuestions?.length ?? 0) - 1 ? allQuestions?.[currentIndex + 1] : null

    // TODO: Temporarily disabled sequential access check due to database issues
    // Students can access any question for now
    // Check if previous question is completed (for sequential access)
    // if (currentIndex > 0 && previousQuestion) {
    //   const { data: prevProgress } = await supabase
    //     .from('user_progress')
    //     .select('completed')
    //     .eq('user_id', session.id)
    //     .eq('question_id', previousQuestion.id)
    //     .single()

    //   if (!prevProgress?.completed) {
    //     return NextResponse.json({
    //       success: false,
    //       message: 'You must complete the previous question first'
    //     }, { status: 403 })
    //   }
    // }

    return NextResponse.json({
      success: true,
      data: {
        question: {
          id: question.id,
          title: question.title,
          description: question.description,
          task: question.task,
          hint: question.hint,
          points: question.points,
          difficulty: question.difficulty,
          starterCode: question.starter_code,
          expectedOutput: question.expected_output,
          functionName: question.function_name,
          orderIndex: question.order_index,
          isCompleted: userProgress?.completed || false,
          userScore: userProgress?.score
        },
        quest: {
          id: quest.id,
          title: quest.title,
          totalQuestions: allQuestions?.length || 0
        },
        navigation: {
          currentIndex,
          previousQuestionId: previousQuestion?.id,
          nextQuestionId: nextQuestion?.id
        }
      }
    })

  } catch (error) {
    console.error('Challenge API error:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
}