import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function POST(
  request: NextRequest,
  { params }: { params: { studentId: string } }
) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'admin') {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 })
    }

    const { studentId } = params

    // Reset user progress
    const { error: progressError } = await supabase
      .from('user_progress')
      .delete()
      .eq('user_id', studentId)

    if (progressError) {
      throw new Error(`Failed to reset user progress: ${progressError.message}`)
    }

    // Reset quest progress
    const { error: questProgressError } = await supabase
      .from('quest_progress')
      .delete()
      .eq('user_id', studentId)

    if (questProgressError) {
      throw new Error(`Failed to reset quest progress: ${questProgressError.message}`)
    }

    // Reset user stats
    const { error: userError } = await supabase
      .from('users')
      .update({
        total_points: 0,
        current_level: 1,
        current_streak: 0,
        max_streak: 0
      })
      .eq('id', studentId)

    if (userError) {
      throw new Error(`Failed to reset user stats: ${userError.message}`)
    }

    return NextResponse.json({
      success: true,
      message: 'Student progress reset successfully'
    })

  } catch (error) {
    console.error('Reset student progress API error:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
}