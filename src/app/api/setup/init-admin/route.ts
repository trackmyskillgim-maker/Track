import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST() {
  try {
    // Check if admin user already exists
    const { data: existingAdmin } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'admin')
      .limit(1)

    if (existingAdmin && existingAdmin.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'Admin user already exists'
      })
    }

    // Create admin user
    const { error: adminError } = await supabase
      .from('users')
      .insert({
        username: 'admin',
        email: 'admin@pythonquest.com',
        password_hash: 'admin123', // Simple password for educational tool
        role: 'admin',
        total_points: 0,
        current_level: 1,
        current_streak: 0,
        max_streak: 0,
        is_active: true
      })
      .select()
      .single()

    if (adminError) {
      throw new Error(`Failed to create admin user: ${adminError.message}`)
    }

    return NextResponse.json({
      success: true,
      message: 'Admin user created successfully',
      data: {
        username: 'admin',
        email: 'admin@pythonquest.com',
        password: 'admin123'
      }
    })

  } catch (error) {
    console.error('Admin initialization error:', error)
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to initialize admin'
    }, { status: 500 })
  }
}