import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

// GET /api/admin/subjects/[id]/students - Get enrolled students
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'admin') {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized - Admin access required'
      }, { status: 401 })
    }

    const { id: subjectId } = params

    // Get subject details for validation
    const { data: subject } = await supabase
      .from('subjects')
      .select('batch, course, section, is_elective')
      .eq('id', subjectId)
      .single()

    // Get enrolled students with user details
    const { data: enrollments, error } = await supabase
      .from('student_subjects')
      .select(`
        id,
        student_id,
        enrolled_at,
        is_cr,
        users!inner(
          id,
          username,
          email,
          roll_number,
          batch,
          course,
          section
        )
      `)
      .eq('subject_id', subjectId)
      .order('enrolled_at', { ascending: false })

    if (error) {
      console.error('Get enrolled students error:', error)
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch enrolled students'
      }, { status: 500 })
    }

    // Format response and filter for data integrity
    // For regular subjects: only include students matching batch/course/section
    // For electives: only include students matching batch (any course/section)
    const students = (enrollments || [])
      .map(enrollment => ({
        enrollmentId: enrollment.id,
        studentId: enrollment.student_id,
        enrolledAt: enrollment.enrolled_at,
        isCr: enrollment.is_cr,
        ...(enrollment.users as any)
      }))
      .filter(student => {
        if (!subject) return true // Fallback if subject not found

        // For electives, only validate batch match
        if (subject.is_elective) {
          if (student.batch !== subject.batch) {
            console.warn(`[EnrolledStudents] Filtering out ${student.username}: batch mismatch for elective subject`)
            return false
          }
          return true
        }

        // For regular subjects, must match batch, course, and section
        if (student.batch !== subject.batch || student.course !== subject.course) {
          console.warn(`[EnrolledStudents] Filtering out ${student.username}: batch/course mismatch for regular subject`)
          return false
        }

        if (student.section !== subject.section) {
          console.warn(`[EnrolledStudents] Filtering out ${student.username}: section mismatch for regular subject`)
          return false
        }

        return true
      })

    return NextResponse.json({
      success: true,
      data: {
        students,
        total: students.length
      }
    })

  } catch (error) {
    console.error('Get students API error:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
}
