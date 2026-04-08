'use client'

import { useEffect, useState } from 'react'

export interface UnlockedAchievement {
  id: string
  code: string
  name: string
  description: string
  icon: string
  points: number
  badge_tier: string
  category: string
}

interface AchievementUnlockModalProps {
  isOpen: boolean
  onClose: () => void
  achievements: UnlockedAchievement[]
  onCelebrationComplete?: () => void
}

export default function AchievementUnlockModal({
  isOpen,
  onClose,
  achievements,
  onCelebrationComplete
}: AchievementUnlockModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showConfetti, setShowConfetti] = useState(false)

  useEffect(() => {
    if (isOpen && achievements.length > 0) {
      setCurrentIndex(0)
      setShowConfetti(true)

      // Create confetti effect
      createConfetti()
    }
  }, [isOpen, achievements])

  const createConfetti = () => {
    const colors = ['#FFD700', '#FF6347', '#32CD32', '#1E90FF', '#FF69B4']
    const container = document.body

    for (let i = 0; i < 50; i++) {
      const confetti = document.createElement('div')
      confetti.className = 'confetti-piece'
      confetti.style.cssText = `
        position: fixed;
        width: 10px;
        height: 10px;
        background: ${colors[Math.floor(Math.random() * colors.length)]};
        left: ${Math.random() * 100}vw;
        top: -10px;
        z-index: 1000;
        border-radius: 50%;
        animation: confetti-fall 3s linear forwards;
        pointer-events: none;
      `

      container.appendChild(confetti)

      // Remove confetti after animation
      setTimeout(() => {
        if (confetti.parentNode) {
          confetti.parentNode.removeChild(confetti)
        }
      }, 3000)
    }
  }

  const handleNext = () => {
    if (currentIndex < achievements.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      handleClose()
    }
  }

  const handleClose = () => {
    setShowConfetti(false)
    onClose()
    if (onCelebrationComplete) {
      onCelebrationComplete()
    }
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'bronze': return 'from-amber-500 to-yellow-600'
      case 'silver': return 'from-gray-400 to-gray-600'
      case 'gold': return 'from-yellow-500 to-yellow-600'
      case 'platinum': return 'from-purple-500 to-purple-600'
      default: return 'from-gray-400 to-gray-600'
    }
  }

  const getTierBorderColor = (tier: string) => {
    switch (tier) {
      case 'bronze': return 'border-amber-500'
      case 'silver': return 'border-gray-500'
      case 'gold': return 'border-yellow-500'
      case 'platinum': return 'border-purple-500'
      default: return 'border-gray-400'
    }
  }

  const getTierGlow = (tier: string) => {
    switch (tier) {
      case 'bronze': return 'shadow-amber-500/50'
      case 'silver': return 'shadow-gray-500/50'
      case 'gold': return 'shadow-yellow-500/50'
      case 'platinum': return 'shadow-purple-500/50'
      default: return 'shadow-gray-500/50'
    }
  }

  if (!isOpen || achievements.length === 0) return null

  const currentAchievement = achievements[currentIndex]
  const totalPoints = achievements.reduce((sum, ach) => sum + ach.points, 0)

  return (
    <>
      {/* Confetti CSS */}
      <style jsx global>{`
        @keyframes confetti-fall {
          to {
            transform: translateY(100vh) rotate(360deg);
          }
        }

        @keyframes bounce-in {
          0% {
            transform: scale(0.3);
            opacity: 0;
          }
          50% {
            transform: scale(1.05);
          }
          70% {
            transform: scale(0.9);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes glow-pulse {
          0%, 100% {
            box-shadow: 0 0 20px rgba(255, 215, 0, 0.6);
          }
          50% {
            box-shadow: 0 0 40px rgba(255, 215, 0, 0.8);
          }
        }

        .achievement-modal-backdrop {
          backdrop-filter: blur(4px);
          background: rgba(0, 0, 0, 0.7);
        }

        .achievement-card {
          animation: bounce-in 0.6s ease-out;
        }

        .achievement-glow {
          animation: glow-pulse 2s ease-in-out infinite;
        }
      `}</style>

      {/* Modal Backdrop */}
      <div className="fixed inset-0 achievement-modal-backdrop flex items-center justify-center z-50">
        <div className={`bg-white rounded-2xl p-8 max-w-lg w-full mx-4 text-center achievement-card border-4 ${getTierBorderColor(currentAchievement.badge_tier)} ${getTierGlow(currentAchievement.badge_tier)} achievement-glow`}>

          {/* Header */}
          <div className="mb-6">
            <div className="text-6xl mb-4 animate-bounce">🎉</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Achievement Unlocked!
            </h1>
            <p className="text-gray-600">
              {achievements.length > 1
                ? `${currentIndex + 1} of ${achievements.length} achievements`
                : 'You earned a new badge!'
              }
            </p>
          </div>

          {/* Achievement Badge */}
          <div className={`mb-6 mx-auto w-32 h-32 rounded-full bg-gradient-to-br ${getTierColor(currentAchievement.badge_tier)} flex items-center justify-center text-6xl border-4 ${getTierBorderColor(currentAchievement.badge_tier)} shadow-2xl`}>
            {currentAchievement.icon}
          </div>

          {/* Achievement Details */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {currentAchievement.name}
            </h2>
            <p className="text-gray-600 mb-4">
              {currentAchievement.description}
            </p>

            {/* Badge Tier */}
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className={`px-3 py-1 rounded-full text-sm font-medium text-white bg-gradient-to-r ${getTierColor(currentAchievement.badge_tier)}`}>
                {currentAchievement.badge_tier.charAt(0).toUpperCase() + currentAchievement.badge_tier.slice(1)} Badge
              </div>
            </div>

            {/* Points */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-center space-x-2">
                <span className="text-3xl">💎</span>
                <div>
                  <div className="text-2xl font-bold text-blue-600">+{currentAchievement.points} XP</div>
                  <div className="text-sm text-gray-600">Achievement Points</div>
                </div>
              </div>
            </div>
          </div>

          {/* Total Points (if multiple achievements) */}
          {achievements.length > 1 && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="text-lg font-semibold text-yellow-800">
                Total: +{totalPoints} XP from {achievements.length} achievements!
              </div>
            </div>
          )}

          {/* Progress Indicator */}
          {achievements.length > 1 && (
            <div className="mb-6">
              <div className="flex space-x-2 justify-center">
                {achievements.map((_, index) => (
                  <div
                    key={index}
                    className={`w-3 h-3 rounded-full transition-colors ${
                      index === currentIndex
                        ? 'bg-blue-500'
                        : index < currentIndex
                          ? 'bg-green-500'
                          : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleNext}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-6 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all transform hover:scale-105 shadow-lg"
            >
              {currentIndex < achievements.length - 1 ? 'Next Achievement' : 'Awesome!'}
            </button>

            {achievements.length > 1 && (
              <button
                onClick={handleClose}
                className="w-full text-gray-500 py-2 px-4 rounded-lg hover:text-gray-700 transition-colors"
              >
                Skip to end
              </button>
            )}
          </div>

          {/* Category Tag */}
          <div className="mt-4 text-xs text-gray-400">
            {currentAchievement.category?.replace('_', ' ')} achievement
          </div>
        </div>
      </div>
    </>
  )
}