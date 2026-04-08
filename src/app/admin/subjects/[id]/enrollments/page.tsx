'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import AdminHeader from '@/components/admin/AdminHeader'
import useSWR, { mutate } from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface Student {
  id: string
  username: string
  email: string
  roll_number: string
  batch: string
  course: string
  section: string
}

interface EnrolledStudent extends Student {
  enrollmentId: string
  studentId: string
  enrolledAt: string
  isCr: boolean
}

export default function SubjectEnrollments() {
  const router = useRouter()
  const params = useParams()
  const subjectId = params.id as string

  const [showEnrollModal, setShowEnrollModal] = useState(false)
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [enrolling, setEnrolling] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Fetch subject details
  const { data: subjectData } = useSWR(
    `/api/admin/subjects/${subjectId}`,
    fetcher
  )

  // Fetch enrolled students
  const { data: enrolledData, mutate: mutateEnrolled } = useSWR(
    `/api/admin/subjects/${subjectId}/students`,
    fetcher
  )

  // Fetch all students for enrollment (when modal is open)
  const { data: allStudentsData } = useSWR(
    showEnrollModal ? '/api/admin/students?for_enrollment=true' : null,
    fetcher
  )

  const subject = subjectData?.data
  const enrolledStudents: EnrolledStudent[] = enrolledData?.data?.students || []
  const allStudents: Student[] = allStudentsData?.data || []

  // Filter students for enrollment
  const eligibleStudents = allStudents.filter(student => {
    // For regular subjects, must match batch, course, and section
    if (!subject?.is_elective) {
      if (student.batch !== subject?.batch || student.course !== subject?.course) {
        return false
      }
      if (student.section !== subject?.section) {
        return false
      }
    } else {
      // For electives, only batch must match (any course, any section)
      if (student.batch !== subject?.batch) {
        return false
      }
    }

    // Exclude already enrolled
    if (enrolledStudents.some(e => e.studentId === student.id)) {
      return false
    }

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      return (
        student.username.toLowerCase().includes(term) ||
        student.email.toLowerCase().includes(term) ||
        student.roll_number?.toLowerCase().includes(term)
      )
    }

    return true
  })

  const handleEnrollStudents = async () => {
    if (selectedStudents.length === 0) {
      setError('Please select at least one student')
      return
    }

    setEnrolling(true)
    setError('')

    try {
      const response = await fetch(`/api/admin/subjects/${subjectId}/enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_ids: selectedStudents })
      })

      const result = await response.json()

      if (result.success) {
        setSuccess(result.message)
        setShowEnrollModal(false)
        setSelectedStudents([])
        mutateEnrolled() // Refresh enrolled students list
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(result.message || 'Failed to enroll students')
      }
    } catch (err) {
      setError('An error occurred while enrolling students')
    } finally {
      setEnrolling(false)
    }
  }

  const handleUnenroll = async (enrollmentId: string, studentName: string) => {
    if (!confirm(`Are you sure you want to unenroll ${studentName}?`)) {
      return
    }

    try {
      const response = await fetch(
        `/api/admin/subjects/${subjectId}/students/${enrollmentId}`,
        { method: 'DELETE' }
      )

      const result = await response.json()

      if (result.success) {
        setSuccess(result.message)
        mutateEnrolled()
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(result.message || 'Failed to unenroll student')
      }
    } catch (err) {
      setError('An error occurred while unenrolling student')
    }
  }

  const handleBulkEnroll = async (type: 'section' | 'all') => {
    let students: string[] = []

    if (type === 'section') {
      // Enroll all students from subject's section(s)
      students = eligibleStudents.map(s => s.id)
    } else if (type === 'all') {
      // For electives - all eligible students
      students = eligibleStudents.map(s => s.id)
    }

    setSelectedStudents(students)
  }

  if (!subject) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminHeader title="Subject Enrollments" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader title="Subject Enrollments" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="mb-4 text-blue-600 hover:text-blue-700 flex items-center gap-2"
        >
          ← Back to Subjects
        </button>

        {/* Subject info */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{subject.name}</h1>
          {subject.subject_code && (
            <p className="text-sm text-gray-500">Code: {subject.subject_code}</p>
          )}
          <p className="text-sm text-gray-600 mt-1">
            {subject.batch}
            {subject.is_elective
              ? ' • Elective (All Courses & Sections)'
              : ` • ${subject.course} • Section ${subject.section}`}
          </p>
          <p className="text-sm text-gray-700 mt-2">
            <strong>{enrolledStudents.length}</strong> students enrolled
          </p>
        </div>

        {/* Success/Error messages */}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
            <button onClick={() => setError('')} className="float-right font-bold">×</button>
          </div>
        )}

        {/* Enroll buttons */}
        <div className="mb-6 flex justify-end gap-3">
          <button
            onClick={() => router.push(`/admin/subjects/${subjectId}/enroll-bulk`)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Bulk Enroll (CSV)
          </button>
          <button
            onClick={() => setShowEnrollModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            + Enroll Students
          </button>
        </div>

        {/* Enrolled students list */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Roll Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Section
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Enrolled
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {enrolledStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No students enrolled yet
                  </td>
                </tr>
              ) : (
                enrolledStudents.map((student) => (
                  <tr key={student.enrollmentId}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{student.username}</div>
                      <div className="text-sm text-gray-500">{student.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {student.roll_number || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {student.section}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(student.enrolledAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {student.isCr ? (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                          CR
                        </span>
                      ) : (
                        <span className="text-gray-500">Student</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      {!student.isCr && (
                        <button
                          onClick={() => handleUnenroll(student.studentId, student.username)}
                          className="text-red-600 hover:text-red-700"
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Enroll Modal */}
        {showEnrollModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Enroll Students</h2>

              {/* Quick actions */}
              <div className="mb-4 flex gap-2">
                <button
                  onClick={() => handleBulkEnroll(subject.is_elective ? 'all' : 'section')}
                  className="text-sm bg-blue-50 text-blue-600 px-3 py-1 rounded hover:bg-blue-100"
                >
                  {subject.is_elective
                    ? `Select All from ${subject.batch} Batch`
                    : `Select All from Section ${subject.section}`}
                </button>
                <button
                  onClick={() => setSelectedStudents([])}
                  className="text-sm bg-gray-50 text-gray-600 px-3 py-1 rounded hover:bg-gray-100"
                >
                  Clear Selection
                </button>
              </div>

              {/* Search */}
              <input
                type="text"
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 text-gray-900"
              />

              {/* Student list */}
              <div className="border border-gray-200 rounded-lg max-h-96 overflow-y-auto mb-4">
                {eligibleStudents.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    No eligible students found
                  </div>
                ) : (
                  eligibleStudents.map((student) => (
                    <label
                      key={student.id}
                      className="flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                    >
                      <input
                        type="checkbox"
                        checked={selectedStudents.includes(student.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedStudents([...selectedStudents, student.id])
                          } else {
                            setSelectedStudents(selectedStudents.filter(id => id !== student.id))
                          }
                        }}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <div className="ml-3 flex-1">
                        <div className="text-sm font-medium text-gray-900">
                          {student.username}
                          <span className="ml-2 text-xs text-gray-500">
                            ({student.course} - {student.section})
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">{student.email}</div>
                      </div>
                    </label>
                  ))
                )}
              </div>

              <div className="text-sm text-gray-600 mb-4">
                Selected: {selectedStudents.length} student(s)
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleEnrollStudents}
                  disabled={enrolling || selectedStudents.length === 0}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg transition-colors"
                >
                  {enrolling ? 'Enrolling...' : `Enroll ${selectedStudents.length} Student(s)`}
                </button>
                <button
                  onClick={() => {
                    setShowEnrollModal(false)
                    setSelectedStudents([])
                    setSearchTerm('')
                    setError('')
                  }}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
