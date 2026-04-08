import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({
        success: false,
        message: 'Not authenticated'
      }, { status: 401 })
    }

    return NextResponse.json({
      success: true,
      user: {
        id: session.id,
        username: session.username,
        email: session.email,
        role: session.role,
        is_super_admin: session.is_super_admin || false // Include super admin flag
      }
    })

  } catch (error) {
    console.error('Session API error:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
}