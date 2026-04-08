// Student auto-registration + Admin login API endpoint
import { NextRequest, NextResponse } from 'next/server'
import { authenticateAdmin, createSession } from '@/lib/auth'
import { checkRateLimit, resetRateLimit } from '@/lib/rateLimiter'
import { supabase } from '@/lib/supabase'
import { z } from 'zod'

const studentLoginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1),
  type: z.literal('student')
})

const adminLoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  type: z.literal('admin')
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type } = body

    // Rate limiting: 5 attempts per IP per minute
    const clientIP = request.ip || request.headers.get('x-forwarded-for') || 'unknown'
    const rateLimitResult = checkRateLimit(clientIP, 5, 60000)

    if (!rateLimitResult.allowed) {
      return NextResponse.json({
        success: false,
        message: `Too many login attempts. Try again in ${rateLimitResult.resetIn} seconds.`
      }, { status: 429 })
    }

    if (type === 'student') {
      const { email, password } = studentLoginSchema.parse(body)

      // Authenticate student with email and password
      const { data: user, error } = await supabase
        .from('users')
        .select('id, username, email, role, year, course, section, total_points, current_level')
        .eq('email', email)
        .eq('password_hash', password) // In production, this should use proper password hashing
        .eq('role', 'student')
        .eq('is_active', true)
        .single()

      if (error || !user) {
        return NextResponse.json({
          success: false,
          message: 'Invalid email or password'
        }, { status: 401 })
      }

      // Update last active time on successful login
      await supabase
        .from('users')
        .update({ last_active: new Date().toISOString() })
        .eq('id', user.id)

      const token = await createSession(
        user,
        request.ip,
        request.headers.get('user-agent') || undefined
      )

      const response = NextResponse.json({
        success: true,
        user,
        message: 'Student login successful'
      })

      // Set httpOnly cookie (2 hours for students)
      response.cookies.set('auth-token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 2 * 60 * 60 // 2 hours
      })

      // Reset rate limit on successful login
      resetRateLimit(clientIP)

      return response

    } else if (type === 'admin') {
      const { username, password } = adminLoginSchema.parse(body)

      const user = await authenticateAdmin(username, password)
      if (!user) {
        return NextResponse.json({
          success: false,
          message: 'Invalid admin credentials'
        }, { status: 401 })
      }

      const token = await createSession(
        user,
        request.ip,
        request.headers.get('user-agent') || undefined
      )

      const response = NextResponse.json({
        success: true,
        user,
        message: 'Admin login successful'
      })

      // Set httpOnly cookie with shorter expiry for admin
      response.cookies.set('auth-token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 8 * 60 * 60 // 8 hours for admin
      })

      // Reset rate limit on successful login
      resetRateLimit(clientIP)

      return response

    } else {
      return NextResponse.json({
        success: false,
        message: 'Invalid login type'
      }, { status: 400 })
    }

  } catch (error) {
    console.error('Login error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        message: 'Invalid input data',
        errors: error.errors
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
}