/**
 * Get user ID from session object
 * Handles both userId and id fields (JWT token structure uses 'id')
 */
export function getUserId(session: any): string | null {
  return session?.userId || session?.id || null
}