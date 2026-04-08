import { supabase } from './supabase'

/**
 * Recalculates and updates sequential prerequisites for all active quests in a subject.
 *
 * Logic:
 * - First quest in subject (lowest order_index): No prerequisite
 * - Each subsequent quest: requires the previous quest in the same subject
 *
 * @param subjectId - The subject ID to recalculate prerequisites for
 * @returns Success status
 */
export async function recalculateQuestPrerequisites(subjectId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Get all active quests for this subject, ordered by order_index
    const { data: quests, error: fetchError } = await supabase
      .from('quests')
      .select('id, order_index, title')
      .eq('subject_id', subjectId)
      .eq('is_active', true)
      .order('order_index', { ascending: true })

    if (fetchError) {
      console.error('Error fetching quests for prerequisite calculation:', fetchError)
      return { success: false, error: fetchError.message }
    }

    if (!quests || quests.length === 0) {
      // No quests in this subject, nothing to do
      return { success: true }
    }

    console.log(`📚 Recalculating prerequisites for ${quests.length} quests in subject ${subjectId}`)

    // Update each quest's prerequisite
    const updates = quests.map(async (quest, index) => {
      if (index === 0) {
        // First quest has no prerequisite
        const { error } = await supabase
          .from('quests')
          .update({
            required_quest_id: null,
            required_points: 0
          })
          .eq('id', quest.id)

        if (error) {
          console.error(`Error removing prerequisite for first quest ${quest.title}:`, error)
          throw error
        }

        console.log(`✅ ${quest.title} - No prerequisite (first quest)`)
      } else {
        // Set prerequisite to previous quest
        const previousQuest = quests[index - 1]
        const { error } = await supabase
          .from('quests')
          .update({
            required_quest_id: previousQuest.id,
            required_points: 0
          })
          .eq('id', quest.id)

        if (error) {
          console.error(`Error setting prerequisite for ${quest.title}:`, error)
          throw error
        }

        console.log(`✅ ${quest.title} - Requires: ${previousQuest.title}`)
      }
    })

    await Promise.all(updates)

    console.log(`✅ Successfully recalculated prerequisites for subject ${subjectId}`)
    return { success: true }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error in recalculateQuestPrerequisites:', errorMessage)
    return { success: false, error: errorMessage }
  }
}

/**
 * Recalculates prerequisites for ALL subjects.
 * Useful for one-time fixes or admin operations.
 */
export async function recalculateAllQuestPrerequisites(): Promise<{ success: boolean; subjectsProcessed: number; error?: string }> {
  try {
    // Get all active subjects
    const { data: subjects, error: fetchError } = await supabase
      .from('subjects')
      .select('id, name')
      .eq('is_active', true)

    if (fetchError) {
      console.error('Error fetching subjects:', fetchError)
      return { success: false, subjectsProcessed: 0, error: fetchError.message }
    }

    if (!subjects || subjects.length === 0) {
      return { success: true, subjectsProcessed: 0 }
    }

    console.log(`🔄 Recalculating prerequisites for ${subjects.length} subjects`)

    // Recalculate for each subject
    for (const subject of subjects) {
      console.log(`\n📚 Processing subject: ${subject.name}`)
      const result = await recalculateQuestPrerequisites(subject.id)

      if (!result.success) {
        console.error(`❌ Failed to process subject ${subject.name}:`, result.error)
        return {
          success: false,
          subjectsProcessed: subjects.indexOf(subject),
          error: `Failed at subject ${subject.name}: ${result.error}`
        }
      }
    }

    console.log(`\n✅ Successfully processed ${subjects.length} subjects`)
    return { success: true, subjectsProcessed: subjects.length }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error in recalculateAllQuestPrerequisites:', errorMessage)
    return { success: false, subjectsProcessed: 0, error: errorMessage }
  }
}
