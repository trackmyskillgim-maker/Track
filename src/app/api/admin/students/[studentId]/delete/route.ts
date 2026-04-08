import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function DELETE(
  request: Request,
  { params }: { params: { studentId: string } }
) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'admin') {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 })
    }

    const { studentId } = params

    if (!studentId) {
      return NextResponse.json({
        success: false,
        message: 'Student ID is required'
      }, { status: 400 })
    }

    // Verify the user exists and is a student
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', studentId)
      .eq('role', 'student')
      .single()

    if (userError || !user) {
      return NextResponse.json({
        success: false,
        message: 'Student not found'
      }, { status: 404 })
    }

    // Delete all related data in the correct order (to handle foreign key constraints)

    // 1. Delete attempt logs (references questions and users)
    const { error: attemptError } = await supabase
      .from('attempt_logs')
      .delete()
      .eq('user_id', studentId)

    if (attemptError) {
      console.error('Error deleting attempt logs:', attemptError)
      throw new Error(`Failed to delete attempt logs: ${attemptError.message}`)
    }

    // 2. Delete any other user-related data if needed
    // (Add more deletions here if there are other tables referencing the user)

    // 3. Finally, delete the user record
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', studentId)

    if (deleteError) {
      console.error('Error deleting user:', deleteError)
      throw new Error(`Failed to delete user: ${deleteError.message}`)
    }

    return NextResponse.json({
      success: true,
      message: 'Student and all associated data deleted successfully'
    })

  } catch (error) {
    console.error('Delete student error:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to delete student'
    }, { status: 500 })
  }
}