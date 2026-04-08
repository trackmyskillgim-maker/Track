import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { getUserId } from '@/lib/session-utils'

// GET /api/student/is-cr - Check if student is CR for any subject
export async function GET() {
  try {
    const session = await getSession()

    if (!session || session.role !== 'student') {
      return NextResponse.json({
        success: true,
        isCR: false
      })
    }

    const userId = getUserId(session)
    if (!userId) {
      return NextResponse.json({
        success: true,
        isCR: false
      })
    }

    // Check if user is a CR for any subject
    const { data: crEnrollments } = await supabase
      .from('student_subjects')
      .select('subject_id, is_cr, subjects(name)')
      .eq('student_id', userId)
      .eq('is_cr', true)

    return NextResponse.json({
      success: true,
      isCR: crEnrollments && crEnrollments.length > 0,
      crSubjects: crEnrollments || []
    })

  } catch (error) {
    console.error('Check CR status error:', error)
    return NextResponse.json({
      success: true,
      isCR: false
    })
  }
}
