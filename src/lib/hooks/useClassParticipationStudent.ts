import useSWR from "swr";
import { fetcher } from "@/lib/providers/SWRProvider";

export function useClassParticipationStudent() {
  // Poll active session every 1s for real-time updates
  // Note: Polling is INTENTIONAL for live session monitoring
  const { data: sessionData, mutate: mutateSession } = useSWR(
    "/api/class-participation/student/active-session",
    fetcher,
    {
      refreshInterval: 1000, // Real-time polling (required for live sessions)
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 500, // Short deduping for real-time data
      shouldRetryOnError: true,
      errorRetryCount: 3,
      errorRetryInterval: 2000,
      keepPreviousData: true, // Show cached data immediately on navigation
      fallbackData: undefined,
    },
  );

  const session = sessionData?.session;
  const hasSession = !!session;

  // Poll queue position every 1s when in a session with a question
  // Conditional: Only polls when there's an active session with a published question
  const shouldPollQueue = hasSession && session?.id && session?.question_id;

  const { data: queueData, mutate: mutateQueue } = useSWR(
    shouldPollQueue
      ? `/api/class-participation/student/queue-position?sessionId=${session.id}&questionId=${session.question_id}`
      : null,
    fetcher,
    {
      refreshInterval: shouldPollQueue ? 1000 : 0, // Only poll when needed
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 500,
      shouldRetryOnError: true,
      errorRetryCount: 3,
      errorRetryInterval: 2000,
      keepPreviousData: true,
      fallbackData: undefined,
    },
  );

  return {
    session,
    hasSession,
    questionPublished: session?.is_published,
    queueData,
    inQueue: queueData?.inQueue,
    hasAccess: queueData?.accessGranted,
    mutateSession,
    mutateQueue,
  };
}
