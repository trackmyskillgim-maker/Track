import useSWR from 'swr'
import { mutate } from 'swr'
import { fetcher } from '@/lib/providers/SWRProvider'
import { useMemo } from 'react'

export interface QuestParticipationItem {
  id: string
  title: string
  difficulty: string
  totalQuestions: number
  studentsAttempted: number
  totalStudents: number
  completionRate: number
  createdAt: string
  isActive: boolean
}

export interface QuestParticipationFilters {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  difficulty?: string
  status?: string
  search?: string
  batch?: string
  course?: string
  section?: string
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

// Client-side filtering and sorting functions
function filterQuests(
  quests: QuestParticipationItem[],
  difficulty: string,
  status: string,
  search: string
): QuestParticipationItem[] {
  let filtered = quests

  // Filter by difficulty
  if (difficulty !== 'all') {
    filtered = filtered.filter(quest => quest.difficulty === difficulty)
  }

  // Filter by status
  if (status !== 'all') {
    if (status === 'active') {
      filtered = filtered.filter(quest => quest.isActive)
    } else if (status === 'archived') {
      filtered = filtered.filter(quest => !quest.isActive)
    }
  }

  // Filter by search query
  if (search.trim()) {
    const searchLower = search.toLowerCase().trim()
    filtered = filtered.filter(quest =>
      quest.title.toLowerCase().includes(searchLower)
    )
  }

  return filtered
}

function sortQuests(quests: QuestParticipationItem[], sortBy: string, sortOrder: 'asc' | 'desc'): QuestParticipationItem[] {
  return [...quests].sort((a, b) => {
    let aValue: any
    let bValue: any

    switch (sortBy) {
      case 'studentsAttempted':
        aValue = a.studentsAttempted
        bValue = b.studentsAttempted
        break
      case 'completionRate':
        aValue = a.completionRate
        bValue = b.completionRate
        break
      case 'createdAt':
        aValue = new Date(a.createdAt).getTime()
        bValue = new Date(b.createdAt).getTime()
        break
      default:
        aValue = a.studentsAttempted
        bValue = b.studentsAttempted
    }

    if (sortOrder === 'desc') {
      return bValue - aValue
    } else {
      return aValue - bValue
    }
  })
}

function paginateQuests(quests: QuestParticipationItem[], page: number, limit: number) {
  const totalCount = quests.length
  const totalPages = Math.ceil(totalCount / limit)
  const startIndex = (page - 1) * limit
  const endIndex = startIndex + limit
  const paginatedQuests = quests.slice(startIndex, endIndex)

  return {
    quests: paginatedQuests,
    pagination: {
      currentPage: page,
      limit,
      totalCount,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1
    }
  }
}

/**
 * Hook that fetches ALL quest participation data once and applies filtering/sorting client-side.
 * This eliminates API calls when changing filters, sorts, or pages.
 */
export function useQuestParticipationClientFiltered(filters: QuestParticipationFilters = {}) {
  // Set defaults
  const page = filters.page || 1
  const limit = filters.limit || 20
  const sortBy = filters.sortBy || 'studentsAttempted'
  const sortOrder = filters.sortOrder || 'desc'
  const difficulty = filters.difficulty || 'all'
  const status = filters.status || 'all'
  const search = filters.search || ''
  const batch = filters.batch || 'all'
  const course = filters.course || 'all'
  const section = filters.section || 'all'

  // Build query string with batch/course/section filters (these affect backend data, not client filtering)
  const params = new URLSearchParams()
  if (batch && batch !== 'all') params.append('batch', batch)
  if (course && course !== 'all') params.append('course', course)
  if (section && section !== 'all') params.append('section', section)

  const queryString = params.toString()
  const apiUrl = queryString
    ? `/api/admin/quest-participation-all?${queryString}`
    : '/api/admin/quest-participation-all'

  // Fetch ALL data once - year/course/section filters affect backend, others are client-side
  const { data, error, isLoading, mutate: mutateParticipation } = useSWR(
    apiUrl,
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

  console.log('🔍 [DEBUG] useQuestParticipationClientFiltered - Raw SWR data:', data)
  console.log('🔍 [DEBUG] useQuestParticipationClientFiltered - SWR error:', error)
  console.log('🔍 [DEBUG] useQuestParticipationClientFiltered - SWR loading:', isLoading)

  // Process data client-side using useMemo for performance
  const processedData = useMemo(() => {
    // SWRProvider fetcher already extracted data from success wrapper
    if (!data?.quests || !Array.isArray(data.quests)) {
      console.log('🔍 [DEBUG] useQuestParticipationClientFiltered - No quests found in data:', data)
      return {
        quests: [],
        pagination: {
          currentPage: page,
          limit,
          totalCount: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false
        },
        filters: {
          sortBy,
          sortOrder,
          difficultyFilter: difficulty
        }
      }
    }

    console.log('🔍 [DEBUG] useQuestParticipationClientFiltered - Found quests:', data.quests.length)

    // Step 1: Apply all filters
    const filteredQuests = filterQuests(data.quests, difficulty, status, search)

    // Step 2: Sort the filtered results
    const sortedQuests = sortQuests(filteredQuests, sortBy, sortOrder)

    // Step 3: Paginate the sorted results
    const paginatedResult = paginateQuests(sortedQuests, page, limit)

    return {
      quests: paginatedResult.quests,
      pagination: paginatedResult.pagination,
      filters: {
        sortBy,
        sortOrder,
        difficultyFilter: difficulty
      }
    }
  }, [data, page, limit, sortBy, sortOrder, difficulty, status, search])

  return {
    data: processedData,
    quests: processedData.quests,
    pagination: processedData.pagination,
    isLoading,
    isError: error,
    mutate: mutateParticipation,
    // Expose raw data for debugging
    rawData: data
  }
}

// Helper to refresh all quest participation data
export function refreshQuestParticipation() {
  mutate('/api/admin/quest-participation-all')
}