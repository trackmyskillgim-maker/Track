import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { z } from 'zod'

// Validation schema
const createAdminSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(50),
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  is_super_admin: z.boolean().default(false)
})

// POST /api/admin/create-admin - Create a new admin (professor or superadmin)
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()

    // Only superadmin can create admins
    if (!session || session.role !== 'admin' || !session.is_super_admin) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized - Superadmin access required'
      }, { status: 401 })
    }

    const body = await request.json()

    // Validate input
    const validationResult = createAdminSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
        message: 'Invalid input',
        errors: validationResult.error.errors
      }, { status: 400 })
    }

    const { username, email, password, is_super_admin } = validationResult.data

    // Check if username already exists
    const { data: existingUsername } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single()

    if (existingUsername) {
      return NextResponse.json({
        success: false,
        message: 'Username already exists'
      }, { status: 409 })
    }

    // Check if email already exists
    const { data: existingEmail } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single()

    if (existingEmail) {
      return NextResponse.json({
        success: false,
        message: 'Email already exists'
      }, { status: 409 })
    }

    // Create admin user (password stored as plain text)
    const { data: newAdmin, error: createError } = await supabase
      .from('users')
      .insert({
        username,
        email: email.toLowerCase(),
        password_hash: password, // Store raw password (field name is password_hash)
        role: 'admin',
        is_super_admin
      })
      .select()
      .single()

    if (createError) {
      console.error('Create admin error:', createError)
      return NextResponse.json({
        success: false,
        message: `Failed to create admin: ${createError.message}`
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Successfully created ${is_super_admin ? 'superadmin' : 'professor'}`,
      data: {
        id: newAdmin.id,
        username: newAdmin.username,
        email: newAdmin.email,
        is_super_admin: newAdmin.is_super_admin
      }
    })

  } catch (error) {
    console.error('Create admin API error:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
}
