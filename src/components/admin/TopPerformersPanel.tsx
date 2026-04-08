'use client'

import { useRouter } from 'next/navigation'

interface TopPerformersPanelProps {
  performers: Array<{
    username: string
    total_score?: number  // RPC returns snake_case
    totalScore?: number   // Support both formats
    quest_points?: number  // Score breakdown
    achievement_points?: number
    cp_points?: number
    completed_questions?: number  // RPC returns snake_case
    completed_challenges?: number  // Legacy support
    completedChallenges?: number   // Support both formats
  }>
}

export default function TopPerformersPanel({ performers }: TopPerformersPanelProps) {
  const router = useRouter()
  const getRankEmoji = (rank: number) => {
    switch (rank) {
      case 1: return '🥇'
      case 2: return '🥈'
      case 3: return '🥉'
      default: return `#${rank}`
    }
  }

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900'
      case 2: return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700'
      case 3: return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900'
      default: return 'text-blue-900 dark:text-blue-300 bg-blue-50 dark:bg-blue-900'
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center">
        <span className="mr-2">🏆</span>
        Top Performers
      </h3>

      <div className="space-y-3">
        {!performers || performers.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-4">No student data available</p>
        ) : (
          (() => {
            // Calculate ranks with tie handling
            const topPerformers = performers.slice(0, 7)
            let currentRank = 1
            return topPerformers.map((performer, index) => {
              // Update rank if score decreased from previous performer
              if (index > 0) {
                const prevScore = topPerformers[index - 1].total_score || topPerformers[index - 1].totalScore || 0
                const currScore = performer.total_score || performer.totalScore || 0
                if (prevScore > currScore) {
                  currentRank = index + 1
                }
              }
              const rank = currentRank

              return (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${getRankColor(rank)}`}>
                      {getRankEmoji(rank)}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {performer.username}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">
                        {performer.completed_questions || performer.completed_challenges || performer.completedChallenges || 0} challenges completed
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg text-blue-600 dark:text-blue-400">
                      {performer.total_score || performer.totalScore || 0}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">pts</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      Q:{performer.quest_points || 0} | A:{performer.achievement_points || 0} | CP:{performer.cp_points || 0}
                    </div>
                  </div>
                </div>
              )
            })
          })()
        )}
      </div>

      {performers && performers.length > 0 && (
        <div className="mt-4 text-center">
          <button
            onClick={() => router.push('/admin/leaderboard')}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium transition-colors"
          >
            View Full Leaderboard →
          </button>
        </div>
      )}
    </div>
  )
}