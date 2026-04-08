'use client'

import { useState, useMemo, useEffect } from 'react'
import { useLeaderboard } from '@/lib/hooks/useLeaderboard'
import { useFilterOptions } from '@/lib/hooks/useFilterOptions'
import AdminHeader from '@/components/admin/AdminHeader'

interface LeaderboardUser {
  id: string
  rank: number
  username: string
  email?: string
  total_points: number
  current_level: number
  current_streak: number
  max_streak?: number
  completedQuests: number
  completedQuestions: number
  achievements: number
  last_active: string
  isCurrentUser: boolean
}


export default function AdminLeaderboardPage() {
  const [viewMode, setViewMode] = useState<'top' | 'all'>('top')

  // Applied filters (used for API calls)
  const [appliedBatch, setAppliedBatch] = useState<string>('all')
  const [appliedCourse, setAppliedCourse] = useState<string>('all')
  const [appliedSection, setAppliedSection] = useState<string>('all')
  const [appliedSubject, setAppliedSubject] = useState<string>('all')

  // Temporary filters (user selection before applying)
  const [selectedBatch, setSelectedBatch] = useState<string>('all')
  const [selectedCourse, setSelectedCourse] = useState<string>('all')
  const [selectedSection, setSelectedSection] = useState<string>('all')
  const [selectedSubject, setSelectedSubject] = useState<string>('all')

  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)
  const { filterOptions, isLoading: filterOptionsLoading } = useFilterOptions()
  const { data, isLoading, isError } = useLeaderboard(appliedBatch, appliedCourse, appliedSection, appliedSubject)

  // Fetch subjects for dropdown
  const [subjects, setSubjects] = useState<Array<{ id: string; name: string; subject_code: string }>>([])
  const [subjectsLoading, setSubjectsLoading] = useState(false)

  useEffect(() => {
    const fetchSubjects = async () => {
      setSubjectsLoading(true)
      try {
        const response = await fetch('/api/admin/subjects/my-subjects')
        const data = await response.json()
        if (data.success) {
          const subjectsData = Array.isArray(data.data) ? data.data : (data.data?.subjects || [])
          setSubjects(subjectsData)
        }
      } catch (error) {
        console.error('Failed to fetch subjects:', error)
        setSubjects([])
      } finally {
        setSubjectsLoading(false)
      }
    }
    fetchSubjects()
  }, [])

  const handleApplyFilters = () => {
    setAppliedBatch(selectedBatch)
    setAppliedCourse(selectedCourse)
    setAppliedSection(selectedSection)
    setAppliedSubject(selectedSubject)
  }

  const handleClearFilters = () => {
    setSelectedBatch('all')
    setSelectedCourse('all')
    setSelectedSection('all')
    setSelectedSubject('all')
    setAppliedBatch('all')
    setAppliedCourse('all')
    setAppliedSection('all')
    setAppliedSubject('all')
  }

  const hasUnappliedChanges =
    selectedBatch !== appliedBatch ||
    selectedCourse !== appliedCourse ||
    selectedSection !== appliedSection ||
    selectedSubject !== appliedSubject


  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return '🥇'
      case 2: return '🥈'
      case 3: return '🥉'
      default: return `#${rank}`
    }
  }

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 2: return 'text-gray-600 bg-gray-50 border-gray-200'
      case 3: return 'text-amber-600 bg-amber-50 border-amber-200'
      default: return 'text-blue-600 bg-blue-50 border-blue-200'
    }
  }

  const formatLastActive = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) return 'Active now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  // Calculate pagination for "all" view
  const allUsers = data?.topPerformers || []
  const totalPages = Math.ceil(allUsers.length / itemsPerPage)

  const paginatedUsers = useMemo(() => {
    if (viewMode === 'top') {
      return allUsers.slice(0, 10)
    }
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return allUsers.slice(startIndex, endIndex)
  }, [allUsers, viewMode, currentPage, itemsPerPage])

  // Reset to page 1 when APPLIED filters or view mode change
  useMemo(() => {
    setCurrentPage(1)
  }, [appliedBatch, appliedCourse, appliedSection, viewMode])

  const displayedUsers = paginatedUsers

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <AdminHeader title="Leaderboard" />
        <div className="max-w-6xl mx-auto p-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                  <div className="h-4 bg-gray-200 rounded mb-4"></div>
                  <div className="h-6 bg-gray-200 rounded mb-2"></div>
                </div>
              ))}
            </div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                  <div className="h-6 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <AdminHeader title="Leaderboard" />
        <div className="max-w-6xl mx-auto p-8">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            Error: {isError?.message || 'Failed to load leaderboard'}
          </div>
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AdminHeader title="Leaderboard" />
      <div className="max-w-6xl mx-auto p-8">

        {/* Platform Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-800 dark:text-white">{data.stats.totalStudents}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Total Students</div>
              </div>
              <div className="text-3xl">👥</div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-800 dark:text-white">{data.stats.averagePoints}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Avg Points</div>
              </div>
              <div className="text-3xl">📊</div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border-l-4 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-800 dark:text-white">{data.stats.topStreak}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Best Streak</div>
              </div>
              <div className="text-3xl">🔥</div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-800 dark:text-white">{data.stats.mostActiveToday}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Active Today</div>
              </div>
              <div className="text-3xl">⚡</div>
            </div>
          </div>
        </div>

        {/* Admin doesn't need "Your Position" card */}

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Subject Filter */}
            <div>
              <label htmlFor="subjectSelect" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Filter by Subject
              </label>
              <select
                id="subjectSelect"
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                disabled={subjectsLoading}
              >
                <option value="all">All Subjects</option>
                {subjects?.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name} {subject.subject_code ? `(${subject.subject_code})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Batch Filter */}
            <div>
              <label htmlFor="yearSelect" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Filter by Batch
              </label>
              <select
                id="yearSelect"
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                disabled={filterOptionsLoading}
              >
                <option value="all">All Batches</option>
                {filterOptions?.batches.map((batch) => (
                  <option key={batch} value={batch}>{batch}</option>
                ))}
              </select>
            </div>

            {/* Course Filter */}
            <div>
              <label htmlFor="courseSelect" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Filter by Course
              </label>
              <select
                id="courseSelect"
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                disabled={filterOptionsLoading}
              >
                <option value="all">All Courses</option>
                {filterOptions?.courses.map((course) => (
                  <option key={course} value={course}>{course}</option>
                ))}
              </select>
            </div>

            {/* Section Filter */}
            <div>
              <label htmlFor="sectionSelect" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Filter by Section
              </label>
              <select
                id="sectionSelect"
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                disabled={filterOptionsLoading}
              >
                <option value="all">All Sections</option>
                {filterOptions?.sections.map((section) => (
                  <option key={section} value={section}>Section {section}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Apply and Clear Filters Buttons */}
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={handleApplyFilters}
              disabled={!hasUnappliedChanges}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Apply Filters
              {hasUnappliedChanges && (
                <span className="inline-flex items-center justify-center w-2 h-2 bg-yellow-400 rounded-full"></span>
              )}
            </button>

            {(appliedBatch !== 'all' || appliedCourse !== 'all' || appliedSection !== 'all' || appliedSubject !== 'all') && (
              <button
                onClick={handleClearFilters}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Clear All Filters
              </button>
            )}
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex space-x-4 mb-6">
          <button
            onClick={() => setViewMode('top')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              viewMode === 'top'
                ? 'bg-blue-500 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            Top 10
          </button>
          <button
            onClick={() => setViewMode('all')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              viewMode === 'all'
                ? 'bg-blue-500 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            All Students ({data.stats.totalStudents})
          </button>
        </div>

        {/* Leaderboard Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
              {viewMode === 'top' ? 'Top Performers' : 'All Students'}
            </h3>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Points
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Level
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Quests
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Questions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Streak
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Badges
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Last Active
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {displayedUsers.map((user: LeaderboardUser) => (
                  <tr
                    key={user.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full border-2 font-bold text-sm ${
                        getRankColor(user.rank)
                      }`}>
                        {getRankIcon(user.rank)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {user.username}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900 dark:text-white">{user.total_points}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">{user.current_level}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">{user.completedQuests}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">{user.completedQuestions}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {user.current_streak > 0 && '🔥'} {user.current_streak}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {user.achievements > 0 && '🏅'} {user.achievements}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatLastActive(user.last_active)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4 p-4">
            {displayedUsers.map((user: LeaderboardUser) => (
              <div
                key={user.id}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full border-2 font-bold ${
                      getRankColor(user.rank)
                    }`}>
                      {getRankIcon(user.rank)}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {user.username}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {formatLastActive(user.last_active)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900 dark:text-white">{user.total_points}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">points</div>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4 text-center text-sm">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">Level {user.current_level}</div>
                    <div className="text-gray-500 dark:text-gray-400">Level</div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{user.completedQuests}</div>
                    <div className="text-gray-500 dark:text-gray-400">Quests</div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {user.current_streak > 0 && '🔥'} {user.current_streak}
                    </div>
                    <div className="text-gray-500 dark:text-gray-400">Streak</div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {user.achievements > 0 && '🏅'} {user.achievements}
                    </div>
                    <div className="text-gray-500 dark:text-gray-400">Badges</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls for "All Students" view */}
          {viewMode === 'all' && totalPages > 1 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, allUsers.length)} of {allUsers.length} students
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600 dark:text-gray-400">Per page:</label>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value))
                        setCurrentPage(1)
                      }}
                      className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  <div className="flex items-center gap-2">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum
                      if (totalPages <= 5) {
                        pageNum = i + 1
                      } else if (currentPage <= 3) {
                        pageNum = i + 1
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i
                      } else {
                        pageNum = currentPage - 2 + i
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-4 py-2 rounded-md transition-colors ${
                            currentPage === pageNum
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                          }`}
                        >
                          {pageNum}
                        </button>
                      )
                    })}
                  </div>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {displayedUsers.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
            <div className="text-6xl mb-4">🏆</div>
            <h3 className="text-xl font-semibold text-gray-700 dark:text-white mb-2">No Students Yet</h3>
            <p className="text-gray-600 dark:text-gray-300">Students will appear here once they start completing quests.</p>
          </div>
        )}
      </div>
    </div>
  )
}
