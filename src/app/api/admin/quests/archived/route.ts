import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const session = await getSession()
    if (!session || session.role !== 'admin') {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 })
    }

    // For regular admins, get their subject IDs first
    let professorSubjectIds: string[] = []
    if (!session.is_super_admin) {
      const { data: professorSubjects } = await supabase
        .from('subjects')
        .select('id')
        .eq('created_by', session.id)

      professorSubjectIds = professorSubjects?.map(s => s.id) || []
    }

    // Build query for archived quests (is_active = false)
    let questsQuery = supabase
      .from('quests')
      .select(`
        id,
        title,
        description,
        difficulty,
        estimated_time,
        order_index,
        is_active,
        created_at,
        question_count_at_archive,
        subject_id
      `)
      .eq('is_active', false)
      .order('created_at', { ascending: false }) // Most recently created first

    // Superadmin sees all archived quests, regular admin sees only their subjects' quests
    if (!session.is_super_admin) {
      questsQuery = questsQuery.in('subject_id', professorSubjectIds)
    }

    const { data: quests, error } = await questsQuery

    if (error) {
      throw new Error(`Failed to fetch archived quests: ${error.message}`)
    }

    // Get question counts and completion stats for each archived quest
    const questsWithStats = await Promise.all(
      (quests || []).map(async (quest) => {
        // CRITICAL FIX: Use the snapshot count stored when the quest was archived
        // This solves the bug where:
        // 1. Deleted questions (is_active=false before archiving) were being counted
        // 2. Active questions showed as 0 when we filtered by is_active=true
        // Now we use question_count_at_archive which was set during archiving
        const totalQuestions = quest.question_count_at_archive ?? 0

        // Get completion stats for this quest using attempt_logs
        const { data: attempts } = await supabase
          .from('attempt_logs')
          .select(`
            user_id,
            is_correct,
            questions!inner(quest_id)
          `)
          .eq('questions.quest_id', quest.id)
          .eq('is_correct', true)

        const uniqueStudents = new Set()
        let totalCompletions = 0

        if (attempts) {
          attempts.forEach((attempt: any) => {
            uniqueStudents.add(attempt.user_id)
            totalCompletions++
          })
        }

        return {
          id: quest.id,
          title: quest.title,
          description: quest.description,
          difficulty: quest.difficulty,
          estimatedTime: quest.estimated_time,
          orderIndex: quest.order_index,
          isActive: quest.is_active,
          createdAt: quest.created_at,
          totalQuestions: totalQuestions,  // Use snapshot directly
          totalCompletions,
          studentsAttempted: uniqueStudents.size
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: questsWithStats
    })

  } catch (error) {
    console.error('Archived quests API error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({
      success: false,
      message: errorMessage
    }, { status: 500 })
  }
}
