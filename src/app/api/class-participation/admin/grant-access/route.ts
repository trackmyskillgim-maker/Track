import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { getUserId } from '@/lib/session-utils'
import { canManageSession } from '@/lib/cr-permissions'
import { z } from 'zod'

const grantAccessSchema = z.object({
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
    const { sessionId, userId: studentUserId } = grantAccessSchema.parse(body)

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

    // Grant access to student
    const { data: updatedQueue, error } = await supabase
      .from('participation_queue')
      .update({
        status: 'attempting',
        access_granted_at: new Date().toISOString()
      })
      .eq('session_id', sessionId)
      .eq('user_id', studentUserId)
      .eq('status', 'waiting')
      .select('*')
      .single()

    if (error) {
      console.error('[ClassParticipation] Grant access error:', error)
      return NextResponse.json({
        success: false,
        message: 'Failed to grant access'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      queueEntry: updatedQueue
    })

  } catch (error: any) {
    console.error('[ClassParticipation] Grant access error:', error)

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
