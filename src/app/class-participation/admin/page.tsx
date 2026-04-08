'use client'

import { useState } from 'react'
import AdminHeader from '@/components/admin/AdminHeader'
import SessionSetupModal from '@/components/class-participation/admin/SessionSetupModal'
import QuestionReviewPanel from '@/components/class-participation/admin/QuestionReviewPanel'
import QueueManagementPanel from '@/components/class-participation/admin/QueueManagementPanel'
import SubmissionsDashboard from '@/components/class-participation/admin/SubmissionsDashboard'
import SessionControls from '@/components/class-participation/admin/SessionControls'
import SessionHistoryList from '@/components/class-participation/admin/SessionHistoryList'
import { useClassParticipationAdmin } from '@/lib/hooks/useClassParticipationAdmin'

export default function ClassParticipationAdmin() {
  const [showSetupModal, setShowSetupModal] = useState(false)

  const {
    currentSession,
    setCurrentSession,
    currentQuestion,
    setCurrentQuestion,
    loading,
    queueData,
    mutateQueue,
    submissionsData,
    mutateSubmissions,
  } = useClassParticipationAdmin()

  const handleSessionCreated = async (session: any) => {
    // Close modal first
    setShowSetupModal(false)

    // Refetch active session from server to ensure consistency
    try {
      const res = await fetch('/api/class-participation/admin/active-sessions')
      const data = await res.json()

      if (data.success && data.session) {
        setCurrentSession(data.session)

        // Fetch any question (published or draft) for this session
        const questionRes = await fetch(`/api/class-participation/admin/question?sessionId=${data.session.id}`)
        const questionData = await questionRes.json()
        if (questionData.success && questionData.question) {
          setCurrentQuestion(questionData.question)
        }
      } else {
        // Fallback to the session passed from modal
        setCurrentSession(session)
      }
    } catch (error) {
      console.error('Failed to refetch active session:', error)
      // Fallback to the session passed from modal
      setCurrentSession(session)
    }
  }

  const handleQuestionGenerated = (question: any) => {
    setCurrentQuestion(question)
  }

  const handleQuestionPublished = () => {
    // Update session status to active
    setCurrentSession({ ...currentSession, status: 'active' })
    // Mark current question as published in state
    if (currentQuestion) {
      setCurrentQuestion({
        ...currentQuestion,
        is_published: true,
        status: 'published',
        published_at: new Date().toISOString()
      })
    }
    mutateQueue()
  }

  const handleQuestionEnded = () => {
    // Clear current question so admin can generate a new one
    setCurrentQuestion(null)
    // Update session to remove current_question_id
    setCurrentSession({ ...currentSession, current_question_id: null })
    // Refresh queue and submissions
    mutateQueue()
    mutateSubmissions()
  }

  const handleSessionEnded = () => {
    setCurrentSession(null)
    setCurrentQuestion(null)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AdminHeader title="Class Participation" />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* New Session Button (when no active session) */}
        {!currentSession && !loading && (
          <div className="mb-6 flex justify-end">
            <button
              onClick={() => setShowSetupModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              + New Session
            </button>
          </div>
        )}

        {loading ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
            <div className="animate-spin text-6xl mb-4">⏳</div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Loading...
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Checking for active sessions
            </p>
          </div>
        ) : !currentSession ? (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
              <div className="text-6xl mb-4">📚</div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No Active Session
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Create a new session to start accepting student submissions
              </p>
              <button
                onClick={() => setShowSetupModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Create Session
              </button>
            </div>

            {/* Past Sessions History */}
            <SessionHistoryList />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Session Info Bar */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {currentSession.topic}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {currentSession.difficulty} • {currentSession.year} • {currentSession.course} {currentSession.section}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    currentSession.status === 'active'
                      ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                      : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                  }`}>
                    {currentSession.status === 'active' ? '🟢 Active' : '🟡 Draft'}
                  </span>
                </div>
              </div>
            </div>

            {/* Question Review Panel - Show when no question OR question is unpublished */}
            {(!currentQuestion || (currentQuestion && !currentQuestion.is_published)) && (
              <QuestionReviewPanel
                sessionId={currentSession.id}
                session={currentSession}
                currentQuestion={currentQuestion}
                onQuestionGenerated={handleQuestionGenerated}
                onQuestionPublished={handleQuestionPublished}
                onSessionEnded={handleSessionEnded}
                onQuestionEnded={handleQuestionEnded}
              />
            )}

            {/* Active Session View - Only show when there's a published question */}
            {currentSession.status === 'active' && currentQuestion && currentQuestion.is_published && (
              <>
                {/* Published Question Display with Previous Questions Toggle */}
                <QuestionReviewPanel
                  sessionId={currentSession.id}
                  session={currentSession}
                  currentQuestion={currentQuestion}
                  onQuestionGenerated={handleQuestionGenerated}
                  onQuestionPublished={handleQuestionPublished}
                  onSessionEnded={handleSessionEnded}
                  onQuestionEnded={handleQuestionEnded}
                />

                {/* Session Controls */}
                <SessionControls
                  session={currentSession}
                  currentQuestion={currentQuestion}
                  onSessionEnded={handleSessionEnded}
                  onQuestionEnded={handleQuestionEnded}
                  onSettingsChanged={() => {
                    setCurrentSession({
                      ...currentSession,
                      auto_advance_enabled: !currentSession.auto_advance_enabled
                    })
                  }}
                />

                {/* Queue Management */}
                <QueueManagementPanel
                  sessionId={currentSession.id}
                  queue={queueData?.queue || []}
                  autoAdvanceEnabled={currentSession.auto_advance_enabled}
                  onQueueUpdate={mutateQueue}
                />

                {/* Submissions Dashboard */}
                <SubmissionsDashboard
                  sessionId={currentSession.id}
                  submissions={{ questions: submissionsData?.submissions || [] }}
                  onSubmissionUpdate={mutateSubmissions}
                  userRole="admin"
                />
              </>
            )}
          </div>
        )}
      </div>

      {/* Session Setup Modal */}
      {showSetupModal && (
        <SessionSetupModal
          onClose={() => setShowSetupModal(false)}
          onSessionCreated={handleSessionCreated}
        />
      )}
    </div>
  )
}