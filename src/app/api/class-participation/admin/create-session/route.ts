import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { getUserId } from '@/lib/session-utils'
import { z } from 'zod'

const createSessionSchema = z.object({
  topic: z.string().min(1).max(255),
  description: z.string().max(1000).optional(), // Optional additional context for AI
  difficulty: z.enum(['Easy', 'Medium', 'Hard']),
  batch: z.string().min(1), // Now accepting batch instead of year
  course: z.enum(['PGDM', 'BDA', 'BIFS', 'HCM']),
  section: z.enum(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']),
  subject_id: z.string().uuid().optional() // Optional for backward compatibility
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
      console.error('[ClassParticipation] Session has no user ID!', session)
      return NextResponse.json({
        success: false,
        message: 'Invalid session - missing user ID'
      }, { status: 401 })
    }

    const body = await request.json()
    const { topic, description, difficulty, batch, course, section, subject_id } = createSessionSchema.parse(body)

    // Auto-close any existing active sessions for this class to prevent confusion
    await supabase
      .from('class_sessions')
      .update({
        status: 'closed',
        ended_at: new Date().toISOString()
      })
      .eq('year', batch) // year column stores batch value
      .eq('course', course)
      .eq('section', section)
      .eq('status', 'active')
      .eq('created_by', userId)

    // Create session
    const { data: newSession, error } = await supabase
      .from('class_sessions')
      .insert({
        topic,
        description: description || null, // Optional context for AI question generation
        difficulty,
        year: batch, // Store batch in year column (column name remains for backward compatibility)
        course,
        section,
        subject_id: subject_id || null, // Link to subject if provided
        created_by: userId,
        status: 'draft',
        auto_advance_enabled: false
      })
      .select('*')
      .single()

    if (error) {
      console.error('[ClassParticipation] Session creation error:', error)
      return NextResponse.json({
        success: false,
        message: 'Failed to create session'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      session: newSession
    })

  } catch (error: any) {
    console.error('[ClassParticipation] Create session error:', error)

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