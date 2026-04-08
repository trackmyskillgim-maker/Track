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

interface Quest {
  id: string
  title: string
  description: string
  difficulty: string
  estimatedTime: string
  totalQuestions: number
  completedQuestions: number
  maxPossiblePoints: number
  earnedPoints: number
  completionPercentage: number
  status: 'locked' | 'available' | 'in_progress' | 'completed'
  isUnlocked: boolean
  orderIndex: number
}

export function useQuests() {
  const { data, error, isLoading, mutate: mutateQuests } = useSWR(
    '/api/student/quests', // Use non-optimized endpoint with all fixes
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
    quests: (data?.quests || []) as Quest[],
    isLoading,
    isError: error,
    mutate: mutateQuests
  }
}

// Helper to invalidate quests cache after submission
export function invalidateQuests() {
  mutate('/api/student/quests')
}

// Optimistic update helper for quest progress
export function updateQuestProgress(questId: string, updates: Partial<Quest>) {
  mutate(
    '/api/student/quests',
    (current: any) => {
      if (!current?.quests) return current

      const updatedQuests = current.quests.map((quest: Quest) =>
        quest.id === questId ? { ...quest, ...updates } : quest
      )

      return { ...current, quests: updatedQuests }
    },
    false // Don't revalidate immediately
  )
}