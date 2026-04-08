import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

// GET /api/admin/subjects/available - Get available subjects for session creation
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

    if (!batch || !course || !section) {
      return NextResponse.json({
        success: false,
        message: 'Batch, course, and section are required'
      }, { status: 400 })
    }

    // Get regular subjects for this batch/course/section
    const { data: regularSubjects, error: regularError } = await supabase
      .from('subjects')
      .select('id, name, subject_code, is_elective')
      .eq('batch', batch)
      .eq('course', course)
      .eq('section', section)
      .eq('is_elective', false)
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (regularError) {
      console.error('Regular subjects fetch error:', regularError)
    }

    // Get elective subjects for this batch (any course - electives are batch-wide)
    const { data: electiveSubjects, error: electiveError } = await supabase
      .from('subjects')
      .select('id, name, subject_code, is_elective')
      .eq('batch', batch)
      .is('section', null)
      .eq('is_elective', true)
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (electiveError) {
      console.error('Elective subjects fetch error:', electiveError)
    }

    // Combine both lists
    const allSubjects = [
      ...(regularSubjects || []),
      ...(electiveSubjects || [])
    ]

    return NextResponse.json({
      success: true,
      data: {
        subjects: allSubjects,
        total: allSubjects.length
      }
    })

  } catch (error) {
    console.error('Available subjects API error:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
}
