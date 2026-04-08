import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'admin') {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const batch = searchParams.get('batch')

    if (!batch) {
      return NextResponse.json({
        success: false,
        message: 'Batch parameter is required'
      }, { status: 400 })
    }

    // Fetch all students for the specified batch
    const { data: students, error } = await supabase
      .from('users')
      .select('username, email, password_hash, batch, course, section, roll_number')
      .eq('role', 'student')
      .eq('batch', batch)
      .order('roll_number', { ascending: true })

    if (error) {
      throw new Error(`Failed to fetch students: ${error.message}`)
    }

    if (!students || students.length === 0) {
      return NextResponse.json({
        success: false,
        message: `No students found for batch ${batch}`
      }, { status: 404 })
    }

    // Generate CSV content
    const headers = ['name', 'email', 'password', 'batch', 'course', 'section', 'roll_number']
    const csvRows = [
      headers.join(','),
      ...students.map((student: any) => [
        student.username,
        student.email,
        student.password_hash,
        student.batch,
        student.course,
        student.section,
        student.roll_number
      ].join(','))
    ]

    const csvContent = csvRows.join('\n')
    const filename = `batch_${batch}_credentials.csv`

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    })

  } catch (error) {
    console.error('Export batch API error:', error)
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 })
  }
}
