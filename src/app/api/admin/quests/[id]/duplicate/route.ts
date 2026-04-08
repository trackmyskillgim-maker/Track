import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { getUserId } from '@/lib/session-utils'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'admin') {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized - Admin access required'
      }, { status: 401 })
    }

    const userId = getUserId(session)
    if (!userId) {
      return NextResponse.json({
        success: false,
        message: 'Invalid session'
      }, { status: 401 })
    }

    const { id: questId } = params
    const body = await request.json()
    const { targetSubjectId, newTitle } = body

    if (!targetSubjectId) {
      return NextResponse.json({
        success: false,
        message: 'Target subject ID is required'
      }, { status: 400 })
    }

    if (!newTitle || !newTitle.trim()) {
      return NextResponse.json({
        success: false,
        message: 'New quest title is required'
      }, { status: 400 })
    }

    // Verify target subject exists and user has access
    const { data: targetSubject } = await supabase
      .from('subjects')
      .select('id, name, created_by')
      .eq('id', targetSubjectId)
      .eq('is_active', true)
      .single()

    if (!targetSubject) {
      return NextResponse.json({
        success: false,
        message: 'Target subject not found or inactive'
      }, { status: 404 })
    }

    // Check permission (super admin can duplicate to any subject, regular admin only to their own)
    const isSuperAdmin = session.is_super_admin === true
    if (!isSuperAdmin && targetSubject.created_by !== userId) {
      return NextResponse.json({
        success: false,
        message: 'You can only duplicate quests to subjects you created'
      }, { status: 403 })
    }

    // Fetch the source quest
    const { data: sourceQuest, error: questError } = await supabase
      .from('quests')
      .select('*')
      .eq('id', questId)
      .single()

    if (questError || !sourceQuest) {
      return NextResponse.json({
        success: false,
        message: 'Source quest not found'
      }, { status: 404 })
    }

    // Check if user has permission to access source quest
    if (!isSuperAdmin && sourceQuest.created_by !== userId) {
      return NextResponse.json({
        success: false,
        message: 'You can only duplicate quests you created'
      }, { status: 403 })
    }

    // Get the highest order_index for the target subject
    const { data: maxOrderQuest } = await supabase
      .from('quests')
      .select('order_index')
      .eq('subject_id', targetSubjectId)
      .order('order_index', { ascending: false })
      .limit(1)
      .single()

    const newOrderIndex = maxOrderQuest ? maxOrderQuest.order_index + 1 : 1

    // Create the duplicated quest
    const { data: newQuest, error: createQuestError } = await supabase
      .from('quests')
      .insert({
        title: newTitle.trim(),
        description: sourceQuest.description,
        order_index: newOrderIndex,
        difficulty: sourceQuest.difficulty,
        subject_id: targetSubjectId,
        estimated_time: sourceQuest.estimated_time,
        total_points: 0, // Will be calculated from questions
        required_quest_id: null, // Don't copy prerequisites
        required_points: sourceQuest.required_points,
        deadline: null, // Don't copy deadline
        is_active: true,
        created_by: userId
      })
      .select()
      .single()

    if (createQuestError || !newQuest) {
      console.error('Error creating duplicated quest:', createQuestError)
      return NextResponse.json({
        success: false,
        message: `Failed to create quest: ${createQuestError?.message || 'Unknown error'}`
      }, { status: 500 })
    }

    // Fetch all questions from source quest
    const { data: sourceQuestions, error: questionsError } = await supabase
      .from('questions')
      .select('*')
      .eq('quest_id', questId)
      .order('order_index', { ascending: true })

    if (questionsError) {
      console.error('Error fetching questions:', questionsError)
      // Quest created but questions failed - return partial success
      return NextResponse.json({
        success: true,
        message: 'Quest created but failed to copy questions',
        data: { questId: newQuest.id, questionsCopied: 0 }
      })
    }

    // Duplicate all questions
    let totalPoints = 0
    if (sourceQuestions && sourceQuestions.length > 0) {
      const newQuestions = sourceQuestions.map(q => ({
        quest_id: newQuest.id,
        title: q.title,
        description: q.description,
        task: q.task,
        starter_code: q.starter_code,
        hint: q.hint,
        expected_output: q.expected_output,
        solution_code: q.solution_code,
        points: q.points,
        max_attempts: q.max_attempts,
        time_limit_seconds: q.time_limit_seconds,
        order_index: q.order_index,
        difficulty: q.difficulty,
        tags: q.tags,
        is_active: q.is_active
      }))

      const { error: insertQuestionsError } = await supabase
        .from('questions')
        .insert(newQuestions)

      if (insertQuestionsError) {
        console.error('Error inserting questions:', insertQuestionsError)
        return NextResponse.json({
          success: true,
          message: 'Quest created but failed to copy some questions',
          data: { questId: newQuest.id, questionsCopied: 0 }
        })
      }

      // Calculate total points
      totalPoints = sourceQuestions.reduce((sum, q) => sum + (q.points || 0), 0)

      // Update quest total_points
      await supabase
        .from('quests')
        .update({ total_points: totalPoints })
        .eq('id', newQuest.id)
    }

    // Fetch test cases for all source questions and duplicate them
    if (sourceQuestions && sourceQuestions.length > 0) {
      const sourceQuestionIds = sourceQuestions.map(q => q.id)

      const { data: sourceTestCases } = await supabase
        .from('question_test_cases')
        .select('*')
        .in('question_id', sourceQuestionIds)

      if (sourceTestCases && sourceTestCases.length > 0) {
        // Get the new question IDs
        const { data: newQuestions } = await supabase
          .from('questions')
          .select('id, order_index')
          .eq('quest_id', newQuest.id)
          .order('order_index', { ascending: true })

        // Map old question IDs to new question IDs by order_index
        const questionIdMap = new Map()
        sourceQuestions.forEach((oldQ, index) => {
          if (newQuestions && newQuestions[index]) {
            questionIdMap.set(oldQ.id, newQuestions[index].id)
          }
        })

        // Duplicate test cases
        const newTestCases = sourceTestCases.map(tc => ({
          question_id: questionIdMap.get(tc.question_id),
          input: tc.input,
          expected_output: tc.expected_output,
          is_visible: tc.is_visible,
          order_index: tc.order_index,
          description: tc.description
        })).filter(tc => tc.question_id) // Remove any without mapped question_id

        if (newTestCases.length > 0) {
          await supabase
            .from('question_test_cases')
            .insert(newTestCases)
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Quest duplicated successfully to "${targetSubject.name}"`,
      data: {
        questId: newQuest.id,
        title: newQuest.title,
        questionsCopied: sourceQuestions?.length || 0,
        totalPoints
      }
    })

  } catch (error) {
    console.error('Quest duplication API error:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
}
