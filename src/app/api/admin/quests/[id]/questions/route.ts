import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'admin') {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 })
    }

    const { id: questId } = params

    // Get all questions for this quest
    const { data: questions, error } = await supabase
      .from('questions')
      .select('*')
      .eq('quest_id', questId)
      .eq('is_active', true)
      .order('order_index', { ascending: true })

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      data: questions || []
    })

  } catch (error) {
    console.error('Get questions API error:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'admin') {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 })
    }

    const { id: questId } = params
    const body = await request.json()
    const { test_cases, ...questionData } = body

    // Validate test cases
    if (!test_cases || !Array.isArray(test_cases) || test_cases.length < 2) {
      return NextResponse.json({
        success: false,
        message: 'At least 2 test cases are required'
      }, { status: 400 })
    }

    // Validate that test_script is not empty for each test case
    const invalidTestCases = test_cases.filter((tc: any) => !tc.test_script || !tc.test_script.trim())
    if (invalidTestCases.length > 0) {
      return NextResponse.json({
        success: false,
        message: 'All test cases must have a non-empty test script'
      }, { status: 400 })
    }

    // Check if quest exists and is active
    const { data: quest, error: questError } = await supabase
      .from('quests')
      .select('id, is_active')
      .eq('id', questId)
      .single()

    if (questError || !quest) {
      return NextResponse.json({
        success: false,
        message: 'Quest not found'
      }, { status: 404 })
    }

    if (!quest.is_active) {
      return NextResponse.json({
        success: false,
        message: 'Cannot create questions in an archived quest. Please restore the quest first.'
      }, { status: 400 })
    }

    // Get the maximum order_index from ALL questions in this quest (active and inactive) to avoid duplicates
    const { data: maxOrderData, error: maxOrderError } = await supabase
      .from('questions')
      .select('order_index')
      .eq('quest_id', questId)
      .order('order_index', { ascending: false })
      .limit(1)

    if (maxOrderError) {
      throw new Error(`Failed to get max order index: ${maxOrderError.message}`)
    }

    const nextOrderIndex = (maxOrderData?.[0]?.order_index || 0) + 1

    // Create new question
    const { data: question, error } = await supabase
      .from('questions')
      .insert([{
        quest_id: questId,
        title: questionData.title,
        description: questionData.description,
        task: questionData.task,
        starter_code: questionData.starter_code || null,
        hint: questionData.hint || null,
        expected_output: questionData.expected_output,
        function_name: questionData.function_name || null,
        solution_code: questionData.solution_code || null,
        points: questionData.points || 10,
        max_attempts: questionData.max_attempts || 3,
        time_limit_seconds: questionData.time_limit_seconds || 300,
        order_index: nextOrderIndex,
        difficulty: questionData.difficulty || 'Easy',
        tags: questionData.tags || null,
        is_active: true
      }])
      .select()
      .single()

    if (error) {
      throw error
    }

    // Create AI test scripts (with legacy column compatibility)
    const testCasesToInsert = test_cases.map((testCase: any, index: number) => ({
      question_id: question.id,
      test_script: testCase.test_script,
      // Legacy columns (required during transition - always provide defaults)
      input: 'AI_SCRIPT', // Always provide default for AI script questions
      expected_output: 'AI_SCRIPT_RESULT', // Always provide default for AI script questions
      is_visible: testCase.is_visible || false,
      order_index: index + 1,
      description: testCase.description || null
    }))

    const { error: testCaseError } = await supabase
      .from('question_test_cases')
      .insert(testCasesToInsert)

    if (testCaseError) {
      // If test case creation fails, we should clean up the question
      await supabase
        .from('questions')
        .delete()
        .eq('id', question.id)

      throw new Error(`Failed to create test cases: ${testCaseError.message}`)
    }

    return NextResponse.json({
      success: true,
      data: question,
      message: 'Question and test cases created successfully'
    })

  } catch (error) {
    console.error('Create question API error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return NextResponse.json({
      success: false,
      message: `Failed to create question: ${errorMessage}`
    }, { status: 500 })
  }
}