'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAdminQuests, addQuestOptimistic, updateQuestOptimistic, type AdminQuest } from '@/lib/hooks/useAdminQuests'
import AdminHeader from '@/components/admin/AdminHeader'
import ConfirmationModal from '@/components/admin/ConfirmationModal'
import SuccessToast from '@/components/admin/SuccessToast'
import UnlockQuestModal from '@/components/admin/UnlockQuestModal'

interface Subject {
  id: string
  name: string
  subject_code: string | null
  is_elective: boolean
}

export default function AdminQuests() {
  const { quests, isLoading, isError, mutate } = useAdminQuests()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newQuest, setNewQuest] = useState({
    title: '',
    description: '',
    difficulty: 'Beginner',
    estimatedTime: '',
    subjectId: ''
  })
  const [creating, setCreating] = useState(false)
  const [editingQuest, setEditingQuest] = useState<AdminQuest | null>(null)

  // Subject selection state
  const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([])
  const [loadingSubjects, setLoadingSubjects] = useState(false)

  // New state for confirmation modal and success toast
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [questToArchive, setQuestToArchive] = useState<{id: string, title: string} | null>(null)
  const [showSuccessToast, setShowSuccessToast] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  // State for unlock modal
  const [showUnlockModal, setShowUnlockModal] = useState(false)
  const [questToUnlock, setQuestToUnlock] = useState<{id: string, title: string} | null>(null)

  // State for duplicate modal
  const [showDuplicateModal, setShowDuplicateModal] = useState(false)
  const [questToDuplicate, setQuestToDuplicate] = useState<{id: string, title: string} | null>(null)
  const [targetSubjectId, setTargetSubjectId] = useState<string>('')
  const [duplicateQuestTitle, setDuplicateQuestTitle] = useState<string>('')
  const [duplicating, setDuplicating] = useState(false)

  // Filters
  const [selectedSubject, setSelectedSubject] = useState<string>('all')
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('active')

  const router = useRouter()

  // Fetch admin's subjects when create or duplicate modal opens OR on page load for filters
  useEffect(() => {
    if (showCreateModal || showDuplicateModal) {
      fetchAdminSubjects()
    }
  }, [showCreateModal, showDuplicateModal])

  // Fetch subjects for filter on component mount
  useEffect(() => {
    fetchAdminSubjects()
  }, [])

  const fetchAdminSubjects = async () => {
    setLoadingSubjects(true)
    try {
      const response = await fetch('/api/admin/subjects/my-subjects')
      const data = await response.json()

      if (data.success) {
        setAvailableSubjects(data.data.subjects || [])
      } else {
        console.error('Failed to fetch subjects:', data.message)
        setAvailableSubjects([])
      }
    } catch (error) {
      console.error('Error fetching subjects:', error)
      setAvailableSubjects([])
    } finally {
      setLoadingSubjects(false)
    }
  }

  const handleCreateQuest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newQuest.title || !newQuest.description || !newQuest.subjectId) {
      alert('Please fill in all required fields including subject selection')
      return
    }

    setCreating(true)

    // Find selected subject for display
    const selectedSubject = availableSubjects.find(s => s.id === newQuest.subjectId)

    // Create optimistic quest object
    const optimisticQuest: AdminQuest = {
      id: `temp-${Date.now()}`, // Temporary ID
      title: newQuest.title,
      description: newQuest.description,
      difficulty: newQuest.difficulty,
      estimatedTime: newQuest.estimatedTime,
      orderIndex: quests.length + 1,
      isActive: true,
      createdAt: new Date().toISOString(),
      totalQuestions: 0,
      totalCompletions: 0,
      studentsAttempted: 0
    }

    // Add optimistically
    addQuestOptimistic(optimisticQuest)

    try {
      const response = await fetch('/api/admin/quests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newQuest.title,
          description: newQuest.description,
          difficulty: newQuest.difficulty,
          estimatedTime: newQuest.estimatedTime,
          subjectId: newQuest.subjectId
        })
      })

      const result = await response.json()
      if (result.success) {
        setShowCreateModal(false)
        setNewQuest({ title: '', description: '', difficulty: 'Beginner', estimatedTime: '', subjectId: '' })
        // Show success toast
        setSuccessMessage(`Quest created successfully for ${selectedSubject?.name || 'subject'}!`)
        setShowSuccessToast(true)
        mutate() // Refresh with real data
      } else {
        alert(`Failed to create quest: ${result.message}`)
        mutate() // Revert optimistic update
      }
    } catch {
      console.error('Create quest error:', 'Failed to create quest')
      alert('Failed to create quest. Please try again.')
      mutate() // Revert optimistic update
    } finally {
      setCreating(false)
    }
  }

  const handleEditQuest = async (questData: any) => {
    if (!editingQuest) return

    setCreating(true)

    // Apply optimistic update
    updateQuestOptimistic(editingQuest.id, {
      title: questData.title,
      description: questData.description,
      difficulty: questData.difficulty,
      estimatedTime: questData.estimatedTime
    })

    try {
      const response = await fetch(`/api/admin/quests/${editingQuest?.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: questData.title,
          description: questData.description,
          difficulty: questData.difficulty,
          estimatedTime: questData.estimatedTime
        })
      })

      const result = await response.json()
      if (result.success) {
        setEditingQuest(null)
        // Show success toast
        setSuccessMessage('Quest updated successfully!')
        setShowSuccessToast(true)
        mutate() // Refresh with real data
      } else {
        alert(`Failed to update quest: ${result.message}`)
        mutate() // Revert optimistic update
      }
    } catch {
      console.error('Update quest error:', 'Failed to update quest')
      alert('Failed to update quest. Please try again.')
      mutate() // Revert optimistic update
    } finally {
      setCreating(false)
    }
  }

  // Initiate archive process with confirmation modal
  const handleArchiveQuest = (questId: string, questTitle: string) => {
    setQuestToArchive({ id: questId, title: questTitle })
    setShowConfirmModal(true)
  }

  // Perform archive action after confirmation
  const confirmArchive = async () => {
    if (!questToArchive) return

    try {
      const response = await fetch(`/api/admin/quests/${questToArchive.id}/archive`, {
        method: 'PATCH'
      })

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/')
          return
        }
        alert(`Failed to archive quest (Error ${response.status}). Please try again.`)
        return
      }

      const result = await response.json()
      if (result.success) {
        setSuccessMessage(`Quest "${questToArchive.title}" has been archived successfully.`)
        setShowSuccessToast(true)
        mutate() // Refresh the quest list
      } else {
        alert(`Failed to archive quest: ${result.message || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Archive quest error:', error)
      alert('An unexpected error occurred while archiving the quest. Please try again.')
    }
  }

  // Close confirmation modal
  const handleCloseConfirmModal = () => {
    setShowConfirmModal(false)
    setQuestToArchive(null)
  }

  // Handle duplicate quest
  const handleDuplicateQuest = async () => {
    if (!questToDuplicate || !targetSubjectId) {
      alert('Please select a target subject')
      return
    }

    if (!duplicateQuestTitle.trim()) {
      alert('Please enter a title for the duplicated quest')
      return
    }

    setDuplicating(true)

    try {
      const response = await fetch(`/api/admin/quests/${questToDuplicate.id}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetSubjectId,
          newTitle: duplicateQuestTitle.trim()
        })
      })

      const result = await response.json()

      if (result.success) {
        setSuccessMessage(result.message)
        setShowSuccessToast(true)
        setShowDuplicateModal(false)
        setQuestToDuplicate(null)
        setTargetSubjectId('')
        setDuplicateQuestTitle('')
        mutate() // Refresh the quest list
      } else {
        alert(`Failed to duplicate quest: ${result.message}`)
      }
    } catch (error) {
      console.error('Duplicate quest error:', error)
      alert('An unexpected error occurred while duplicating the quest')
    } finally {
      setDuplicating(false)
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'beginner': return 'bg-green-100 text-green-800'
      case 'intermediate': return 'bg-yellow-100 text-yellow-800'
      case 'advanced': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Filter quests
  const filteredQuests = quests.filter(quest => {
    // Filter by subject
    if (selectedSubject !== 'all' && (quest as any).subject?.id !== selectedSubject) {
      return false
    }

    // Filter by difficulty
    if (selectedDifficulty !== 'all' && quest.difficulty.toLowerCase() !== selectedDifficulty.toLowerCase()) {
      return false
    }

    // Filter by status
    if (selectedStatus === 'active' && !quest.isActive) {
      return false
    }
    if (selectedStatus === 'inactive' && quest.isActive) {
      return false
    }

    return true
  })

  // Only show loading if we have no quests data at all (first load)
  if (isLoading && quests.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminHeader title="Quest Management" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading quests...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader title="Quest Management" />

      <div className="w-full px-4 py-6">
        {/* Header Actions */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Quest Management</h2>
            <p className="text-sm text-gray-600">Create and manage learning quests for students</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => router.push('/admin/quests/archived')}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center space-x-2 text-sm"
              title="View and restore archived quests"
            >
              <span>📦</span>
              <span>Archived</span>
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2 text-sm"
            >
              <span>+</span>
              <span>Create Quest</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              >
                <option value="all">All Subjects</option>
                {availableSubjects.map(subject => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name} {subject.subject_code ? `(${subject.subject_code})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              >
                <option value="all">All Difficulties</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setSelectedSubject('all')
                  setSelectedDifficulty('all')
                  setSelectedStatus('active')
                }}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Error State */}
        {isError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {isError?.message || 'Failed to load quests'}
          </div>
        )}

        {/* Quests List */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Quest
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Subject
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Difficulty
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Questions
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Students
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filteredQuests.map((quest) => (
                <tr key={quest.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-4">
                    <div className="text-sm font-semibold text-gray-900">
                      {quest.title}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    {(quest as any).subject ? (
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">
                          {(quest as any).subject.name}
                        </div>
                        {(quest as any).subject.subjectCode && (
                          <div className="text-xs text-gray-500">
                            {(quest as any).subject.subjectCode}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-amber-600">⚠️ No subject</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex px-2 py-1 text-sm font-semibold rounded ${getDifficultyColor(quest.difficulty)}`}>
                      {quest.difficulty}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center text-sm text-gray-700 font-medium">
                    {quest.totalQuestions}
                  </td>
                  <td className="px-4 py-4 text-center text-sm text-gray-700 font-medium">
                    {quest.studentsAttempted}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className={`inline-flex px-2 py-1 text-sm font-semibold rounded ${
                      quest.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {quest.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex justify-end gap-2 flex-wrap">
                      <button
                        onClick={() => router.push(`/admin/quests/${quest.id}/questions`)}
                        className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-600 hover:text-white border border-blue-600 rounded transition-colors"
                        title="Manage questions"
                      >
                        Questions
                      </button>
                      <button
                        onClick={() => {
                          setQuestToUnlock({ id: quest.id, title: quest.title })
                          setShowUnlockModal(true)
                        }}
                        className="px-2 py-1.5 text-sm text-green-600 hover:bg-green-600 hover:text-white border border-green-600 rounded transition-colors"
                        title="Grant access to specific students"
                      >
                        🔓
                      </button>
                      <button
                        onClick={() => setEditingQuest(quest)}
                        className="px-3 py-1.5 text-sm text-indigo-600 hover:bg-indigo-600 hover:text-white border border-indigo-600 rounded transition-colors"
                        title="Edit quest"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          setQuestToDuplicate({ id: quest.id, title: quest.title })
                          setDuplicateQuestTitle(`${quest.title} (Copy)`)
                          setShowDuplicateModal(true)
                        }}
                        className="px-2 py-1.5 text-sm text-purple-600 hover:bg-purple-600 hover:text-white border border-purple-600 rounded transition-colors"
                        title="Duplicate quest to another subject"
                      >
                        📋
                      </button>
                      <button
                        onClick={() => handleArchiveQuest(quest.id, quest.title)}
                        className="px-2 py-1.5 text-sm bg-orange-600 hover:bg-orange-700 text-white border border-orange-600 rounded transition-colors"
                        title="Archive quest"
                      >
                        📦
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredQuests.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">📝</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {quests.length === 0 ? 'No quests yet' : 'No quests match your filters'}
              </h3>
              <p className="text-gray-600 mb-4">
                {quests.length === 0
                  ? 'Get started by creating your first quest'
                  : 'Try adjusting your filters to see more quests'
                }
              </p>
              {quests.length === 0 && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Create Your First Quest
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create Quest Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Create New Quest</h3>

            <form onSubmit={handleCreateQuest} className="space-y-4">
              {/* Subject Selection - REQUIRED FIRST */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject <span className="text-red-500">*</span>
                </label>
                <select
                  value={newQuest.subjectId}
                  onChange={(e) => setNewQuest({ ...newQuest, subjectId: e.target.value })}
                  disabled={loadingSubjects}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white disabled:opacity-50"
                  required
                >
                  <option value="">Select a subject</option>
                  {loadingSubjects ? (
                    <option disabled>Loading subjects...</option>
                  ) : availableSubjects.length === 0 ? (
                    <option disabled>No subjects available - Create a subject first</option>
                  ) : (
                    <>
                      {availableSubjects.filter(s => !s.is_elective).length > 0 && (
                        <optgroup label="Regular Subjects">
                          {availableSubjects
                            .filter(s => !s.is_elective)
                            .map(subject => (
                              <option key={subject.id} value={subject.id}>
                                {subject.name}{subject.subject_code ? ` (${subject.subject_code})` : ''}
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
                                {subject.name}{subject.subject_code ? ` (${subject.subject_code})` : ''}
                              </option>
                            ))}
                        </optgroup>
                      )}
                    </>
                  )}
                </select>
                {availableSubjects.length === 0 && !loadingSubjects && (
                  <p className="text-xs text-amber-600 mt-1">
                    ⚠️ You need to create at least one subject before creating quests.{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateModal(false)
                        router.push('/admin/subjects/create')
                      }}
                      className="text-blue-600 underline hover:text-blue-700"
                    >
                      Create Subject
                    </button>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quest Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newQuest.title}
                  onChange={(e) => setNewQuest({ ...newQuest, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                  placeholder="Enter quest title"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newQuest.description}
                  onChange={(e) => setNewQuest({ ...newQuest, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                  rows={3}
                  placeholder="Describe what students will learn"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Difficulty
                </label>
                <select
                  value={newQuest.difficulty}
                  onChange={(e) => setNewQuest({ ...newQuest, difficulty: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estimated Time
                </label>
                <input
                  type="text"
                  value={newQuest.estimatedTime}
                  onChange={(e) => setNewQuest({ ...newQuest, estimatedTime: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                  placeholder="e.g., 30 minutes"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create Quest'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Quest Modal */}
      {editingQuest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Edit Quest</h3>

            <form onSubmit={(e) => {
              e.preventDefault()
              const formData = new FormData(e.target as HTMLFormElement)
              handleEditQuest({
                title: formData.get('title'),
                description: formData.get('description'),
                difficulty: formData.get('difficulty'),
                estimatedTime: formData.get('estimatedTime')
              })
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quest Title
                </label>
                <input
                  type="text"
                  name="title"
                  defaultValue={editingQuest.title}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                  placeholder="Enter quest title"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  defaultValue={editingQuest.description}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                  rows={3}
                  placeholder="Describe what students will learn"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Difficulty
                </label>
                <select
                  name="difficulty"
                  defaultValue={editingQuest.difficulty}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estimated Time
                </label>
                <input
                  type="text"
                  name="estimatedTime"
                  defaultValue={editingQuest.estimatedTime}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                  placeholder="e.g., 30 minutes"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {creating ? 'Updating...' : 'Update Quest'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingQuest(null)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={handleCloseConfirmModal}
        onConfirm={confirmArchive}
        title="📦 Archive Quest"
        message={`Are you sure you want to archive "${questToArchive?.title}"?\n\n✅ This will:\n• Hide the quest from students\n• Preserve all student progress and data\n• Allow you to restore it later from the Archived Quests page\n\n💡 To permanently delete this quest, archive it first, then use the Delete option on the Archived Quests page.`}
        confirmText="📦 Archive Quest"
        cancelText="Cancel"
        isDestructive={false}
      />

      {/* Success Toast */}
      <SuccessToast
        isOpen={showSuccessToast}
        onClose={() => setShowSuccessToast(false)}
        message={successMessage}
      />

      {/* Duplicate Quest Modal */}
      {showDuplicateModal && questToDuplicate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Duplicate Quest: {questToDuplicate.title}
            </h3>

            <p className="text-sm text-gray-600 mb-4">
              Enter a name for the duplicated quest and select the target subject. All questions and test cases will be copied.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Quest Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={duplicateQuestTitle}
                onChange={(e) => setDuplicateQuestTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900"
                placeholder="Enter quest title..."
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Subject <span className="text-red-500">*</span>
              </label>
              <select
                value={targetSubjectId}
                onChange={(e) => setTargetSubjectId(e.target.value)}
                disabled={loadingSubjects}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900"
                required
              >
                <option value="">Select a subject...</option>
                {availableSubjects.map(subject => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name} {subject.subject_code ? `(${subject.subject_code})` : ''}
                    {subject.is_elective ? ' - Elective' : ''}
                  </option>
                ))}
              </select>
              {loadingSubjects && (
                <p className="text-xs text-gray-500 mt-1">Loading subjects...</p>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-xs text-blue-800">
                ℹ️ The duplicated quest will be placed at the end of the target subject&apos;s quest list.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleDuplicateQuest}
                disabled={duplicating || !targetSubjectId}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {duplicating ? 'Duplicating...' : '📋 Duplicate Quest'}
              </button>
              <button
                onClick={() => {
                  setShowDuplicateModal(false)
                  setQuestToDuplicate(null)
                  setTargetSubjectId('')
                  setDuplicateQuestTitle('')
                }}
                disabled={duplicating}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unlock Quest Modal */}
      {showUnlockModal && questToUnlock && (
        <UnlockQuestModal
          questId={questToUnlock.id}
          questTitle={questToUnlock.title}
          onClose={() => {
            setShowUnlockModal(false)
            setQuestToUnlock(null)
          }}
          onSuccess={(message) => {
            setSuccessMessage(message)
            setShowSuccessToast(true)
          }}
        />
      )}
    </div>
  )
}