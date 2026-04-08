'use client'

interface RecentActivityProps {
  activities: Array<{
    completed_at: string
    questions?: {
      title?: string
      quests?: {
        title?: string
      }
    }
  }>
}

export default function RecentActivity({ activities }: RecentActivityProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)

    if (diffHours < 1) {
      return 'Just now'
    } else if (diffHours < 24) {
      return `${diffHours}h ago`
    } else if (diffDays === 1) {
      return 'Yesterday'
    } else {
      return `${diffDays} days ago`
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
        <span className="mr-2">📚</span>
        Recent Activity
      </h3>

      {!activities || activities.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">🚀</div>
          <p>No completed challenges yet!</p>
          <p className="text-sm">Start your first quest to see activity here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((activity, index) => (
            <div key={index} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50">
              <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 text-sm">✓</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">
                  {activity.questions?.title || 'Class Participation'}
                </p>
                <p className="text-xs text-gray-500">
                  {activity.questions?.quests?.title ? `in ${activity.questions.quests.title}` : 'Live Session'}
                </p>
              </div>
              <div className="text-xs text-gray-400">
                {formatDate(activity.completed_at)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}