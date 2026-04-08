// JWT token management and authentication utilities
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { supabase, User } from './supabase'

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key')

export interface UserPayload {
  id: string
  username: string
  email: string
  role: 'student' | 'admin'
  is_super_admin?: boolean // True for super admin, false for professors
  [key: string]: any
}

export async function signToken(payload: UserPayload, expirationTime: string = '2h'): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expirationTime)
    .sign(secret)
}

export async function verifyToken(token: string): Promise<UserPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret)
    return payload as UserPayload
  } catch {
    return null
  }
}

export async function getSession(): Promise<UserPayload | null> {
  const token = cookies().get('auth-token')?.value
  if (!token) return null

  return await verifyToken(token)
}

export async function authenticateStudent(email: string, password: string) {
  // Student login - NO auto-registration
  // Students must be imported by super admin first
  const { data: users, error: findError } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .eq('role', 'student')
    .limit(1)

  if (findError) {
    throw new Error(`Database query failed: ${findError.message}`)
  }

  if (!users || users.length === 0) {
    // Student not found - return null (no auto-registration)
    return null
  }

  const user = users[0]

  // Verify password
  if (!user.password_hash || user.password_hash !== password) {
    return null
  }

  // Update last active time
  await supabase
    .from('users')
    .update({ last_active: new Date().toISOString() })
    .eq('id', user.id)

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role as 'student' | 'admin'
  }
}

export async function authenticateAdmin(username: string, password: string) {
  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .eq('role', 'admin')
    .limit(1)

  if (error || !users || users.length === 0) {
    return null
  }

  const user = users[0]

  if (!user.password_hash || user.password_hash !== password) {
    return null
  }

  // Update last active time
  await supabase
    .from('users')
    .update({ last_active: new Date().toISOString() })
    .eq('id', user.id)

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role as 'student' | 'admin',
    is_super_admin: user.is_super_admin || false // Include super admin flag
  }
}

export async function createSession(user: UserPayload, ipAddress?: string, userAgent?: string) {
  // Different session timeouts: 2h for students, 8h for admins
  const tokenExpiration = user.role === 'admin' ? '8h' : '2h'
  const sessionDuration = user.role === 'admin'
    ? 8 * 60 * 60 * 1000  // 8 hours for admin
    : 2 * 60 * 60 * 1000  // 2 hours for student

  const token = await signToken(user, tokenExpiration)

  const { error } = await supabase
    .from('sessions')
    .insert({
      user_id: user.id,
      token_hash: token.substring(0, 50), // Store first 50 chars for simple tracking
      ip_address: ipAddress,
      user_agent: userAgent,
      expires_at: new Date(Date.now() + sessionDuration).toISOString()
    })

  if (error) {
    console.error('Failed to create session:', error)
  }

  return token
}