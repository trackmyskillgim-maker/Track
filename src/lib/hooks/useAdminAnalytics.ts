import useSWR from 'swr'
import { mutate } from 'swr'
import { fetcher } from '@/lib/providers/SWRProvider'

const fetcherWithFallback = async (url: string) => {
  console.log('🔍 [DEBUG] fetcherWithFallback - URL:', url)
  try {
    const result = await fetcher(url)
    console.log('🔍 [DEBUG] fetcherWithFallback - Success result:', result)
    return result
  } catch (error) {
    console.log('🔍 [DEBUG] fetcherWithFallback - Error:', error)
    // If optimized endpoint fails, try the original
    if (url.includes('-optimized')) {
      const fallbackUrl = url.replace('-optimized', '')
      console.log('🔍 [DEBUG] fetcherWithFallback - Falling back to:', fallbackUrl)
      const fallbackResult = await fetcher(fallbackUrl)
      console.log('🔍 [DEBUG] fetcherWithFallback - Fallback result:', fallbackResult)
      return fallbackResult
    }
    throw error
  }
}

export function useAdminAnalytics(
  batchFilter?: string,
  courseFilter?: string,
  sectionFilter?: string,
  subjectFilter?: string
) {
  // Build query string with filters
  const params = new URLSearchParams()
  if (batchFilter && batchFilter !== 'all') params.append('batch', batchFilter)
  if (courseFilter && courseFilter !== 'all') params.append('course', courseFilter)
  if (sectionFilter && sectionFilter !== 'all') params.append('section', sectionFilter)
  if (subjectFilter && subjectFilter !== 'all') params.append('subject', subjectFilter)

  const queryString = params.toString()
  const url = queryString ? `/api/admin/analytics-optimized?${queryString}` : '/api/admin/analytics-optimized'

  const { data, error, isLoading, mutate: mutateAnalytics } = useSWR(
    url,
    fetcherWithFallback,
    {
      refreshInterval: 0, // Disable auto-refresh
      revalidateOnFocus: false, // Don't refresh when tab gets focus
      revalidateOnReconnect: true, // Refresh when connection restored
      dedupingInterval: 60000, // Cache for 1 minute during navigation
      shouldRetryOnError: true,
      errorRetryCount: 3,
      errorRetryInterval: 5000,
      keepPreviousData: true, // Show cached data immediately on navigation
      fallbackData: undefined,
      revalidateIfStale: true, // Update in background if stale
      revalidateOnMount: true, // Load data on first visit
    }
  )

  return {
    data: data, // SWRProvider fetcher already extracted data from success wrapper
    isLoading,
    isError: error,
    mutate: mutateAnalytics
  }
}

// Helper to refresh analytics data
export function refreshAnalytics() {
  mutate('/api/admin/analytics-optimized')
}