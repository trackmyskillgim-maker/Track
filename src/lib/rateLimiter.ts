// Rate limiting for authentication endpoints
interface RateLimitStore {
  [ip: string]: {
    attempts: number
    resetTime: number
  }
}

const rateLimitStore: RateLimitStore = {}

export function checkRateLimit(ip: string, maxAttempts: number = 5, windowMs: number = 60000): { allowed: boolean; resetIn?: number } {
  const now = Date.now()
  const clientData = rateLimitStore[ip]

  // Clean up expired entries
  if (clientData && now > clientData.resetTime) {
    delete rateLimitStore[ip]
  }

  // Check if IP exists in store
  if (!rateLimitStore[ip]) {
    rateLimitStore[ip] = {
      attempts: 1,
      resetTime: now + windowMs
    }
    return { allowed: true }
  }

  // Check if limit exceeded
  if (rateLimitStore[ip].attempts >= maxAttempts) {
    const resetIn = Math.ceil((rateLimitStore[ip].resetTime - now) / 1000)
    return { allowed: false, resetIn }
  }

  // Increment attempts
  rateLimitStore[ip].attempts++
  return { allowed: true }
}

export function resetRateLimit(ip: string) {
  delete rateLimitStore[ip]
}