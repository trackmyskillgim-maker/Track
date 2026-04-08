'use client'

import { useState } from 'react'
import { useParticipationHistory } from '@/lib/hooks/useParticipationHistory'

export default function StudentParticipationHistory() {
  const { sessions, isLoading, isError } = useParticipationHistory()
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set())
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set())

  // Filter and search states
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'passed' | 'failed'>('all')
  const [dateFilter, setDateFilter] = useState('')

  const toggleSession = (sessionId: string) => {
    const newExpanded = new Set(expandedSessions)
    if (newExpanded.has(sessionId)) {
      newExpanded.delete(sessionId)
    } else {
      newExpanded.add(sessionId)
    }
    setExpandedSessions(newExpanded)
  }

  const toggleQuestion = (questionId: string) => {
    const newExpanded = new Set(expandedQuestions)
    if (newExpanded.has(questionId)) {
      newExpanded.delete(questionId)
    } else {
      newExpanded.add(questionId)
    }
    setExpandedQuestions(newExpanded)
  }

  // Filter sessions based on search query and filters
  const filteredSessions = sessions.filter((session: any) => {
    // Search filter - check topic and question content
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesTopic = session.topic.toLowerCase().includes(query)
      const matchesQuestion = session.questions?.some((q: any) =>
        q.question_text?.toLowerCase().includes(query)
      )
      if (!matchesTopic && !matchesQuestion) return false
    }

    // Status filter - check if any questions match the status
    if (statusFilter !== 'all') {
      const hasMatchingStatus = session.questions?.some((q: any) => {
        const hasPassed = q.my_submissions?.some((s: any) => s.result === 'pass')
        return statusFilter === 'passed' ? hasPassed : !hasPassed
      })
      if (!hasMatchingStatus) return false
    }

    // Date filter
    if (dateFilter) {
      const sessionDate = new Date(session.ended_at).toISOString().split('T')[0]
      if (sessionDate !== dateFilter) return false
    }

    return true
  })

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <p className="text-gray-600 dark:text-gray-400">Loading your participation history...</p>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-700 dark:text-red-300">
          {isError.message?.includes('401') ? 'Please log in to view your history' : 'Failed to load participation history'}
        </p>
      </div>
    )
  }

  if (sessions.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
        <div className="text-6xl mb-4">📚</div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          No Participation History
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Your past class participation sessions will appear here
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
        My Participation History ({sessions.length} sessions)
      </h2>

      {/* Search and Filter Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 space-y-4">
        {/* Search Bar */}
        <div>
          <label htmlFor="search" className="block text-sm font-medium text-gray-900 mb-2">
            Search by Topic or Question
          </label>
          <input
            id="search"
            type="text"
            placeholder="Search sessions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filters Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Status Filter */}
          <div>
            <label htmlFor="status-filter" className="block text-sm font-medium text-gray-900 mb-2">
              Filter by Status
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'passed' | 'failed')}
              className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Attempts</option>
              <option value="passed">Passed Attempts</option>
              <option value="failed">Failed Attempts</option>
            </select>
          </div>

          {/* Date Filter */}
          <div>
            <label htmlFor="date-filter" className="block text-sm font-medium text-gray-900 mb-2">
              Filter by Date
            </label>
            <input
              id="date-filter"
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Clear Filters Button */}
        {(searchQuery || statusFilter !== 'all' || dateFilter) && (
          <button
            onClick={() => {
              setSearchQuery('')
              setStatusFilter('all')
              setDateFilter('')
            }}
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline"
          >
            Clear All Filters
          </button>
        )}
      </div>

      {/* Results Count */}
      {filteredSessions.length !== sessions.length && (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Showing {filteredSessions.length} of {sessions.length} sessions
        </p>
      )}

      {filteredSessions.length === 0 && sessions.length > 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No Results Found
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Try adjusting your search or filters
          </p>
        </div>
      ) : null}

      {filteredSessions.map((session: any) => {
        const isSessionExpanded = expandedSessions.has(session.id)

        return (
          <div key={session.id} className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            {/* Session Header */}
            <div
              className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              onClick={() => toggleSession(session.id)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {session.topic}
                    </h3>
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-xs font-medium">
                      {session.difficulty}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {session.course} • {session.year} • Section {session.section}
                  </p>
                  <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                    <span>📅 {new Date(session.ended_at).toLocaleString()}</span>
                    <span>❓ {session.total_questions_attempted} questions attempted</span>
                    <span className="text-green-600 dark:text-green-400">
                      ✓ {session.passed_questions} passed
                    </span>
                    <span>📝 {session.total_submissions} total submissions</span>
                  </div>
                </div>
                <button className="ml-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  {isSessionExpanded ? '▼' : '▶'}
                </button>
              </div>
            </div>

            {/* Expanded Session Details */}
            {isSessionExpanded && (
              <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900">
                {session.questions.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                    No questions attempted in this session
                  </p>
                ) : (
                  <div className="space-y-3">
                    {session.questions.map((question: any, index: number) => {
                      const isQuestionExpanded = expandedQuestions.has(question.id)
                      const bestSubmission = question.my_submissions.find((s: any) => s.result === 'pass') ||
                        question.my_submissions[question.my_submissions.length - 1]
                      const hasPassed = question.my_submissions.some((s: any) => s.result === 'pass')

                      return (
                        <div key={question.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                          {/* Question Header */}
                          <div
                            className="p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            onClick={() => toggleQuestion(question.id)}
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-2">
                                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs font-medium">
                                    Question #{question.order_index || index + 1}
                                  </span>
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {question.difficulty}
                                  </span>
                                  {hasPassed ? (
                                    <span className="text-xs font-medium text-green-600 dark:text-green-400">
                                      ✓ Passed
                                    </span>
                                  ) : (
                                    <span className="text-xs font-medium text-red-600 dark:text-red-400">
                                      ✗ Not Passed
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                                  {question.question_text}
                                </p>
                                <div className="flex items-center space-x-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
                                  <span>📝 {question.my_submissions.length} attempt{question.my_submissions.length !== 1 ? 's' : ''}</span>
                                  {bestSubmission?.xp_awarded > 0 && (
                                    <span className="text-yellow-600 dark:text-yellow-400">
                                      ⭐ {bestSubmission.xp_awarded} XP earned
                                    </span>
                                  )}
                                </div>
                              </div>
                              <button className="ml-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                {isQuestionExpanded ? '▼' : '▶'}
                              </button>
                            </div>
                          </div>

                          {/* Expanded Question Details */}
                          {isQuestionExpanded && (
                            <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-4">
                              {/* Full Question Text */}
                              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                  Question:
                                </h4>
                                <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans">
                                  {question.question_text}
                                </pre>
                              </div>

                              {/* My Submissions */}
                              <div>
                                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                  My Submissions ({question.my_submissions.length}):
                                </h4>
                                <div className="space-y-2">
                                  {question.my_submissions.map((submission: any, subIndex: number) => (
                                    <div
                                      key={submission.id}
                                      className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
                                    >
                                      <div className="flex justify-between items-start mb-2">
                                        <div>
                                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                            Attempt #{subIndex + 1}
                                          </span>
                                          <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                                            {new Date(submission.submitted_at).toLocaleString()}
                                          </span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                          {submission.xp_awarded > 0 && (
                                            <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded text-xs font-medium">
                                              +{submission.xp_awarded} XP
                                            </span>
                                          )}
                                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                            submission.result === 'pass'
                                              ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                                              : submission.result === 'fail'
                                              ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                                              : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                                          }`}>
                                            {submission.result}
                                          </span>
                                        </div>
                                      </div>

                                      {/* Gemini Feedback */}
                                      {submission.gemini_feedback && (
                                        <div className="mb-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                                          <p className="text-xs font-semibold text-blue-900 dark:text-blue-200 mb-1">
                                            AI Feedback:
                                          </p>
                                          <p className="text-xs text-blue-800 dark:text-blue-300">
                                            {submission.gemini_feedback}
                                          </p>
                                        </div>
                                      )}

                                      {/* Code */}
                                      <details className="text-xs">
                                        <summary className="cursor-pointer text-blue-600 dark:text-blue-400 hover:text-blue-700 mb-1">
                                          View My Code
                                        </summary>
                                        <pre className="mt-2 p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 overflow-x-auto">
                                          <code className="text-xs text-gray-900 dark:text-gray-100">{submission.code}</code>
                                        </pre>
                                      </details>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}