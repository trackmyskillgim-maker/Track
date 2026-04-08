import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'admin') {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 })
    }

    const { questId, studentIds } = await request.json()

    if (!questId || !studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Invalid request: questId and studentIds are required'
      }, { status: 400 })
    }

    // Verify quest exists and get its subject_id
    const { data: quest, error: questError } = await supabase
      .from('quests')
      .select('id, title, subject_id')
      .eq('id', questId)
      .single()

    if (questError || !quest) {
      return NextResponse.json({
        success: false,
        message: 'Quest not found'
      }, { status: 404 })
    }

    // NEW: Verify all students are enrolled in the quest's subject
    if (quest.subject_id) {
      const { data: enrollments } = await supabase
        .from('student_subjects')
        .select('student_id')
        .eq('subject_id', quest.subject_id)
        .in('student_id', studentIds)

      const enrolledStudentIds = enrollments?.map(e => e.student_id) || []
      const notEnrolled = studentIds.filter(sid => !enrolledStudentIds.includes(sid))

      if (notEnrolled.length > 0) {
        // Get usernames of non-enrolled students for better error message
        const { data: users } = await supabase
          .from('users')
          .select('username')
          .in('id', notEnrolled)

        const notEnrolledNames = users?.map(u => u.username).join(', ') || 'Unknown students'

        return NextResponse.json({
          success: false,
          message: `Cannot unlock: The following students are not enrolled in this quest's subject: ${notEnrolledNames}`
        }, { status: 400 })
      }
    }

    // Prepare unlock records
    const unlockRecords = studentIds.map(studentId => ({
      quest_id: questId,
      user_id: studentId,
      unlocked_by: session.id,
      unlocked_at: new Date().toISOString()
    }))

    // Insert unlock records (upsert to handle duplicates)
    const { error: insertError } = await supabase
      .from('admin_quest_unlocks')
      .upsert(unlockRecords, {
        onConflict: 'quest_id,user_id',
        ignoreDuplicates: false
      })

    if (insertError) {
      console.error('Failed to insert unlock records:', insertError)
      return NextResponse.json({
        success: false,
        message: 'Failed to unlock quest'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Quest unlocked for ${studentIds.length} student(s)`,
      data: {
        questId,
        unlockedCount: studentIds.length
      }
    })

  } catch (error) {
    console.error('Unlock quest error:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
}

// GET endpoint to fetch admin unlocks for a quest
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'admin') {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const questId = searchParams.get('questId')

    if (!questId) {
      return NextResponse.json({
        success: false,
        message: 'Quest ID is required'
      }, { status: 400 })
    }

    // Fetch all admin unlocks for this quest
    const { data: unlocks, error } = await supabase
      .from('admin_quest_unlocks')
      .select(`
        id,
        quest_id,
        user_id,
        unlocked_at,
        users:user_id (
          username,
          year,
          course,
          section
        )
      `)
      .eq('quest_id', questId)
      .order('unlocked_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch unlocks:', error)
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch unlocks'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: unlocks || []
    })

  } catch (error) {
    console.error('Get unlocks error:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
}
