import useSWR from 'swr'
import { fetcher } from '@/lib/providers/SWRProvider'

export function useLeaderboard(
  batchFilter?: string,
  courseFilter?: string,
  sectionFilter?: string,
  subjectFilter?: string
) {
  // Build query parameters
  const params = new URLSearchParams()

  if (batchFilter && batchFilter !== 'all') {
    params.append('batch', batchFilter)
  }
  if (courseFilter && courseFilter !== 'all') {
    params.append('course', courseFilter)
  }
  if (sectionFilter && sectionFilter !== 'all') {
    params.append('section', sectionFilter)
  }
  if (subjectFilter && subjectFilter !== 'all') {
    params.append('subject', subjectFilter)
  }

  const queryString = params.toString()
  const url = queryString ? `/api/student/leaderboard?${queryString}` : '/api/student/leaderboard'

  const { data, error, isLoading, mutate } = useSWR(
    url,
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