import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/auth'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('auth-token')?.value

  // Handle root path - redirect authenticated users to their dashboard
  if (pathname === '/') {
    if (token) {
      try {
        const payload = await verifyToken(token)
        if (payload) {
          if (payload.role === 'admin') {
            return NextResponse.redirect(new URL('/admin/dashboard', request.url))
          } else if (payload.role === 'student') {
            return NextResponse.redirect(new URL('/student/dashboard', request.url))
          }
        }
      } catch {
        // Token invalid, let them access login page
      }
    }
    return NextResponse.next()
  }

  // Protect admin routes
  if (pathname.startsWith('/admin')) {
    if (!token) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    try {
      const payload = await verifyToken(token)

      if (!payload || payload.role !== 'admin') {
        return NextResponse.redirect(new URL('/', request.url))
      }
    } catch {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // Protect student routes (allow both students and admins)
  if (pathname.startsWith('/student')) {
    if (!token) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    try {
      const payload = await verifyToken(token)

      // Allow both students and admins to access student routes
      // Admins can access to "view as student"
      if (!payload || (payload.role !== 'student' && payload.role !== 'admin')) {
        return NextResponse.redirect(new URL('/', request.url))
      }
    } catch {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // Protect class-participation routes
  if (pathname.startsWith('/class-participation/admin')) {
    if (!token) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    try {
      const payload = await verifyToken(token)

      if (!payload || payload.role !== 'admin') {
        return NextResponse.redirect(new URL('/', request.url))
      }
    } catch {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  if (pathname.startsWith('/class-participation/student')) {
    if (!token) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    try {
      const payload = await verifyToken(token)

      if (!payload || (payload.role !== 'student' && payload.role !== 'admin')) {
        return NextResponse.redirect(new URL('/', request.url))
      }
    } catch {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // Protect CR routes - must be a student with is_cr = true
  if (pathname.startsWith('/class-participation/cr')) {
    if (!token) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    try {
      const payload = await verifyToken(token)

      // CR routes require student role
      // Note: We check is_cr flag at the API level for more granular control
      if (!payload || payload.role !== 'student') {
        return NextResponse.redirect(new URL('/student/dashboard', request.url))
      }
    } catch {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/admin/:path*', '/student/:path*', '/class-participation/:path*']
}