'use client'

import { useState, useMemo } from 'react'
import { useFilterOptions } from '@/lib/hooks/useFilterOptions'

interface Student {
  id: string
  username: string
  email: string
  batch?: string
  course?: string
  section?: string
  totalPoints?: number
  completedQuests?: number
}

interface BulkDeleteStudentsModalProps {
  isOpen: boolean
  onClose: () => void
  students: Student[]
  onDeleteComplete: () => void
}

type DeleteMode = 'all' | 'filter' | 'inactive' | 'select'

export default function BulkDeleteStudentsModal({
  isOpen,
  onClose,
  students,
  onDeleteComplete
}: BulkDeleteStudentsModalProps) {
  const [deleteMode, setDeleteMode] = useState<DeleteMode>('filter')
  const [selectedBatch, setSelectedBatch] = useState<string>('all')
  const [selectedCourse, setSelectedCourse] = useState<string>('all')
  const [selectedSection, setSelectedSection] = useState<string>('all')
  const [inactiveDays, setInactiveDays] = useState<number>(90)
  const [zeroPointsOnly, setZeroPointsOnly] = useState<boolean>(false)
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const [confirmText, setConfirmText] = useState('')
  const [step, setStep] = useState<'configure' | 'preview' | 'confirm'>('configure')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { filterOptions } = useFilterOptions()

  // Calculate students to be deleted based on selected mode
  const studentsToDelete = useMemo(() => {
    let filtered = students

    if (deleteMode === 'all') {
      return students
    }

    if (deleteMode === 'filter') {
      // Filter by batch
      if (selectedBatch !== 'all') {
        filtered = filtered.filter(s => s.batch === selectedBatch)
      }
      // Filter by course
      if (selectedCourse !== 'all') {
        filtered = filtered.filter(s => s.course === selectedCourse)
      }
      // Filter by section
      if (selectedSection !== 'all') {
        filtered = filtered.filter(s => s.section === selectedSection)
      }
      // Filter by zero points
      if (zeroPointsOnly) {
        filtered = filtered.filter(s => (s.totalPoints || 0) === 0)
      }
      return filtered
    }

    if (deleteMode === 'inactive') {
      // Filter inactive students (last_active > inactiveDays)
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - inactiveDays)
      // For now, filter by zero activity (can be enhanced with actual last_active field)
      filtered = filtered.filter(s =>
        (s.totalPoints || 0) === 0 && (s.completedQuests || 0) === 0
      )
      return filtered
    }

    if (deleteMode === 'select') {
      return students.filter(s => selectedStudentIds.has(s.id))
    }

    return []
  }, [deleteMode, students, selectedBatch, selectedCourse, selectedSection, zeroPointsOnly, inactiveDays, selectedStudentIds])

  const handleStudentSelect = (studentId: string) => {
    const newSelected = new Set(selectedStudentIds)
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId)
    } else {
      newSelected.add(studentId)
    }
    setSelectedStudentIds(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedStudentIds.size === students.length) {
      setSelectedStudentIds(new Set())
    } else {
      setSelectedStudentIds(new Set(students.map(s => s.id)))
    }
  }

  const handleDelete = async () => {
    if (confirmText !== 'DELETE') {
      setError('Please type DELETE to confirm')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/students/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          studentIds: studentsToDelete.map(s => s.id)
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete students')
      }

      onDeleteComplete()
      onClose()
      resetModal()
    } catch (err: any) {
      setError(err.message || 'Failed to delete students')
    } finally {
      setLoading(false)
    }
  }

  // Filtered students for search in select mode
  const filteredStudentsForSelect = useMemo(() => {
    if (!searchTerm) return students
    const term = searchTerm.toLowerCase()
    return students.filter(s =>
      s.username.toLowerCase().includes(term) ||
      s.email.toLowerCase().includes(term) ||
      (s.batch && s.batch.toLowerCase().includes(term)) ||
      (s.course && s.course.toLowerCase().includes(term)) ||
      (s.section && s.section.toLowerCase().includes(term))
    )
  }, [students, searchTerm])

  const resetModal = () => {
    setDeleteMode('filter')
    setSelectedBatch('all')
    setSelectedCourse('all')
    setSelectedSection('all')
    setInactiveDays(90)
    setZeroPointsOnly(false)
    setSelectedStudentIds(new Set())
    setSearchTerm('')
    setConfirmText('')
    setStep('configure')
    setError(null)
  }

  const handleClose = () => {
    resetModal()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="text-red-500">⚠️</span>
              Bulk Delete Students
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              Step {step === 'configure' ? '1' : step === 'preview' ? '2' : '3'} of 3: {
                step === 'configure' ? 'Configure deletion criteria' :
                step === 'preview' ? 'Preview students to delete' :
                'Confirm deletion'
              }
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Step 1: Configure */}
        {step === 'configure' && (
          <div className="px-6 py-4 space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Select Deletion Mode
              </h3>

              <div className="space-y-3">
                {/* Filter Mode */}
                <label className="flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  style={{ borderColor: deleteMode === 'filter' ? '#3b82f6' : '#d1d5db' }}>
                  <input
                    type="radio"
                    name="deleteMode"
                    value="filter"
                    checked={deleteMode === 'filter'}
                    onChange={(e) => setDeleteMode(e.target.value as DeleteMode)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white">Filter by Criteria</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">Delete students matching specific batch, course, section, or activity criteria</div>
                  </div>
                </label>

                {/* Inactive Mode */}
                <label className="flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  style={{ borderColor: deleteMode === 'inactive' ? '#3b82f6' : '#d1d5db' }}>
                  <input
                    type="radio"
                    name="deleteMode"
                    value="inactive"
                    checked={deleteMode === 'inactive'}
                    onChange={(e) => setDeleteMode(e.target.value as DeleteMode)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white">Inactive Students</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">Delete students with no activity (0 points, 0 quests completed)</div>
                  </div>
                </label>

                {/* Select Mode */}
                <label className="flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  style={{ borderColor: deleteMode === 'select' ? '#3b82f6' : '#d1d5db' }}>
                  <input
                    type="radio"
                    name="deleteMode"
                    value="select"
                    checked={deleteMode === 'select'}
                    onChange={(e) => setDeleteMode(e.target.value as DeleteMode)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white">Select Specific Students</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">Manually select individual students from the list</div>
                  </div>
                </label>

                {/* Delete All Mode */}
                <label className="flex items-start space-x-3 p-4 border-2 border-red-300 dark:border-red-700 rounded-lg cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  style={{ borderColor: deleteMode === 'all' ? '#ef4444' : '#fca5a5' }}>
                  <input
                    type="radio"
                    name="deleteMode"
                    value="all"
                    checked={deleteMode === 'all'}
                    onChange={(e) => setDeleteMode(e.target.value as DeleteMode)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-red-600 dark:text-red-400">⚠️ Delete ALL Students</div>
                    <div className="text-sm text-red-600 dark:text-red-400">Permanently delete all {students.length} students (use with extreme caution!)</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Filter Options for 'filter' mode */}
            {deleteMode === 'filter' && (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-4">
                <h4 className="font-medium text-gray-900 dark:text-white">Filter Criteria</h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Batch Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Batch
                    </label>
                    <select
                      value={selectedBatch}
                      onChange={(e) => setSelectedBatch(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white bg-white dark:bg-gray-800"
                    >
                      <option value="all">All Batches</option>
                      {filterOptions?.batches.map((batch) => (
                        <option key={batch} value={batch}>{batch}</option>
                      ))}
                    </select>
                  </div>

                  {/* Course Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Course
                    </label>
                    <select
                      value={selectedCourse}
                      onChange={(e) => setSelectedCourse(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white bg-white dark:bg-gray-800"
                    >
                      <option value="all">All Courses</option>
                      {filterOptions?.courses.map((course) => (
                        <option key={course} value={course}>{course}</option>
                      ))}
                    </select>
                  </div>

                  {/* Section Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Section
                    </label>
                    <select
                      value={selectedSection}
                      onChange={(e) => setSelectedSection(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white bg-white dark:bg-gray-800"
                    >
                      <option value="all">All Sections</option>
                      {filterOptions?.sections.map((section) => (
                        <option key={section} value={section}>{section}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Zero Points Filter */}
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={zeroPointsOnly}
                    onChange={(e) => setZeroPointsOnly(e.target.checked)}
                    className="rounded text-blue-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Only students with 0 points
                  </span>
                </label>
              </div>
            )}

            {/* Select Students Mode */}
            {deleteMode === 'select' && (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    Select Students ({selectedStudentIds.size} selected)
                  </h4>
                  <button
                    onClick={handleSelectAll}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {selectedStudentIds.size === students.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                {/* Search Bar */}
                <div className="mb-3">
                  <input
                    type="text"
                    placeholder="Search by name, email, batch, course, or section..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white bg-white dark:bg-gray-800"
                  />
                </div>

                <div className="max-h-64 overflow-y-auto space-y-2">
                  {filteredStudentsForSelect.length === 0 ? (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-4">No students found</p>
                  ) : (
                    filteredStudentsForSelect.map((student) => (
                      <label
                        key={student.id}
                        className="flex items-center space-x-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedStudentIds.has(student.id)}
                          onChange={() => handleStudentSelect(student.id)}
                          className="rounded text-blue-600"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 dark:text-white">{student.username}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-300">{student.email}</div>
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {student.batch || 'N/A'} • {student.course || 'N/A'} • {student.section || 'N/A'}
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Summary */}
            <div className={`rounded-lg p-4 border ${studentsToDelete.length === 0 ? 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600' : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'}`}>
              <div className="flex items-start space-x-3">
                <span className={`text-xl ${studentsToDelete.length === 0 ? 'text-gray-500 dark:text-gray-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                  {studentsToDelete.length === 0 ? 'ℹ️' : '⚠️'}
                </span>
                <div className="flex-1">
                  <div className={`font-medium ${studentsToDelete.length === 0 ? 'text-gray-900 dark:text-white' : 'text-yellow-900 dark:text-yellow-200'}`}>
                    {studentsToDelete.length} student{studentsToDelete.length !== 1 ? 's' : ''} will be deleted
                  </div>
                  <div className={`text-sm mt-1 ${studentsToDelete.length === 0 ? 'text-gray-600 dark:text-gray-300' : 'text-yellow-800 dark:text-yellow-300'}`}>
                    {studentsToDelete.length === 0 ? (
                      deleteMode === 'filter' ? (
                        'No students match your selected criteria. Try selecting "All Batches", "All Courses", and "All Sections", or choose a different deletion mode.'
                      ) : deleteMode === 'select' ? (
                        'Please select at least one student from the list above.'
                      ) : (
                        'No students match this criteria.'
                      )
                    ) : (
                      'This action will permanently delete all student data including progress, submissions, and achievements.'
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Preview */}
        {step === 'preview' && (
          <div className="px-6 py-4">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Students to be Deleted ({studentsToDelete.length})
              </h3>
              <div className="max-h-96 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                  <thead className="bg-gray-100 dark:bg-gray-800 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">Username</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">Email</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">Batch</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">Course</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">Section</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">Points</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                    {studentsToDelete.map((student) => (
                      <tr key={student.id} className="hover:bg-gray-100 dark:hover:bg-gray-600">
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{student.username}</td>
                        <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">{student.email}</td>
                        <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">{student.batch || 'N/A'}</td>
                        <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">{student.course || 'N/A'}</td>
                        <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">{student.section || 'N/A'}</td>
                        <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">{student.totalPoints || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === 'confirm' && (
          <div className="px-6 py-4">
            <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-500 dark:border-red-700 rounded-lg p-6 space-y-4">
              <div className="flex items-start space-x-3">
                <span className="text-red-500 text-3xl">🛑</span>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-red-900 dark:text-red-200 mb-2">
                    Final Confirmation Required
                  </h3>
                  <p className="text-red-800 dark:text-red-300 mb-4">
                    You are about to permanently delete <strong>{studentsToDelete.length} student{studentsToDelete.length !== 1 ? 's' : ''}</strong> and all their associated data:
                  </p>
                  <ul className="list-disc list-inside text-red-800 dark:text-red-300 space-y-1 mb-4">
                    <li>Student profiles and account information</li>
                    <li>All quest progress and submissions</li>
                    <li>Achievement and points history</li>
                    <li>Activity logs and timestamps</li>
                  </ul>
                  <p className="text-red-900 dark:text-red-200 font-semibold mb-4">
                    ⚠️ This action CANNOT be undone!
                  </p>

                  <div>
                    <label className="block text-sm font-medium text-red-900 dark:text-red-200 mb-2">
                      Type <strong>DELETE</strong> to confirm:
                    </label>
                    <input
                      type="text"
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      placeholder="Type DELETE here"
                      className="w-full px-4 py-2 border-2 border-red-500 dark:border-red-700 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900 dark:text-white bg-white dark:bg-gray-800"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600 px-6 py-4 flex items-center justify-between">
          <button
            onClick={step === 'configure' ? handleClose : () => setStep(step === 'preview' ? 'configure' : 'preview')}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            disabled={loading}
          >
            {step === 'configure' ? 'Cancel' : 'Back'}
          </button>

          <div className="flex items-center gap-3">
            {step !== 'confirm' && (
              <button
                onClick={() => setStep(step === 'configure' ? 'preview' : 'confirm')}
                disabled={studentsToDelete.length === 0}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                Next: {step === 'configure' ? 'Preview' : 'Confirm'}
              </button>
            )}

            {step === 'confirm' && (
              <button
                onClick={handleDelete}
                disabled={loading || confirmText !== 'DELETE' || studentsToDelete.length === 0}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <span>🗑️</span>
                    Delete {studentsToDelete.length} Student{studentsToDelete.length !== 1 ? 's' : ''}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
