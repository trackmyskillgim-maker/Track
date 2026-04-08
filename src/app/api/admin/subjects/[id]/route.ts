import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

// GET /api/admin/subjects/[id] - Get single subject with details
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

    const { id } = params

    // Get subject
    const { data: subject, error: subjectError } = await supabase
      .from('subjects')
      .select('*')
      .eq('id', id)
      .single()

    if (subjectError || !subject) {
      return NextResponse.json({
        success: false,
        message: 'Subject not found'
      }, { status: 404 })
    }

    // Get enrollment count
    const { count: enrollmentCount } = await supabase
      .from('student_subjects')
      .select('*', { count: 'exact', head: true })
      .eq('subject_id', id)

    // Get CR info
    const { data: crEnrollment } = await supabase
      .from('student_subjects')
      .select(`
        student_id,
        users!inner(id, username, email, batch, course, section)
      `)
      .eq('subject_id', id)
      .eq('is_cr', true)
      .single()

    return NextResponse.json({
      success: true,
      data: {
        ...subject,
        enrollmentCount: enrollmentCount || 0,
        cr: crEnrollment ? {
          id: crEnrollment.student_id,
          ...(crEnrollment.users as any)
        } : null
      }
    })

  } catch (error) {
    console.error('Get subject API error:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
}
