'use client'

import { useState, useMemo, useEffect } from 'react'
import { useStudents, type Student } from '@/lib/hooks/useStudents'
import { useAdminQuests } from '@/lib/hooks/useAdminQuests'
import { useFilterOptions } from '@/lib/hooks/useFilterOptions'
import BulkDeleteStudentsModal from '@/components/admin/BulkDeleteStudentsModal'

// Debug logging for build troubleshooting
console.log('🔍 [BUILD DEBUG] AdminStudents: Starting imports')

// Declare components at module scope
let AdminHeader: any

try {
  console.log('🔍 [BUILD DEBUG] AdminStudents: Importing AdminHeader...')
  AdminHeader = require('@/components/admin/AdminHeader').default
  console.log('✅ [BUILD DEBUG] AdminStudents: AdminHeader imported successfully')
} catch {
  console.error('❌ [BUILD DEBUG] AdminStudents: Failed to import AdminHeader')
  throw new Error('Failed to import AdminHeader')
}

console.log('✅ [BUILD DEBUG] AdminStudents: All imports completed successfully')

interface StudentHistory {
  student: {
    id: string
    username: string
    email: string
    totalPoints: number
    joinedAt: string
    lastActive: string
  }
  summary: {
    totalAttempts: number
    correctAttempts: number
    accuracyRate: number
    totalPointsEarned: number
    uniqueQuestionsCompleted: number
    completedQuests: number
    totalQuests: number
  }
  questProgress: Array<{
    questId: string
    questTitle: string
    difficulty: string
    totalQuestions: number
    completedQuestions: number
    isCompleted: boolean
    progress: number
    pointsEarned: number
    lastAttempt: string | null
  }>
  timeline: Record<string, any[]>
  recentActivity: Array<{
    id: string
    date: string
    questTitle: string
    questionTitle: string
    isCorrect: boolean
    points: number
  }>
}

