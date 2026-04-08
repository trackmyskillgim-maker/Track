import useSWR from 'swr'
import { mutate } from 'swr'
import { fetcher } from '@/lib/providers/SWRProvider'

export interface AdminQuest {
  id: string
  title: string
  description: string
  difficulty: string
  estimatedTime: string
  orderIndex: number
  isActive: boolean
  createdAt: string
  totalQuestions: number
  totalCompletions: number
  studentsAttempted: number
}

export function useAdminQuests() {
  const { data, error, isLoading, mutate: mutateQuests } = useSWR(
    '/api/admin/quests',
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

  return {
    quests: (data || []) as AdminQuest[], // SWRProvider fetcher already extracted data from success wrapper
    isLoading,
    isError: error,
    mutate: mutateQuests
  }
}

// Helper functions for quest management
export function invalidateAdminQuests() {
  mutate('/api/admin/quests')
}

// Optimistic update for quest creation
export function addQuestOptimistic(newQuest: AdminQuest) {
  mutate(
    '/api/admin/quests',
    (current: any) => {
      if (!current?.data) return { success: true, data: [newQuest] }
      return { ...current, data: [...current.data, newQuest] }
    },
    false // Don't revalidate immediately
  )
}

// Optimistic update for quest deletion
export function removeQuestOptimistic(questId: string) {
  mutate(
    '/api/admin/quests',
    (current: any) => {
      if (!current?.data) return { success: true, data: [] }
      return { ...current, data: current.data.filter((quest: AdminQuest) => quest.id !== questId) }
    },
    false // Don't revalidate immediately
  )
}

// Optimistic update for quest editing
export function updateQuestOptimistic(questId: string, updates: Partial<AdminQuest>) {
  mutate(
    '/api/admin/quests',
    (current: any) => {
      if (!current?.data) return { success: true, data: [] }
      return {
        ...current,
        data: current.data.map((quest: AdminQuest) =>
          quest.id === questId ? { ...quest, ...updates } : quest
        )
      }
    },
    false // Don't revalidate immediately
  )
}