import useSWR from 'swr'
import { fetcher } from '@/lib/providers/SWRProvider'

export interface Student {
  id: string
  username: string
  email: string
  role: string
  totalPoints: number
  completedChallenges: number
  completedQuests: number
  cpAttempts: number
  cpPoints: number
  badges: number
  currentStreak: number
  maxStreak: number
  lastActive: string
  createdAt: string
  questCompletedAt?: string | null  // New field for quest completion date
}

export function useStudents(
  questFilter?: string,
  batchFilter?: string,
  courseFilter?: string,
  sectionFilter?: string,
  subjectFilter?: string
) {
  // Build query parameters
  const params = new URLSearchParams()

  if (questFilter && questFilter !== 'all') {
    params.append('quest', questFilter)
  }
  if (subjectFilter && subjectFilter !== 'all') {
    params.append('subject', subjectFilter)
  }
  if (batchFilter && batchFilter !== 'all') {
    params.append('batch', batchFilter)
  }
  if (courseFilter && courseFilter !== 'all') {
    params.append('course', courseFilter)
  }
  if (sectionFilter && sectionFilter !== 'all') {
    params.append('section', sectionFilter)
  }

  const queryString = params.toString()
  const url = queryString ? `/api/admin/students?${queryString}` : '/api/admin/students'

  const { data, error, isLoading, mutate } = useSWR(
    url,
    fetcher,
    {
      refreshInterval: 0, // Disable auto-refresh
      revalidateOnFocus: false, // Don't refresh when tab gets focus
      revalidateOnReconnect: true, // Refresh when connection restored
      dedupingInterval: 30000, // Shorter cache for faster updates
      shouldRetryOnError: true,
      errorRetryCount: 3,
      errorRetryInterval: 5000,
      keepPreviousData: true, // Show cached data immediately during transitions
      fallbackData: undefined,
      revalidateIfStale: false, // Prefer cached data for smoother UX
      revalidateOnMount: true, // Load data on first visit
    }
  )

  return {
    students: (data || []) as Student[],
    isLoading,
    isError: error,
    mutate
  }
}