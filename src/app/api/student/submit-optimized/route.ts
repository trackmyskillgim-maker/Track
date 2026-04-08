import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || (session.role !== 'student' && session.role !== 'admin')) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 })
    }

    const body = await request.json()
    const { questionId, code, isCorrect } = body

    if (!questionId || !code || typeof isCorrect !== 'boolean') {
      return NextResponse.json({
        success: false,
        message: 'Missing required fields'
      }, { status: 400 })
    }

    // Call the optimized RPC function - handles everything in one database call
    const { data, error } = await supabase
      .rpc('submit_question_optimized', {
        p_user_id: session.id,
        p_question_id: questionId,
        p_code: code,
        p_is_correct: isCorrect
      })

    if (error) {
      console.error('Submit RPC error:', error)
      return NextResponse.json({
        success: false,
        message: 'Submission failed'
      }, { status: 500 })
    }

    // The RPC function returns the complete response
    if (!data?.success) {
      return NextResponse.json(data || {
        success: false,
        message: 'Submission failed'
      }, { status: 400 })
    }

    return NextResponse.json(data)

  } catch (error) {
    console.error('Submit API error:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
}