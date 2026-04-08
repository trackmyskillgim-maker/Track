'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import StudentHeader from '@/components/student/StudentHeader'
import { useAchievements } from '@/lib/hooks/useAchievements'

interface Achievement {
  id: string
  code: string
  name: string
  description: string
  icon: string
  requirements: any
  points: number
  badge_tier: 'bronze' | 'silver' | 'gold' | 'platinum'
  is_active: boolean
  earned: boolean
  earnedAt: string | null
  progress: number
  target: number
  progressPercentage: number
}

interface EarnedAchievement {
  id: string
  name: string
  description: string
  icon: string
  badge_tier: 'bronze' | 'silver' | 'gold' | 'platinum'
  points: number
  earnedAt: string
}

interface AchievementsData {
  allAchievements: Achievement[]
  earnedAchievements: EarnedAchievement[]
  stats: {
    totalAchievements: number
    earnedAchievements: number
    totalPoints: number
    bronzeBadges: number
    silverBadges: number
    goldBadges: number
    platinumBadges: number
  }
}

export default function AchievementsPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'earned' | 'categories'>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedTier, setSelectedTier] = useState<string>('all')
  const router = useRouter()
  const { data, isLoading: loading, isError, mutate } = useAchievements()

  // Handle error with redirect
  if (isError && isError.message?.includes('401')) {
    router.push('/')
    return null
  }

  const error = isError ? (isError instanceof Error ? isError.message : 'Failed to load achievements') : null

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'bronze': return 'border-amber-500 bg-amber-50 text-amber-700'
      case 'silver': return 'border-gray-500 bg-gray-50 text-gray-700'
      case 'gold': return 'border-yellow-500 bg-yellow-50 text-yellow-700'
      case 'platinum': return 'border-purple-500 bg-purple-50 text-purple-700'
      default: return 'border-gray-300 bg-gray-50 text-gray-600'
    }
  }

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'bronze': return '🥉'
      case 'silver': return '🥈'
      case 'gold': return '🥇'
      case 'platinum': return '💎'
      default: return '🏅'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getCategoryDisplayName = (category: string) => {
    const categoryNames: Record<string, string> = {
      'quest_completion': 'Quest Completion',
      'question_solving': 'Question Solving',
      'accuracy_performance': 'Accuracy Performance',
      'correct_streaks': 'Correct Streaks',
      'level_milestones': 'Level Milestones',
      'subject_mastery': 'Subject Mastery',
      'special': 'Special Achievements'
    }
    return categoryNames[category] || category
  }

  const getFilteredAchievements = () => {
    if (!data) return []

    let filtered = data.allAchievements

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((achievement: any) => {
        // Since category field might not exist in current data, we'll infer from code
        const code = achievement.code
        if (selectedCategory === 'quest_completion') {
          return code.includes('quest') && !code.includes('subject')
        }
        if (selectedCategory === 'question_solving') {
          return code.includes('problem') || code.includes('brain') || code.includes('mind') ||
                 code.includes('logic') || code.includes('genius_solver')
        }
        if (selectedCategory === 'accuracy_performance') {
          return code.includes('sharp') || code.includes('precision') || code.includes('difficulty')
        }
        if (selectedCategory === 'correct_streaks') {
          return code.includes('streak') || code.includes('fire') || code.includes('blazing') || code.includes('inferno')
        }
        if (selectedCategory === 'level_milestones') {
          return code.includes('scholar') || code.includes('academic') || code.includes('intellectual') ||
                 code.includes('genius_level') || code.includes('legend')
        }
        if (selectedCategory === 'special') {
          return code.includes('knowledge') || code.includes('completionist') || code.includes('first_attempt')
        }
        return true
      })
    }

    // Filter by tier
    if (selectedTier !== 'all') {
      filtered = filtered.filter((achievement: any) => achievement.badge_tier === selectedTier)
    }

    return filtered
  }

  const getAchievementsByCategory = () => {
    if (!data) return {}

    const categories: Record<string, any[]> = {
      'quest_completion': [],
      'question_solving': [],
      'accuracy_performance': [],
      'correct_streaks': [],
      'level_milestones': [],
      'special': []
    }

    data.allAchievements.forEach((achievement: any) => {
      const code = achievement.code
      if (code.includes('quest') && !code.includes('subject')) {
        categories.quest_completion.push(achievement)
      } else if (code.includes('problem') || code.includes('brain') || code.includes('mind') ||
                 code.includes('logic') || code.includes('genius_solver')) {
        categories.question_solving.push(achievement)
      } else if (code.includes('sharp') || code.includes('precision') || code.includes('difficulty')) {
        categories.accuracy_performance.push(achievement)
      } else if (code.includes('streak') || code.includes('fire') || code.includes('blazing') || code.includes('inferno')) {
        categories.correct_streaks.push(achievement)
      } else if (code.includes('scholar') || code.includes('academic') || code.includes('intellectual') ||
                 code.includes('genius_level') || code.includes('legend')) {
        categories.level_milestones.push(achievement)
      } else if (code.includes('knowledge') || code.includes('completionist') || code.includes('first_attempt')) {
        categories.special.push(achievement)
      }
    })

    return categories
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <StudentHeader title="Achievements" />
        <div className="max-w-6xl mx-auto p-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <StudentHeader title="Achievements" />
        <div className="max-w-6xl mx-auto p-8">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded mb-4">
            Error: {error}
          </div>
          <button
            onClick={() => mutate()}
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
      <StudentHeader title="Achievements" />
      <div className="max-w-6xl mx-auto p-8">

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-800 dark:text-white">
                  {data.stats.earnedAchievements}/{data.stats.totalAchievements}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Earned</div>
              </div>
              <div className="text-3xl">🏆</div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-800 dark:text-white">{data.stats.totalPoints}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Points</div>
              </div>
              <div className="text-3xl">⭐</div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border-l-4 border-amber-500">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-800 dark:text-white">
                  {data.stats.bronzeBadges + data.stats.silverBadges + data.stats.goldBadges + data.stats.platinumBadges}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Badges</div>
              </div>
              <div className="text-3xl">🏅</div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-800 dark:text-white">
                  {data.stats.totalAchievements > 0 ? Math.round((data.stats.earnedAchievements / data.stats.totalAchievements) * 100) : 0}%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Progress</div>
              </div>
              <div className="text-3xl">📊</div>
            </div>
          </div>
        </div>

        {/* Badge Tier Breakdown */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Badge Collection</h2>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-3xl mb-2">🥉</div>
              <div className="text-2xl font-bold text-amber-600">{data.stats.bronzeBadges}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Bronze</div>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-2">🥈</div>
              <div className="text-2xl font-bold text-gray-600 dark:text-gray-300">{data.stats.silverBadges}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Silver</div>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-2">🥇</div>
              <div className="text-2xl font-bold text-yellow-600">{data.stats.goldBadges}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Gold</div>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-2">💎</div>
              <div className="text-2xl font-bold text-purple-600">{data.stats.platinumBadges}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Platinum</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-4 mb-6">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'all'
                ? 'bg-blue-500 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            All Achievements ({data.allAchievements.length})
          </button>
          <button
            onClick={() => setActiveTab('earned')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'earned'
                ? 'bg-blue-500 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            Earned ({data.earnedAchievements.length})
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'categories'
                ? 'bg-blue-500 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            By Category
          </button>
        </div>

        {/* Filters for All tab */}
        {activeTab === 'all' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Filters</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                >
                  <option value="all">All Categories</option>
                  <option value="quest_completion">Quest Completion</option>
                  <option value="question_solving">Question Solving</option>
                  <option value="accuracy_performance">Accuracy Performance</option>
                  <option value="correct_streaks">Correct Streaks</option>
                  <option value="level_milestones">Level Milestones</option>
                  <option value="special">Special Achievements</option>
                </select>
              </div>

              {/* Tier Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Badge Tier</label>
                <select
                  value={selectedTier}
                  onChange={(e) => setSelectedTier(e.target.value)}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                >
                  <option value="all">All Tiers</option>
                  <option value="bronze">🥉 Bronze</option>
                  <option value="silver">🥈 Silver</option>
                  <option value="gold">🥇 Gold</option>
                  <option value="platinum">💎 Platinum</option>
                </select>
              </div>
            </div>

            {/* Clear Filters */}
            {(selectedCategory !== 'all' || selectedTier !== 'all') && (
              <button
                onClick={() => {
                  setSelectedCategory('all')
                  setSelectedTier('all')
                }}
                className="mt-4 px-4 py-2 text-sm text-blue-600 hover:text-blue-800 transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        )}

        {/* Achievement Cards */}
        {activeTab === 'all' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {getFilteredAchievements().map((achievement: any) => (
              <div
                key={achievement.id}
                className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border-2 transition-all ${
                  achievement.earned
                    ? `${getTierColor(achievement.badge_tier)} shadow-lg`
                    : 'border-gray-200 opacity-75'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="text-4xl">{achievement.icon}</div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">
                        {achievement.name}
                      </h3>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm">{getTierIcon(achievement.badge_tier)}</span>
                        <span className="text-sm font-medium capitalize text-black">
                          {achievement.badge_tier}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-yellow-600">+{achievement.points}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">points</div>
                  </div>
                </div>

                <p className="text-gray-600 text-sm mb-4">{achievement.description}</p>

                {achievement.earned ? (
                  <div className="flex items-center justify-between">
                    <span className="text-green-600 font-medium text-sm">✅ Completed</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">
                      {achievement.earnedAt ? formatDate(achievement.earnedAt) : ''}
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-300">Progress</span>
                      <span className="font-medium text-black">
                        {achievement.progress}/{achievement.target}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all"
                        style={{ width: `${achievement.progressPercentage}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500 text-center">
                      {achievement.progressPercentage}% complete
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Earned Achievements Tab */}
        {activeTab === 'earned' && (
          <div className="space-y-4">
            {data.earnedAchievements.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
                <div className="text-6xl mb-4">🎯</div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No Achievements Yet</h3>
                <p className="text-gray-600 dark:text-gray-300">Complete quests and challenges to start earning achievements!</p>
              </div>
            ) : (
              data.earnedAchievements.map((achievement: any) => (
                <div
                  key={achievement.id}
                  className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border-l-4 ${getTierColor(achievement.badge_tier)}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="text-4xl">{achievement.icon}</div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800">
                          {achievement.name}
                        </h3>
                        <p className="text-gray-600 text-sm">{achievement.description}</p>
                        <div className="flex items-center space-x-4 mt-2">
                          <span className="flex items-center space-x-1 text-sm">
                            <span>{getTierIcon(achievement.badge_tier)}</span>
                            <span className="capitalize font-medium text-black">{achievement.badge_tier}</span>
                          </span>
                          <span className="text-yellow-600 font-bold">+{achievement.points} points</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500 mb-1">Earned on</div>
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {formatDate(achievement.earnedAt)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Category View Tab */}
        {activeTab === 'categories' && (
          <div className="space-y-8">
            {Object.entries(getAchievementsByCategory()).map(([categoryKey, achievements]) => {
              if (achievements.length === 0) return null

              const earnedCount = achievements.filter(a => a.earned).length

              return (
                <div key={categoryKey} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-gray-800">
                      {getCategoryDisplayName(categoryKey)}
                    </h3>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      {earnedCount}/{achievements.length} earned
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{ width: `${(earnedCount / achievements.length) * 100}%` }}
                    ></div>
                  </div>

                  {/* Achievement Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {achievements.map((achievement) => (
                      <div
                        key={achievement.id}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          achievement.earned
                            ? `${getTierColor(achievement.badge_tier)} shadow-md`
                            : 'border-gray-200 bg-gray-50 opacity-75'
                        }`}
                      >
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="text-2xl">{achievement.icon}</div>
                          <div>
                            <h4 className="font-semibold text-gray-800 text-sm">
                              {achievement.name}
                            </h4>
                            <div className="flex items-center space-x-1 text-xs">
                              <span>{getTierIcon(achievement.badge_tier)}</span>
                              <span className="capitalize text-black">{achievement.badge_tier}</span>
                              <span className="text-yellow-600">+{achievement.points}pts</span>
                            </div>
                          </div>
                        </div>

                        <p className="text-xs text-gray-600 mb-2">{achievement.description}</p>

                        {achievement.earned ? (
                          <div className="text-xs text-green-600 font-medium">
                            ✅ Completed {achievement.earnedAt ? formatDate(achievement.earnedAt) : ''}
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">
                              Progress: <span className="text-black">{achievement.progress}/{achievement.target}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1">
                              <div
                                className="bg-blue-400 h-1 rounded-full"
                                style={{ width: `${achievement.progressPercentage}%` }}
                              ></div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}