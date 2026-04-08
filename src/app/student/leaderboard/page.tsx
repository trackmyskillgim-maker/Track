'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLeaderboard } from '@/lib/hooks/useLeaderboard'
import StudentHeader from '@/components/student/StudentHeader'

interface LeaderboardUser {
  id: string
  rank: number
  username: string
  email?: string
  total_points: number
  current_level: number
  current_streak: number
  max_streak?: number
  completedQuests: number
  completedQuestions: number
  achievements: number
  last_active: string
  isCurrentUser: boolean
}


export default function LeaderboardPage() {
  const [viewMode, setViewMode] = useState<'top' | 'all'>('top')
  const router = useRouter()
  const { data, isLoading, isError } = useLeaderboard()


  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return '🥇'
      case 2: return '🥈'
      case 3: return '🥉'
      default: return `#${rank}`
    }
  }

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 2: return 'text-gray-600 bg-gray-50 border-gray-200'
      case 3: return 'text-amber-600 bg-amber-50 border-amber-200'
      default: return 'text-blue-600 bg-blue-50 border-blue-200'
    }
  }

  const formatLastActive = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) return 'Active now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const displayedUsers = viewMode === 'top'
    ? data?.topPerformers.slice(0, 10) || []
    : data?.topPerformers || []

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                  <div className="h-4 bg-gray-200 rounded mb-4"></div>
                  <div className="h-6 bg-gray-200 rounded mb-2"></div>
                </div>
              ))}
            </div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                  <div className="h-6 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            Error: {isError?.message || 'Failed to load leaderboard'}
          </div>
          <button
            onClick={() => router.refresh()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <StudentHeader title="Leaderboard" />
      <div className="max-w-6xl mx-auto p-8">

        {/* Platform Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-800">{data.stats.totalStudents}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Total Students</div>
              </div>
              <div className="text-3xl">👥</div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-800">{data.stats.averagePoints}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Avg Points</div>
              </div>
              <div className="text-3xl">📊</div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border-l-4 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-800">{data.stats.topStreak}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Best Streak</div>
              </div>
              <div className="text-3xl">🔥</div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-800">{data.stats.mostActiveToday}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Active Today</div>
              </div>
              <div className="text-3xl">⚡</div>
            </div>
          </div>
        </div>

        {/* Your Position */}
        {data.currentUser && (
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">🎆 Your Position</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{getRankIcon(data.currentUser.rank)}</div>
                <div className="text-sm opacity-90">Rank</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{data.currentUser.total_points}</div>
                <div className="text-sm opacity-90">Points</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">Level {data.currentUser.current_level}</div>
                <div className="text-sm opacity-90">Current Level</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{data.currentUser.current_streak} 🔥</div>
                <div className="text-sm opacity-90">Streak</div>
              </div>
            </div>
          </div>
        )}

        {/* View Toggle */}
        <div className="flex space-x-4 mb-6">
          <button
            onClick={() => setViewMode('top')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              viewMode === 'top'
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Top 10
          </button>
          <button
            onClick={() => setViewMode('all')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              viewMode === 'all'
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            All Students ({data.stats.totalStudents})
          </button>
        </div>

        {/* Leaderboard Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-800">
              {viewMode === 'top' ? 'Top Performers' : 'All Students'}
            </h3>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Points
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Level
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quests
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Questions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Streak
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Badges
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Active
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200 dark:divide-gray-700">
                {displayedUsers.map((user: LeaderboardUser) => (
                  <tr
                    key={user.id}
                    className={`hover:bg-gray-50 transition-colors ${
                      user.isCurrentUser ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full border-2 font-bold text-sm ${
                        getRankColor(user.rank)
                      }`}>
                        {getRankIcon(user.rank)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className={`text-sm font-medium ${
                            user.isCurrentUser ? 'text-blue-900' : 'text-gray-900'
                          }`}>
                            {user.username}
                            {user.isCurrentUser && <span className="ml-2 text-blue-600">(You)</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">{user.total_points}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{user.current_level}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{user.completedQuests}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{user.completedQuestions}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {user.current_streak > 0 && '🔥'} {user.current_streak}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {user.achievements > 0 && '🏅'} {user.achievements}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">
                      {formatLastActive(user.last_active)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4 p-4">
            {displayedUsers.map((user: LeaderboardUser) => (
              <div
                key={user.id}
                className={`bg-white border rounded-lg p-4 ${
                  user.isCurrentUser ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full border-2 font-bold ${
                      getRankColor(user.rank)
                    }`}>
                      {getRankIcon(user.rank)}
                    </div>
                    <div>
                      <div className={`font-medium ${
                        user.isCurrentUser ? 'text-blue-900' : 'text-gray-900'
                      }`}>
                        {user.username}
                        {user.isCurrentUser && <span className="ml-2 text-blue-600">(You)</span>}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">
                        {formatLastActive(user.last_active)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900 dark:text-white">{user.total_points}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">points</div>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4 text-center text-sm">
                  <div>
                    <div className="font-medium">Level {user.current_level}</div>
                    <div className="text-gray-500 dark:text-gray-400 dark:text-gray-500">Level</div>
                  </div>
                  <div>
                    <div className="font-medium">{user.completedQuests}</div>
                    <div className="text-gray-500 dark:text-gray-400 dark:text-gray-500">Quests</div>
                  </div>
                  <div>
                    <div className="font-medium">
                      {user.current_streak > 0 && '🔥'} {user.current_streak}
                    </div>
                    <div className="text-gray-500 dark:text-gray-400 dark:text-gray-500">Streak</div>
                  </div>
                  <div>
                    <div className="font-medium">
                      {user.achievements > 0 && '🏅'} {user.achievements}
                    </div>
                    <div className="text-gray-500 dark:text-gray-400 dark:text-gray-500">Badges</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {displayedUsers.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
            <div className="text-6xl mb-4">🏆</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Students Yet</h3>
            <p className="text-gray-600 dark:text-gray-300">Be the first to start your coding journey!</p>
          </div>
        )}
      </div>
    </div>
  )
}