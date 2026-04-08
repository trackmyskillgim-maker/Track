import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { parseCSV, StudentCSVRow } from '@/lib/csv-validator'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'admin') {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 })
    }

    const body = await request.json()
    const { csvContent } = body

    if (!csvContent || typeof csvContent !== 'string') {
      return NextResponse.json({
        success: false,
        message: 'Missing CSV content'
      }, { status: 400 })
    }

    // Parse and validate CSV
    const validationResult = await parseCSV(csvContent)

    if (!validationResult.valid) {
      return NextResponse.json({
        success: false,
        message: 'CSV validation failed',
        errors: validationResult.errors,
        duplicateEmails: validationResult.duplicateEmails
      }, { status: 400 })
    }

    // Check for existing emails in database
    const emails = validationResult.data.map(row => row.email)
    const { data: existingUsers, error: checkError } = await supabase
      .from('users')
      .select('email')
      .in('email', emails)

    if (checkError) {
      throw new Error(`Failed to check existing emails: ${checkError.message}`)
    }

    if (existingUsers && existingUsers.length > 0) {
      const existingEmails = existingUsers.map(u => u.email)
      return NextResponse.json({
        success: false,
        message: 'Some email addresses already exist in the database',
        existingEmails,
        errors: existingEmails.map(email => ({
          field: 'email',
          message: 'Email already exists',
          value: email
        }))
      }, { status: 400 })
    }

    // Course to department mapping
    const courseToDepartment: Record<string, string> = {
      'PGDM': 'Business Administration',
      'BDA': 'Data Analytics',
      'HCM': 'Healthcare Management',
      'BIFS': 'Finance and Investment'
    }

    // Transform CSV data to database format
    const studentsToInsert = validationResult.data.map((row: StudentCSVRow) => ({
      username: row.name,
      email: row.email,
      password_hash: row.password, // Plain text stored in password_hash column
      role: 'student',
      batch: row.batch,
      course: row.course,
      section: row.section,
      roll_number: row.roll_number,
      department: courseToDepartment[row.course] || row.course,
      year: null, // DEPRECATED field, set to null
      created_at: new Date().toISOString()
    }))

    // Insert all students in a single transaction
    const { data: insertedStudents, error: insertError } = await supabase
      .from('users')
      .insert(studentsToInsert)
      .select()

    if (insertError) {
      throw new Error(`Failed to insert students: ${insertError.message}`)
    }

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${insertedStudents?.length || 0} students`,
      count: insertedStudents?.length || 0,
      data: insertedStudents
    })

  } catch (error) {
    console.error('Bulk import API error:', error)
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 })
  }
}
