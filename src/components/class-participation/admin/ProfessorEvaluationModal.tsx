'use client'

import { useState, useEffect } from 'react'

interface Submission {
  submission_id: string
  user_id: string
  username: string
  roll_number?: string
  code: string
  result: string
  gemini_feedback: string
  xp_awarded: number
  submitted_at: string
  session_submission_count?: number
}

interface ProfessorEvaluationModalProps {
  isOpen: boolean
  onClose: () => void
  submissions: Submission[]
  onEvaluate: (submissionId: string, approved: boolean, points: number) => Promise<void>
}

export default function ProfessorEvaluationModal({
  isOpen,
  onClose,
  submissions,
  onEvaluate
}: ProfessorEvaluationModalProps) {
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null)
  const [showAIFeedback, setShowAIFeedback] = useState(false)
  const [points, setPoints] = useState(100)
  const [isEvaluating, setIsEvaluating] = useState(false)

  // Set first submission as selected when modal opens
  useEffect(() => {
    if (isOpen && submissions.length > 0 && !selectedSubmissionId) {
      setSelectedSubmissionId(submissions[0].submission_id)
    }
  }, [isOpen, submissions, selectedSubmissionId])

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedSubmissionId(null)
      setShowAIFeedback(false)
      setPoints(100)
    }
  }, [isOpen])

  const selectedSubmission = submissions.find(s => s.submission_id === selectedSubmissionId)

  const handleApprove = async () => {
    if (!selectedSubmissionId || isEvaluating) return

    setIsEvaluating(true)
    try {
      await onEvaluate(selectedSubmissionId, true, points)

      // Auto-select next submission in list
      const currentIndex = submissions.findIndex(s => s.submission_id === selectedSubmissionId)
      if (currentIndex < submissions.length - 1) {
        setSelectedSubmissionId(submissions[currentIndex + 1].submission_id)
        setPoints(100) // Reset points for next student
        setShowAIFeedback(false)
      } else {
        // Last submission - close modal or stay with no selection
        setSelectedSubmissionId(null)
      }
    } catch (error) {
      console.error('Evaluation error:', error)
      alert('Failed to approve submission')
    } finally {
      setIsEvaluating(false)
    }
  }

  const handleReject = async () => {
    if (!selectedSubmissionId || isEvaluating) return

    setIsEvaluating(true)
    try {
      await onEvaluate(selectedSubmissionId, false, 0)

      // Auto-select next submission
      const currentIndex = submissions.findIndex(s => s.submission_id === selectedSubmissionId)
      if (currentIndex < submissions.length - 1) {
        setSelectedSubmissionId(submissions[currentIndex + 1].submission_id)
        setPoints(100)
        setShowAIFeedback(false)
      } else {
        setSelectedSubmissionId(null)
      }
    } catch (error) {
      console.error('Evaluation error:', error)
      alert('Failed to reject submission')
    } finally {
      setIsEvaluating(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="h-full max-w-[95vw] mx-auto p-4 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full h-[90vh] flex flex-col animate-slideUp">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Professor Evaluation
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Review and grade student submissions
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left Panel - Code Viewer */}
            <div className="flex-1 flex flex-col border-r border-gray-200 dark:border-gray-700 overflow-hidden">
              {selectedSubmission ? (
                <>
                  {/* Student Info Bar */}
                  <div className="px-6 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {selectedSubmission.username}
                        </h3>
                        {(selectedSubmission.session_submission_count || 0) > 1 && (
                          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded text-xs font-medium">
                            Answered {selectedSubmission.session_submission_count} questions
                          </span>
                        )}
                      </div>
                      <div className="text-right text-sm text-gray-500 dark:text-gray-400">
                        {new Date(selectedSubmission.submitted_at).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>

                  {/* Code Display - Simple, fast, no external dependencies */}
                  <div className="flex-1 overflow-auto p-4 bg-gray-900">
                    <pre className="text-gray-100 font-mono text-sm leading-relaxed whitespace-pre-wrap break-words p-4 rounded-lg bg-gray-950">
                      <code>{selectedSubmission.code}</code>
                    </pre>
                  </div>

                  {/* AI Feedback Toggle */}
                  <div className="border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => setShowAIFeedback(!showAIFeedback)}
                      className="w-full px-6 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <span className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                        <svg className="w-5 h-5 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-.5a1.5 1.5 0 00-3 0v.5a1 1 0 01-1 1H6a1 1 0 01-1-1v-3a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3H4a1 1 0 001-1V6a1 1 0 011-1h3a1 1 0 001-1v-.5z" />
                        </svg>
                        What AI thinks about this code
                      </span>
                      <svg
                        className={`w-5 h-5 text-gray-500 transition-transform ${showAIFeedback ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {showAIFeedback && (
                      <div className="px-6 py-4 bg-purple-50 dark:bg-purple-900/20 border-t border-purple-200 dark:border-purple-800">
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {selectedSubmission.gemini_feedback}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Evaluation Controls */}
                  <div className="px-6 py-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-end gap-4">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Points (0-100)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={points}
                          onChange={(e) => setPoints(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          disabled={isEvaluating}
                        />
                      </div>
                      <button
                        onClick={handleApprove}
                        disabled={isEvaluating}
                        className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {isEvaluating ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                        Approve
                      </button>
                      <button
                        onClick={handleReject}
                        disabled={isEvaluating}
                        className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {isEvaluating ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        )}
                        Reject
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-500">
                  {submissions.length === 0 ? 'No submissions to evaluate' : 'Select a submission from the list'}
                </div>
              )}
            </div>

            {/* Right Panel - Student List */}
            <div className="w-80 bg-gray-50 dark:bg-gray-800 overflow-hidden flex flex-col">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Pending Evaluation ({submissions.length})
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto">
                {submissions.length === 0 ? (
                  <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                    All submissions evaluated! 🎉
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {submissions.map((submission) => (
                      <button
                        key={submission.submission_id}
                        onClick={() => {
                          setSelectedSubmissionId(submission.submission_id)
                          setShowAIFeedback(false)
                        }}
                        className={`w-full px-4 py-3 text-left transition-colors ${
                          selectedSubmissionId === submission.submission_id
                            ? 'bg-blue-100 dark:bg-blue-900/30 border-l-4 border-blue-500'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900 dark:text-white text-sm">
                            {submission.username}
                          </span>
                          {(submission.session_submission_count || 0) > 1 && (
                            <span className="px-2 py-0.5 bg-blue-500 text-white rounded-full text-xs font-medium">
                              {submission.session_submission_count}Q
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          {new Date(submission.submitted_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }

        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
