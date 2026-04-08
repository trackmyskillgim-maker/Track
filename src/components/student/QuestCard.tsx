'use client'

import Link from 'next/link'

interface QuestCardProps {
  quest: {
    id: string
    title: string
    description: string
    difficulty: string
    estimatedTime: string
    totalQuestions: number
    completedQuestions: number
    maxPossiblePoints: number
    earnedPoints: number
    completionPercentage: number
    status: 'locked' | 'available' | 'in_progress' | 'completed'
    isUnlocked: boolean
    lockReason?: string
    orderIndex: number
    isAdminUnlocked?: boolean
  }
  isRecommended?: boolean
}

export default function QuestCard({ quest, isRecommended = false }: QuestCardProps) {
  const getStatusIcon = () => {
    switch (quest.status) {
      case 'locked': return '🔒'
      case 'available': return '📖'
      case 'in_progress': return '⚔️'
      case 'completed': return '👑'
      default: return '📖'
    }
  }

  const getStatusColor = () => {
    if (isRecommended) {
      return 'bg-gradient-to-br from-purple-50 to-blue-50 border-purple-400 shadow-lg ring-2 ring-purple-200 hover:shadow-xl'
    }
    switch (quest.status) {
      case 'locked': return 'bg-gray-100 border-gray-300'
      case 'available': return 'bg-blue-50 border-blue-300 hover:bg-blue-100'
      case 'in_progress': return 'bg-yellow-50 border-yellow-300 hover:bg-yellow-100'
      case 'completed': return 'bg-green-50 border-green-300'
      default: return 'bg-gray-100 border-gray-300'
    }
  }

  const getDifficultyColor = () => {
    switch (quest.difficulty.toLowerCase()) {
      case 'beginner': return 'bg-green-100 text-green-800'
      case 'intermediate': return 'bg-yellow-100 text-yellow-800'
      case 'advanced': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = () => {
    switch (quest.status) {
      case 'locked': return 'Locked'
      case 'available': return 'Start Quest'
      case 'in_progress': return 'Continue'
      case 'completed': return 'Completed'
      default: return 'Start Quest'
    }
  }

  const CardContent = () => (
    <div className={`relative rounded-lg border-2 p-6 transition-all duration-200 ${getStatusColor()} ${quest.status === 'locked' ? 'opacity-60' : ''} ${isRecommended ? 'animate-pulse' : ''}`}>
      {/* Recommended Badge */}
      {isRecommended && (
        <div className="absolute -top-2 -right-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg animate-bounce">
          ⭐ NEXT
        </div>
      )}

      {/* Admin Unlocked Badge */}
      {quest.isAdminUnlocked && (
        <div className="absolute -top-2 -left-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center space-x-1">
          <span>🔓</span>
          <span>Unlocked by Admin</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-4 relative">
        <div className="flex items-center space-x-3">
          <div className="text-3xl">{getStatusIcon()}</div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">{quest.title}</h3>
            <div className="flex items-center space-x-2 mt-1">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor()}`}>
                {quest.difficulty}
              </span>
              <span className="text-sm text-gray-500">
                {quest.estimatedTime}
              </span>
            </div>
          </div>
        </div>
        {quest.status === 'completed' && (
          <div className="text-green-600 font-semibold">
            {quest.earnedPoints}/{quest.maxPossiblePoints} XP
          </div>
        )}
      </div>

      {/* Description */}
      <p className="text-gray-600 mb-4 line-clamp-2">{quest.description}</p>

      {/* Lock Reason */}
      {quest.status === 'locked' && quest.lockReason && (
        <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <span className="text-orange-500">🔒</span>
            <p className="text-sm text-orange-700 font-medium">{quest.lockReason}</p>
          </div>
        </div>
      )}

      {/* Progress */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>Progress</span>
          <span>{quest.completedQuestions}/{quest.totalQuestions} questions</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              quest.status === 'completed' ? 'bg-green-500' :
              quest.status === 'in_progress' ? 'bg-yellow-500' : 'bg-gray-300'
            }`}
            style={{ width: `${quest.completionPercentage}%` }}
          ></div>
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {quest.completionPercentage}% complete
        </div>
      </div>

      {/* Action Button */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-500">
          {quest.maxPossiblePoints} XP total
        </div>
        <div className={`px-4 py-2 rounded font-medium text-sm ${
          quest.status === 'locked' ? 'bg-gray-300 text-gray-600 cursor-not-allowed' :
          quest.status === 'completed' ? 'bg-green-600 text-white' :
          'bg-blue-600 text-white hover:bg-blue-700'
        }`}>
          {getStatusText()}
        </div>
      </div>
    </div>
  )

  // Wrap in Link if unlocked, otherwise just return the card
  if (quest.isUnlocked && quest.status !== 'locked') {
    return (
      <Link href={`/student/quest/${quest.id}`} className="block">
        <CardContent />
      </Link>
    )
  }

  return <CardContent />
}