import useSWR from 'swr'
import { fetcher } from '@/lib/providers/SWRProvider'

export function useParticipationHistory() {
  const { data, error, isLoading, mutate } = useSWR(
    '/api/class-participation/student/my-history',
    fetcher,
    {
      refreshInterval: 0,              // No polling for history (static data)
      revalidateOnFocus: false,        // Don't refetch when tab gains focus
      revalidateOnReconnect: true,     // Refetch when internet reconnects
      dedupingInterval: 60000,         // Cache for 60 seconds
      shouldRetryOnError: true,        // Retry on error
      errorRetryCount: 3,              // Max 3 retries
      errorRetryInterval: 5000,        // 5s between retries
      keepPreviousData: true,          // Show cached data immediately while revalidating
      fallbackData: undefined,         // No fallback data
    }
  )

  return {
    sessions: data?.sessions || [],
    isLoading,
    isError: error,
    mutate
  }
}
