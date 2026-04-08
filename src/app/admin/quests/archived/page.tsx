'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import AdminHeader from '@/components/admin/AdminHeader'
import ConfirmationModal from '@/components/admin/ConfirmationModal'
import SuccessToast from '@/components/admin/SuccessToast'

interface ArchivedQuest {
  id: string
  title: string
  description: string
  difficulty: string
  estimatedTime: string
  orderIndex: number
  isActive: boolean
  createdAt: string
  totalQuestions: number
  totalCompletions: number
  studentsAttempted: number
}

const fetcher = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Failed to fetch archived quests')
  }
  const data = await response.json()
  if (!data.success) {
    throw new Error(data.message || 'Failed to fetch archived quests')
  }
  return data.data
}

export default function ArchivedQuests() {
  const router = useRouter()
  const { data: quests, isLoading, error, mutate } = useSWR<ArchivedQuest[]>(
    '/api/admin/quests/archived',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshInterval: 0, // Disable auto-refresh
      dedupingInterval: 60000 // Cache for 1 minute
    }
  )

  const [questToRestore, setQuestToRestore] = useState<{ id: string; title: string } | null>(null)
  const [questToDelete, setQuestToDelete] = useState<{ id: string; title: string; studentsCount: number } | null>(null)
  const [showRestoreModal, setShowRestoreModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showSuccessToast, setShowSuccessToast] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  const handleRestoreClick = (questId: string, questTitle: string) => {
    setQuestToRestore({ id: questId, title: questTitle })
    setShowRestoreModal(true)
  }

  const handleDeleteClick = (questId: string, questTitle: string, studentsCount: number) => {
    setQuestToDelete({ id: questId, title: questTitle, studentsCount })
    setShowDeleteModal(true)
  }

  const confirmRestore = async () => {
    if (!questToRestore) return

    setIsProcessing(true)
    setShowRestoreModal(false)

    try {
      const response = await fetch(`/api/admin/quests/${questToRestore.id}/restore`, {
        method: 'PATCH'
      })

      const result = await response.json()

      if (result.success) {
        setSuccessMessage(`Quest "${questToRestore.title}" has been restored successfully!`)
        setShowSuccessToast(true)
        mutate() // Refresh the archived quests list
      } else {
        alert(`Failed to restore quest: ${result.message}`)
      }
    } catch (error) {
      console.error('Restore quest error:', error)
      alert('An error occurred while restoring the quest. Please try again.')
    } finally {
      setIsProcessing(false)
      setQuestToRestore(null)
    }
  }

  const confirmDelete = async () => {
    if (!questToDelete) return

    setIsProcessing(true)
    setShowDeleteModal(false)

    try {
      const response = await fetch(`/api/admin/quests/${questToDelete.id}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.success) {
        setSuccessMessage(`Quest "${questToDelete.title}" has been permanently deleted.`)
        setShowSuccessToast(true)
        mutate() // Refresh the archived quests list
      } else {
        alert(`Failed to delete quest: ${result.message}`)
      }
    } catch (error) {
      console.error('Delete quest error:', error)
      alert('An error occurred while deleting the quest. Please try again.')
    } finally {
      setIsProcessing(false)
      setQuestToDelete(null)
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminHeader title="Archived Quests" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading archived quests...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader title="Archived Quests" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Actions */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Archived Quests</h2>
            <p className="text-gray-600">View and restore previously archived quests</p>
          </div>
          <button
            onClick={() => router.push('/admin/quests')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <span>←</span>
            <span>Back to Active Quests</span>
          </button>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error?.message || 'Failed to load archived quests'}
          </div>
        )}

        {/* Archived Quests List */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quest
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Difficulty
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Questions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Students
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {quests && quests.length > 0 ? (
                  quests.map((quest) => (
                    <tr key={quest.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-start">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {quest.title}
                            </div>
                            <div className="text-sm text-gray-500 max-w-xs">
                              {quest.description.length > 100
                                ? `${quest.description.substring(0, 100)}...`
                                : quest.description
                              }
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              {quest.estimatedTime}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getDifficultyColor(quest.difficulty)}`}>
                          {quest.difficulty}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {quest.totalQuestions}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {quest.studentsAttempted}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(quest.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleRestoreClick(quest.id, quest.title)}
                            disabled={isProcessing}
                            className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Restore this quest to active status"
                          >
                            ↻ Restore
                          </button>
                          {/* Only show delete for quests with no students */}
                          {quest.studentsAttempted === 0 && (
                            <button
                              onClick={() => handleDeleteClick(quest.id, quest.title, quest.studentsAttempted)}
                              disabled={isProcessing}
                              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Permanently delete this quest (only available for quests with no student attempts)"
                            >
                              🗑️ Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="text-gray-400 text-6xl mb-4">📦</div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No archived quests</h3>
                      <p className="text-gray-600 mb-4">
                        Quests you archive will appear here and can be restored anytime
                      </p>
                      <button
                        onClick={() => router.push('/admin/quests')}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                      >
                        Go to Active Quests
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Restore Confirmation Modal */}
      <ConfirmationModal
        isOpen={showRestoreModal}
        onClose={() => {
          setShowRestoreModal(false)
          setQuestToRestore(null)
        }}
        onConfirm={confirmRestore}
        title="↻ Restore Quest"
        message={`Are you sure you want to restore "${questToRestore?.title}"?\n\n✅ This will:\n• Make the quest visible to students again\n• Restore all questions in the quest\n• Preserve all existing student progress data\n\n💡 The quest will appear in the active quests list.`}
        confirmText="↻ Restore Quest"
        cancelText="Cancel"
        isDestructive={false}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false)
          setQuestToDelete(null)
        }}
        onConfirm={confirmDelete}
        title="⚠️ Permanently Delete Quest"
        message={`⚠️ PERMANENT DELETION WARNING\n\nYou are about to permanently delete "${questToDelete?.title}".\n\n❌ This will:\n• Completely remove the quest and all its questions\n• Delete all associated test cases and data\n• Cannot be undone or recovered\n\n🛡️ Safety: This quest has ${questToDelete?.studentsCount || 0} student attempts.\n\n⚠️ This action is PERMANENT and IRREVERSIBLE!`}
        confirmText="🗑️ Delete Permanently"
        cancelText="Cancel"
        isDestructive={true}
      />

      {/* Success Toast */}
      <SuccessToast
        isOpen={showSuccessToast}
        onClose={() => setShowSuccessToast(false)}
        message={successMessage}
      />
    </div>
  )
}
