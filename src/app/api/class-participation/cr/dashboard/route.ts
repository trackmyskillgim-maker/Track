import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { getUserId } from '@/lib/session-utils'

// GET /api/class-participation/cr/dashboard - Get CR's dashboard data
export async function GET() {
  try {
    const session = await getSession()

    if (!session || session.role !== 'student') {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized - Student access required'
      }, { status: 401 })
    }

    const userId = getUserId(session)
    if (!userId) {
      return NextResponse.json({
        success: false,
        message: 'Invalid session'
      }, { status: 401 })
    }

    // Check if user is a CR for any subject
    const { data: crEnrollments } = await supabase
      .from('student_subjects')
      .select('subject_id, is_cr')
      .eq('student_id', userId)
      .eq('is_cr', true)

    if (!crEnrollments || crEnrollments.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'You are not a Course Representative for any subject'
      }, { status: 403 })
    }

    // Use RPC function to get CR dashboard data
    const { data: dashboardData, error } = await supabase
      .rpc('get_cr_dashboard', { cr_user_id: userId })

    if (error) {
      console.error('CR dashboard RPC error:', error)
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch CR dashboard data'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: dashboardData || {
        subjects: [],
        active_sessions: [],
        past_sessions: []
      }
    })

  } catch (error) {
    console.error('CR dashboard API error:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
}
