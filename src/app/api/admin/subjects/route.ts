import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'admin') {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized - Admin access required'
      }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const batch = searchParams.get('batch')
    const course = searchParams.get('course')
    const section = searchParams.get('section')
    const showArchived = searchParams.get('showArchived') === 'true'

    // Build query
    let query = supabase
      .from('subjects')
      .select(`
        id,
        name,
        subject_code,
        batch,
        course,
        section,
        is_elective,
        created_at,
        created_by,
        is_active
      `)
      .order('batch', { ascending: false })
      .order('course', { ascending: true })
      .order('is_elective', { ascending: true })
      .order('name', { ascending: true })

    // Filter by archive status
    if (!showArchived) {
      query = query.eq('is_active', true)
    }

    // Superadmin sees all subjects, regular admin sees only their subjects
    if (!session.is_super_admin) {
      query = query.eq('created_by', session.id)
    }

    // Apply filters
    if (batch && batch !== 'all') {
      query = query.eq('batch', batch)
    }

    if (course && course !== 'all') {
      query = query.eq('course', course)
    }

    if (section && section !== 'all') {
      query = query.eq('section', section)
    }

    const { data: subjects, error } = await query

    if (error) {
      throw new Error(`Failed to fetch subjects: ${error.message}`)
    }

    // Get enrollment counts and CR info for each subject
    const subjectsWithStats = await Promise.all(
      (subjects || []).map(async (subject) => {
        // Get enrolled students with user details for filtering
        const { data: enrollments } = await supabase
          .from('student_subjects')
          .select(`
            student_id,
            users!inner(
              id,
              username,
              email,
              batch,
              course,
              section
            )
          `)
          .eq('subject_id', subject.id)

        // Filter enrollments based on subject type
        let validEnrollments = enrollments || []

        // For regular subjects, only count students matching batch/course/section
        if (!subject.is_elective) {
          validEnrollments = validEnrollments.filter(enrollment => {
            const user = enrollment.users as any
            return (
              user.batch === subject.batch &&
              user.course === subject.course &&
              user.section === subject.section
            )
          })
        }
        // For electives, all enrolled students are valid (no filtering)

        // Get CR info (separate query, not filtered)
        const { data: crEnrollment } = await supabase
          .from('student_subjects')
          .select(`
            student_id,
            users!inner(username, email)
          `)
          .eq('subject_id', subject.id)
          .eq('is_cr', true)
          .single()

        const cr = crEnrollment ? {
          id: crEnrollment.student_id,
          username: (crEnrollment.users as any).username,
          email: (crEnrollment.users as any).email
        } : null

        return {
          ...subject,
          enrollmentCount: validEnrollments.length,
          cr
        }
      })
    )

    // Separate regular and elective subjects
    const regularSubjects = subjectsWithStats.filter(s => !s.is_elective)
    const electiveSubjects = subjectsWithStats.filter(s => s.is_elective)

    return NextResponse.json({
      success: true,
      data: {
        regularSubjects,
        electiveSubjects,
        total: subjectsWithStats.length
      }
    })

  } catch (error) {
    console.error('Subjects list API error:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
}
