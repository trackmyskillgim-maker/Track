'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AdminHeader from '@/components/admin/AdminHeader'

export default function CreateSubject() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    subject_code: '',
    batch: '',
    course: '',
    section: '',
    sections: [] as string[], // For regular subjects: multiple sections
    is_elective: false
  })
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  const batches = ['2022-2024', '2023-2025', '2024-2026', '2025-2027']
  const courses = ['PGDM', 'BDA', 'BIFS', 'HCM']
  const sections = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validation
    if (!formData.name.trim()) {
      setError('Subject name is required')
      return
    }

    if (!formData.batch) {
      setError('Batch is required')
      return
    }

    // Validate course is selected
    if (!formData.course) {
      setError('Course is required')
      return
    }

    // For regular subjects: need at least one section
    if (!formData.is_elective && formData.sections.length === 0) {
      setError('At least one section is required for regular subjects')
      return
    }

    setCreating(true)

    try {
      const response = await fetch('/api/admin/subjects/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          subject_code: formData.subject_code.trim() || undefined,
          batch: formData.batch,
          course: formData.course, // Always required
          sections: formData.is_elective ? [] : formData.sections,
          is_elective: formData.is_elective
        })
      })

      const result = await response.json()

      if (result.success) {
        // Show success message if multiple subjects created
        if (result.data?.created && result.data.created.length > 1) {
          alert(`Successfully created ${result.data.created.length} subjects for sections: ${result.data.created.map((s: any) => s.section).join(', ')}`)
        }
        router.push('/admin/subjects')
      } else {
        setError(result.message || 'Failed to create subject')
      }
    } catch (err) {
      setError('An error occurred while creating the subject')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader title="Create Subject" />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-blue-600 hover:text-blue-700 flex items-center gap-2"
          >
            ← Back to Subjects
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Create New Subject</h1>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Subject Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                placeholder="e.g., Python Programming, Machine Learning"
                maxLength={200}
              />
            </div>

            {/* Subject Code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject Code (Optional)
              </label>
              <input
                type="text"
                value={formData.subject_code}
                onChange={(e) => setFormData({ ...formData, subject_code: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                placeholder="e.g., CS101, ML202"
                maxLength={50}
              />
            </div>

            {/* Batch */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Batch <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.batch}
                onChange={(e) => setFormData({ ...formData, batch: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              >
                <option value="">Select Batch</option>
                {batches.map(batch => (
                  <option key={batch} value={batch}>{batch}</option>
                ))}
              </select>
            </div>

            {/* Course - Required for all subjects */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Course <span className="text-red-500">*</span>
                {formData.is_elective && (
                  <span className="text-xs text-gray-500 ml-2">(Primary department for this elective)</span>
                )}
              </label>
              <select
                value={formData.course}
                onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              >
                <option value="">Select Course</option>
                {courses.map(course => (
                  <option key={course} value={course}>{course}</option>
                ))}
              </select>
            </div>

            {/* Elective Checkbox */}
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_elective}
                  onChange={(e) => setFormData({
                    ...formData,
                    is_elective: e.target.checked,
                    sections: e.target.checked ? [] : formData.sections,
                    course: e.target.checked ? '' : formData.course
                  })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  This is an elective subject (students from any course and section within batch can enroll)
                </span>
              </label>
            </div>

            {/* Sections (only if not elective) */}
            {!formData.is_elective && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Sections <span className="text-red-500">*</span>
                  <span className="text-xs text-gray-500 ml-2">(Select one or more)</span>
                </label>
                <div className="grid grid-cols-5 gap-3">
                  {sections.map(section => (
                    <label key={section} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.sections.includes(section)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              sections: [...formData.sections, section]
                            })
                          } else {
                            setFormData({
                              ...formData,
                              sections: formData.sections.filter(s => s !== section)
                            })
                          }
                        }}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Section {section}</span>
                    </label>
                  ))}
                </div>
                {formData.sections.length > 0 && (
                  <p className="mt-2 text-sm text-blue-600">
                    Selected: {formData.sections.sort().join(', ')}
                  </p>
                )}
              </div>
            )}

            {formData.is_elective && (
              <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded">
                <p className="text-sm">
                  <strong>Note:</strong> Elective subjects are open to students from ANY course and ANY section within the selected batch. The selected course represents the primary department offering this elective. During enrollment, you'll be able to select students from the entire batch regardless of their course or section.
                </p>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={creating}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                {creating ? 'Creating...' : 'Create Subject'}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
