import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { recalculateAllQuestPrerequisites } from '@/lib/quest-prerequisites'

/**
 * One-time admin endpoint to fix prerequisites for all existing quests.
 *
 * This endpoint recalculates sequential prerequisites for all quests in all subjects.
 * Should be called once to fix existing data, then the automatic system handles new quests.
 */
export async function POST() {
  try {
    const session = await getSession()

    // Only super admins can run this fix
    if (!session || session.role !== 'admin' || !session.is_super_admin) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized - Super admin access required'
      }, { status: 401 })
    }

    console.log('🔧 Starting prerequisite fix for all quests...')

    const result = await recalculateAllQuestPrerequisites()

    if (!result.success) {
      return NextResponse.json({
        success: false,
        message: result.error || 'Failed to recalculate prerequisites',
        subjectsProcessed: result.subjectsProcessed
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully recalculated prerequisites for all quests',
      subjectsProcessed: result.subjectsProcessed
    })

  } catch (error) {
    console.error('Fix prerequisites API error:', error)
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 })
  }
}
