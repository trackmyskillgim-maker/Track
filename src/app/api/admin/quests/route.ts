import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { recalculateQuestPrerequisites } from '@/lib/quest-prerequisites'

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

    // Build quests query
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
        subject_id,
        subjects (
          id,
          name,
          subject_code
        )
      `)
      .eq('is_active', true)
      .order('order_index', { ascending: true })

    // Superadmin sees all quests, regular admin sees only quests for their subjects
    if (!session.is_super_admin) {
      questsQuery = questsQuery.in('subject_id', professorSubjectIds)
    }

    const { data: quests, error } = await questsQuery

    if (error) {
      throw new Error(`Failed to fetch quests: ${error.message}`)
    }

    // Get question counts and completion stats for each quest separately
    const questsWithStats = await Promise.all(
      (quests || []).map(async (quest) => {
        // Get question count for this quest
        // NOTE: For ACTIVE quests, we only count ACTIVE questions (is_active = true)
        // This is correct because inactive questions are "deleted" questions that shouldn't be shown
        // Compare with archived quests endpoint: archived quests count ALL questions (no is_active filter)
        const { count: totalQuestions } = await supabase
          .from('questions')
          .select('*', { count: 'exact', head: true })
          .eq('quest_id', quest.id)
          .eq('is_active', true) // ✅ Correct for active quests

        // Get completion stats for this quest using attempt_logs (consistent with Quest Participation)
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

        // Extract subject info (handle case where subjects might be null during migration)
        const subjectInfo = quest.subjects && typeof quest.subjects === 'object' && !Array.isArray(quest.subjects)
          ? {
              id: (quest.subjects as any).id,
              name: (quest.subjects as any).name,
              subjectCode: (quest.subjects as any).subject_code
            }
          : null

        return {
          id: quest.id,
          title: quest.title,
          description: quest.description,
          difficulty: quest.difficulty,
          estimatedTime: quest.estimated_time,
          orderIndex: quest.order_index,
          isActive: quest.is_active,
          createdAt: quest.created_at,
          subjectId: quest.subject_id,
          subject: subjectInfo,
          totalQuestions: totalQuestions || 0,
          totalCompletions,
          studentsAttempted: uniqueStudents.size
        }
      })
    )

    const response = {
      success: true,
      data: questsWithStats
    }

    console.log('🔍 [DEBUG] Admin Quests API - Final response:', response)
    console.log('🔍 [DEBUG] Admin Quests API - Quest count:', questsWithStats.length)

    return NextResponse.json(response)

  } catch (error) {
    console.error('Admin quests API error:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'admin') {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 })
    }

    const body = await request.json()
    const { title, description, difficulty, estimatedTime, orderIndex, subjectId } = body

    if (!title || !description || !difficulty || !subjectId) {
      return NextResponse.json({
        success: false,
        message: 'Missing required fields (title, description, difficulty, subject)'
      }, { status: 400 })
    }

    // Verify subject exists and is active
    const { data: subject, error: subjectError } = await supabase
      .from('subjects')
      .select('id, name')
      .eq('id', subjectId)
      .eq('is_active', true)
      .single()

    if (subjectError || !subject) {
      return NextResponse.json({
        success: false,
        message: 'Invalid or inactive subject'
      }, { status: 400 })
    }

    // Get the maximum order_index from ALL quests (active and inactive) to avoid duplicates
    const { data: maxOrderData, error: maxOrderError } = await supabase
      .from('quests')
      .select('order_index')
      .order('order_index', { ascending: false })
      .limit(1)

    if (maxOrderError) {
      throw new Error(`Failed to get max order index: ${maxOrderError.message}`)
    }

    const nextOrderIndex = orderIndex || ((maxOrderData?.[0]?.order_index || 0) + 1)

    // Create new quest with subject_id
    const { data: newQuest, error } = await supabase
      .from('quests')
      .insert({
        title,
        description,
        difficulty,
        estimated_time: estimatedTime,
        order_index: nextOrderIndex,
        subject_id: subjectId,
        is_active: true,
        created_by: session.id
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create quest: ${error.message}`)
    }

    // Recalculate prerequisites for all quests in this subject
    // This ensures sequential locking: quest 2 requires quest 1, quest 3 requires quest 2, etc.
    const prereqResult = await recalculateQuestPrerequisites(subjectId)
    if (!prereqResult.success) {
      console.error('Failed to recalculate prerequisites:', prereqResult.error)
      // Don't fail the request, just log the error
    }

    return NextResponse.json({
      success: true,
      data: newQuest,
      message: 'Quest created successfully'
    })

  } catch (error) {
    console.error('Create quest API error:', error)
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 })
  }
}