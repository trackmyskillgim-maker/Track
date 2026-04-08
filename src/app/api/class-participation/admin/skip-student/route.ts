import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { getUserId } from '@/lib/session-utils'
import { canManageSession } from '@/lib/cr-permissions'
import { z } from 'zod'

const skipStudentSchema = z.object({
  sessionId: z.string().uuid(),
  userId: z.string().uuid()
})

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized - Authentication required'
      }, { status: 401 })
    }

    const currentUserId = getUserId(session)
    if (!currentUserId) {
      return NextResponse.json({
        success: false,
        message: 'Invalid session'
      }, { status: 401 })
    }

    const body = await request.json()
    const { sessionId, userId: studentUserId } = skipStudentSchema.parse(body)

    // Check if user can manage this session (admin creator OR CR for subject)
    const { canManage, reason } = await canManageSession(
      currentUserId,
      session.role,
      sessionId
    )

    if (!canManage) {
      return NextResponse.json({
        success: false,
        message: reason || 'Not authorized to manage this session'
      }, { status: 403 })
    }

    // Get session details for auto-advance check
    const { data: classSession } = await supabase
      .from('class_sessions')
      .select('auto_advance_enabled')
      .eq('id', sessionId)
      .single()

    if (!classSession) {
      return NextResponse.json({
        success: false,
        message: 'Session not found'
      }, { status: 404 })
    }

    // Mark student as skipped
    const { error: skipError } = await supabase
      .from('participation_queue')
      .update({ status: 'skipped' })
      .eq('session_id', sessionId)
      .eq('user_id', studentUserId)

    if (skipError) {
      console.error('[ClassParticipation] Skip error:', skipError)
      return NextResponse.json({
        success: false,
        message: 'Failed to skip student'
      }, { status: 500 })
    }

    // If auto-advance enabled, grant access to next student
    if (classSession.auto_advance_enabled) {
      const { data: nextStudent } = await supabase
        .rpc('get_next_student_in_queue', { p_session_id: sessionId })

      if (nextStudent) {
        await supabase
          .from('participation_queue')
          .update({
            status: 'attempting',
            access_granted_at: new Date().toISOString()
          })
          .eq('session_id', sessionId)
          .eq('user_id', nextStudent)
          .eq('status', 'waiting')
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Student skipped successfully'
    })

  } catch (error: any) {
    console.error('[ClassParticipation] Skip student error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        message: 'Invalid input data',
        errors: error.errors
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
}
