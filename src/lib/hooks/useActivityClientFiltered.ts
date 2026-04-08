import useSWR from 'swr'
import { mutate } from 'swr'
import { fetcher } from '@/lib/providers/SWRProvider'
import { useMemo } from 'react'

export interface ActivityItem {
  id: string
  student: {
    username: string
  }
  quest: {
    title: string
  }
  question: {
    title: string
    points: number
  }
  points: number
  submittedAt: string
  isCorrect: boolean
}

export interface ActivityFilters {
  page?: number
  limit?: number
  dateFilter?: string
  customStartDate?: string
  customEndDate?: string
}

export interface ActivityData {
  activities: ActivityItem[]
  pagination: {
    currentPage: number
    limit: number
    totalCount: number
    totalPages: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
  filters: {
    dateFilter: string
    customStartDate?: string
    customEndDate?: string
  }
}

// Client-side date filtering function
function filterActivitiesByDate(
  activities: ActivityItem[],
  dateFilter: string,
  customStartDate?: string,
  customEndDate?: string
): ActivityItem[] {
  if (dateFilter === 'all') return activities

  const now = new Date()

  return activities.filter(activity => {
    const activityDate = new Date(activity.submittedAt)

    switch (dateFilter) {
      case 'today': {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        return activityDate >= today
      }
      case 'week': {
        const weekAgo = new Date()
        weekAgo.setDate(now.getDate() - 7)
        return activityDate >= weekAgo
      }
      case 'month': {
        const monthAgo = new Date()
        monthAgo.setDate(now.getDate() - 30)
        return activityDate >= monthAgo
      }
      case 'custom': {
        if (!customStartDate || !customEndDate) return true
        const startDate = new Date(customStartDate)
        startDate.setHours(0, 0, 0, 0)
        const endDate = new Date(customEndDate)
        endDate.setHours(23, 59, 59, 999)
        return activityDate >= startDate && activityDate <= endDate
      }
      default:
        return true
    }
  })
}

// Client-side pagination function
function paginateActivities(activities: ActivityItem[], page: number, limit: number) {
  const totalCount = activities.length
  const totalPages = Math.ceil(totalCount / limit)
  const startIndex = (page - 1) * limit
  const endIndex = startIndex + limit
  const paginatedActivities = activities.slice(startIndex, endIndex)

  return {
    activities: paginatedActivities,
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
 * Hook that fetches ALL activity data once and applies filtering/pagination client-side.
 * This eliminates API calls when changing filters or pages.
 */
export function useActivityClientFiltered(filters: ActivityFilters = {}) {
  // Set defaults
  const page = filters.page || 1
  const limit = filters.limit || 20
  const dateFilter = filters.dateFilter || 'all'
  const customStartDate = filters.customStartDate
  const customEndDate = filters.customEndDate

  // Fetch ALL data once - no filter parameters in API call
  const { data, error, isLoading, mutate: mutateActivity } = useSWR(
    '/api/admin/activity-all', // New endpoint that returns ALL data
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

  console.log('🔍 [DEBUG] useActivityClientFiltered - Raw SWR data:', data)
  console.log('🔍 [DEBUG] useActivityClientFiltered - SWR error:', error)
  console.log('🔍 [DEBUG] useActivityClientFiltered - SWR loading:', isLoading)

  // Process data client-side using useMemo for performance
  const processedData = useMemo(() => {
    // SWRProvider fetcher already extracted data from success wrapper
    if (!data?.activities || !Array.isArray(data.activities)) {
      console.log('🔍 [DEBUG] useActivityClientFiltered - No activities found in data:', data)
      return {
        activities: [],
        pagination: {
          currentPage: page,
          limit,
          totalCount: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false
        },
        filters: {
          dateFilter,
          customStartDate,
          customEndDate
        }
      }
    }

    console.log('🔍 [DEBUG] useActivityClientFiltered - Found activities:', data.activities.length)

    // Step 1: Filter by date
    const filteredActivities = filterActivitiesByDate(data.activities, dateFilter, customStartDate, customEndDate)
    console.log('🔍 [DEBUG] useActivityClientFiltered - After date filter:', filteredActivities.length)

    // Step 2: Paginate the filtered results
    const paginatedResult = paginateActivities(filteredActivities, page, limit)

    return {
      activities: paginatedResult.activities,
      pagination: paginatedResult.pagination,
      filters: {
        dateFilter,
        customStartDate,
        customEndDate
      }
    }
  }, [data, page, limit, dateFilter, customStartDate, customEndDate])

  return {
    data: processedData,
    activities: processedData.activities,
    pagination: processedData.pagination,
    isLoading,
    isError: error,
    mutate: mutateActivity,
    // Expose raw data for debugging
    rawData: data
  }
}

// Helper to refresh all activity data
export function refreshActivity() {
  mutate('/api/admin/activity-all')
}