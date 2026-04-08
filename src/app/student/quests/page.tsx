'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import QuestCard from '@/components/student/QuestCard'
import { useQuests } from '@/lib/hooks/useQuests'
import StudentHeader from '@/components/student/StudentHeader'

export default function QuestsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { quests, isLoading, isError } = useQuests()
  const [completedQuestId, setCompletedQuestId] = useState<string | null>(null)
  const [nextRecommendedQuest, setNextRecommendedQuest] = useState<string | null>(null)

  useEffect(() => {
    // Check if we just completed a quest
    const completed = searchParams.get('completed')
    if (completed && quests.length > 0) {
      setCompletedQuestId(completed)

      // Find the next recommended quest (next available quest in order)
      const sortedQuests = [...quests].sort((a, b) => a.orderIndex - b.orderIndex)
      const nextAvailable = sortedQuests.find((quest) =>
        quest.status === 'available' && quest.isUnlocked
      )

      if (nextAvailable) {
        setNextRecommendedQuest(nextAvailable.id)
      }

      // Clear the URL parameter after 5 seconds to avoid persistent highlighting
      setTimeout(() => {
        setCompletedQuestId(null)
        setNextRecommendedQuest(null)
        // Remove the completed parameter from URL without page reload
        const url = new URL(window.location.href)
        url.searchParams.delete('completed')
        window.history.replaceState({}, '', url.toString())
      }, 5000)
    }
  }, [searchParams, quests])

  // Only show loading if we have no quests data at all (first load)
  if (isLoading && quests.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading quests...</p>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">❌</div>
          <p className="text-gray-600 dark:text-gray-300">{isError?.message || 'Failed to load quests'}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const completedQuests = quests.filter(q => q.status === 'completed').length
  const totalQuests = quests.length
  const overallProgress = totalQuests > 0 ? Math.round((completedQuests / totalQuests) * 100) : 0

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <StudentHeader title="Quest Selection" />

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quest completion stats */}
        <div className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          {completedQuests}/{totalQuests} quests completed
        </div>
        {/* Quest Completion Success Message */}
        {completedQuestId && (
          <div className="bg-green-100 border border-green-400 rounded-lg p-4 mb-6 animate-pulse">
            <div className="flex items-center">
              <div className="text-2xl mr-3">🎉</div>
              <div>
                <h3 className="text-green-800 font-semibold">Quest Completed!</h3>
                <p className="text-green-700 text-sm">
                  Congratulations! You&apos;ve successfully completed your quest.
                  {nextRecommendedQuest && " Check out the highlighted quest below for your next challenge!"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Progress Overview */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Your Learning Journey</h2>
            <div className="text-2xl font-bold text-blue-600">{overallProgress}%</div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${overallProgress}%` }}
            ></div>
          </div>
          <p className="text-gray-600 text-sm">
            Complete quests in order to unlock new challenges and earn experience points!
          </p>
        </div>

        {/* Quest Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quests.map((quest) => (
            <QuestCard
              key={quest.id}
              quest={quest}
              isRecommended={quest.id === nextRecommendedQuest}
            />
          ))}
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2 flex items-center">
            <span className="mr-2">💡</span>
            How Quests Work
          </h3>
          <ul className="text-blue-800 space-y-2 text-sm">
            <li>• <strong>Sequential Unlock:</strong> Complete all questions in a quest to unlock the next one</li>
            <li>• <strong>Progress Tracking:</strong> Your progress is automatically saved as you complete questions</li>
            <li>• <strong>Experience Points:</strong> Earn XP for each correct answer to level up</li>
            <li>• <strong>Achievements:</strong> Unlock badges by completing quests and reaching milestones</li>
          </ul>
        </div>
      </div>
    </div>
  )
}