import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { getUserId } from '@/lib/session-utils'
import { z } from 'zod'

// Validation schema for subject creation
const createSubjectSchema = z.object({
  name: z.string().min(1, 'Subject name is required').max(200, 'Subject name too long'),
  subject_code: z.string().max(50).optional(),
  batch: z.string().min(1, 'Batch is required'),
  course: z.string().min(1, 'Course is required'), // Required for all subjects (primary department for electives)
  sections: z.array(z.string().max(2)).default([]), // Multiple sections for regular subjects
  is_elective: z.boolean().default(false)
})

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'admin') {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized - Admin access required'
      }, { status: 401 })
    }

    const userId = getUserId(session)
    if (!userId) {
      return NextResponse.json({
        success: false,
        message: 'Invalid session'
      }, { status: 401 })
    }

    const body = await request.json()

    // Validate input
    const validationResult = createSubjectSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
        message: 'Invalid input',
        errors: validationResult.error.errors
      }, { status: 400 })
    }

    const data = validationResult.data

    // Validate subject requirements
    if (data.is_elective) {
      // Electives should not have specific sections
      if (data.sections.length > 0) {
        return NextResponse.json({
          success: false,
          message: 'Elective subjects cannot have specific sections'
        }, { status: 400 })
      }
    } else {
      // Regular subjects need at least one section
      if (data.sections.length === 0) {
        return NextResponse.json({
          success: false,
          message: 'At least one section is required for regular subjects'
        }, { status: 400 })
      }
    }

    // Check for duplicate subjects
    if (!data.is_elective) {
      // For regular subjects, check course + sections combination
      const { data: existingSubjects } = await supabase
        .from('subjects')
        .select('id, name, section')
        .eq('name', data.name)
        .eq('batch', data.batch)
        .eq('course', data.course!)
        .eq('is_active', true)

      const duplicateSections: string[] = []
      for (const section of data.sections) {
        const duplicate = existingSubjects?.find(s => s.section === section)
        if (duplicate) {
          duplicateSections.push(section)
        }
      }

      if (duplicateSections.length > 0) {
        return NextResponse.json({
          success: false,
          message: `Subject "${data.name}" already exists for ${data.batch} ${data.course} Section${duplicateSections.length > 1 ? 's' : ''} ${duplicateSections.join(', ')}`
        }, { status: 409 })
      }
    } else {
      // For electives, check if same name+batch combination exists
      const { data: existing } = await supabase
        .from('subjects')
        .select('id')
        .eq('name', data.name)
        .eq('batch', data.batch)
        .eq('is_elective', true)
        .eq('is_active', true)
        .single()

      if (existing) {
        return NextResponse.json({
          success: false,
          message: `Elective subject "${data.name}" already exists for batch ${data.batch}`
        }, { status: 409 })
      }
    }

    // Create subjects
    // - For regular: one subject per section (same course)
    // - For electives: one subject with course as primary department, section=null
    const subjectsToCreate = data.is_elective
      ? [{
          name: data.name,
          subject_code: data.subject_code || null,
          batch: data.batch,
          course: data.course,
          section: null,
          is_elective: true,
          created_by: userId,
          is_active: true
        }]
      : data.sections.map(section => ({
          name: data.name,
          subject_code: data.subject_code || null,
          batch: data.batch,
          course: data.course,
          section: section,
          is_elective: false,
          created_by: userId,
          is_active: true
        }))

    const { data: createdSubjects, error: createError } = await supabase
      .from('subjects')
      .insert(subjectsToCreate)
      .select()

    if (createError) {
      console.error('Error creating subjects:', createError)
      return NextResponse.json({
        success: false,
        message: `Failed to create subjects: ${createError.message}`
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: data.is_elective
        ? 'Elective subject created successfully'
        : `Successfully created subject for ${createdSubjects.length} section${createdSubjects.length > 1 ? 's' : ''}`,
      data: {
        created: createdSubjects,
        count: createdSubjects.length
      }
    })

  } catch (error) {
    console.error('Subject creation API error:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
}
