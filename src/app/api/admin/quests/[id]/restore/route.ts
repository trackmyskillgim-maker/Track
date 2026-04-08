import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { recalculateQuestPrerequisites } from '@/lib/quest-prerequisites'

export async function PATCH(
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

    // Check if quest exists and is currently archived
    const { data: quest, error: checkError } = await supabase
      .from('quests')
      .select('id, title, is_active, subject_id')
      .eq('id', questId)
      .single()

    if (checkError || !quest) {
      return NextResponse.json({
        success: false,
        message: 'Quest not found'
      }, { status: 404 })
    }

    if (quest.is_active) {
      return NextResponse.json({
        success: false,
        message: 'Quest is already active'
      }, { status: 400 })
    }

    // Restore quest by setting is_active to true and clearing the archive snapshot
    const { error } = await supabase
      .from('quests')
      .update({
        is_active: true,
        question_count_at_archive: null  // Clear snapshot - quest is now active again
      })
      .eq('id', questId)

    if (error) {
      throw error
    }

    // Restore ONLY questions that were archived with the quest (not manually deleted)
    // CRITICAL FIX: Only restore questions that have archived_at timestamp
    // Questions deleted before archiving have archived_at=NULL and should stay deleted
    const { error: questionsError } = await supabase
      .from('questions')
      .update({
        is_active: true,
        archived_at: null  // Clear archived_at since question is now active again
      })
      .eq('quest_id', questId)
      .not('archived_at', 'is', null)  // Only restore questions that were archived (have timestamp)

    if (questionsError) {
      console.error('Failed to restore questions:', questionsError)
      // Quest is already restored, so we can still return success
      // but log the issue for debugging
    }

    // Recalculate prerequisites for all quests in the subject
    // When a quest is restored, prerequisites need to be recalculated
    const prereqResult = await recalculateQuestPrerequisites(quest.subject_id)
    if (!prereqResult.success) {
      console.error('Failed to recalculate prerequisites after restore:', prereqResult.error)
      // Don't fail the request, just log the error
    }

    return NextResponse.json({
      success: true,
      message: 'Quest restored successfully'
    })

  } catch (error) {
    console.error('Restore quest API error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return NextResponse.json({
      success: false,
      message: `Failed to restore quest: ${errorMessage}`
    }, { status: 500 })
  }
}