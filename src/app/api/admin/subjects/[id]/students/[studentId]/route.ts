import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

// DELETE /api/admin/subjects/[id]/students/[studentId] - Remove student from subject
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; studentId: string } }
) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'admin') {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized - Admin access required'
      }, { status: 401 })
    }

    const { id: subjectId, studentId } = params

    // Check if student is CR for this subject
    const { data: enrollment, error: fetchError } = await supabase
      .from('student_subjects')
      .select('is_cr')
      .eq('subject_id', subjectId)
      .eq('student_id', studentId)
      .single()

    if (fetchError || !enrollment) {
      return NextResponse.json({
        success: false,
        message: 'Student is not enrolled in this subject'
      }, { status: 404 })
    }

    // Prevent removing CR - must remove CR assignment first
    if (enrollment.is_cr) {
      return NextResponse.json({
        success: false,
        message: 'Cannot unenroll CR from subject. Remove CR assignment first.'
      }, { status: 400 })
    }

    // Remove enrollment
    const { error: deleteError } = await supabase
      .from('student_subjects')
      .delete()
      .eq('subject_id', subjectId)
      .eq('student_id', studentId)

    if (deleteError) {
      console.error('Unenroll error:', deleteError)
      return NextResponse.json({
        success: false,
        message: `Failed to unenroll student: ${deleteError.message}`
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Student unenrolled successfully'
    })

  } catch (error) {
    console.error('Unenroll student API error:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
}
