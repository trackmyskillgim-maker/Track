import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { getUserId } from '@/lib/session-utils'
import { z } from 'zod'

const toggleAutoAdvanceSchema = z.object({
  sessionId: z.string().uuid(),
  enabled: z.boolean()
})

export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { sessionId, enabled } = toggleAutoAdvanceSchema.parse(body)

    // Verify session ownership
    const { data: classSession } = await supabase
      .from('class_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('created_by', userId)
      .single()

    if (!classSession) {
      return NextResponse.json({
        success: false,
        message: 'Session not found or access denied'
      }, { status: 404 })
    }

    // Toggle auto-advance
    const { error: updateError } = await supabase
      .from('class_sessions')
      .update({ auto_advance_enabled: enabled })
      .eq('id', sessionId)

    if (updateError) {
      console.error('[ClassParticipation] Toggle error:', updateError)
      return NextResponse.json({
        success: false,
        message: 'Failed to update auto-advance setting'
      }, { status: 500 })
    }

    // If enabling auto-advance mid-session, immediately grant access to person at top of queue
    if (enabled && classSession.current_question_id) {
      const { data: topOfQueue } = await supabase
        .from('participation_queue')
        .select('*')
        .eq('session_id', sessionId)
        .eq('question_id', classSession.current_question_id)
        .eq('status', 'waiting')
        .order('position', { ascending: true })
        .limit(1)
        .single()

      if (topOfQueue) {
        // Auto-grant access to the person at position 1
        await supabase
          .from('participation_queue')
          .update({
            status: 'attempting',
            access_granted_at: new Date().toISOString()
          })
          .eq('id', topOfQueue.id)

        console.log(`[ClassParticipation] Auto-advance enabled: granted access to queue ID ${topOfQueue.id}`)
      }
    }

    return NextResponse.json({
      success: true,
      autoAdvanceEnabled: enabled
    })

  } catch (error: any) {
    console.error('[ClassParticipation] Toggle auto-advance error:', error)

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