export default function AdminStudents() {
  const [searchTerm, setSearchTerm] = useState('')
  const [questFilter, setQuestFilter] = useState<'all' | 'none' | 'some' | 'completed'>('all')

  // Applied filters (used for API calls)
  const [appliedQuestId, setAppliedQuestId] = useState<string>('all')
  const [appliedSubject, setAppliedSubject] = useState<string>('all')
  const [appliedBatch, setAppliedBatch] = useState<string>('all')
  const [appliedCourse, setAppliedCourse] = useState<string>('all')
  const [appliedSection, setAppliedSection] = useState<string>('all')

  // Temporary filters (user selection before applying)
  const [selectedQuestId, setSelectedQuestId] = useState<string>('all')
  const [selectedSubject, setSelectedSubject] = useState<string>('all')
  const [selectedBatch, setSelectedBatch] = useState<string>('all')
  const [selectedCourse, setSelectedCourse] = useState<string>('all')
  const [selectedSection, setSelectedSection] = useState<string>('all')

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [studentHistory, setStudentHistory] = useState<StudentHistory | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [loadingDelete, setLoadingDelete] = useState(false)
  const [showAllActivity, setShowAllActivity] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [studentsPerPage, setStudentsPerPage] = useState(10)

  // Check if user is super admin (can bulk import/delete students)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)

  // Fetch user session to check super admin status
  useEffect(() => {
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.user) {
          setIsSuperAdmin(data.user.is_super_admin || false)
        }
      })
      .catch(() => setIsSuperAdmin(false))
  }, [])

  // Fetch filter options
  const { filterOptions, isLoading: filterOptionsLoading } = useFilterOptions()

  // Fetch quests for dropdown
  const { quests, isLoading: questsLoading } = useAdminQuests()

  // Fetch subjects for dropdown (for admin: all subjects, for professor: their subjects)
  const [subjects, setSubjects] = useState<Array<{ id: string; name: string; subject_code: string }>>([])
  const [subjectsLoading, setSubjectsLoading] = useState(false)

  useEffect(() => {
    const fetchSubjects = async () => {
      setSubjectsLoading(true)
      try {
        const response = await fetch('/api/admin/subjects/my-subjects')
        const data = await response.json()
        if (data.success) {
          // Handle both array and object responses
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

  // Fetch students with APPLIED filters
  const { students, isLoading: loading, mutate } = useStudents(
    appliedQuestId,
    appliedBatch,
    appliedCourse,
    appliedSection,
    appliedSubject
  )

  // Filter students based on search term and quest completion filter
  const filteredStudents = useMemo(() => {
    let filtered = students || []

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(student =>
        student.username.toLowerCase().includes(searchLower) ||
        student.email.toLowerCase().includes(searchLower)
      )
    }

    // Quest completion filter
    switch (questFilter) {
      case 'none':
        filtered = filtered.filter(student => student.completedChallenges === 0)
        break
      case 'some':
        filtered = filtered.filter(student => student.completedChallenges > 0 && student.completedQuests === 0)
        break
      case 'completed':
        filtered = filtered.filter(student => student.completedQuests > 0)
        break
      case 'all':
      default:
        // No additional filtering
        break
    }

    return filtered
  }, [students, searchTerm, questFilter])

  // Pagination calculations
  const totalPages = Math.ceil(filteredStudents.length / studentsPerPage)
  const paginatedStudents = useMemo(() => {
    const startIndex = (currentPage - 1) * studentsPerPage
    const endIndex = startIndex + studentsPerPage
    return filteredStudents.slice(startIndex, endIndex)
  }, [filteredStudents, currentPage, studentsPerPage])

  // Reset to page 1 when APPLIED filters change
  useMemo(() => {
    setCurrentPage(1)
  }, [searchTerm, questFilter, appliedQuestId, appliedBatch, appliedCourse, appliedSection])

  const handleApplyFilters = () => {
    setAppliedQuestId(selectedQuestId)
    setAppliedSubject(selectedSubject)
    setAppliedBatch(selectedBatch)
    setAppliedCourse(selectedCourse)
    setAppliedSection(selectedSection)
  }

  const handleClearFilters = () => {
    setSelectedQuestId('all')
    setSelectedSubject('all')
    setSelectedBatch('all')
    setSelectedCourse('all')
    setSelectedSection('all')
    setAppliedQuestId('all')
    setAppliedSubject('all')
    setAppliedBatch('all')
    setAppliedCourse('all')
    setAppliedSection('all')
    setQuestFilter('all')
    setSearchTerm('')
  }

  const hasUnappliedChanges =
    selectedQuestId !== appliedQuestId ||
    selectedSubject !== appliedSubject ||
    selectedBatch !== appliedBatch ||
    selectedCourse !== appliedCourse ||
    selectedSection !== appliedSection

  const fetchStudents = async () => {
    mutate()
  }

  const handleViewDetails = async (student: Student) => {
    setSelectedStudent(student)
    setShowHistoryModal(true)
    setLoadingHistory(true)

    try {
      const response = await fetch(`/api/admin/students/${student.id}/history`)
      const result = await response.json()

      if (result.success) {
        setStudentHistory(result.data)
      } else {
        setError('Failed to load student history')
      }
    } catch (err) {
      setError('Failed to load student history')
      console.error('Error fetching student history:', err)
    } finally {
      setLoadingHistory(false)
    }
  }

  const handleDeleteUser = (student: Student) => {
    setSelectedStudent(student)
    setShowDeleteModal(true)
  }

  const confirmDeleteUser = async () => {
    if (!selectedStudent) return

    setLoadingDelete(true)
    try {
      const response = await fetch(`/api/admin/students/${selectedStudent.id}/delete`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.success) {
        // Refresh the students list
        fetchStudents()
        setShowDeleteModal(false)
        setSelectedStudent(null)
        setError(null)
      } else {
        setError(result.message || 'Failed to delete student')
      }
    } catch (err) {
      setError('Failed to delete student')
      console.error('Delete student error:', err)
    } finally {
      setLoadingDelete(false)
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString()
    } catch {
      return 'Invalid date'
    }
  }

  const formatDateTime = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString()
    } catch {
      return 'Invalid date'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <AdminHeader title="Student Management" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-300">Loading students...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AdminHeader title="Student Management" />

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Student Management</h2>
            <p className="text-gray-600 dark:text-gray-300">Monitor and manage student accounts and progress</p>
          </div>
          {/* Only show bulk import/delete buttons to super admins */}
          {isSuperAdmin && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowBulkDeleteModal(true)}
                disabled={!students || students.length === 0}
                className="px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-lg hover:from-red-700 hover:to-orange-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed"
                title={students && students.length > 0 ? 'Bulk delete students (Super Admin only)' : 'No students to delete'}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Bulk Delete Students
              </button>
              <a
                href="/admin/students/bulk-upload"
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                title="Bulk upload students (Super Admin only)"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Bulk Upload Students
              </a>
            </div>
          )}
          {/* Show message for professors */}
          {!isSuperAdmin && (
            <div className="text-sm text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 px-4 py-2 rounded-lg">
              ℹ️ Professors can enroll existing students in subjects. Contact super admin for bulk student import.
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded mb-6">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-2 text-red-500 hover:text-red-700"
            >
              ✕
            </button>
          </div>
        )}

        {/* Search and Filter Controls */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          {/* First Row - Search and Academic Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* Search Bar */}
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Search Students
              </label>
              <input
                type="text"
                id="search"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700"
              />
            </div>

            {/* Batch Filter */}
            <div>
              <label htmlFor="batchSelect" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Filter by Batch
              </label>
              <select
                id="batchSelect"
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

          {/* Second Row - Quest & Subject Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

            {/* Quest Filter */}
            <div>
              <label htmlFor="questSelect" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Filter by Quest
              </label>
              <select
                id="questSelect"
                value={selectedQuestId}
                onChange={(e) => setSelectedQuestId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                disabled={questsLoading}
              >
                <option value="all">All Quests</option>
                {quests?.map((quest) => (
                  <option key={quest.id} value={quest.id}>
                    {quest.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Quest Completion Filter */}
            <div>
              <label htmlFor="questFilter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Quest Completion Status
              </label>
              <select
                id="questFilter"
                value={questFilter}
                onChange={(e) => setQuestFilter(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700"
              >
                <option value="all">All Students</option>
                <option value="none">Haven&apos;t Started</option>
                <option value="some">In Progress</option>
                <option value="completed">Completed Quests</option>
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

            {(appliedBatch !== 'all' || appliedCourse !== 'all' || appliedSection !== 'all' || appliedQuestId !== 'all' || appliedSubject !== 'all' || questFilter !== 'all' || searchTerm) && (
              <button
                onClick={handleClearFilters}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Clear All Filters
              </button>
            )}
          </div>

          {/* Filter Results Summary */}
          <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            Showing {filteredStudents.length} of {students?.length || 0} students
            {searchTerm && (
              <span> matching &quot;{searchTerm}&quot;</span>
            )}
            {appliedBatch !== 'all' && (
              <span> from batch {appliedBatch}</span>
            )}
            {appliedCourse !== 'all' && (
              <span> taking {appliedCourse}</span>
            )}
            {appliedSection !== 'all' && (
              <span> from section {appliedSection}</span>
            )}
            {appliedQuestId !== 'all' && (
              <span> for quest &quot;{quests?.find(q => q.id === appliedQuestId)?.title || 'Unknown'}&quot;</span>
            )}
            {questFilter !== 'all' && (
              <span> with {questFilter === 'none' ? 'no progress' : questFilter === 'some' ? 'some progress' : 'completed quests'}</span>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">All Students</h3>

            {filteredStudents.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">👥</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchTerm || questFilter !== 'all' ? 'No Students Found' : 'No Students Yet'}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  {searchTerm || questFilter !== 'all' || selectedQuestId !== 'all'
                    ? 'Try adjusting your search or filter criteria.'
                    : 'Students will appear here once they start using the platform.'
                  }
                </p>
                {(searchTerm || questFilter !== 'all' || selectedQuestId !== 'all') && (
                  <button
                    onClick={() => {
                      setSearchTerm('')
                      setQuestFilter('all')
                      setSelectedQuestId('all')
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Student
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Quests Completed
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Questions Completed
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Points
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        CP Attempts
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        CP Points
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Badges
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Streak
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        {selectedQuestId !== 'all' ? 'Quest Completed' : 'Last Active'}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {paginatedStudents.map((student) => (
                      <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-blue-600 font-medium text-sm">
                                {student.username.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {student.username}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                Joined {formatDate(student.createdAt)}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">{student.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">🎯</span>
                            <span className="text-sm font-bold text-green-600">
                              {student.completedQuests}
                            </span>
                            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              student.completedChallenges === 0 ? 'bg-gray-100 text-gray-800' :
                              student.completedQuests === 0 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {student.completedChallenges === 0 ? 'Not Started' :
                               student.completedQuests === 0 ? 'In Progress' : 'Completed'}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">📝</span>
                            <span className="text-sm font-bold text-blue-600">
                              {student.completedChallenges}
                            </span>
                            <span className="text-xs text-gray-500">questions</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">🏆</span>
                            <span className="text-sm font-bold text-purple-600">
                              {student.totalPoints}
                            </span>
                            <span className="text-xs text-gray-500">pts</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">✋</span>
                            <span className="text-sm font-bold text-orange-600">
                              {student.cpAttempts || 0}
                            </span>
                            <span className="text-xs text-gray-500">attempts</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">⭐</span>
                            <span className="text-sm font-bold text-yellow-600">
                              {student.cpPoints || 0}
                            </span>
                            <span className="text-xs text-gray-500">xp</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">🏅</span>
                            <span className="text-sm font-bold text-pink-600">
                              {student.badges || 0}
                            </span>
                            <span className="text-xs text-gray-500">badges</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">🔥</span>
                            <span className="text-sm font-bold text-red-600">
                              {student.currentStreak || 0}
                            </span>
                            <span className="text-xs text-gray-500">day streak</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {selectedQuestId !== 'all' ? (
                            student.questCompletedAt ? (
                              <span className="text-green-600 dark:text-green-400 font-medium">
                                ✅ {formatDate(student.questCompletedAt)}
                              </span>
                            ) : (
                              <span className="text-gray-400">Not completed</span>
                            )
                          ) : (
                            student.lastActive ?
                              formatDate(student.lastActive) :
                              'Never'
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <button
                            onClick={() => handleViewDetails(student)}
                            className="text-blue-600 hover:text-blue-900 transition-colors"
                          >
                            View Details
                          </button>
                          <button
                            onClick={() => handleDeleteUser(student)}
                            className="text-red-600 hover:text-red-900 transition-colors"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination Controls */}
                {filteredStudents.length > 0 && (
                  <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Showing {((currentPage - 1) * studentsPerPage) + 1} to {Math.min(currentPage * studentsPerPage, filteredStudents.length)} of {filteredStudents.length} students
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600 dark:text-gray-400">Per page:</label>
                        <select
                          value={studentsPerPage}
                          onChange={(e) => {
                            setStudentsPerPage(Number(e.target.value))
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
                )}
              </div>
            )}
          </div>
        </div>

        {/* Student Details Modal */}
        {showHistoryModal && selectedStudent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {selectedStudent.username} - Complete History
                </h3>
                <button
                  onClick={() => {
                    setShowHistoryModal(false)
                    setSelectedStudent(null)
                    setStudentHistory(null)
                    setShowAllActivity(false)
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  ✕
                </button>
              </div>

              <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-120px)]">
                {loadingHistory ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-gray-600 dark:text-gray-300">Loading history...</span>
                  </div>
                ) : studentHistory ? (
                  <div className="space-y-6">
                    {/* Student Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h4 className="font-medium text-blue-900 mb-2">Overview</h4>
                        <div className="space-y-1 text-sm text-blue-900">
                          <p><span className="font-medium">Total Points:</span> {studentHistory.summary.totalPointsEarned}</p>
                          <p><span className="font-medium">Accuracy:</span> {studentHistory.summary.accuracyRate}%</p>
                          <p><span className="font-medium">Questions Completed:</span> {studentHistory.summary.uniqueQuestionsCompleted}</p>
                        </div>
                      </div>
                      <div className="bg-green-50 p-4 rounded-lg">
                        <h4 className="font-medium text-green-900 mb-2">Quest Progress</h4>
                        <div className="space-y-1 text-sm text-green-900">
                          <p><span className="font-medium">Completed Quests:</span> {studentHistory.summary.completedQuests}</p>
                          <p><span className="font-medium">Total Quests:</span> {studentHistory.summary.totalQuests}</p>
                          <p><span className="font-medium">Progress:</span> {Math.round((studentHistory.summary.completedQuests / Math.max(studentHistory.summary.totalQuests, 1)) * 100)}%</p>
                        </div>
                      </div>
                      <div className="bg-purple-50 p-4 rounded-lg">
                        <h4 className="font-medium text-purple-900 mb-2">Activity</h4>
                        <div className="space-y-1 text-sm text-purple-900">
                          <p><span className="font-medium">Total Attempts:</span> {studentHistory.summary.totalAttempts}</p>
                          <p><span className="font-medium">Correct Attempts:</span> {studentHistory.summary.correctAttempts}</p>
                          <p><span className="font-medium">Joined:</span> {formatDate(studentHistory.student.joinedAt)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Quest Progress */}
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white mb-3">Quest Progress</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {studentHistory.questProgress.filter(quest => quest.progress > 0 || quest.isCompleted).map((quest) => (
                          <div key={quest.questId} className={`p-4 rounded-lg border ${
                            quest.isCompleted ? 'bg-green-50 border-green-200' :
                            quest.progress > 0 ? 'bg-yellow-50 border-yellow-200' :
                            'bg-gray-50 border-gray-200'
                          }`}>
                            <div className="flex justify-between items-start mb-2">
                              <h5 className="font-medium text-gray-900 dark:text-white text-sm">{quest.questTitle}</h5>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                quest.difficulty === 'Beginner' ? 'bg-green-100 text-green-800' :
                                quest.difficulty === 'Intermediate' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {quest.difficulty}
                              </span>
                            </div>
                            <div className="space-y-1 text-xs text-gray-600">
                              <p>Progress: {quest.completedQuestions}/{quest.totalQuestions} questions ({quest.progress}%)</p>
                              <p>Points earned: {quest.pointsEarned}</p>
                              {quest.lastAttempt && (
                                <p>Last attempt: {formatDate(quest.lastAttempt)}</p>
                              )}
                            </div>
                            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  quest.isCompleted ? 'bg-green-500' : quest.progress > 0 ? 'bg-yellow-500' : 'bg-gray-300'
                                }`}
                                style={{ width: `${quest.progress}%` }}
                              ></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Recent Activity */}
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-medium text-gray-900 dark:text-white">Recent Activity</h4>
                        {studentHistory.recentActivity.length > 5 && (
                          <button
                            onClick={() => setShowAllActivity(!showAllActivity)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            {showAllActivity ? 'Show Less' : 'Load All Activity'}
                          </button>
                        )}
                      </div>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {(showAllActivity ? studentHistory.recentActivity : studentHistory.recentActivity.slice(0, 5)).map((activity) => (
                          <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <span>{activity.isCorrect ? '✅' : '❌'}</span>
                                <span className="font-medium text-gray-900 dark:text-white">{activity.questTitle}</span>
                                <span className="text-gray-500 dark:text-gray-400">→</span>
                                <span className="text-gray-700 dark:text-gray-300">{activity.questionTitle}</span>
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {formatDateTime(activity.date)}
                              </div>
                            </div>
                            {activity.isCorrect && (
                              <span className="text-green-600 dark:text-green-400 font-medium">+{activity.points} pts</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-8">Failed to load student history</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && selectedStudent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Delete Student</h3>
              </div>
              <div className="px-6 py-4">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Are you sure you want to permanently delete <strong>{selectedStudent.username}</strong>?
                  This action cannot be undone.
                </p>
                <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                  <p className="text-sm text-red-800 dark:text-red-400 font-medium">
                    This will permanently delete:
                  </p>
                  <ul className="text-sm text-red-800 dark:text-red-400 mt-1 list-disc list-inside">
                    <li>Student account and profile</li>
                    <li>All attempt history and submissions</li>
                    <li>Progress tracking data</li>
                    <li>Points and achievements</li>
                  </ul>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false)
                    setSelectedStudent(null)
                  }}
                  disabled={loadingDelete}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteUser}
                  disabled={loadingDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 flex items-center"
                >
                  {loadingDelete && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  )}
                  Delete Student
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Delete Modal */}
        <BulkDeleteStudentsModal
          isOpen={showBulkDeleteModal}
          onClose={() => setShowBulkDeleteModal(false)}
          students={students || []}
          onDeleteComplete={() => {
            mutate()
            setShowBulkDeleteModal(false)
          }}
        />
      </div>
    </div>
  )
}