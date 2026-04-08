'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AdminHeader from '@/components/admin/AdminHeader'
import SuccessToast from '@/components/admin/SuccessToast'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface Subject {
  id: string
  name: string
  subject_code: string | null
  batch: string
  course: string
  section: string | null
  is_elective: boolean
  created_at: string
  enrollmentCount: number
  is_active: boolean
  cr: {
    id: string
    username: string
    email: string
  } | null
}

interface SubjectsResponse {
  success: boolean
  data: {
    regularSubjects: Subject[]
    electiveSubjects: Subject[]
    total: number
  }
}

export default function AdminSubjects() {
  const router = useRouter()

  // Filters
  const [selectedBatch, setSelectedBatch] = useState<string>('all')
  const [selectedCourse, setSelectedCourse] = useState<string>('all')
  const [selectedSection, setSelectedSection] = useState<string>('all')
  const [showArchived, setShowArchived] = useState<boolean>(false)

  // Applied filters (for API)
  const [appliedBatch, setAppliedBatch] = useState<string>('all')
  const [appliedCourse, setAppliedCourse] = useState<string>('all')
  const [appliedSection, setAppliedSection] = useState<string>('all')
  const [appliedShowArchived, setAppliedShowArchived] = useState<boolean>(false)

  const [showSuccessToast, setShowSuccessToast] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  // Build query params
  const queryParams = new URLSearchParams()
  if (appliedBatch !== 'all') queryParams.set('batch', appliedBatch)
  if (appliedCourse !== 'all') queryParams.set('course', appliedCourse)
  if (appliedSection !== 'all') queryParams.set('section', appliedSection)
  if (appliedShowArchived) queryParams.set('showArchived', 'true')

  const { data, isLoading, error, mutate } = useSWR<SubjectsResponse>(
    `/api/admin/subjects?${queryParams.toString()}`,
    fetcher
  )

  const regularSubjects = data?.data?.regularSubjects || []
  const electiveSubjects = data?.data?.electiveSubjects || []

  const handleApplyFilters = () => {
    setAppliedBatch(selectedBatch)
    setAppliedCourse(selectedCourse)
    setAppliedSection(selectedSection)
    setAppliedShowArchived(showArchived)
  }

  const handleClearFilters = () => {
    setSelectedBatch('all')
    setSelectedCourse('all')
    setSelectedSection('all')
    setShowArchived(false)
    setAppliedBatch('all')
    setAppliedCourse('all')
    setAppliedSection('all')
    setAppliedShowArchived(false)
  }

  const hasUnappliedChanges =
    selectedBatch !== appliedBatch ||
    selectedCourse !== appliedCourse ||
    selectedSection !== appliedSection ||
    showArchived !== appliedShowArchived

  const handleArchiveToggle = async (subjectId: string, currentIsActive: boolean) => {
    try {
      const response = await fetch(`/api/admin/subjects/${subjectId}/archive`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: currentIsActive })
      })

      const result = await response.json()

      if (result.success) {
        setSuccessMessage(result.message)
        setShowSuccessToast(true)
        mutate()
      } else {
        alert(`Error: ${result.message}`)
      }
    } catch (error) {
      console.error('Archive toggle error:', error)
      alert('Failed to update subject')
    }
  }

  const batches = ['all', '2022-2024', '2023-2025', '2024-2026']
  const courses = ['all', 'PGDM', 'BDA', 'BIFS', 'HCM']
  const sections = ['all', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminHeader title="Subject Management" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">Loading subjects...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminHeader title="Subject Management" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12 text-red-600">
            Error loading subjects. Please refresh the page.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader title="Subject Management" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Subject Management</h1>
          <button
            onClick={() => router.push('/admin/subjects/create')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            + Create Subject
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[150px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Batch</label>
              <select
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              >
                {batches.map(b => (
                  <option key={b} value={b}>{b === 'all' ? 'All Batches' : b}</option>
                ))}
              </select>
            </div>

            <div className="flex-1 min-w-[150px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              >
                {courses.map(c => (
                  <option key={c} value={c}>{c === 'all' ? 'All Courses' : c}</option>
                ))}
              </select>
            </div>

            <div className="flex-1 min-w-[150px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              >
                {sections.map(s => (
                  <option key={s} value={s}>{s === 'all' ? 'All Sections' : s}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="showArchived"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="showArchived" className="text-sm font-medium text-gray-700 cursor-pointer">
                Show Archived
              </label>
            </div>

            <div className="flex gap-2 items-end">
              <button
                onClick={handleApplyFilters}
                className="relative bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
              >
                {hasUnappliedChanges && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full"></span>
                )}
                Apply Filters
              </button>
              <button
                onClick={handleClearFilters}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-2 rounded-lg transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* Regular Subjects */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Regular Subjects (Section-Specific)
          </h2>
          {regularSubjects.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
              No regular subjects found. {appliedShowArchived ? 'Try adjusting filters.' : 'Create one to get started.'}
            </div>
          ) : (
            <div className="grid gap-4">
              {regularSubjects.map(subject => (
                <div key={subject.id} className={`bg-white rounded-lg shadow p-6 ${!subject.is_active ? 'border-2 border-orange-300' : ''}`}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-gray-900">{subject.name}</h3>
                        {!subject.is_active && (
                          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
                            Archived
                          </span>
                        )}
                      </div>
                      {subject.subject_code && (
                        <p className="text-sm text-gray-500">Code: {subject.subject_code}</p>
                      )}
                      <p className="text-sm text-gray-600 mt-1">
                        {subject.batch} • {subject.course} • Section {subject.section} • {subject.enrollmentCount} students enrolled
                      </p>
                      {subject.cr && (
                        <p className="text-sm text-blue-600 mt-1">
                          CR: {subject.cr.username}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 flex-wrap justify-end">
                      <button
                        onClick={() => router.push(`/admin/subjects/${subject.id}/enrollments`)}
                        className="text-blue-600 hover:text-blue-700 px-3 py-1 rounded border border-blue-600 hover:bg-blue-50 transition-colors text-sm"
                      >
                        Manage Enrollments
                      </button>
                      <button
                        onClick={() => router.push(`/admin/subjects/${subject.id}/assign-cr`)}
                        className="text-green-600 hover:text-green-700 px-3 py-1 rounded border border-green-600 hover:bg-green-50 transition-colors text-sm"
                      >
                        Assign CR
                      </button>
                      <button
                        onClick={() => handleArchiveToggle(subject.id, subject.is_active)}
                        className={`px-3 py-1 rounded border transition-colors text-sm ${
                          subject.is_active
                            ? 'text-orange-600 hover:text-orange-700 border-orange-600 hover:bg-orange-50'
                            : 'text-green-600 hover:text-green-700 border-green-600 hover:bg-green-50'
                        }`}
                      >
                        {subject.is_active ? 'Archive' : 'Unarchive'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Elective Subjects */}
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Elective Subjects (Cross-Section)
          </h2>
          {electiveSubjects.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
              No elective subjects found.
            </div>
          ) : (
            <div className="grid gap-4">
              {electiveSubjects.map(subject => (
                <div key={subject.id} className={`bg-white rounded-lg shadow p-6 ${!subject.is_active ? 'border-2 border-orange-300' : ''}`}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        {subject.name}
                        <span className="text-sm bg-purple-100 text-purple-700 px-2 py-1 rounded">Elective</span>
                        {!subject.is_active && (
                          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
                            Archived
                          </span>
                        )}
                      </h3>
                      {subject.subject_code && (
                        <p className="text-sm text-gray-500">Code: {subject.subject_code}</p>
                      )}
                      <p className="text-sm text-gray-600 mt-1">
                        {subject.batch} • All Courses & Sections • {subject.enrollmentCount} students enrolled
                      </p>
                      {subject.cr && (
                        <p className="text-sm text-blue-600 mt-1">
                          CR: {subject.cr.username}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 flex-wrap justify-end">
                      <button
                        onClick={() => router.push(`/admin/subjects/${subject.id}/enrollments`)}
                        className="text-blue-600 hover:text-blue-700 px-3 py-1 rounded border border-blue-600 hover:bg-blue-50 transition-colors text-sm"
                      >
                        Manage Enrollments
                      </button>
                      <button
                        onClick={() => router.push(`/admin/subjects/${subject.id}/assign-cr`)}
                        className="text-green-600 hover:text-green-700 px-3 py-1 rounded border border-green-600 hover:bg-green-50 transition-colors text-sm"
                      >
                        Assign CR
                      </button>
                      <button
                        onClick={() => handleArchiveToggle(subject.id, subject.is_active)}
                        className={`px-3 py-1 rounded border transition-colors text-sm ${
                          subject.is_active
                            ? 'text-orange-600 hover:text-orange-700 border-orange-600 hover:bg-orange-50'
                            : 'text-green-600 hover:text-green-700 border-green-600 hover:bg-green-50'
                        }`}
                      >
                        {subject.is_active ? 'Archive' : 'Unarchive'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Success Toast */}
      {showSuccessToast && (
        <SuccessToast
          isOpen={showSuccessToast}
          message={successMessage}
          onClose={() => setShowSuccessToast(false)}
        />
      )}
    </div>
  )
}
