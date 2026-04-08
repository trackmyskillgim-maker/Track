export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: { questionId: string } }
) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'admin') {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 })
    }

    const { questionId } = params

    const { data: question, error } = await supabase
      .from('questions')
      .select('*')
      .eq('id', questionId)
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      data: question
    })

  } catch (error) {
    console.error('Get question API error:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { questionId: string } }
) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'admin') {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 })
    }

    const { questionId } = params
    const body = await request.json()
    const { test_cases, ...questionData } = body

    // Validate test cases if provided
    if (test_cases && (!Array.isArray(test_cases) || test_cases.length < 2)) {
      return NextResponse.json({
        success: false,
        message: 'At least 2 test cases are required'
      }, { status: 400 })
    }

    // Validate that test_script is not empty for each test case
    if (test_cases) {
      const invalidTestCases = test_cases.filter((tc: any) => !tc.test_script || !tc.test_script.trim())
      if (invalidTestCases.length > 0) {
        return NextResponse.json({
          success: false,
          message: 'All test cases must have a non-empty test script'
        }, { status: 400 })
      }
    }

    // Update question
    const { data: question, error } = await supabase
      .from('questions')
      .update({
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
        difficulty: questionData.difficulty || 'Easy',
        tags: questionData.tags || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', questionId)
      .select()
      .single()

    if (error) {
      throw error
    }

    // Update test cases if provided
    if (test_cases) {
      // Delete existing test cases
      const { error: deleteError } = await supabase
        .from('question_test_cases')
        .delete()
        .eq('question_id', questionId)

      if (deleteError) {
        throw new Error(`Failed to delete existing test cases: ${deleteError.message}`)
      }

      // Create new AI test scripts (with legacy column compatibility)
      const testCasesToInsert = test_cases.map((testCase: any, index: number) => ({
        question_id: questionId,
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
        throw new Error(`Failed to create test cases: ${testCaseError.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      data: question,
      message: 'Question updated successfully'
    })

  } catch (error) {
    console.error('Update question API error:', error)
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { questionId: string } }
) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'admin') {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 })
    }

    const { questionId } = params

    // Soft delete by setting is_active to false
    const { error } = await supabase
      .from('questions')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', questionId)

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      message: 'Question deleted successfully'
    })

  } catch (error) {
    console.error('Delete question API error:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
}
