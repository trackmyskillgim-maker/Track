'use client'

import { useEffect, useState } from 'react'
import AchievementUnlockModal, { UnlockedAchievement } from './AchievementUnlockModal'

interface SuccessModalProps {
  isOpen: boolean
  onClose: () => void
  points: number
  isQuestComplete?: boolean
  nextAction: () => void
  message?: string
  isReviewQuestion?: boolean
  achievements?: {
    newAchievements: UnlockedAchievement[]
    totalAchievementPoints: number
    currentStreak: number
    streakBroken: boolean
  }
}

export default function SuccessModal({
  isOpen,
  onClose,
  points,
  isQuestComplete = false,
  nextAction,
  message,
  isReviewQuestion = false,
  achievements
}: SuccessModalProps) {
  const [showAchievements, setShowAchievements] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  useEffect(() => {
    if (isOpen) {
      // Check if we have new achievements to show first
      if (achievements?.newAchievements && achievements.newAchievements.length > 0) {
        setShowAchievements(true)
        setShowSuccess(false)
      } else {
        setShowAchievements(false)
        setShowSuccess(true)

        // Auto-close and navigate after 3 seconds if no achievements
        const timer = setTimeout(() => {
          onClose()
          nextAction()
        }, 3000)

        return () => clearTimeout(timer)
      }
    } else {
      setShowAchievements(false)
      setShowSuccess(false)
    }
  }, [isOpen, achievements, onClose, nextAction])

  const handleAchievementModalClose = () => {
    setShowAchievements(false)
    setShowSuccess(true)

    // Auto-close success modal after achievements
    const timer = setTimeout(() => {
      onClose()
      nextAction()
    }, 3000)

    return () => clearTimeout(timer)
  }

  if (!isOpen) return null

  // Calculate total points including achievements
  const totalPointsEarned = points + (achievements?.totalAchievementPoints || 0)

  return (
    <>
      {/* Achievement Unlock Modal (shows first if there are achievements) */}
      <AchievementUnlockModal
        isOpen={showAchievements}
        onClose={handleAchievementModalClose}
        achievements={achievements?.newAchievements || []}
        onCelebrationComplete={handleAchievementModalClose}
      />

      {/* Success Modal (shows after achievements or immediately if no achievements) */}
      {showSuccess && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 text-center">
            {/* Success Animation */}
            <div className="mb-6">
              <div className={`w-20 h-20 ${isReviewQuestion ? 'bg-blue-100' : 'bg-green-100'} rounded-full flex items-center justify-center mx-auto mb-4`}>
                <div className={`text-4xl ${isReviewQuestion ? '' : 'animate-bounce'}`}>
                  {isReviewQuestion ? '📚' : '🎉'}
                </div>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {isQuestComplete ? 'Quest Completed!' : isReviewQuestion ? 'Review Complete!' : 'Correct Answer!'}
              </h2>
              <p className="text-gray-600">
                {message || (isQuestComplete
                  ? 'Amazing work! You\'ve completed this quest.'
                  : 'Well done! Your solution is correct.'
                )}
              </p>
            </div>

            {/* Points Display */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-center space-x-2">
                <span className="text-2xl">💎</span>
                <div>
                  <div className="text-2xl font-bold text-blue-600">+{totalPointsEarned} XP</div>
                  <div className="text-sm text-gray-600">
                    {achievements?.totalAchievementPoints && achievements.totalAchievementPoints > 0
                      ? `${points} question + ${achievements.totalAchievementPoints} achievements`
                      : 'Points earned'
                    }
                  </div>
                </div>
              </div>
            </div>

            {/* Streak Information */}
            {achievements && (
              <div className="mb-6 space-y-2">
                {achievements.currentStreak > 0 && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                    <div className="flex items-center justify-center space-x-2">
                      <span className="text-lg">🔥</span>
                      <div className="text-sm">
                        <span className="font-semibold text-orange-700">
                          {achievements.currentStreak} correct in a row!
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {achievements.streakBroken && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-center justify-center space-x-2">
                      <span className="text-lg">💔</span>
                      <div className="text-sm text-red-700">
                        Streak broken, but don&apos;t give up!
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Achievement Summary */}
            {achievements?.newAchievements && achievements.newAchievements.length > 0 && (
              <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="text-lg font-semibold text-yellow-800 mb-2">
                  🎉 New Achievements Unlocked!
                </div>
                <div className="text-sm text-yellow-700">
                  You earned {achievements.newAchievements.length} achievement{achievements.newAchievements.length > 1 ? 's' : ''}
                  {' '}worth {achievements.totalAchievementPoints} bonus XP!
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={() => {
                  onClose()
                  nextAction()
                }}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                {isQuestComplete ? 'View All Quests' : 'Next Question'}
              </button>

              <button
                onClick={onClose}
                className="w-full text-gray-500 py-2 px-4 rounded-lg hover:text-gray-700 transition-colors"
              >
                Stay on this question
              </button>
            </div>

            {/* Auto-advance notice */}
            <p className="text-xs text-gray-400 mt-4">
              Automatically advancing in 3 seconds...
            </p>
          </div>
        </div>
      )}
    </>
  )
}