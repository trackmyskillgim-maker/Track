'use client'

import { useState } from 'react'

interface SessionControlsProps {
  session: any
  currentQuestion?: any
  onSessionEnded: () => void
  onQuestionEnded?: () => void
  onSettingsChanged: () => void
}

export default function SessionControls({
  session,
  currentQuestion,
  onSessionEnded,
  onQuestionEnded,
  onSettingsChanged
}: SessionControlsProps) {
  const [endingSession, setEndingSession] = useState(false)
  const [endingQuestion, setEndingQuestion] = useState(false)
  const [showEndConfirm, setShowEndConfirm] = useState(false)
  const [showEndQuestionConfirm, setShowEndQuestionConfirm] = useState(false)

  const handleToggleAutoAdvance = async () => {
    try {
      const res = await fetch('/api/class-participation/admin/toggle-auto-advance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          enabled: !session.auto_advance_enabled
        })
      })

      if (res.ok) {
        onSettingsChanged()
      }
    } catch (error) {
      console.error('Toggle auto-advance error:', error)
    }
  }

  const handleEndQuestion = async () => {
    if (!currentQuestion || !onQuestionEnded) return

    setEndingQuestion(true)
    try {
      const res = await fetch('/api/class-participation/admin/end-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          questionId: currentQuestion.id
        })
      })

      if (res.ok) {
        onQuestionEnded()
        setShowEndQuestionConfirm(false)
      }
    } catch (error) {
      console.error('End question error:', error)
    } finally {
      setEndingQuestion(false)
    }
  }

  const handleEndSession = async () => {
    setEndingSession(true)
    try {
      const res = await fetch('/api/class-participation/admin/end-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id })
      })

      const data = await res.json()

      if (res.ok && data.success) {
        // Download report as JSON
        const reportBlob = new Blob([JSON.stringify(data.report, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(reportBlob)
        const a = document.createElement('a')
        a.href = url
        a.download = `session-report-${session.id}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        onSessionEnded()
        setShowEndConfirm(false)
      }
    } catch (error) {
      console.error('End session error:', error)
    } finally {
      setEndingSession(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          {/* Auto-Advance Toggle */}
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={session.auto_advance_enabled}
              onChange={handleToggleAutoAdvance}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Auto-advance Queue
            </span>
          </label>
        </div>

        <div className="flex items-center space-x-3">
          {/* End Current Question Button */}
          {currentQuestion && (
            <button
              onClick={() => setShowEndQuestionConfirm(true)}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors"
            >
              End Current Question
            </button>
          )}

          {/* End Session Button */}
          <button
            onClick={() => setShowEndConfirm(true)}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
          >
            End Session
          </button>
        </div>
      </div>

      {/* End Question Confirmation Modal */}
      {showEndQuestionConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              End Current Question?
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              This will close the current question and mark any remaining students in the queue as skipped. You can then generate and publish a new question.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowEndQuestionConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                disabled={endingQuestion}
              >
                Cancel
              </button>
              <button
                onClick={handleEndQuestion}
                className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                disabled={endingQuestion}
              >
                {endingQuestion ? 'Ending...' : 'End Question'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* End Session Confirmation Modal */}
      {showEndConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              End Session?
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              This will close the session, stop accepting new submissions, and generate a final report. This action cannot be undone.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowEndConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                disabled={endingSession}
              >
                Cancel
              </button>
              <button
                onClick={handleEndSession}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                disabled={endingSession}
              >
                {endingSession ? 'Ending...' : 'End Session'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}