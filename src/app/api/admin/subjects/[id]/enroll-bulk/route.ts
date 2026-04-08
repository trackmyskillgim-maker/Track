import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { parseEnrollmentCSV } from '@/lib/enrollment-csv-validator'

// POST /api/admin/subjects/[id]/enroll-bulk - Bulk enroll students via CSV
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
    const { csvContent } = body

    if (!csvContent) {
      return NextResponse.json({
        success: false,
        message: 'CSV content is required'
      }, { status: 400 })
    }

    // Parse and validate CSV
    const validationResult = await parseEnrollmentCSV(csvContent)

    if (!validationResult.valid) {
      return NextResponse.json({
        success: false,
        message: 'CSV validation failed',
        errors: validationResult.errors,
        duplicateEmails: validationResult.duplicateEmails
      }, { status: 400 })
    }

    const emails = validationResult.emails

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

    // Fetch all students matching the emails from CSV
    const { data: students, error: studentsError } = await supabase
      .from('users')
      .select('id, username, email, batch, course, section, role')
      .in('email', emails)
      .eq('role', 'student')

    if (studentsError) {
      return NextResponse.json({
        success: false,
        message: `Failed to fetch students: ${studentsError.message}`
      }, { status: 500 })
    }

    // Check which emails don't exist in database
    const foundEmails = new Set(students?.map(s => s.email.toLowerCase()) || [])
    const notFoundEmails = emails.filter(email => !foundEmails.has(email))

    if (notFoundEmails.length > 0) {
      return NextResponse.json({
        success: false,
        message: 'Some emails do not exist in the system',
        notFoundEmails
      }, { status: 400 })
    }

    if (!students || students.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No valid students found for the provided emails'
      }, { status: 404 })
    }

    // Validate student eligibility based on subject type
    const ineligibleStudents: string[] = []

    if (!subject.is_elective) {
      // Regular subjects: validate batch, course, and section match
      students.forEach(student => {
        if (student.batch !== subject.batch || student.course !== subject.course) {
          ineligibleStudents.push(`${student.username} (${student.email}) - wrong batch/course`)
        } else if (student.section !== subject.section) {
          ineligibleStudents.push(`${student.username} (${student.email}) - wrong section`)
        }
      })
    } else {
      // Electives: only validate batch match
      students.forEach(student => {
        if (student.batch !== subject.batch) {
          ineligibleStudents.push(`${student.username} (${student.email}) - not from batch ${subject.batch}`)
        }
      })
    }

    if (ineligibleStudents.length > 0) {
      return NextResponse.json({
        success: false,
        message: 'Some students are not eligible for this subject',
        ineligibleStudents
      }, { status: 400 })
    }

    // Check for existing enrollments
    const studentIds = students.map(s => s.id)
    const { data: existingEnrollments } = await supabase
      .from('student_subjects')
      .select('student_id, users!inner(email)')
      .eq('subject_id', subjectId)
      .in('student_id', studentIds)

    const alreadyEnrolledEmails = existingEnrollments?.map(e => (e.users as any).email) || []

    // Filter out already enrolled students
    const studentsToEnroll = students.filter(s =>
      !alreadyEnrolledEmails.includes(s.email)
    )

    if (studentsToEnroll.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'All students from CSV are already enrolled in this subject',
        alreadyEnrolledCount: alreadyEnrolledEmails.length
      }, { status: 409 })
    }

    // Enroll students
    const enrollments = studentsToEnroll.map(student => ({
      subject_id: subjectId,
      student_id: student.id,
      is_cr: false
    }))

    const { error: enrollError } = await supabase
      .from('student_subjects')
      .insert(enrollments)

    if (enrollError) {
      console.error('Bulk enrollment error:', enrollError)
      return NextResponse.json({
        success: false,
        message: `Failed to enroll students: ${enrollError.message}`
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Successfully enrolled ${studentsToEnroll.length} student(s)`,
      count: studentsToEnroll.length,
      skipped: alreadyEnrolledEmails.length
    })

  } catch (error) {
    console.error('Bulk enroll API error:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
}
