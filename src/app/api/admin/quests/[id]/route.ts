import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { recalculateQuestPrerequisites } from '@/lib/quest-prerequisites'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'admin') {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 })
    }

    const { id: questId } = params

    const { data: quest, error } = await supabase
      .from('quests')
      .select('*')
      .eq('id', questId)
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      data: quest
    })

  } catch (error) {
    console.error('Get quest API error:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'admin') {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 })
    }

    const { id: questId } = params
    const body = await request.json()

    // Get current quest to check for order_index changes
    const { data: currentQuest, error: fetchError } = await supabase
      .from('quests')
      .select('order_index, subject_id')
      .eq('id', questId)
      .single()

    if (fetchError) {
      throw fetchError
    }

    // Build update object
    const updateData: any = {
      title: body.title,
      description: body.description,
      difficulty: body.difficulty,
      estimated_time: body.estimatedTime || body.estimated_time
    }

    // If order_index is being updated, include it
    const orderIndexChanged = body.orderIndex !== undefined && body.orderIndex !== currentQuest.order_index

    if (body.orderIndex !== undefined) {
      updateData.order_index = body.orderIndex
    }

    const { data: quest, error } = await supabase
      .from('quests')
      .update(updateData)
      .eq('id', questId)
      .select()
      .single()

    if (error) {
      throw error
    }

    // If order_index changed, recalculate prerequisites for the subject
    if (orderIndexChanged) {
      const prereqResult = await recalculateQuestPrerequisites(currentQuest.subject_id)
      if (!prereqResult.success) {
        console.error('Failed to recalculate prerequisites:', prereqResult.error)
        // Don't fail the request, just log the error
      }
    }

    return NextResponse.json({
      success: true,
      data: quest,
      message: 'Quest updated successfully'
    })

  } catch (error) {
    console.error('Update quest API error:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'admin') {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 })
    }

    const { id: questId } = params

    // Check if quest exists and get its status
    const { data: quest, error: questError } = await supabase
      .from('quests')
      .select('id, title, is_active')
      .eq('id', questId)
      .single()

    if (questError || !quest) {
      return NextResponse.json({
        success: false,
        message: 'Quest not found'
      }, { status: 404 })
    }

    // Only allow deletion of archived quests (is_active = false)
    if (quest.is_active) {
      return NextResponse.json({
        success: false,
        message: 'Cannot delete active quests. Please archive the quest first before deleting it.'
      }, { status: 400 })
    }

    // Enhanced Safety Check: Verify no students have attempted this quest
    // Check 1: quest_progress table
    const { data: questProgress, error: progressError } = await supabase
      .from('quest_progress')
      .select('id')
      .eq('quest_id', questId)
      .limit(1)

    if (progressError) {
      console.error('Error checking quest progress:', progressError)
    }

    // Check 2: attempt_logs table (source of truth)
    // Get all questions for this quest
    const { data: questionsData, error: questionsError } = await supabase
      .from('questions')
      .select('id')
      .eq('quest_id', questId)

    if (questionsError) {
      console.error('Error getting questions:', questionsError)
    }

    let attemptLogs = null
    let attemptsError = null

    if (questionsData && questionsData.length > 0) {
      const questionIds = questionsData.map(q => q.id)

      const { data: attempts, error: attemptError } = await supabase
        .from('attempt_logs')
        .select('id, user_id')
        .in('question_id', questionIds)
        .limit(1)

      attemptLogs = attempts
      attemptsError = attemptError

      if (attemptsError) {
        console.error('Error checking attempt logs:', attemptsError)
      }
    }

    // Check 3: Count unique students who attempted (for better error messaging)
    let studentCount = 0
    if (questionsData && questionsData.length > 0) {
      const questionIds = questionsData.map(q => q.id)
      const { count } = await supabase
        .from('attempt_logs')
        .select('user_id', { count: 'exact', head: true })
        .in('question_id', questionIds)

      studentCount = count || 0
    }

    // If ANY student data exists, prevent deletion
    if ((questProgress && questProgress.length > 0) || (attemptLogs && attemptLogs.length > 0) || studentCount > 0) {
      return NextResponse.json({
        success: false,
        message: `Cannot delete quest: ${studentCount} student(s) have attempted this quest. Use Archive instead to preserve student records and maintain data integrity.`,
        hasStudentData: true,
        studentCount
      }, { status: 400 })
    }

    // Safe to hard delete - no student data exists
    // Database cascade will handle questions, user_progress, etc.
    const { error: deleteError } = await supabase
      .from('quests')
      .delete()
      .eq('id', questId)

    if (deleteError) {
      throw deleteError
    }

    return NextResponse.json({
      success: true,
      message: 'Quest permanently deleted successfully'
    })

  } catch (error) {
    console.error('Delete quest API error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return NextResponse.json({
      success: false,
      message: `Failed to delete quest: ${errorMessage}`
    }, { status: 500 })
  }
}