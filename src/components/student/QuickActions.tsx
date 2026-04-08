'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'

interface QuickActionsProps {
  stats: {
    completedQuests: number
    totalQuests: number
  }
}

interface ContinueData {
  questId?: string
  questionId?: string
  questTitle?: string
  url: string
  allCompleted?: boolean
  message?: string
}

export default function QuickActions({ stats: _stats }: QuickActionsProps) {
  const [continueData, setContinueData] = useState<ContinueData | null>(null)
  const [isCR, setIsCR] = useState(false)

  useEffect(() => {
    // Fetch smart continue learning data
    fetch('/api/student/continue')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setContinueData(data.data)
        }
      })
      .catch(console.error)
    
    // Check if user is a CR
    fetch('/api/student/is-cr')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setIsCR(data.isCR === true)
        }
      })
      .catch(console.error)
  }, [])
  
  const baseActions = [
    {
      title: 'Browse Quests',
      description: 'Explore all available coding challenges',
      icon: '🗺️',
      href: '/student/quests',
      color: 'bg-blue-500 hover:bg-blue-600',
      disabled: false
    },
    {
      title: 'Continue Learning',
      description: continueData?.allCompleted ?
        continueData.message || 'All quests completed!' :
        continueData?.questTitle ?
          `Continue: ${continueData.questTitle}` :
          'Resume your current quest',
      icon: '⚔️',
      href: continueData?.url || '/student/quests',
      color: 'bg-green-500 hover:bg-green-600',
      disabled: continueData?.allCompleted || false
    },
    {
      title: 'View Achievements',
      description: 'Check your badges and milestones',
      icon: '🏅',
      href: '/student/achievements',
      color: 'bg-purple-500 hover:bg-purple-600',
      disabled: false
    },
    {
      title: 'Leaderboard',
      description: 'See how you rank against peers',
      icon: '🥇',
      href: '/student/leaderboard',
      color: 'bg-yellow-500 hover:bg-yellow-600',
      disabled: false
    }
  ]

  const crAction = {
    title: 'CR Panel',
    description: 'Manage class participation queue',
    icon: '👨‍🏫',
    href: '/class-participation/cr',
    color: 'bg-indigo-500 hover:bg-indigo-600',
    disabled: false
  }

  const actions = isCR ? [...baseActions, crAction] : baseActions

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
        <span className="mr-2">🚀</span>
        Quick Actions
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {actions.map((action, index) => (
          <Link
            key={index}
            href={action.href}
            className={`${action.color} ${action.disabled ? 'opacity-50 cursor-not-allowed' : ''} text-white rounded-lg p-4 block transition-colors duration-200`}
            onClick={action.disabled ? (e) => e.preventDefault() : undefined}
          >
            <div className="flex items-center space-x-3">
              <div className="text-2xl">{action.icon}</div>
              <div>
                <div className="font-semibold">{action.title}</div>
                <div className="text-sm opacity-90">{action.description}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
