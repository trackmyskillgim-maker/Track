import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { fetcher } from '@/lib/providers/SWRProvider'

export function useClassParticipationAdmin() {
  const [currentSession, setCurrentSession] = useState<any>(null)
  const [currentQuestion, setCurrentQuestion] = useState<any>(null)

  // Fetch active session with SWR caching
  const { data: activeSessionData, isLoading: loadingSession } = useSWR(
    '/api/class-participation/admin/active-sessions',
    fetcher,
    {
      refreshInterval: 0,
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60000,  // 60s cache
      shouldRetryOnError: true,
      errorRetryCount: 3,
      errorRetryInterval: 5000,
      keepPreviousData: true,  // Show cached data immediately
      fallbackData: undefined,
    }
  )

  // Fetch question for the session with SWR caching
  const { data: questionData, isLoading: loadingQuestion } = useSWR(
    activeSessionData?.session?.id ? `/api/class-participation/admin/question?sessionId=${activeSessionData.session.id}` : null,
    fetcher,
    {
      refreshInterval: 0,
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60000,  // 60s cache
      shouldRetryOnError: true,
      errorRetryCount: 3,
      errorRetryInterval: 5000,
      keepPreviousData: true,
      fallbackData: undefined,
    }
  )

  // Update local state when SWR data changes
  useEffect(() => {
    if (activeSessionData?.session) {
      setCurrentSession(activeSessionData.session)
    }
  }, [activeSessionData])

  useEffect(() => {
    if (questionData?.question) {
      setCurrentQuestion(questionData.question)
    }
  }, [questionData])

  const loading = loadingSession || loadingQuestion

  // Poll queue every 1s when session is active for real-time updates
  // Conditional: Only polls when session status is 'active'
  const shouldPollQueue = currentSession?.status === 'active'

  const { data: queueData, mutate: mutateQueue } = useSWR(
    currentSession?.id ? `/api/class-participation/admin/queue?sessionId=${currentSession.id}` : null,
    fetcher,
    {
      refreshInterval: shouldPollQueue ? 1000 : 0,  // Only poll when active
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 500,                         // Short deduping for real-time data
      shouldRetryOnError: true,
      errorRetryCount: 3,
      errorRetryInterval: 2000,
      keepPreviousData: true,                        // Show cached data immediately
      fallbackData: undefined,
    }
  )

  // Poll submissions every 2s when session is active
  // Conditional: Only polls when session status is 'active'
  const shouldPollSubmissions = currentSession?.status === 'active'

  const { data: submissionsData, mutate: mutateSubmissions } = useSWR(
    currentSession?.id ? `/api/class-participation/admin/submissions?sessionId=${currentSession.id}` : null,
    fetcher,
    {
      refreshInterval: shouldPollSubmissions ? 2000 : 0,  // Only poll when active
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 1000,
      shouldRetryOnError: true,
      errorRetryCount: 3,
      errorRetryInterval: 2000,
      keepPreviousData: true,
      fallbackData: undefined,
    }
  )

  return {
    currentSession,
    setCurrentSession,
    currentQuestion,
    setCurrentQuestion,
    loading,
    queueData,
    mutateQueue,
    submissionsData,
    mutateSubmissions,
  }
}
