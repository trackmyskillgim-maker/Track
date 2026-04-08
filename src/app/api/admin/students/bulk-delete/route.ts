import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const user = await getSession()
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { studentIds } = body

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Student IDs are required' },
        { status: 400 }
      )
    }

    // Safety check: limit bulk delete to reasonable number
    if (studentIds.length > 1000) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete more than 1000 students at once' },
        { status: 400 }
      )
    }

    // Delete in a transaction-like manner
    // 1. Delete user_achievements
    const { error: achievementsError } = await supabase
      .from('user_achievements')
      .delete()
      .in('user_id', studentIds)

    if (achievementsError && achievementsError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error deleting achievements:', achievementsError)
      // Continue anyway as this is not critical
    }

    // 2. Delete attempt_logs (student submissions and attempts)
    const { error: attemptsError } = await supabase
      .from('attempt_logs')
      .delete()
      .in('student_id', studentIds)

    if (attemptsError && attemptsError.code !== 'PGRST116') {
      console.error('Error deleting attempt logs:', attemptsError)
      return NextResponse.json(
        { success: false, error: 'Failed to delete student attempt logs' },
        { status: 500 }
      )
    }

    // 3. Delete user_progress
    const { error: progressError } = await supabase
      .from('user_progress')
      .delete()
      .in('student_id', studentIds)

    if (progressError && progressError.code !== 'PGRST116') {
      console.error('Error deleting user progress:', progressError)
      return NextResponse.json(
        { success: false, error: 'Failed to delete student progress' },
        { status: 500 }
      )
    }

    // 4. Delete sessions
    const { error: sessionsError } = await supabase
      .from('sessions')
      .delete()
      .in('user_id', studentIds)

    if (sessionsError && sessionsError.code !== 'PGRST116') {
      console.error('Error deleting sessions:', sessionsError)
      // Continue anyway as sessions will expire
    }

    // 5. Delete class participation queue entries
    const { error: queueError } = await supabase
      .from('class_participation_queue')
      .delete()
      .in('student_id', studentIds)

    if (queueError && queueError.code !== 'PGRST116') {
      console.error('Error deleting queue entries:', queueError)
      // Continue anyway
    }

    // 6. Delete class participation submissions
    const { error: cpSubmissionsError } = await supabase
      .from('class_participation_submissions')
      .delete()
      .in('student_id', studentIds)

    if (cpSubmissionsError && cpSubmissionsError.code !== 'PGRST116') {
      console.error('Error deleting CP submissions:', cpSubmissionsError)
      // Continue anyway
    }

    // 7. Delete class participation sessions (if student was session creator)
    const { error: cpSessionsError } = await supabase
      .from('class_participation_sessions')
      .delete()
      .in('created_by', studentIds)

    if (cpSessionsError && cpSessionsError.code !== 'PGRST116') {
      console.error('Error deleting CP sessions:', cpSessionsError)
      // Continue anyway
    }

    // 8. Finally, delete the users themselves
    const { error: usersError, count } = await supabase
      .from('users')
      .delete()
      .in('id', studentIds)
      .eq('role', 'student') // Safety check: only delete students

    if (usersError) {
      console.error('Error deleting users:', usersError)
      return NextResponse.json(
        { success: false, error: 'Failed to delete students' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${count || studentIds.length} student(s) and all associated data`,
      deletedCount: count || studentIds.length
    })

  } catch (error: any) {
    console.error('Bulk delete error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
