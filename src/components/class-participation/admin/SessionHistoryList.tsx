'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { fetcher } from '@/lib/providers/SWRProvider'

export default function SessionHistoryList() {
  const { data, error, isLoading, mutate } = useSWR(
    '/api/class-participation/admin/past-sessions',
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

  const sessions = data?.sessions || []
  const loading = isLoading

  // Delete state
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  // Filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [courseFilter, setCourseFilter] = useState<string>('all')
  const [yearFilter, setYearFilter] = useState<string>('all')
  const [sectionFilter, setSectionFilter] = useState<string>('all')
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState('')

  // Extract unique values for filters
  const uniqueCourses = useMemo(() => {
    const courses = new Set(sessions.map((s: any) => s.course))
    return Array.from(courses).sort()
  }, [sessions])

  const uniqueYears = useMemo(() => {
    const years = new Set(sessions.map((s: any) => s.year))
    return Array.from(years).sort()
  }, [sessions])

  const uniqueSections = useMemo(() => {
    const sections = new Set(sessions.map((s: any) => s.section))
    return Array.from(sections).sort()
  }, [sessions])

  const uniqueDifficulties = useMemo(() => {
    const difficulties = new Set(sessions.map((s: any) => s.difficulty))
    return Array.from(difficulties).sort()
  }, [sessions])

  // Delete handler
  const handleDeleteSession = async (sessionId: string) => {
    setDeletingSessionId(sessionId)
    try {
      const response = await fetch(`/api/class-participation/admin/delete-session?sessionId=${sessionId}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (result.success) {
        // Refresh the sessions list
        mutate()
        setConfirmDeleteId(null)
      } else {
        alert(result.message || 'Failed to delete session')
      }
    } catch (error) {
      console.error('Delete error:', error)
      alert('Failed to delete session')
    } finally {
      setDeletingSessionId(null)
    }
  }

  // Filtered sessions
  const filteredSessions = useMemo(() => {
    return sessions.filter((session: any) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        if (!session.topic.toLowerCase().includes(query)) {
          return false
        }
      }

      // Course filter
      if (courseFilter !== 'all' && session.course !== courseFilter) {
        return false
      }

      // Year filter
      if (yearFilter !== 'all' && session.year !== yearFilter) {
        return false
      }

      // Section filter
      if (sectionFilter !== 'all' && session.section !== sectionFilter) {
        return false
      }

      // Difficulty filter
      if (difficultyFilter !== 'all' && session.difficulty !== difficultyFilter) {
        return false
      }

      // Date filter
      if (dateFilter) {
        const sessionDate = session.ended_at
          ? new Date(session.ended_at).toISOString().split('T')[0]
          : new Date(session.created_at).toISOString().split('T')[0]
        if (sessionDate !== dateFilter) {
          return false
        }
      }

      return true
    })
  }, [sessions, searchQuery, courseFilter, yearFilter, sectionFilter, difficultyFilter, dateFilter])

  if (loading && !data) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <p className="text-gray-600 dark:text-gray-400">Loading past sessions...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-700 dark:text-red-300">Failed to load past sessions</p>
      </div>
    )
  }

  if (sessions.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
        <div className="text-6xl mb-4">📚</div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          No Past Sessions
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Your completed sessions will appear here
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Past Sessions ({sessions.length})
        </h3>

        {/* Search and Filters */}
        <div className="space-y-4">
          {/* Search Bar */}
          <div>
            <input
              type="text"
              placeholder="Search by topic..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filters Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* Course Filter */}
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Courses</option>
              {uniqueCourses.map((course: any) => (
                <option key={course} value={course}>{course}</option>
              ))}
            </select>

            {/* Year Filter */}
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Years</option>
              {uniqueYears.map((year: any) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>

            {/* Section Filter */}
            <select
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Sections</option>
              {uniqueSections.map((section: any) => (
                <option key={section} value={section}>Section {section}</option>
              ))}
            </select>

            {/* Difficulty Filter */}
            <select
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Difficulties</option>
              {uniqueDifficulties.map((difficulty: any) => (
                <option key={difficulty} value={difficulty}>{difficulty}</option>
              ))}
            </select>

            {/* Date Filter */}
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Clear Filters Button */}
          {(searchQuery || courseFilter !== 'all' || yearFilter !== 'all' || sectionFilter !== 'all' || difficultyFilter !== 'all' || dateFilter) && (
            <button
              onClick={() => {
                setSearchQuery('')
                setCourseFilter('all')
                setYearFilter('all')
                setSectionFilter('all')
                setDifficultyFilter('all')
                setDateFilter('')
              }}
              className="text-sm text-blue-600 hover:text-blue-700 underline"
            >
              Clear All Filters
            </button>
          )}

          {/* Results Count */}
          {filteredSessions.length !== sessions.length && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Showing {filteredSessions.length} of {sessions.length} sessions
            </p>
          )}
        </div>
      </div>

      {filteredSessions.length === 0 ? (
        <div className="p-12 text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No Sessions Found
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Try adjusting your search or filters
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {filteredSessions.map((session: any) => (
          <div key={session.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
                  {session.topic}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {session.course} • {session.year} • Section {session.section} • {session.difficulty}
                </p>
                <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                  <span>📅 {session.ended_at ? new Date(session.ended_at).toLocaleString() : new Date(session.created_at).toLocaleString()}</span>
                  <span>❓ {session.total_questions} questions</span>
                  <span>👥 {session.total_participants} participants</span>
                </div>
              </div>

              <div className="ml-4 flex items-center space-x-2">
                <Link
                  href={`/class-participation/admin/session/${session.id}`}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  View Details
                </Link>

                {confirmDeleteId === session.id ? (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleDeleteSession(session.id)}
                      disabled={deletingSessionId === session.id}
                      className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      {deletingSessionId === session.id ? 'Deleting...' : 'Confirm'}
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      disabled={deletingSessionId === session.id}
                      className="px-3 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteId(session.id)}
                    className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium transition-colors"
                    title="Delete this session and all related data"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        </div>
      )}
    </div>
  )
}