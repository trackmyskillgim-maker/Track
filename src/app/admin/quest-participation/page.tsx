'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { mutate } from 'swr'
import { useQuestParticipationClientFiltered } from '@/lib/hooks/useQuestParticipationClientFiltered'
import { useFilterOptions } from '@/lib/hooks/useFilterOptions'
import AdminHeader from '@/components/admin/AdminHeader'
import InfoTooltip from '@/components/common/InfoTooltip'

interface QuestParticipationItem {
  id: string
  title: string
  difficulty: string
  totalQuestions: number
  studentsAttempted: number
  totalStudents: number
  completionRate: number
  createdAt: string
  isActive: boolean
}

interface QuestParticipationData {
  quests: QuestParticipationItem[]
  pagination: {
    currentPage: number
    limit: number
    totalCount: number
    totalPages: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
  filters: {
    sortBy: string
    sortOrder: string
    difficultyFilter: string
  }
}

export default function QuestParticipationPage() {
  const [currentPage, setCurrentPage] = useState(1)
  const [sortBy, setSortBy] = useState('studentsAttempted')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [difficultyFilter, setDifficultyFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Applied filters (used for API calls)
  const [appliedBatch, setAppliedBatch] = useState<string>('all')
  const [appliedCourse, setAppliedCourse] = useState<string>('all')
  const [appliedSection, setAppliedSection] = useState<string>('all')

  // Temporary filters (user selection before applying)
  const [selectedBatch, setSelectedBatch] = useState<string>('all')
  const [selectedCourse, setSelectedCourse] = useState<string>('all')
  const [selectedSection, setSelectedSection] = useState<string>('all')

  const [restoring, setRestoring] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState('')
  const [showSuccessToast, setShowSuccessToast] = useState(false)
  const router = useRouter()

  // Fetch filter options
  const { filterOptions, isLoading: filterOptionsLoading } = useFilterOptions()

  // Use client-side filtering hook - no API calls when filters change!
  const { data, quests, pagination, isLoading, isError } = useQuestParticipationClientFiltered({
    page: currentPage,
    limit: 20,
    sortBy,
    sortOrder,
    difficulty: difficultyFilter,
    status: statusFilter,
    search: searchQuery,
    batch: appliedBatch,
    course: appliedCourse,
    section: appliedSection
  })

  const handleApplyFilters = () => {
    setAppliedBatch(selectedBatch)
    setAppliedCourse(selectedCourse)
    setAppliedSection(selectedSection)
  }

  const handleClearFilters = () => {
    setSelectedBatch('all')
    setSelectedCourse('all')
    setSelectedSection('all')
    setAppliedBatch('all')
    setAppliedCourse('all')
    setAppliedSection('all')
    setSearchQuery('')
    setDifficultyFilter('all')
    setStatusFilter('all')
  }

  const hasUnappliedChanges =
    selectedBatch !== appliedBatch ||
    selectedCourse !== appliedCourse ||
    selectedSection !== appliedSection

  // Force cache refresh on mount to ensure latest data is shown
  useEffect(() => {
    mutate('/api/admin/quest-participation')
  }, [])


  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getDifficultyColor = (difficulty: string) => {
    const difficultyLower = (difficulty || '').toLowerCase();
    switch (difficultyLower) {
      case 'beginner': return 'bg-green-500 text-white'
      case 'intermediate': return 'bg-yellow-500 text-white'
      case 'advanced': return 'bg-red-500 text-white'
      default: return 'bg-gray-500 text-white'
    }
  }

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSortChange = (newSortBy: string) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(newSortBy)
      setSortOrder('desc')
    }
    setCurrentPage(1)
  }

  const handleFilterChange = (filter: string) => {
    setDifficultyFilter(filter)
    setCurrentPage(1)
  }

