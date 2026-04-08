'use client'

import { useParams, useRouter } from 'next/navigation'
import StudentHeader from '@/components/student/StudentHeader'
import useSWR from 'swr'
import QueueManagementPanel from '@/components/class-participation/admin/QueueManagementPanel'
import SubmissionsDashboard from '@/components/class-participation/admin/SubmissionsDashboard'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function CRSessionManagement() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.sessionId as string

  // Fetch session details
  const { data: sessionData, isLoading: loadingSession } = useSWR(
    sessionId ? `/api/class-participation/admin/session-details?sessionId=${sessionId}` : null,
    fetcher,
    { refreshInterval: 5000 }
  )

  // Fetch current question
  const { data: questionData } = useSWR(
    sessionId ? `/api/class-participation/admin/question?sessionId=${sessionId}` : null,
    fetcher,
    { refreshInterval: 5000 }
  )

  // Poll queue every 1s
  const { data: queueData, mutate: mutateQueue } = useSWR(
    sessionId ? `/api/class-participation/admin/queue?sessionId=${sessionId}` : null,
    fetcher,
    { refreshInterval: 1000 }
  )

  // Poll submissions every 2s
  const { data: submissionsData, mutate: mutateSubmissions } = useSWR(
    sessionId ? `/api/class-participation/admin/submissions?sessionId=${sessionId}` : null,
    fetcher,
    { refreshInterval: 2000 }
  )

  const currentSession = sessionData?.session
  const currentQuestion = questionData?.question

  if (loadingSession) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <StudentHeader title="Manage Session" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12 text-gray-900 dark:text-white">Loading session...</div>
        </div>
      </div>
    )
  }

  if (!currentSession) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <StudentHeader title="Manage Session" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded mb-4">
            Session not found or you don&apos;t have permission to manage it.
          </div>
          <button
            onClick={() => router.push('/class-participation/cr')}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
          >
            ← Back to CR Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <StudentHeader title="Manage Session" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back button */}
        <button
          onClick={() => router.push('/class-participation/cr')}
          className="mb-4 text-blue-600 hover:text-blue-700 flex items-center gap-2"
        >
          ← Back to CR Dashboard
        </button>

        {/* CR Info Banner */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <div className="text-2xl mr-3">👨‍🏫</div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-yellow-900 dark:text-yellow-200 mb-1">CR Queue Management</h3>
              <p className="text-xs text-yellow-800 dark:text-yellow-300">
                You can manage the student queue and view submissions. Session control (create/end/generate questions) is restricted to admins.
              </p>
            </div>
          </div>
        </div>

        {/* Session Info Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {currentSession.topic}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {currentSession.difficulty} • {currentSession.year} • {currentSession.course} {currentSession.section}
                {currentSession.subject_name && ` • ${currentSession.subject_name}`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                currentSession.status === 'active'
                  ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                  : currentSession.status === 'waiting'
                  ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                  : 'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200'
              }`}>
                {currentSession.status === 'active' ? '🟢 Active' :
                 currentSession.status === 'waiting' ? '🟡 Waiting' :
                 '🔴 Ended'}
              </span>
            </div>
          </div>
        </div>

        {/* Current Question Display (matching admin layout) */}
        {currentQuestion && currentQuestion.is_published && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Current Question
              </h3>
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                🟢 Published
              </span>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <pre className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200 font-mono">
                {currentQuestion.question_text}
              </pre>
            </div>
          </div>
        )}

        {/* Queue Management Panel - Full Width (matching admin layout) */}
        <div className="mb-6">
          <QueueManagementPanel
            sessionId={sessionId}
            queue={queueData?.queue || []}
            onQueueUpdate={mutateQueue}
            autoAdvanceEnabled={currentSession.auto_advance_enabled || false}
          />
        </div>

        {/* Submissions Dashboard - Full Width (matching admin layout) */}
        <div className="mb-6">
          <SubmissionsDashboard
            sessionId={sessionId}
            submissions={{ questions: submissionsData?.submissions || [] }}
            onSubmissionUpdate={mutateSubmissions}
            userRole="student"
          />
        </div>
      </div>
    </div>
  )
}
