import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { generateSampleCSV } from '@/lib/csv-validator'

export async function GET() {
  try {
    const session = await getSession()
    if (!session || session.role !== 'admin') {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 })
    }

    const csvContent = generateSampleCSV()

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="student_import_template.csv"'
      }
    })

  } catch (error) {
    console.error('Download template API error:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
}
