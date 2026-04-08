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

    // Get quest subject_id before archiving (for prerequisite recalculation)
    const { data: questData, error: fetchError } = await supabase
      .from('quests')
      .select('subject_id')
      .eq('id', questId)
      .single()

    if (fetchError) {
      throw fetchError
    }

    // STEP 1: Count active questions BEFORE archiving
    // This is the key fix - we store a snapshot of how many questions were active
    // when the quest was archived, so deleted questions don't get counted
    const { count: activeQuestionCount } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('quest_id', questId)
      .eq('is_active', true)  // Only count active questions

    // STEP 2: Archive quest by setting is_active to false AND storing question count snapshot
    const { error } = await supabase
      .from('quests')
      .update({
        is_active: false,
        question_count_at_archive: activeQuestionCount || 0  // Store snapshot
      })
      .eq('id', questId)

    if (error) {
      throw error
    }

    // STEP 3: Archive all ACTIVE questions in this quest
    // CRITICAL: We only archive questions that are currently active
    // Questions that were already deleted (is_active=false) should NOT get archived_at timestamp
    // This way, on restore, we only restore questions that were active at archive time
    const { error: questionsError } = await supabase
      .from('questions')
      .update({
        is_active: false,
        archived_at: new Date().toISOString()  // Mark when this question was archived
      })
      .eq('quest_id', questId)
      .eq('is_active', true)  // Only update currently active questions!

    if (questionsError) {
      console.error('Failed to archive questions:', questionsError)
      // Quest is already archived, so we can still return success
      // but log the issue for debugging
    }

    // STEP 4: Recalculate prerequisites for remaining active quests in the subject
    // When a quest is archived, subsequent quests need their prerequisites updated
    const prereqResult = await recalculateQuestPrerequisites(questData.subject_id)
    if (!prereqResult.success) {
      console.error('Failed to recalculate prerequisites after archive:', prereqResult.error)
      // Don't fail the request, just log the error
    }

    return NextResponse.json({
      success: true,
      message: 'Quest archived successfully'
    })

  } catch (error) {
    console.error('Archive quest API error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return NextResponse.json({
      success: false,
      message: `Failed to archive quest: ${errorMessage}`
    }, { status: 500 })
  }
}