import useSWR from 'swr'
import { mutate } from 'swr'
import { fetcher } from '@/lib/providers/SWRProvider'

export interface AdminQuestion {
  id: string
  title: string
  description: string
  task: string
  starter_code: string | null
  hint: string | null
  expected_output: string
  function_name: string | null
  solution_code: string | null
  points: number
  max_attempts: number | null
  time_limit_seconds: number | null
  order_index: number
  difficulty: 'Easy' | 'Medium' | 'Hard'
  tags: string[] | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface QuestInfo {
  id: string
  title: string
  description: string
}

// Hook for quest details
export function useQuestInfo(questId: string) {
  const { data, error, isLoading, mutate: mutateQuest } = useSWR(
    questId ? `/api/admin/quests/${questId}` : null,
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
    quest: data as QuestInfo | undefined,
    isLoading,
    isError: error,
    mutate: mutateQuest
  }
}

// Hook for questions within a quest
export function useQuestQuestions(questId: string) {
  const { data, error, isLoading, mutate: mutateQuestions } = useSWR(
    questId ? `/api/admin/quests/${questId}/questions` : null,
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
    questions: (data || []) as AdminQuestion[],
    isLoading,
    isError: error,
    mutate: mutateQuestions
  }
}

// Combined hook for both quest and questions
export function useQuestWithQuestions(questId: string) {
  const questInfo = useQuestInfo(questId)
  const questionsData = useQuestQuestions(questId)

  return {
    quest: questInfo.quest,
    questions: questionsData.questions,
    isLoadingQuest: questInfo.isLoading,
    isLoadingQuestions: questionsData.isLoading,
    isLoading: questInfo.isLoading || questionsData.isLoading,
    questError: questInfo.isError,
    questionsError: questionsData.isError,
    isError: questInfo.isError || questionsData.isError,
    mutateQuest: questInfo.mutate,
    mutateQuestions: questionsData.mutate
  }
}

// Helper functions for question management
export function invalidateQuestQuestions(questId: string) {
  mutate(`/api/admin/quests/${questId}/questions`)
}

export function invalidateQuestInfo(questId: string) {
  mutate(`/api/admin/quests/${questId}`)
}

// Optimistic update for question creation
export function addQuestionOptimistic(questId: string, newQuestion: AdminQuestion) {
  mutate(
    `/api/admin/quests/${questId}/questions`,
    (current: AdminQuestion[] | undefined) => {
      if (!current) return [newQuestion]
      return [...current, newQuestion].sort((a, b) => a.order_index - b.order_index)
    },
    false // Don't revalidate immediately
  )
}

// Optimistic update for question deletion
export function removeQuestionOptimistic(questId: string, questionId: string) {
  mutate(
    `/api/admin/quests/${questId}/questions`,
    (current: AdminQuestion[] | undefined) => {
      if (!current) return []
      return current.filter(question => question.id !== questionId)
    },
    false // Don't revalidate immediately
  )
}

// Optimistic update for question editing
export function updateQuestionOptimistic(questId: string, questionId: string, updates: Partial<AdminQuestion>) {
  mutate(
    `/api/admin/quests/${questId}/questions`,
    (current: AdminQuestion[] | undefined) => {
      if (!current) return []
      return current.map(question =>
        question.id === questionId ? { ...question, ...updates } : question
      )
    },
    false // Don't revalidate immediately
  )
}