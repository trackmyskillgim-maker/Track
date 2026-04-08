'use client'

import { useRouter } from 'next/navigation'

interface RecentActivityPanelProps {
  activities: Array<{
    username?: string      // RPC returns this
    student?: string       // Legacy support
    questTitle?: string    // RPC returns this
    quest?: string         // Legacy support
    questionTitle?: string // RPC returns this
    question?: string      // Legacy support
    points?: number        // RPC returns this
    score?: number         // Legacy support
    timestamp?: string     // RPC returns this
    completed_at?: string  // Legacy support
    completedAt?: string   // Legacy support
    isCorrect?: boolean    // RPC returns this
  }>
}

export default function RecentActivityPanel({ activities }: RecentActivityPanelProps) {
  const router = useRouter()
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Unknown'

    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return 'Invalid date'

      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffMins = Math.floor(diffMs / (1000 * 60))
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

      if (diffMins < 60) {
        return `${diffMins}m ago`
      } else if (diffHours < 24) {
        return `${diffHours}h ago`
      } else {
        return `${diffDays}d ago`
      }
    } catch {
      return 'Invalid date'
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center">
        <span className="mr-2">📈</span>
        Recent Activity
      </h3>

      <div className="space-y-3">
        {!activities || activities.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-4">No recent activity</p>
        ) : (
          activities.slice(0, 5).map((activity, index) => (
            <div
              key={index}
              className="flex items-start justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-gray-900 dark:text-white">
                    {activity.username || activity.student}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {activity.isCorrect ? 'completed' : 'attempted'}
                  </span>
                  {activity.isCorrect ? (
                    <span className="text-green-600">✓</span>
                  ) : (
                    <span className="text-red-600">✗</span>
                  )}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  <span className="font-medium">{activity.questTitle || activity.quest}</span>
                  <span className="mx-1">→</span>
                  <span>{activity.questionTitle || activity.question}</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {formatDate(activity.timestamp || activity.completed_at || activity.completedAt)}
                  </span>
                  {activity.isCorrect && (
                    <span className="text-sm font-medium text-green-600">
                      +{activity.points || activity.score} XP
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {activities && activities.length > 0 && (
        <div className="mt-4 text-center">
          <button
            onClick={() => router.push('/admin/activity')}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium transition-colors"
          >
            View All Activity →
          </button>
        </div>
      )}
    </div>
  )
}