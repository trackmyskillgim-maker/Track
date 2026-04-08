import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

const MAX_SUBMISSIONS_PER_HOUR = 5

export async function GET() {
  try {
    const session = await getSession()
    if (!session || (session.role !== 'student' && session.role !== 'admin')) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 })
    }

    // Get successful submissions in the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

    const { data: recentSubmissions, error } = await supabase
      .from('attempt_logs')
      .select('id, submitted_at')
      .eq('user_id', session.id)
      .eq('is_correct', true)
      .eq('attempt_type', 'submission')
      .gte('submitted_at', oneHourAgo)
      .order('submitted_at', { ascending: false })

    if (error) {
      console.error('Rate limit check error:', error)
      return NextResponse.json({
        success: false,
        message: 'Failed to check rate limit'
      }, { status: 500 })
    }

    const submissionsCount = recentSubmissions?.length || 0
    const remainingSubmissions = Math.max(0, MAX_SUBMISSIONS_PER_HOUR - submissionsCount)
    const isLimitReached = submissionsCount >= MAX_SUBMISSIONS_PER_HOUR

    // Calculate time until next available submission
    let timeUntilReset = 0
    if (isLimitReached && recentSubmissions && recentSubmissions.length > 0) {
      // Find the oldest submission in the window
      const oldestSubmission = recentSubmissions[recentSubmissions.length - 1]
      const oldestTime = new Date(oldestSubmission.submitted_at).getTime()
      const resetTime = oldestTime + 60 * 60 * 1000 // One hour from oldest
      timeUntilReset = Math.max(0, Math.ceil((resetTime - Date.now()) / 1000)) // Seconds
    }

    return NextResponse.json({
      success: true,
      data: {
        submissionsCount,
        maxSubmissions: MAX_SUBMISSIONS_PER_HOUR,
        remainingSubmissions,
        isLimitReached,
        timeUntilResetSeconds: timeUntilReset,
        recentSubmissions: recentSubmissions?.map(s => s.submitted_at) || []
      }
    })

  } catch (error) {
    console.error('Rate limit API error:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
}
