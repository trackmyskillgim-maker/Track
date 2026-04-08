'use client'

import { SWRConfig } from 'swr'
import { ReactNode, useMemo } from 'react'

// Global fetcher with error handling
const fetcher = async (url: string) => {
  console.log('🔍 [DEBUG] SWR Fetcher - URL:', url)

  const response = await fetch(url)

  if (!response.ok) {
    console.log('🔍 [DEBUG] SWR Fetcher - HTTP Error:', response.status, response.statusText)
    if (response.status === 401) {
      // Redirect to login on unauthorized
      window.location.href = '/'
      throw new Error('Unauthorized')
    }
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  const data = await response.json()
  console.log('🔍 [DEBUG] SWR Fetcher - Raw response data:', data)

  // Handle different API response formats:
  // - Dashboard/Analytics APIs: {success: true, data: {...}}
  // - Class Participation APIs: {success: true, session/queue/etc: ...}
  if (data.hasOwnProperty('success')) {
    if (!data.success) {
      throw new Error(data.message || 'API request failed')
    }
    // If response has .data field, extract it (for dashboard/analytics)
    // Otherwise return full response (for class participation)
    if (data.hasOwnProperty('data')) {
      console.log('🔍 [DEBUG] SWR Fetcher - Extracting .data field')
      return data.data
    }
  }

  // Return full response for Class Participation or direct API responses
  console.log('🔍 [DEBUG] SWR Fetcher - Returning full response')
  return data
}

// Create a singleton cache instance that persists across navigation
// This ensures data is instantly available when navigating back
let globalCache: Map<string, any> | null = null

function getGlobalCache() {
  if (!globalCache) {
    globalCache = new Map()
  }
  return globalCache
}

// Clear cache on startup to avoid stale data issues
if (typeof window !== 'undefined') {
  console.log('🔍 [DEBUG] SWR - Clearing cache on startup')
  globalCache = new Map()
}

interface SWRProviderProps {
  children: ReactNode
}

export function SWRProvider({ children }: SWRProviderProps) {
  // Use persistent cache provider
  const cacheProvider = useMemo(() => {
    return () => getGlobalCache()
  }, [])

  return (
    <SWRConfig
      value={{
        fetcher,
        revalidateOnFocus: true, // Enable refetch on tab focus for real-time
        revalidateOnReconnect: true,
        shouldRetryOnError: true,
        errorRetryCount: 3,
        errorRetryInterval: 5000,
        dedupingInterval: 0, // Disable deduplication for real-time updates
        keepPreviousData: true,
        revalidateIfStale: true, // Allow revalidation of stale data for real-time
        revalidateOnMount: true, // Always fetch on mount to ensure data is available
        // Use persistent cache provider
        provider: cacheProvider,
        onError: (error, key) => {
          console.error(`SWR Error for ${key}:`, error)
        },
        onSuccess: (_, key) => {
          console.log(`✅ SWR Success for ${key} - Cache size: ${getGlobalCache().size}`)
        }
      }}
    >
      {children}
    </SWRConfig>
  )
}

// Export fetcher for use in hooks
export { fetcher }

// Export cache clearing function for logout
export function clearAllSWRCache() {
  console.log('🔍 [DEBUG] Manually clearing global SWR cache')
  if (globalCache) {
    const oldSize = globalCache.size
    globalCache.clear()
    // Force re-initialization by setting to new Map
    globalCache = new Map()
    console.log('✅ [DEBUG] Global cache cleared and re-initialized. Old size:', oldSize, 'New size:', globalCache.size)
  }
}