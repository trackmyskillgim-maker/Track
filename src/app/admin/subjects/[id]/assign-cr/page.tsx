'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import AdminHeader from '@/components/admin/AdminHeader'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface EnrolledStudent {
  enrollmentId: string
  studentId: string
  username: string
  email: string
  roll_number: string
  batch: string
  course: string
  section: string
  isCr: boolean
}

export default function AssignCR() {
  const router = useRouter()
  const params = useParams()
  const subjectId = params.id as string

  const [selectedStudentId, setSelectedStudentId] = useState<string>('')
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Fetch subject details
  const { data: subjectData, mutate: mutateSubject } = useSWR(
    `/api/admin/subjects/${subjectId}`,
    fetcher
  )

  // Fetch enrolled students
  const { data: enrolledData } = useSWR(
    `/api/admin/subjects/${subjectId}/students`,
    fetcher
  )

  const subject = subjectData?.data
  const enrolledStudents: EnrolledStudent[] = enrolledData?.data?.students || []
  const currentCr = subject?.cr
  const nonCrStudents = enrolledStudents.filter(s => !s.isCr)

  const handleAssignCr = async () => {
    if (!selectedStudentId) {
      setError('Please select a student')
      return
    }

    setProcessing(true)
    setError('')

    try {
      const response = await fetch(`/api/admin/subjects/${subjectId}/assign-cr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: selectedStudentId })
      })

      const result = await response.json()

      if (result.success) {
        setSuccess(result.message)
        mutateSubject() // Refresh subject data
        setTimeout(() => {
          router.push('/admin/subjects')
        }, 1500)
      } else {
        setError(result.message || 'Failed to assign CR')
      }
    } catch (err) {
      setError('An error occurred while assigning CR')
    } finally {
      setProcessing(false)
    }
  }

  const handleRemoveCr = async () => {
    if (!confirm('Are you sure you want to remove the current CR?')) {
      return
    }

    setProcessing(true)
    setError('')

    try {
      const response = await fetch(`/api/admin/subjects/${subjectId}/assign-cr`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.success) {
        setSuccess(result.message)
        mutateSubject() // Refresh subject data
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(result.message || 'Failed to remove CR')
      }
    } catch (err) {
      setError('An error occurred while removing CR')
    } finally {
      setProcessing(false)
    }
  }

  if (!subject) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminHeader title="Assign CR" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader title="Assign Course Representative" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="mb-4 text-blue-600 hover:text-blue-700 flex items-center gap-2"
        >
          ← Back to Subjects
        </button>

        {/* Subject info */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Assign Course Representative</h1>
          <p className="text-lg text-gray-700 mt-2">{subject.name}</p>
          {subject.subject_code && (
            <p className="text-sm text-gray-500">Code: {subject.subject_code}</p>
          )}
          <p className="text-sm text-gray-600 mt-1">
            {subject.batch} • {subject.course} •{' '}
            {subject.is_elective ? 'Elective (All Sections)' : `Section ${subject.section}`}
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

        {/* Current CR */}
        {currentCr && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Current CR</h2>
            <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div>
                <p className="font-medium text-gray-900">{currentCr.username}</p>
                <p className="text-sm text-gray-600">{currentCr.email}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {currentCr.batch} • {currentCr.course} • Section {currentCr.section}
                </p>
              </div>
              <button
                onClick={handleRemoveCr}
                disabled={processing}
                className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors"
              >
                {processing ? 'Removing...' : 'Remove CR'}
              </button>
            </div>
            <div className="mt-4 p-3 bg-gray-50 rounded border border-gray-200">
              <p className="text-sm text-gray-700">
                <strong>Note:</strong> Removing the CR will revoke their access to manage class participation sessions for this subject.
              </p>
            </div>
          </div>
        )}

        {/* Assign New CR */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            {currentCr ? 'Reassign CR' : 'Assign CR'}
          </h2>

          {enrolledStudents.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>No students enrolled in this subject yet.</p>
              <button
                onClick={() => router.push(`/admin/subjects/${subjectId}/enrollments`)}
                className="mt-4 text-blue-600 hover:text-blue-700"
              >
                Enroll Students →
              </button>
            </div>
          ) : nonCrStudents.length === 0 && currentCr ? (
            <div className="p-8 text-center text-gray-500">
              <p>All eligible students are already assigned. Only one CR is allowed per subject.</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-600 mb-4">
                Select a student from the enrolled list to assign as Course Representative.
                {currentCr && ' This will replace the current CR.'}
              </p>

              {/* Student selection */}
              <div className="space-y-2 max-h-96 overflow-y-auto mb-6">
                {nonCrStudents.map((student) => (
                  <label
                    key={student.studentId}
                    className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedStudentId === student.studentId
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="cr-student"
                      value={student.studentId}
                      checked={selectedStudentId === student.studentId}
                      onChange={(e) => setSelectedStudentId(e.target.value)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <div className="ml-3 flex-1">
                      <div className="text-sm font-medium text-gray-900">
                        {student.username}
                        <span className="ml-2 text-xs text-gray-500">
                          (Section {student.section})
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">{student.email}</div>
                      {student.roll_number && (
                        <div className="text-xs text-gray-500">Roll: {student.roll_number}</div>
                      )}
                    </div>
                  </label>
                ))}
              </div>

              {/* Info box */}
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">CR Responsibilities:</h3>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                  <li>Manage class participation sessions for this subject</li>
                  <li>Approve/skip students in the queue</li>
                  <li>View live submission results</li>
                  <li>Access past session history</li>
                </ul>
                <p className="text-xs text-blue-700 mt-2">
                  <strong>Note:</strong> CRs cannot create or end sessions - only manage them.
                </p>
              </div>

              {/* Assign button */}
              <div className="flex gap-3">
                <button
                  onClick={handleAssignCr}
                  disabled={processing || !selectedStudentId}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  {processing ? 'Assigning...' : currentCr ? 'Reassign CR' : 'Assign as CR'}
                </button>
                <button
                  onClick={() => router.back()}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
