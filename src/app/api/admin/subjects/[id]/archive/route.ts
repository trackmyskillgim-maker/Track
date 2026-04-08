import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { getUserId } from '@/lib/session-utils'

export async function PATCH(
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

    const userId = getUserId(session)
    if (!userId) {
      return NextResponse.json({
        success: false,
        message: 'Invalid session'
      }, { status: 401 })
    }

    const { id } = params
    const body = await request.json()
    const { archived } = body

    if (typeof archived !== 'boolean') {
      return NextResponse.json({
        success: false,
        message: 'Invalid request: archived must be boolean'
      }, { status: 400 })
    }

    // Check if subject exists and user has permission
    const { data: subject } = await supabase
      .from('subjects')
      .select('id, name, created_by')
      .eq('id', id)
      .single()

    if (!subject) {
      return NextResponse.json({
        success: false,
        message: 'Subject not found'
      }, { status: 404 })
    }

    // Super admin can archive any subject, regular admin only their own
    const isSuperAdmin = session.is_super_admin === true
    if (!isSuperAdmin && subject.created_by !== userId) {
      return NextResponse.json({
        success: false,
        message: 'You can only archive subjects you created'
      }, { status: 403 })
    }

    // Update is_active status (archived = !is_active)
    const { error: updateError } = await supabase
      .from('subjects')
      .update({ is_active: !archived })
      .eq('id', id)

    if (updateError) {
      console.error('Error updating subject:', updateError)
      return NextResponse.json({
        success: false,
        message: `Failed to update subject: ${updateError.message}`
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: archived ? 'Subject archived successfully' : 'Subject unarchived successfully'
    })

  } catch (error) {
    console.error('Subject archive API error:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
}