  const handleRestoreQuest = async (questId: string, questTitle: string) => {
    if (!confirm(`Are you sure you want to restore "${questTitle}"? This will make it active and available to students again.`)) {
      return
    }

    setRestoring(questId)

    try {
      const response = await fetch(`/api/admin/quests/${questId}/restore`, {
        method: 'PATCH'
      })

      const result = await response.json()

      if (result.success) {
        setSuccessMessage(`Quest "${questTitle}" has been successfully restored.`)
        setShowSuccessToast(true)
        // Refresh the data to show updated status
        window.location.reload()
      } else {
        alert(`Failed to restore quest: ${result.message || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Restore quest error:', error)
      alert('An unexpected error occurred while restoring the quest. Please try again.')
    } finally {
      setRestoring(null)
    }
  }

  const renderPagination = () => {
    if (!pagination || pagination.totalPages <= 1) return null

    const { currentPage, totalPages, hasNextPage, hasPreviousPage } = pagination
    const pages = []

    // Calculate visible page range
    const maxVisiblePages = 5
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1)
    }

    // Previous button
    if (hasPreviousPage) {
      pages.push(
        <button
          key="prev"
          onClick={() => handlePageChange(currentPage - 1)}
          className="px-3 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
        >
          ←
        </button>
      )
    }

    // First page if not visible in range
    if (startPage > 1) {
      pages.push(
        <button
          key={1}
          onClick={() => handlePageChange(1)}
          className="px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
        >
          1
        </button>
      )
      if (startPage > 2) {
        pages.push(
          <span key="ellipsis1" className="px-2 py-2 text-gray-400">
            ...
          </span>
        )
      }
    }

    // Visible page range
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`px-3 py-2 rounded-md transition-colors ${
            i === currentPage
              ? 'bg-blue-600 text-white'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          {i}
        </button>
      )
    }

    // Last page if not visible in range
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pages.push(
          <span key="ellipsis2" className="px-2 py-2 text-gray-400">
            ...
          </span>
        )
      }
      pages.push(
        <button
          key={totalPages}
          onClick={() => handlePageChange(totalPages)}
          className="px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
        >
          {totalPages}
        </button>
      )
    }

    // Next button
    if (hasNextPage) {
      pages.push(
        <button
          key="next"
          onClick={() => handlePageChange(currentPage + 1)}
          className="px-3 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
        >
          →
        </button>
      )
    }

    return (
      <div className="flex items-center justify-center space-x-1 mt-8">
        {pages}
      </div>
    )
  }

