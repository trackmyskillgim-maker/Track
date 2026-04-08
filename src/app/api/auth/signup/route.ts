import { NextResponse } from 'next/server'

// Student self-signup is disabled
// Students must be imported by super admin through bulk upload feature
// Contact your course administrator to create your account

export async function POST() {
  return NextResponse.json({
    success: false,
    message: 'Student self-registration is disabled. Your account must be created by an administrator. Please contact your course administrator to get access.'
  }, { status: 403 })
}