import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function POST() {
  try {
    const session = await getSession()
    if (!session || session.role !== 'admin') {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 })
    }

    console.log('🔧 Setting up quest prerequisites...')

    // Get all quests ordered by order_index
    const { data: quests, error: questsError } = await supabase
      .from('quests')
      .select('id, title, order_index')
      .eq('is_active', true)
      .order('order_index', { ascending: true })

    if (questsError) {
      throw new Error(`Failed to fetch quests: ${questsError.message}`)
    }

    if (!quests || quests.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No quests found'
      }, { status: 404 })
    }

    console.log(`Found ${quests.length} quests to process`)

    const results = []

    // Set up prerequisites - each quest requires the previous one
    for (let i = 0; i < quests.length; i++) {
      const quest = quests[i]

      if (i === 0) {
        // First quest has no prerequisites
        const { error: updateError } = await supabase
          .from('quests')
          .update({
            required_quest_id: null,
            required_points: 0
          })
          .eq('id', quest.id)

        results.push({
          quest: quest.title,
          action: 'Set as entry point (no prerequisites)',
          success: !updateError,
          error: updateError?.message
        })

        console.log(`✅ ${quest.title}: Set as entry point`)
      } else {
        // Set prerequisite to previous quest
        const previousQuest = quests[i-1]
        const { error: updateError } = await supabase
          .from('quests')
          .update({
            required_quest_id: previousQuest.id,
            required_points: 0 // No additional points required for now
          })
          .eq('id', quest.id)

        results.push({
          quest: quest.title,
          action: `Set prerequisite to "${previousQuest.title}"`,
          success: !updateError,
          error: updateError?.message
        })

        console.log(`✅ ${quest.title}: Requires "${previousQuest.title}"`)
      }
    }

    // Verify the setup
    console.log('🔍 Verifying prerequisite setup...')
    const { data: verifiedQuests } = await supabase
      .from('quests')
      .select(`
        id,
        title,
        required_quest_id,
        order_index,
        prerequisite:required_quest_id (
          id,
          title
        )
      `)
      .eq('is_active', true)
      .order('order_index', { ascending: true })

    const verification = verifiedQuests?.map(quest => {
      let prereqTitle = 'None (entry point)'

      // Handle the prerequisite quest data
      if (quest.required_quest_id && quest.prerequisite) {
        if (Array.isArray(quest.prerequisite)) {
          prereqTitle = quest.prerequisite[0]?.title || 'Unknown'
        } else if (typeof quest.prerequisite === 'object') {
          prereqTitle = (quest.prerequisite as any).title || 'Unknown'
        }
      }

      return {
        quest: quest.title,
        prerequisite: prereqTitle
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Quest prerequisites set up successfully',
      data: {
        setup: results,
        verification
      }
    })

  } catch (error) {
    console.error('Setup prerequisites error:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
}