  // Only show loading if we have no data at all (first load)
  if (isLoading && quests.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminHeader title="Quest Participation Analysis" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-64 mb-8"></div>
            <div className="h-10 bg-gray-200 rounded w-full mb-6"></div>
            {[...Array(10)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg p-6 shadow-md">
                <div className="h-6 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminHeader title="Quest Participation Analysis" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            Error: {isError?.message || 'Failed to load quest participation data'}
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader title="Quest Participation Analysis" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">📊 Complete Quest Participation Analysis</h2>
          <p className="text-gray-600">Detailed analysis of all quest participation and performance metrics</p>
        </div>

        {/* Filters and Sorting */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex flex-col space-y-4">
            {/* Search Bar */}
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-gray-700">Search:</label>
              <div className="flex-1 max-w-md">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setCurrentPage(1)
                  }}
                  placeholder="Search by quest title..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                />
              </div>
            </div>

            {/* Filters Row */}
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center space-x-4">
                <label className="text-sm font-medium text-gray-700">Sort by:</label>
                <select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [field, order] = e.target.value.split('-')
                    setSortBy(field)
                    setSortOrder(order as 'asc' | 'desc')
                    setCurrentPage(1)
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                >
                  <option value="studentsAttempted-desc">Most Participated</option>
                  <option value="studentsAttempted-asc">Least Participated</option>
                  <option value="completionRate-desc">Highest Completion Rate</option>
                  <option value="completionRate-asc">Lowest Completion Rate</option>
                  <option value="createdAt-desc">Newest First</option>
                  <option value="createdAt-asc">Oldest First</option>
                </select>
              </div>

              <div className="flex items-center space-x-4">
                <label className="text-sm font-medium text-gray-700">Status:</label>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                >
                  <option value="all">All Quests</option>
                  <option value="active">Active Quests</option>
                  <option value="archived">Archived Quests</option>
                </select>
              </div>

              <div className="flex items-center space-x-4">
                <label className="text-sm font-medium text-gray-700">Difficulty:</label>
                <select
                  value={difficultyFilter}
                  onChange={(e) => handleFilterChange(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                >
                  <option value="all">All Difficulties</option>
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>

              <div className="text-sm text-gray-600 flex items-center">
                Showing {pagination?.totalCount || 0} total quests
              </div>
            </div>

            {/* Student Filters Row */}
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center space-x-4">
                <label className="text-sm font-medium text-gray-700">Year:</label>
                <select
                  value={selectedBatch}
                  onChange={(e) => {
                    setSelectedBatch(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                  disabled={filterOptionsLoading}
                >
                  <option value="all">All Batches</option>
                  {filterOptions?.batches.map((batch) => (
                    <option key={batch} value={batch}>{batch}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-4">
                <label className="text-sm font-medium text-gray-700">Course:</label>
                <select
                  value={selectedCourse}
                  onChange={(e) => {
                    setSelectedCourse(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                  disabled={filterOptionsLoading}
                >
                  <option value="all">All Courses</option>
                  {filterOptions?.courses.map((course) => (
                    <option key={course} value={course}>{course}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-4">
                <label className="text-sm font-medium text-gray-700">Section:</label>
                <select
                  value={selectedSection}
                  onChange={(e) => {
                    setSelectedSection(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
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
            <div className="flex justify-start items-center gap-3">
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

              {(appliedBatch !== 'all' || appliedCourse !== 'all' || appliedSection !== 'all' ||
                difficultyFilter !== 'all' || statusFilter !== 'all' || searchQuery !== '') && (
                <button
                  onClick={handleClearFilters}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md text-sm font-medium transition-colors"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Quest List */}
        <div className="space-y-4">
          {quests.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No Quests Found</h3>
              <p className="text-gray-600">
                {difficultyFilter === 'all'
                  ? 'No quests have been created yet.'
                  : 'No quests found for the selected difficulty level.'}
              </p>
            </div>
          ) : (
            quests.map((quest) => (
              <div key={quest.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">{quest.title}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(quest.difficulty)}`}>
                        {quest.difficulty || 'Unknown'}
                      </span>
                      {!quest.isActive && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-300 text-gray-700">
                          Archived
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      {/* Students Attempted */}
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <div className="text-lg font-bold text-blue-600 flex items-center justify-center">
                          {quest.studentsAttempted}
                          <InfoTooltip tooltip="Number of students who attempted at least one question in this quest" />
                        </div>
                        <div className="text-xs text-blue-800">Students Attempted</div>
                      </div>

                      {/* Success Rate (among those who attempted) */}
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="text-lg font-bold text-green-600 flex items-center justify-center">
                          {quest.completionRate.toFixed(1)}%
                          <InfoTooltip
                            tooltip={`Of the ${quest.studentsAttempted} student${quest.studentsAttempted !== 1 ? 's' : ''} who attempted this quest, ${quest.completionRate.toFixed(1)}% completed ALL questions`}
                          />
                        </div>
                        <div className="text-xs text-green-800">Success Rate</div>
                      </div>

                      {/* Class Completion (class-wide) */}
                      <div className="text-center p-3 bg-purple-50 rounded-lg">
                        <div className="text-lg font-bold text-purple-600 flex items-center justify-center">
                          {((quest.studentsAttempted / quest.totalStudents) * quest.completionRate).toFixed(1)}%
                          <InfoTooltip
                            tooltip={`Of all ${quest.totalStudents} students in the class, ${((quest.studentsAttempted / quest.totalStudents) * quest.completionRate).toFixed(1)}% completed this quest`}
                          />
                        </div>
                        <div className="text-xs text-purple-800">Class Completion</div>
                        <div className="text-xs text-purple-600 mt-1">
                          {Math.round((quest.studentsAttempted / quest.totalStudents) * quest.completionRate / 100 * quest.totalStudents)} of {quest.totalStudents} students
                        </div>
                      </div>

                      {/* Questions */}
                      <div className="text-center p-3 bg-orange-50 rounded-lg">
                        <div className="text-lg font-bold text-orange-600 flex items-center justify-center">
                          {quest.totalQuestions}
                          <InfoTooltip tooltip="Total number of questions in this quest" />
                        </div>
                        <div className="text-xs text-orange-800">Questions</div>
                      </div>
                    </div>

                    <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                      <div
                        className="h-3 rounded-full bg-blue-500"
                        style={{ width: `${Math.min((quest.studentsAttempted / quest.totalStudents) * 100, 100)}%` }}
                      ></div>
                    </div>
                    <div className="text-sm text-gray-600">
                      {quest.studentsAttempted} of {quest.totalStudents} students participated ({((quest.studentsAttempted / quest.totalStudents) * 100).toFixed(1)}%)
                    </div>
                  </div>

                  <div className="mt-4 lg:mt-0 lg:ml-6 text-right">
                    <div className="text-sm text-gray-500 mb-3">
                      Created: {formatDate(quest.createdAt)}
                    </div>
                    {!quest.isActive && (
                      <div className="flex space-x-2 justify-end">
                        <button
                          onClick={() => handleRestoreQuest(quest.id, quest.title)}
                          disabled={restoring === quest.id}
                          className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {restoring === quest.id ? 'Restoring...' : 'Restore'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {renderPagination()}

        {/* Pagination Info */}
        {quests.length > 0 && pagination && (
          <div className="text-center text-sm text-gray-600 mt-4">
            Showing {(pagination.currentPage - 1) * pagination.limit + 1} to{' '}
            {Math.min(pagination.currentPage * pagination.limit, pagination.totalCount)} of{' '}
            {pagination.totalCount} quests
          </div>
        )}

        {/* Success Toast */}
        {showSuccessToast && (
          <div className="fixed bottom-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50">
            <div className="flex items-center space-x-2">
              <span>✅</span>
              <span>{successMessage}</span>
              <button
                onClick={() => setShowSuccessToast(false)}
                className="ml-4 text-green-200 hover:text-white"
              >
                ×
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}