import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

/**
 * GET /api/admin/subjects/my-subjects
 * Fetches all subjects created by the logged-in admin for use in dropdowns
 * Used in: Quest creation, Session creation, etc.
 */
export async function GET() {
  try {
    const session = await getSession()
    if (!session || session.role !== 'admin') {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized - Admin access required'
      }, { status: 401 })
    }

    // Fetch subjects: ALL for superadmin, only created_by for regular admin
    let query = supabase
      .from('subjects')
      .select(`
        id,
        name,
        subject_code,
        batch,
        course,
        section,
        is_elective
      `)
      .eq('is_active', true)
      .order('name', { ascending: true })

    // Regular admin: only show subjects they created
    // Superadmin: show all subjects
    if (!session.is_super_admin) {
      query = query.eq('created_by', session.id)
    }

    const { data: subjects, error } = await query

    if (error) {
      console.error('[MySubjects] Fetch error:', error)
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch subjects'
      }, { status: 500 })
    }

    // Separate regular and elective subjects for better UI organization
    const regularSubjects = subjects?.filter(s => !s.is_elective) || []
    const electiveSubjects = subjects?.filter(s => s.is_elective) || []

    return NextResponse.json({
      success: true,
      data: {
        subjects: subjects || [],
        regularSubjects,
        electiveSubjects
      }
    })

  } catch (error: any) {
    console.error('[MySubjects] Error:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
}
