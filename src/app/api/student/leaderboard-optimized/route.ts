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

    // Call the optimized RPC function
    const { data, error } = await supabase
      .rpc('get_leaderboard_optimized')

    if (error) {
      console.error('Leaderboard RPC error:', error)
      throw new Error('Failed to fetch leaderboard')
    }

    // No HTTP caching - rely on SWR for same-session performance
    return NextResponse.json(
      {
        success: true,
        data: data || { leaderboard: [] }
      },
      {
        headers: {
          'Cache-Control': 'private, no-cache, no-store, must-revalidate',
          'Vary': 'Cookie'
        }
      }
    )

  } catch (error) {
    console.error('Leaderboard API error:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
}