import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { z } from 'zod'

// Validation schema
const enrollSchema = z.object({
  student_ids: z.array(z.string().uuid()).min(1, 'At least one student is required')
})

// POST /api/admin/subjects/[id]/enroll - Enroll students in subject
export async function POST(
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
    const body = await request.json()

    // Validate input
    const validationResult = enrollSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
        message: 'Invalid input',
        errors: validationResult.error.errors
      }, { status: 400 })
    }

    const { student_ids } = validationResult.data

    // Verify subject exists
    const { data: subject, error: subjectError } = await supabase
      .from('subjects')
      .select('id, name, batch, course, section, is_elective')
      .eq('id', subjectId)
      .single()

    if (subjectError || !subject) {
      return NextResponse.json({
        success: false,
        message: 'Subject not found'
      }, { status: 404 })
    }

    // Verify all students exist and match subject criteria
    const { data: students, error: studentsError } = await supabase
      .from('users')
      .select('id, username, batch, course, section, role')
      .in('id', student_ids)
      .eq('role', 'student')

    if (studentsError || !students || students.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No valid students found'
      }, { status: 404 })
    }

    // Validate student eligibility based on subject type
    if (!subject.is_elective) {
      // Regular subjects: validate batch, course, and section match
      const invalidStudents: string[] = []
      students.forEach(student => {
        if (student.batch !== subject.batch || student.course !== subject.course) {
          invalidStudents.push(student.username)
        }
      })

      if (invalidStudents.length > 0) {
        return NextResponse.json({
          success: false,
          message: `Students ${invalidStudents.join(', ')} do not match subject batch/course for this regular subject`
        }, { status: 400 })
      }

      // Validate section match for regular subjects
      const wrongSectionStudents = students.filter(s => s.section !== subject.section)
      if (wrongSectionStudents.length > 0) {
        return NextResponse.json({
          success: false,
          message: `Students must be from section ${subject.section} for this regular subject`
        }, { status: 400 })
      }
    } else {
      // Electives: only validate batch match (any course, any section allowed)
      const wrongBatchStudents = students.filter(s => s.batch !== subject.batch)
      if (wrongBatchStudents.length > 0) {
        return NextResponse.json({
          success: false,
          message: `Students ${wrongBatchStudents.map(s => s.username).join(', ')} are not from batch ${subject.batch}`
        }, { status: 400 })
      }
    }

    // Check for existing enrollments
    const { data: existingEnrollments } = await supabase
      .from('student_subjects')
      .select('student_id')
      .eq('subject_id', subjectId)
      .in('student_id', student_ids)

    const alreadyEnrolledIds = existingEnrollments?.map(e => e.student_id) || []

    // Filter out already enrolled students
    const studentsToEnroll = student_ids.filter(id => !alreadyEnrolledIds.includes(id))

    if (studentsToEnroll.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'All selected students are already enrolled in this subject'
      }, { status: 409 })
    }

    // Enroll students
    const enrollments = studentsToEnroll.map(student_id => ({
      subject_id: subjectId,
      student_id,
      is_cr: false
    }))

    const { error: enrollError } = await supabase
      .from('student_subjects')
      .insert(enrollments)

    if (enrollError) {
      console.error('Enrollment error:', enrollError)
      return NextResponse.json({
        success: false,
        message: `Failed to enroll students: ${enrollError.message}`
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Successfully enrolled ${studentsToEnroll.length} student(s)`,
      data: {
        enrolled: studentsToEnroll.length,
        skipped: alreadyEnrolledIds.length
      }
    })

  } catch (error) {
    console.error('Enroll students API error:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
}
