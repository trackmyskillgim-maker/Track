export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const session = await getSession()
    if (!session || session.role !== 'admin') {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 })
    }

    // Get all students to extract unique values
    const { data: students, error } = await supabase
      .from('users')
      .select('batch, course, section')
      .eq('role', 'student')

    if (error) {
      throw new Error('Failed to fetch students')
    }

    // Extract unique values
    const batches = new Set<string>()
    const courses = new Set<string>()
    const sections = new Set<string>()

    students?.forEach(student => {
      if (student.batch) batches.add(student.batch)
      if (student.course) courses.add(student.course)
      if (student.section) sections.add(student.section)
    })

    return NextResponse.json({
      success: true,
      data: {
        batches: Array.from(batches).sort(),
        courses: Array.from(courses).sort(),
        sections: Array.from(sections).sort()
      }
    })

  } catch (error) {
    console.error('Filter options API error:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
}
