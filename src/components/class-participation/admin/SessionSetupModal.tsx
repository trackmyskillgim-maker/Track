'use client'

import { useState, useEffect } from 'react'

interface SessionSetupModalProps {
  onClose: () => void
  onSessionCreated: (session: any) => void
}

interface Subject {
  id: string
  name: string
  subject_code: string | null
  is_elective: boolean
}

export default function SessionSetupModal({ onClose, onSessionCreated }: SessionSetupModalProps) {
  const [topic, setTopic] = useState('')
  const [description, setDescription] = useState('')
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Easy')
  const [batch, setBatch] = useState<string>('')
  const [course, setCourse] = useState<'PGDM' | 'BDA' | 'BIFS' | 'HCM'>('PGDM')
  const [section, setSection] = useState<string>('A')
  const [subjectId, setSubjectId] = useState<string>('')
  const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([])
  const [loadingSubjects, setLoadingSubjects] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [availableBatches, setAvailableBatches] = useState<string[]>([])

  const sections = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']

  // Fetch available batches on mount
  useEffect(() => {
    const fetchBatches = async () => {
      try {
        const response = await fetch('/api/admin/filter-options')
        const data = await response.json()
        if (data.success && data.data?.batches) {
          setAvailableBatches(data.data.batches)
          // Set first batch as default
          if (data.data.batches.length > 0) {
            setBatch(data.data.batches[0])
          }
        }
      } catch (err) {
        console.error('Failed to fetch batches:', err)
      }
    }
    fetchBatches()
  }, [])

  // Fetch available subjects when batch/course/section changes
  useEffect(() => {
    const fetchSubjects = async () => {
      if (!batch) return // Wait for batch to be set

      setLoadingSubjects(true)
      try {
        const response = await fetch(
          `/api/admin/subjects/available?batch=${batch}&course=${course}&section=${section}`
        )
        const data = await response.json()

        if (data.success) {
          setAvailableSubjects(data.data.subjects || [])
        } else {
          setAvailableSubjects([])
        }
      } catch (err) {
        console.error('Failed to fetch subjects:', err)
        setAvailableSubjects([])
      } finally {
        setLoadingSubjects(false)
      }
    }

    fetchSubjects()
  }, [batch, course, section])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/class-participation/admin/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          description: description || undefined, // Include description if provided
          difficulty,
          batch,
          course,
          section,
          subject_id: subjectId || undefined // Include subject_id if selected
        })
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to create session')
      }

      onSessionCreated(data.session)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Create New Session
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Topic */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Topic
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Loops, Functions, Data Structures"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description <span className="text-xs text-gray-500">(Optional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add specific requirements or context for AI question generation..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 resize-none"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                This helps AI generate more specific questions (e.g., "Focus on nested loops with arrays")
              </p>
            </div>

            {/* Difficulty */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Difficulty
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>

            {/* Batch */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Batch
              </label>
              <select
                value={batch}
                onChange={(e) => setBatch(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                disabled={availableBatches.length === 0}
              >
                {availableBatches.length === 0 ? (
                  <option value="">No batches available</option>
                ) : (
                  availableBatches.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))
                )}
              </select>
            </div>

            {/* Course */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Course
              </label>
              <select
                value={course}
                onChange={(e) => setCourse(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="PGDM">PGDM</option>
                <option value="BDA">BDA</option>
                <option value="BIFS">BIFS</option>
                <option value="HCM">HCM</option>
              </select>
            </div>

            {/* Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Section
              </label>
              <select
                value={section}
                onChange={(e) => setSection(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {sections.map(s => (
                  <option key={s} value={s}>Section {s}</option>
                ))}
              </select>
            </div>

            {/* Subject (Optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Subject <span className="text-xs text-gray-500">(Optional)</span>
              </label>
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                disabled={loadingSubjects}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
              >
                <option value="">No Subject (General Session)</option>
                {availableSubjects.length > 0 && (
                  <>
                    {availableSubjects.filter(s => !s.is_elective).length > 0 && (
                      <optgroup label="Regular Subjects">
                        {availableSubjects
                          .filter(s => !s.is_elective)
                          .map(subject => (
                            <option key={subject.id} value={subject.id}>
                              {subject.name}
                              {subject.subject_code ? ` (${subject.subject_code})` : ''}
                            </option>
                          ))}
                      </optgroup>
                    )}
                    {availableSubjects.filter(s => s.is_elective).length > 0 && (
                      <optgroup label="Elective Subjects">
                        {availableSubjects
                          .filter(s => s.is_elective)
                          .map(subject => (
                            <option key={subject.id} value={subject.id}>
                              {subject.name}
                              {subject.subject_code ? ` (${subject.subject_code})` : ''}
                            </option>
                          ))}
                      </optgroup>
                    )}
                  </>
                )}
              </select>
              {loadingSubjects && (
                <p className="text-xs text-gray-500 mt-1">Loading subjects...</p>
              )}
              {!loadingSubjects && availableSubjects.length === 0 && (
                <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                  No subjects found for this batch/course/section
                </p>
              )}
              {subjectId && (
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  Only students enrolled in this subject will see this session
                </p>
              )}
            </div>

            {error && (
              <div className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Create Session'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}