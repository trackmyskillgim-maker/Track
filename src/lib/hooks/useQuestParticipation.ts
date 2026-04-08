import useSWR from 'swr'
import { mutate } from 'swr'
import { fetcher } from '@/lib/providers/SWRProvider'

export interface QuestParticipationItem {
  id: string
  title: string
  difficulty: string
  totalQuestions: number
  studentsAttempted: number
  totalStudents: number
  completionRate: number
  averageScore: number
  createdAt: string
  isActive: boolean
}

export interface QuestParticipationData {
  quests: QuestParticipationItem[]
  pagination: {
    currentPage: number
    limit: number
    totalCount: number
    totalPages: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
  filters: {
    sortBy: string
    sortOrder: string
    difficultyFilter: string
  }
}

export interface QuestParticipationFilters {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  difficulty?: string
  year?: string
  course?: string
  section?: string
}

// Create a stable cache key for the filters
function createCacheKey(filters: QuestParticipationFilters) {
  const params = new URLSearchParams()

  // Set defaults
  params.set('page', (filters.page || 1).toString())
  params.set('limit', (filters.limit || 20).toString())
  params.set('sortBy', filters.sortBy || 'studentsAttempted')
  params.set('sortOrder', filters.sortOrder || 'desc')
  params.set('difficulty', filters.difficulty || 'all')

  // Add new filters
  if (filters.year && filters.year !== 'all') params.set('year', filters.year)
  if (filters.course && filters.course !== 'all') params.set('course', filters.course)
  if (filters.section && filters.section !== 'all') params.set('section', filters.section)

  return `/api/admin/quest-participation?${params.toString()}`
}

export function useQuestParticipation(filters: QuestParticipationFilters = {}) {
  const cacheKey = createCacheKey(filters)

  const { data, error, isLoading, mutate: mutateParticipation } = useSWR(
    cacheKey,
    fetcher,
    {
      refreshInterval: 0,
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 10000, // Shorter to force refresh
      shouldRetryOnError: true,
      errorRetryCount: 3,
      errorRetryInterval: 5000,
      keepPreviousData: false, // Don't keep previous data
      fallbackData: undefined,
      revalidateIfStale: true, // Force revalidation if stale
      revalidateOnMount: true, // Force revalidation on mount
    }
  )

  console.log('🔍 [DEBUG] useQuestParticipation - Raw SWR data:', data)
  console.log('🔍 [DEBUG] useQuestParticipation - SWR error:', error)
  console.log('🔍 [DEBUG] useQuestParticipation - SWR loading:', isLoading)
  console.log('🔍 [DEBUG] useQuestParticipation - Cache key:', cacheKey)

  return {
    data: data as QuestParticipationData | undefined,
    quests: data?.quests || [],
    pagination: data?.pagination,
    isLoading,
    isError: error,
    mutate: mutateParticipation,
    cacheKey // Expose for debugging
  }
}

// Helper to invalidate all quest participation data
export function invalidateQuestParticipation() {
  // Invalidate all quest-participation cached data
  mutate(
    (key) => typeof key === 'string' && key.startsWith('/api/admin/quest-participation'),
    undefined,
    { revalidate: true }
  )
}

// Helper to prefetch data for common filter combinations
export function prefetchQuestParticipation(filters: QuestParticipationFilters) {
  const cacheKey = createCacheKey(filters)
  mutate(cacheKey, fetcher(cacheKey))
}

// Optimistic helper for common navigation patterns
export function prefetchCommonFilters() {
  // Prefetch common filter combinations users are likely to use
  const commonFilters = [
    { difficulty: 'all', sortBy: 'studentsAttempted', sortOrder: 'desc' },
    { difficulty: 'Beginner', sortBy: 'studentsAttempted', sortOrder: 'desc' },
    { difficulty: 'Intermediate', sortBy: 'studentsAttempted', sortOrder: 'desc' },
    { difficulty: 'Advanced', sortBy: 'studentsAttempted', sortOrder: 'desc' },
    { difficulty: 'all', sortBy: 'completionRate', sortOrder: 'desc' },
  ] as const

  commonFilters.forEach(filters => {
    prefetchQuestParticipation(filters)
  })
}