'use client'

import { useState, useEffect } from 'react'

interface QuestionReviewPanelProps {
  sessionId: string
  session: any
  currentQuestion: any
  onQuestionGenerated: (question: any) => void
  onQuestionPublished: () => void
  onSessionEnded: () => void
  onQuestionEnded: () => void
}

export default function QuestionReviewPanel({
  sessionId,
  session,
  currentQuestion,
  onQuestionGenerated,
  onQuestionPublished,
  onSessionEnded,
  onQuestionEnded
}: QuestionReviewPanelProps) {
  const [loading, setLoading] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [showPreGenForm, setShowPreGenForm] = useState(false)
  const [editTopic, setEditTopic] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editDifficulty, setEditDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Easy')
  const [error, setError] = useState('')
  const [previousQuestions, setPreviousQuestions] = useState<any[]>([])
  const [showPrevious, setShowPrevious] = useState(false)
  const [endingSession, setEndingSession] = useState(false)
  const [endingQuestion, setEndingQuestion] = useState(false)
  const [showEndConfirm, setShowEndConfirm] = useState(false)
  const [showEndQuestionConfirm, setShowEndQuestionConfirm] = useState(false)

  // Fetch all questions for this session
  useEffect(() => {
    const fetchAllQuestions = async () => {
      try {
        const res = await fetch(`/api/class-participation/admin/all-questions?sessionId=${sessionId}`)
        const data = await res.json()
        if (data.success && data.questions) {
          setPreviousQuestions(data.questions)
        }
      } catch (err) {
        console.error('Failed to fetch previous questions:', err)
      }
    }
    fetchAllQuestions()
  }, [sessionId, currentQuestion])

  const handleGenerate = async (customTopic?: string, customDifficulty?: string, customDescription?: string) => {
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/class-participation/admin/generate-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          ...(customTopic && { topic: customTopic }),
          ...(customDifficulty && { difficulty: customDifficulty }),
          ...(customDescription !== undefined && { description: customDescription })
        })
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to generate question')
      }

      onQuestionGenerated(data.question)
      setShowEditForm(false)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handlePublish = async () => {
    if (!currentQuestion) return

    setPublishing(true)
    setError('')

    try {
      const res = await fetch('/api/class-participation/admin/publish-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          questionId: currentQuestion.id
        })
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to publish question')
      }

      onQuestionPublished()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setPublishing(false)
    }
  }

  const handleEditRegenerate = () => {
    // Topic stays the same, only description and difficulty can change
    handleGenerate(undefined, editDifficulty, editDescription)
  }

  const handleEndQuestion = async () => {
    if (!currentQuestion) return

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

  // If question is published, show published view
  if (currentQuestion && currentQuestion.is_published) {
    const filteredPreviousQuestions = previousQuestions.filter((q: any) => q.id !== currentQuestion.id)

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Current Question
          </h3>
          <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
            🟢 Published
          </span>
        </div>
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-4">
          <pre className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200 font-mono">
            {currentQuestion.question_text}
          </pre>
        </div>

        {/* Previous Questions Section - Show below current question */}
        {filteredPreviousQuestions.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setShowPrevious(!showPrevious)}
              className="flex items-center justify-between w-full text-left"
            >
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                📚 Previous Questions in this Session ({filteredPreviousQuestions.length})
              </span>
              <span className="text-gray-500">{showPrevious ? '▼' : '▶'}</span>
            </button>
            {showPrevious && (
              <div className="mt-3 space-y-2">
                {filteredPreviousQuestions.map((q: any) => (
                  <div key={q.id} className="bg-gray-50 dark:bg-gray-900 rounded p-3 text-sm">
                    <div className="flex items-start justify-between mb-2">
                      <span className="font-medium text-gray-900 dark:text-white">
                        Question {q.order_index}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        q.is_published
                          ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                          : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                      }`}>
                        {q.is_published ? 'Published' : 'Draft'}
                      </span>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 line-clamp-3">
                      {q.question_text}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // Otherwise show generation/draft view
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Question Generation
        </h3>

        {/* Action Buttons */}
        <div className="flex items-center space-x-3">
          {/* End Current Question Button - only show if there's a published question */}
          {currentQuestion && currentQuestion.is_published && (
            <button
              onClick={() => setShowEndQuestionConfirm(true)}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors text-sm"
            >
              End Current Question
            </button>
          )}

          {/* End Session Button */}
          <button
            onClick={() => setShowEndConfirm(true)}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors text-sm"
          >
            End Session
          </button>
        </div>
      </div>

      {!currentQuestion ? (
        <div className="py-6">
          {!showPreGenForm ? (
            <div className="text-center">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Generate a coding question using Gemini AI
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => handleGenerate()}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {loading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Generating...
                    </span>
                  ) : (
                    '✨ Generate with Session Topic'
                  )}
                </button>
                <button
                  onClick={() => setShowPreGenForm(true)}
                  disabled={loading}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  📝 Custom Topic
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                Generate Question with Custom Topic
              </h4>
              {error && (
                <div className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 p-3 rounded-lg text-sm mb-4">
                  {error}
                </div>
              )}
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Topic
                  </label>
                  <input
                    type="text"
                    value={editTopic}
                    onChange={(e) => setEditTopic(e.target.value)}
                    placeholder="e.g., python if statement, loops, functions"
                    className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description (Optional)
                  </label>
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Provide additional context or specific requirements for the question"
                    rows={3}
                    className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Difficulty
                  </label>
                  <select
                    value={editDifficulty}
                    onChange={(e) => setEditDifficulty(e.target.value as any)}
                    className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
                <div className="flex space-x-2 pt-2">
                  <button
                    onClick={() => {
                      if (editTopic) {
                        handleGenerate(editTopic, editDifficulty, editDescription)
                        setShowPreGenForm(false)
                        setEditTopic('')
                        setEditDescription('')
                      }
                    }}
                    disabled={loading || !editTopic}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Generating...' : '✨ Generate Question'}
                  </button>
                  <button
                    onClick={() => {
                      setShowPreGenForm(false)
                      setEditTopic('')
                      setEditDescription('')
                    }}
                    disabled={loading}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div>
          {/* Generated Question Display */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-4">
            <pre className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200 font-mono">
              {currentQuestion.question_text}
            </pre>
          </div>

          {error && (
            <div className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 p-3 rounded-lg text-sm mb-4">
              {error}
            </div>
          )}

          {/* Edit Form */}
          {showEditForm && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-4">
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                Regenerate with Custom Parameters
              </h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Provide additional context or specific requirements for the question"
                    rows={3}
                    className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Difficulty
                  </label>
                  <select
                    value={editDifficulty}
                    onChange={(e) => setEditDifficulty(e.target.value as any)}
                    className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={handleEditRegenerate}
                    disabled={loading}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                  >
                    Regenerate
                  </button>
                  <button
                    onClick={() => {
                      setShowEditForm(false)
                      setEditDescription('')
                    }}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={() => handleGenerate()}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              🔄 Regenerate (Same)
            </button>
            <button
              onClick={() => setShowEditForm(!showEditForm)}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              ✏️ Edit & Regenerate
            </button>
            <button
              onClick={handlePublish}
              disabled={publishing}
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {publishing ? 'Publishing...' : '✅ Confirm & Publish'}
            </button>
          </div>
        </div>
      )}

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