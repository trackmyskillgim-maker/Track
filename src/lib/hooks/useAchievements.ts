import useSWR from 'swr'
import { fetcher } from '@/lib/providers/SWRProvider'

export function useAchievements() {
  const { data, error, isLoading, mutate } = useSWR(
    '/api/student/achievements',
    fetcher,
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
    data: data || null,
    isLoading,
    isError: error,
    mutate
  }
}
