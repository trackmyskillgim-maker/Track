import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { z } from 'zod'

const assignCrSchema = z.object({
  student_id: z.string().uuid()
})

// POST /api/admin/subjects/[id]/assign-cr - Assign CR for subject
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'admin') {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized - Admin access required'
      }, { status: 401 })
    }

    const { id: subjectId } = params
    const body = await request.json()

    // Validate input
    const validationResult = assignCrSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
        message: 'Invalid input',
        errors: validationResult.error.errors
      }, { status: 400 })
    }

    const { student_id } = validationResult.data

    // Verify student is enrolled in this subject
    const { data: enrollment, error: enrollError } = await supabase
      .from('student_subjects')
      .select('id, is_cr')
      .eq('subject_id', subjectId)
      .eq('student_id', student_id)
      .single()

    if (enrollError || !enrollment) {
      return NextResponse.json({
        success: false,
        message: 'Student is not enrolled in this subject. Enroll the student first.'
      }, { status: 400 })
    }

    if (enrollment.is_cr) {
      return NextResponse.json({
        success: false,
        message: 'This student is already the CR for this subject'
      }, { status: 400 })
    }

    // Use RPC function for transaction-safe CR assignment
    const { data, error: rpcError } = await supabase.rpc('assign_cr_transaction', {
      p_subject_id: subjectId,
      p_new_cr_id: student_id
    })

    if (rpcError) {
      console.error('Assign CR RPC error:', rpcError)
      return NextResponse.json({
        success: false,
        message: `Failed to assign CR: ${rpcError.message}`
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'CR assigned successfully'
    })

  } catch (error) {
    console.error('Assign CR API error:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
}

// DELETE /api/admin/subjects/[id]/assign-cr - Remove CR assignment
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'admin') {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized - Admin access required'
      }, { status: 401 })
    }

    const { id: subjectId } = params

    // Get current CR
    const { data: crEnrollment, error: fetchError } = await supabase
      .from('student_subjects')
      .select('student_id')
      .eq('subject_id', subjectId)
      .eq('is_cr', true)
      .single()

    if (fetchError || !crEnrollment) {
      return NextResponse.json({
        success: false,
        message: 'No CR assigned for this subject'
      }, { status: 404 })
    }

    // Use RPC function for transaction-safe CR removal
    const { data, error: rpcError } = await supabase.rpc('remove_cr_transaction', {
      p_subject_id: subjectId,
      p_cr_id: crEnrollment.student_id
    })

    if (rpcError) {
      console.error('Remove CR RPC error:', rpcError)
      return NextResponse.json({
        success: false,
        message: `Failed to remove CR: ${rpcError.message}`
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'CR removed successfully'
    })

  } catch (error) {
    console.error('Remove CR API error:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
}
