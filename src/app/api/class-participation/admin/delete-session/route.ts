import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function DELETE(request: NextRequest) {
  try {
    // Verify authentication
    const session = await getSession()
    if (!session || session.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized - Admin access required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json(
        { success: false, message: 'Session ID is required' },
        { status: 400 }
      )
    }

    // First, check if the session exists and get its status
    const { data: sessionRecord, error: fetchError } = await supabase
      .from('class_sessions')
      .select('id, status, topic')
      .eq('id', sessionId)
      .single()

    if (fetchError || !sessionRecord) {
      return NextResponse.json(
        { success: false, message: 'Session not found' },
        { status: 404 }
      )
    }

    // Prevent deletion of active sessions
    if (sessionRecord.status === 'active') {
      return NextResponse.json(
        {
          success: false,
          message: 'Cannot delete an active session. Please end the session first.'
        },
        { status: 400 }
      )
    }

    // Delete the session (CASCADE will handle related records)
    const { error: deleteError } = await supabase
      .from('class_sessions')
      .delete()
      .eq('id', sessionId)

    if (deleteError) {
      console.error('Error deleting session:', deleteError)
      return NextResponse.json(
        { success: false, message: 'Failed to delete session' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Session "${sessionRecord.topic}" and all related data deleted successfully`
    })

  } catch (error) {
    console.error('Delete session error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
