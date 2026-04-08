import useSWR from 'swr'
import { mutate } from 'swr'
import { fetcher } from '@/lib/providers/SWRProvider'

const fetcherWithFallback = async (url: string) => {
  try {
    return await fetcher(url)
  } catch (error) {
    // If optimized endpoint fails, try the original
    if (url.includes('-optimized')) {
      const fallbackUrl = url.replace('-optimized', '')
      console.log('Falling back to original endpoint due to error:', fallbackUrl)
      return await fetcher(fallbackUrl)
    }
    throw error
  }
}

export function useStudentDashboard() {
  const { data, error, isLoading, mutate: mutateDashboard } = useSWR(
    '/api/student/dashboard-optimized',
    fetcherWithFallback,
    {
      refreshInterval: 0, // Disable auto-refresh to prevent unnecessary requests
      revalidateOnFocus: false, // Use global setting
      revalidateOnReconnect: true,
      dedupingInterval: 60000, // Longer dedupe to reduce API calls
      shouldRetryOnError: true,
      errorRetryCount: 3,
      errorRetryInterval: 5000,
      keepPreviousData: true,
      fallbackData: undefined, // Will use cache if available
    }
  )

  return {
    data,
    isLoading,
    isError: error,
    mutate: mutateDashboard
  }
}

// Helper function to invalidate dashboard cache globally
export function invalidateDashboard() {
  mutate('/api/student/dashboard-optimized')
}