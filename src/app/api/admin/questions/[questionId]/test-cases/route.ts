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

    // Allow both admin and student access for test cases (students need it for Pyodide execution)
    if (!session || (session.role !== 'admin' && session.role !== 'student')) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 })
    }

    const { questionId } = params
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format')

    // Get test cases for this question (including new test_script column)
    const { data: testCases, error } = await supabase
      .from('question_test_cases')
      .select('*')
      .eq('question_id', questionId)
      .order('order_index', { ascending: true })

    if (error) {
      throw error
    }

    // Return raw format for admin forms
    if (format === 'raw') {
      return NextResponse.json({
        success: true,
        data: testCases || []
      })
    }

    // Transform for client-side Pyodide execution - PURE AI SCRIPT FORMAT
    const mvpTestCases = testCases?.map(tc => {
      return {
        id: tc.id,
        testScript: tc.test_script || '', // AI-generated test script
        description: tc.description,
        is_visible: tc.is_visible,
        order_index: tc.order_index
      }
    }) || []

    return NextResponse.json({
      success: true,
      data: mvpTestCases
    })

  } catch (error) {
    console.error('Get test cases API error:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
}
