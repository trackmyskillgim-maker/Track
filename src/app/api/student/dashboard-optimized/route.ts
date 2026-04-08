import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const session = await getSession()
    if (!session || (session.role !== 'student' && session.role !== 'admin')) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 })
    }

    // Call the optimized RPC function - single database call
    const { data, error } = await supabase
      .rpc('get_student_dashboard_optimized', { p_user_id: session.id })

    if (error) {
      console.error('Dashboard RPC error:', error)
      throw new Error('Failed to fetch dashboard data')
    }

    // No caching - each user must get fresh data
    return NextResponse.json(
      {
        success: true,
        data
      },
      {
        headers: {
          'Cache-Control': 'private, no-cache, no-store, must-revalidate',
          'Vary': 'Cookie'
        }
      }
    )

  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
}