'use client'

import { useState, useEffect } from 'react'

interface Student {
  id: string
  username: string
  year: string
  course: string
  section: string
}

interface UnlockQuestModalProps {
  questId: string
  questTitle: string
  onClose: () => void
  onSuccess: (message: string) => void
}

export default function UnlockQuestModal({ questId, questTitle, onClose, onSuccess }: UnlockQuestModalProps) {
  const [filterYears, setFilterYears] = useState<string[]>([])
  const [filterCourses, setFilterCourses] = useState<string[]>([])
  const [filterSections, setFilterSections] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showAnimation, setShowAnimation] = useState(false)

  // Fetch students based on filters
  useEffect(() => {
    fetchStudents()
  }, [filterYears, filterCourses, filterSections])

  const fetchStudents = async () => {
    setLoading(true)
    try {
      // Fetch all students and filter client-side for multi-select
      const response = await fetch(`/api/admin/students`)
      const result = await response.json()

      if (result.success) {
        let filteredData = result.data || []

        // Apply multi-select filters
        if (filterYears.length > 0) {
          filteredData = filteredData.filter((s: Student) => filterYears.includes(s.year))
        }
        if (filterCourses.length > 0) {
          filteredData = filteredData.filter((s: Student) => filterCourses.includes(s.course))
        }
        if (filterSections.length > 0) {
          filteredData = filteredData.filter((s: Student) => filterSections.includes(s.section))
        }

        setStudents(filteredData)
      }
    } catch (error) {
      console.error('Failed to fetch students:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filter students by search term
  const filteredStudents = students.filter(student =>
    student.username.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Toggle filter selection
  const toggleFilter = (filterArray: string[], setFilter: (val: string[]) => void, value: string) => {
    if (filterArray.includes(value)) {
      setFilter(filterArray.filter(v => v !== value))
    } else {
      setFilter([...filterArray, value])
    }
  }

  // Toggle student selection
  const toggleStudent = (studentId: string) => {
    const newSelection = new Set(selectedStudents)
    if (newSelection.has(studentId)) {
      newSelection.delete(studentId)
    } else {
      newSelection.add(studentId)
    }
    setSelectedStudents(newSelection)
  }

  // Select all filtered students
  const selectAll = () => {
    const newSelection = new Set(selectedStudents)
    filteredStudents.forEach(student => newSelection.add(student.id))
    setSelectedStudents(newSelection)
  }

  // Deselect all
  const deselectAll = () => {
    setSelectedStudents(new Set())
  }

  // Submit unlock request
  const handleUnlock = async () => {
    if (selectedStudents.size === 0) {
      alert('Please select at least one student')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/admin/quests/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questId,
          studentIds: Array.from(selectedStudents)
        })
      })

      const result = await response.json()

      if (result.success) {
        // Show success animation
        setShowAnimation(true)
        setTimeout(() => {
          onSuccess(`Quest "${questTitle}" unlocked for ${selectedStudents.size} student(s)`)
          onClose()
        }, 2000)
      } else {
        alert(`Failed to unlock quest: ${result.message}`)
      }
    } catch (error) {
      console.error('Failed to unlock quest:', error)
      alert('Failed to unlock quest. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const FilterCheckbox = ({ label, value, checked, onChange }: any) => (
    <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1 rounded">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 text-blue-600 rounded"
      />
      <span className="text-sm text-gray-900 dark:text-gray-100">{label}</span>
    </label>
  )

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                🔓 Unlock Quest: {questTitle}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Grant access to students who haven&apos;t completed prerequisites
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Year Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Year {filterYears.length > 0 && `(${filterYears.length})`}
              </label>
              <div className="space-y-1 max-h-32 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md p-2 bg-white dark:bg-gray-800">
                <FilterCheckbox
                  label="1st Year"
                  value="1st year"
                  checked={filterYears.includes('1st year')}
                  onChange={() => toggleFilter(filterYears, setFilterYears, '1st year')}
                />
                <FilterCheckbox
                  label="2nd Year"
                  value="2nd year"
                  checked={filterYears.includes('2nd year')}
                  onChange={() => toggleFilter(filterYears, setFilterYears, '2nd year')}
                />
              </div>
            </div>

            {/* Course Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Course {filterCourses.length > 0 && `(${filterCourses.length})`}
              </label>
              <div className="space-y-1 max-h-32 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md p-2 bg-white dark:bg-gray-800">
                {['PGDM', 'BDA', 'BIFS', 'HCM'].map(course => (
                  <FilterCheckbox
                    key={course}
                    label={course}
                    value={course}
                    checked={filterCourses.includes(course)}
                    onChange={() => toggleFilter(filterCourses, setFilterCourses, course)}
                  />
                ))}
              </div>
            </div>

            {/* Section Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Section {filterSections.length > 0 && `(${filterSections.length})`}
              </label>
              <div className="space-y-1 max-h-32 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md p-2 bg-white dark:bg-gray-800">
                {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'].map(section => (
                  <FilterCheckbox
                    key={section}
                    label={`Section ${section}`}
                    value={`Section ${section}`}
                    checked={filterSections.includes(`Section ${section}`)}
                    onChange={() => toggleFilter(filterSections, setFilterSections, `Section ${section}`)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="mt-4">
            <input
              type="text"
              placeholder="Search students by username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>

          {/* Bulk Actions */}
          <div className="mt-4 flex justify-between items-center">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {selectedStudents.size} student(s) selected from {filteredStudents.length} shown
            </div>
            <div className="space-x-2">
              <button
                onClick={selectAll}
                className="px-3 py-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                Select All ({filteredStudents.length})
              </button>
              <button
                onClick={deselectAll}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-700 dark:text-gray-400"
              >
                Deselect All
              </button>
            </div>
          </div>
        </div>

        {/* Student List */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 dark:text-gray-400 mt-2">Loading students...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-400">No students found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredStudents.map((student) => (
                <div
                  key={student.id}
                  onClick={() => toggleStudent(student.id)}
                  className={`p-3 border rounded-md cursor-pointer transition-colors ${
                    selectedStudents.has(student.id)
                      ? 'bg-blue-50 border-blue-300 dark:bg-blue-900 dark:border-blue-600'
                      : 'bg-white border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={selectedStudents.has(student.id)}
                        onChange={() => toggleStudent(student.id)}
                        className="h-4 w-4 text-blue-600 rounded"
                      />
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {student.username}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {student.year} • {student.course} • {student.section}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={handleUnlock}
              disabled={selectedStudents.size === 0 || submitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Unlocking...</span>
                </>
              ) : (
                <>
                  <span>🔓</span>
                  <span>Unlock for {selectedStudents.size} Student(s)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Success Animation */}
        {showAnimation && (
          <div className="absolute inset-0 bg-white dark:bg-gray-800 bg-opacity-95 flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4 animate-bounce">✅</div>
              <div className="text-xl font-semibold text-gray-900 dark:text-white">
                Quest Unlocked Successfully!
              </div>
              <div className="text-gray-600 dark:text-gray-400 mt-2">
                {selectedStudents.size} student(s) can now access this quest
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
