import { supabase } from './supabase'

export async function cleanupExpiredSessions() {
  try {
    const { error } = await supabase
      .from('sessions')
      .delete()
      .lt('expires_at', new Date().toISOString())

    if (error) {
      console.error('Failed to cleanup expired sessions:', error)
    }
  } catch (error) {
    console.error('Session cleanup error:', error)
  }
}

export async function validateSession(userId: string, tokenHash: string): Promise<boolean> {
  try {
    const { data: sessions, error } = await supabase
      .from('sessions')
      .select('expires_at')
      .eq('user_id', userId)
      .eq('token_hash', tokenHash)
      .gt('expires_at', new Date().toISOString())
      .limit(1)

    if (error || !sessions || sessions.length === 0) {
      return false
    }

    return true
  } catch (error) {
    console.error('Session validation error:', error)
    return false
  }
}