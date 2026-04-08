'use client'

import { useState } from 'react'

interface QueueEntry {
  queue_id: string
  user_id: string
  username: string
  email: string
  year: string
  course: string
  section: string
  queue_position: number
  queue_status: string
  joined_at: string
  access_granted_at: string | null
  session_submission_count?: number
}

interface QueueManagementPanelProps {
  sessionId: string
  queue: QueueEntry[]
  autoAdvanceEnabled: boolean
  onQueueUpdate: () => void
}

export default function QueueManagementPanel({
  sessionId,
  queue,
  autoAdvanceEnabled,
  onQueueUpdate
}: QueueManagementPanelProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const handleGrantAccess = async (userId: string) => {
    setActionLoading(userId)
    try {
      const res = await fetch('/api/class-participation/admin/grant-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, userId })
      })

      if (res.ok) {
        onQueueUpdate()
      }
    } catch (error) {
      console.error('Grant access error:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const handleSkip = async (userId: string) => {
    setActionLoading(userId)
    try {
      const res = await fetch('/api/class-participation/admin/skip-student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, userId })
      })

      if (res.ok) {
        onQueueUpdate()
      }
    } catch (error) {
      console.error('Skip error:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      waiting: { color: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200', text: '⏳ Waiting' },
      attempting: { color: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200', text: '✍️ Attempting' },
      completed: { color: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200', text: '✅ Completed' },
      skipped: { color: 'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200', text: '⏭️ Skipped' }
    }
    const badge = badges[status as keyof typeof badges] || badges.waiting
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>{badge.text}</span>
  }

  const waitingQueue = queue.filter(q => q.queue_status === 'waiting')
  const attemptingQueue = queue.filter(q => q.queue_status === 'attempting')
  const completedQueue = queue.filter(q => q.queue_status === 'completed')

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Queue Management
        </h3>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {autoAdvanceEnabled ? '🔄 Auto-advance ON' : '🔒 Manual mode'}
        </div>
      </div>

      {queue.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No students in queue yet
        </div>
      ) : (
        <div className="space-y-4">
          {/* Attempting Students */}
          {attemptingQueue.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Currently Attempting ({attemptingQueue.length})
              </h4>
              {attemptingQueue.map((entry) => (
                <div
                  key={entry.queue_id}
                  className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-2"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                        #{entry.queue_position} {entry.username}
                        {(entry.session_submission_count || 0) > 1 && (
                          <span className="px-2 py-0.5 bg-blue-500 text-white rounded-full text-xs font-medium">
                            {entry.session_submission_count}Q
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {entry.year} • {entry.course} {entry.section} • {entry.email}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(entry.queue_status)}
                      <button
                        onClick={() => handleSkip(entry.user_id)}
                        disabled={actionLoading === entry.user_id}
                        className="px-3 py-1 text-xs bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors disabled:opacity-50"
                      >
                        Skip
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Waiting Students */}
          {waitingQueue.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Waiting ({waitingQueue.length})
              </h4>
              <div className="space-y-2">
                {waitingQueue.map((entry) => (
                  <div
                    key={entry.queue_id}
                    className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 flex justify-between items-center"
                  >
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                        #{entry.queue_position} {entry.username}
                        {(entry.session_submission_count || 0) > 1 && (
                          <span className="px-2 py-0.5 bg-blue-500 text-white rounded-full text-xs font-medium">
                            {entry.session_submission_count}Q
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {entry.year} • {entry.course} {entry.section}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(entry.queue_status)}
                      {!autoAdvanceEnabled && (
                        <button
                          onClick={() => handleGrantAccess(entry.user_id)}
                          disabled={actionLoading === entry.user_id}
                          className="px-3 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded transition-colors disabled:opacity-50"
                        >
                          Give Access
                        </button>
                      )}
                      <button
                        onClick={() => handleSkip(entry.user_id)}
                        disabled={actionLoading === entry.user_id}
                        className="px-3 py-1 text-xs bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors disabled:opacity-50"
                      >
                        Skip
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed Students */}
          {completedQueue.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Completed ({completedQueue.length})
              </h4>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                {completedQueue.map(e => `#${e.queue_position} ${e.username}`).join(', ')}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}