'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSessionDetail } from '@/lib/hooks/useSessionDetail'

export default function SessionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.sessionId as string

  const { session, questions, isLoading: loading, isError } = useSessionDetail(sessionId)
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set())

  const error = isError ? 'Failed to load session details' : ''

  const toggleQuestion = (questionId: string) => {
    const newExpanded = new Set(expandedQuestions)
    if (newExpanded.has(questionId)) {
      newExpanded.delete(questionId)
    } else {
      newExpanded.add(questionId)
    }
    setExpandedQuestions(newExpanded)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <p className="text-gray-600 dark:text-gray-400">Loading session details...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
            <p className="text-red-700 dark:text-red-300">{error || 'Session not found'}</p>
          </div>
          <Link
            href="/class-participation/admin"
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            ← Back to Class Participation
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link
            href="/class-participation/admin"
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center"
          >
            ← Back to Class Participation
          </Link>
        </div>

        {/* Session Info Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {session.topic}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {session.course} • {session.year} • Section {session.section} • {session.difficulty}
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
              {session.status === 'closed' ? '🔒 Closed' : session.status}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Started</p>
              <p className="text-base font-medium text-gray-900 dark:text-white">
                {new Date(session.created_at).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Ended</p>
              <p className="text-base font-medium text-gray-900 dark:text-white">
                {session.ended_at ? new Date(session.ended_at).toLocaleString() : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Questions</p>
              <p className="text-base font-medium text-gray-900 dark:text-white">
                {questions.length}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Auto-Advance</p>
              <p className="text-base font-medium text-gray-900 dark:text-white">
                {session.auto_advance_enabled ? 'Enabled' : 'Disabled'}
              </p>
            </div>
          </div>
        </div>

        {/* Questions List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Questions ({questions.length})
            </h2>
          </div>

          {questions.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-500 dark:text-gray-400">No questions in this session</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {questions.map((question: any, index: number) => {
                const isExpanded = expandedQuestions.has(question.id)
                return (
                  <div key={question.id} className="p-4">
                    {/* Question Header */}
                    <div
                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-3 rounded-lg transition-colors"
                      onClick={() => toggleQuestion(question.id)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs font-medium">
                              Question #{index + 1}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {question.difficulty}
                            </span>
                            <span className={`text-xs font-medium ${
                              question.status === 'published' ? 'text-green-600 dark:text-green-400' :
                              question.status === 'closed' ? 'text-gray-600 dark:text-gray-400' :
                              'text-yellow-600 dark:text-yellow-400'
                            }`}>
                              {question.status}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                            {question.question_text}
                          </p>
                          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                            <span>👥 {question.stats.total_participants} participants</span>
                            <span>📝 {question.stats.total_submissions} submissions</span>
                            <span className="text-green-600 dark:text-green-400">✓ {question.stats.passed} passed</span>
                            <span className="text-red-600 dark:text-red-400">✗ {question.stats.failed} failed</span>
                          </div>
                        </div>
                        <button className="ml-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                          {isExpanded ? '▼' : '▶'}
                        </button>
                      </div>
                    </div>

                    {/* Expanded Question Details */}
                    {isExpanded && (
                      <div className="mt-4 pl-6 space-y-4">
                        {/* Full Question Text */}
                        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                            Question Text:
                          </h4>
                          <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                            {question.question_text}
                          </pre>
                        </div>

                        {/* Submissions */}
                        {question.submissions.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                              Submissions ({question.submissions.length}):
                            </h4>
                            <div className="space-y-2">
                              {question.submissions.map((submission: any) => (
                                <div
                                  key={submission.id}
                                  className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
                                >
                                  <div className="flex justify-between items-start mb-2">
                                    <div>
                                      <span className="font-medium text-gray-900 dark:text-white">
                                        {submission.users?.username || 'Unknown'}
                                      </span>
                                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                                        {new Date(submission.submitted_at).toLocaleString()}
                                      </span>
                                    </div>
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                                      submission.result === 'pass' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' :
                                      submission.result === 'fail' ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200' :
                                      'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                                    }`}>
                                      {submission.result}
                                    </span>
                                  </div>
                                  {submission.ai_feedback && (
                                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                                      {submission.ai_feedback}
                                    </p>
                                  )}
                                  <details className="text-xs">
                                    <summary className="cursor-pointer text-blue-600 dark:text-blue-400 hover:text-blue-700">
                                      View Code
                                    </summary>
                                    <pre className="mt-2 p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 overflow-x-auto">
                                      <code className="text-gray-900 dark:text-gray-100">{submission.code}</code>
                                    </pre>
                                  </details>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Queue (if any students didn't submit) */}
                        {question.queue.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                              Queue ({question.queue.length}):
                            </h4>
                            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                              <div className="space-y-1 text-xs">
                                {question.queue.map((entry: any) => (
                                  <div key={entry.id} className="flex justify-between items-center">
                                    <span className="text-gray-700 dark:text-gray-300">
                                      {entry.users?.username || 'Unknown'}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded text-xs ${
                                      entry.status === 'attempting' ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200' :
                                      entry.status === 'completed' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' :
                                      'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                                    }`}>
                                      {entry.status}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}