import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { getUserId } from '@/lib/session-utils'
import { generateQuestion } from '@/lib/gemini'
import { z } from 'zod'

const generateQuestionSchema = z.object({
  sessionId: z.string().uuid(),
  topic: z.string().min(1).max(255).optional(), // Optional for regenerate
  difficulty: z.enum(['Easy', 'Medium', 'Hard']).optional(), // Optional for regenerate
  description: z.string().optional() // Optional custom description
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
    const { sessionId, topic, difficulty, description } = generateQuestionSchema.parse(body)

    // Get session details
    const { data: classSession, error: sessionError } = await supabase
      .from('class_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('created_by', userId)
      .single()

    if (sessionError || !classSession) {
      return NextResponse.json({
        success: false,
        message: 'Session not found or access denied'
      }, { status: 404 })
    }

    // Use provided topic/difficulty/description or fallback to session values
    const questionTopic = topic || classSession.topic
    const questionDifficulty = difficulty || classSession.difficulty
    const questionDescription = description !== undefined ? description : (classSession.description || undefined)

    // Generate question using Gemini (with optional description for better context)
    const result = await generateQuestion(questionTopic, questionDifficulty, questionDescription)

    if (!result.success) {
      return NextResponse.json({
        success: false,
        message: result.error || 'Failed to generate question'
      }, { status: 500 })
    }

    // Delete any existing draft questions for this session
    await supabase
      .from('session_questions')
      .delete()
      .eq('session_id', sessionId)
      .eq('is_published', false)

    // Calculate next order_index based on ALL questions (published or draft)
    const { data: allQuestions } = await supabase
      .from('session_questions')
      .select('order_index')
      .eq('session_id', sessionId)
      .order('order_index', { ascending: false })
      .limit(1)

    const nextOrderIndex = allQuestions && allQuestions.length > 0
      ? allQuestions[0].order_index + 1
      : 1

    // Save generated question with correct order_index
    const { data: questionData, error: questionError } = await supabase
      .from('session_questions')
      .insert({
        session_id: sessionId,
        question_text: result.question,
        difficulty: questionDifficulty,
        is_published: false,
        status: 'draft',
        order_index: nextOrderIndex
      })
      .select('*')
      .single()

    if (questionError) {
      console.error('[ClassParticipation] Question save error:', questionError)
      return NextResponse.json({
        success: false,
        message: 'Failed to save generated question'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      question: questionData
    })

  } catch (error: any) {
    console.error('[ClassParticipation] Generate question error:', error)

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