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

    // Get all students
    const { data: allStudents, error: studentError } = await supabase
      .from('users')
      .select(`
        id,
        username,
        email,
        created_at,
        last_active
      `)
      .eq('role', 'student')
      .order('created_at', { ascending: false })

    if (studentError) {
      console.error('Error fetching students:', studentError)
      throw new Error(`Failed to fetch students: ${studentError.message}`)
    }

    // Get all students who have made attempts
    const { data: usersWithAttempts, error: attemptError } = await supabase
      .from('attempt_logs')
      .select('user_id')

    if (attemptError) {
      console.error('Error fetching attempt logs:', attemptError)
      throw new Error(`Failed to fetch attempt logs: ${attemptError.message}`)
    }

    // Get unique user IDs who have made attempts
    const userIdsWithAttempts = new Set(usersWithAttempts?.map(a => a.user_id).filter(Boolean) || [])

    // Filter students who haven't made any attempts
    const notStartedStudents = allStudents?.filter(student => !userIdsWithAttempts.has(student.id)) || []

    const studentsData = notStartedStudents?.map(student => ({
      id: student.id,
      username: student.username,
      email: student.email,
      joinedAt: student.created_at,
      lastActive: student.last_active,
      daysSinceJoined: Math.floor(
        (new Date().getTime() - new Date(student.created_at).getTime()) / (1000 * 60 * 60 * 24)
      )
    })) || []

    return NextResponse.json({
      success: true,
      data: {
        count: studentsData.length,
        students: studentsData
      }
    })

  } catch (error) {
    console.error('Get not started students error:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch students who haven\'t started'
    }, { status: 500 })
  }
}