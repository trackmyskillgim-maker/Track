'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import AdminHeader from '@/components/admin/AdminHeader'
import useSWR from 'swr'
import { parseEnrollmentCSV, EnrollmentValidationError } from '@/lib/enrollment-csv-validator'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function BulkEnrollmentPage() {
  const router = useRouter()
  const params = useParams()
  const subjectId = params.id as string

  const { data: subjectData } = useSWR(
    `/api/admin/subjects/${subjectId}`,
    fetcher
  )
  const subject = subjectData?.data

  const [file, setFile] = useState<File | null>(null)
  const [csvContent, setCsvContent] = useState<string>('')
  const [preview, setPreview] = useState<string[]>([])
  const [errors, setErrors] = useState<EnrollmentValidationError[]>([])
  const [duplicateEmails, setDuplicateEmails] = useState<string[]>([])
  const [notFoundEmails, setNotFoundEmails] = useState<string[]>([])
  const [ineligibleStudents, setIneligibleStudents] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [uploadCount, setUploadCount] = useState(0)
  const [skippedCount, setSkippedCount] = useState(0)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setErrors([])
    setDuplicateEmails([])
    setNotFoundEmails([])
    setIneligibleStudents([])
    setUploadSuccess(false)

    // Read file content
    const reader = new FileReader()
    reader.onload = async (event) => {
      const content = event.target?.result as string
      setCsvContent(content)

      // Validate CSV
      const validationResult = await parseEnrollmentCSV(content)

      if (!validationResult.valid) {
        setErrors(validationResult.errors)
        setDuplicateEmails(validationResult.duplicateEmails)
        setPreview([])
      } else {
        setPreview(validationResult.emails)
        setErrors([])
        setDuplicateEmails([])
      }
    }
    reader.readAsText(selectedFile)
  }

  const handleDownloadTemplate = () => {
    const csvContent = 'email\nstudent1@example.com\nstudent2@example.com\nstudent3@example.com'
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'enrollment_template.csv'
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  const handleImport = async () => {
    if (!csvContent || preview.length === 0) return

    setIsUploading(true)
    setErrors([])
    setNotFoundEmails([])
    setIneligibleStudents([])

    try {
      const response = await fetch(`/api/admin/subjects/${subjectId}/enroll-bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ csvContent })
      })

      const result = await response.json()

      if (!response.ok) {
        if (result.notFoundEmails) {
          setNotFoundEmails(result.notFoundEmails)
        }
        if (result.ineligibleStudents) {
          setIneligibleStudents(result.ineligibleStudents)
        }
        if (result.errors) {
          setErrors(result.errors)
        }
        alert(result.message || 'Enrollment failed')
      } else {
        setUploadSuccess(true)
        setUploadCount(result.count || 0)
        setSkippedCount(result.skipped || 0)
        setPreview([])
        setFile(null)
        setCsvContent('')

        // Reset file input
        const fileInput = document.getElementById('csv-file') as HTMLInputElement
        if (fileInput) fileInput.value = ''
      }
    } catch (error) {
      console.error('Import error:', error)
      alert('Failed to enroll students')
    } finally {
      setIsUploading(false)
    }
  }

  if (!subject) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminHeader title="Bulk Enrollment" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader title="Bulk Enrollment" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Bulk Student Enrollment
            </h1>
            <p className="text-gray-600 mt-2">
              {subject.name} • {subject.batch}
              {subject.is_elective ? ' • Elective (All Courses & Sections)' : ` • ${subject.course} • Section ${subject.section}`}
            </p>
          </div>
          <button
            onClick={() => router.push(`/admin/subjects/${subjectId}/enrollments`)}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Back to Enrollments
          </button>
        </div>

        {/* Success Message */}
        {uploadSuccess && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <svg className="w-6 h-6 text-green-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div>
                <h3 className="text-green-800 font-semibold">Enrollment Successful!</h3>
                <p className="text-green-700 text-sm">
                  Successfully enrolled {uploadCount} student(s)
                  {skippedCount > 0 && ` (${skippedCount} already enrolled, skipped)`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Instructions Card */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Instructions</h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>Download the CSV template below</li>
            <li>Fill in student email addresses (one per row)</li>
            <li>Students must already exist in the system (added by superadmin)</li>
            <li>
              {subject.is_elective
                ? `Students must be from batch ${subject.batch} (any course, any section)`
                : `Students must match: ${subject.batch} • ${subject.course} • Section ${subject.section}`}
            </li>
            <li>Upload the filled CSV file</li>
            <li>Review the preview and click Import</li>
          </ol>
          <button
            onClick={handleDownloadTemplate}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Download CSV Template
          </button>
        </div>

        {/* File Upload Card */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Upload CSV File</h2>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <input
              id="csv-file"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <label htmlFor="csv-file" className="cursor-pointer">
              <div className="flex flex-col items-center">
                <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-gray-600 mb-2">
                  {file ? file.name : 'Click to select CSV file or drag and drop'}
                </p>
                <p className="text-sm text-gray-500">CSV files only</p>
              </div>
            </label>
          </div>
        </div>

        {/* Errors */}
        {(errors.length > 0 || duplicateEmails.length > 0 || notFoundEmails.length > 0 || ineligibleStudents.length > 0) && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
            <h3 className="text-red-800 font-semibold mb-4 flex items-center">
              <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              Validation Errors
            </h3>

            {notFoundEmails.length > 0 && (
              <div className="mb-4">
                <p className="text-red-700 font-medium mb-2">Emails not found in system (contact superadmin to add these students first):</p>
                <ul className="list-disc list-inside text-red-600 text-sm space-y-1">
                  {notFoundEmails.map((email, idx) => (
                    <li key={idx}>{email}</li>
                  ))}
                </ul>
              </div>
            )}

            {ineligibleStudents.length > 0 && (
              <div className="mb-4">
                <p className="text-red-700 font-medium mb-2">Students not eligible for this subject:</p>
                <ul className="list-disc list-inside text-red-600 text-sm space-y-1">
                  {ineligibleStudents.map((student, idx) => (
                    <li key={idx}>{student}</li>
                  ))}
                </ul>
              </div>
            )}

            {duplicateEmails.length > 0 && (
              <div className="mb-4">
                <p className="text-red-700 font-medium mb-2">Duplicate emails found in CSV:</p>
                <ul className="list-disc list-inside text-red-600 text-sm space-y-1">
                  {duplicateEmails.map((email, idx) => (
                    <li key={idx}>{email}</li>
                  ))}
                </ul>
              </div>
            )}

            {errors.length > 0 && (
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-red-100">
                    <tr>
                      <th className="px-4 py-2 text-left text-red-800">Row</th>
                      <th className="px-4 py-2 text-left text-red-800">Field</th>
                      <th className="px-4 py-2 text-left text-red-800">Error</th>
                      <th className="px-4 py-2 text-left text-red-800">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {errors.map((error, idx) => (
                      <tr key={idx} className="border-t border-red-200">
                        <td className="px-4 py-2 text-red-700">{error.row}</td>
                        <td className="px-4 py-2 text-red-700">{error.field}</td>
                        <td className="px-4 py-2 text-red-700">{error.message}</td>
                        <td className="px-4 py-2 text-red-700">{error.value || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Preview */}
        {preview.length > 0 && errors.length === 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Preview ({preview.length} emails)
            </h3>
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left text-gray-700">#</th>
                    <th className="px-4 py-2 text-left text-gray-700">Email</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((email, idx) => (
                    <tr key={idx} className="border-t border-gray-200">
                      <td className="px-4 py-2 text-gray-500">{idx + 1}</td>
                      <td className="px-4 py-2 text-gray-900">{email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={handleImport}
                disabled={isUploading}
                className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
              >
                {isUploading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Enrolling...
                  </>
                ) : (
                  `Enroll ${preview.length} Student(s)`
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
