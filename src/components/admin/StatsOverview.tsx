'use client'

import InfoTooltip from '@/components/common/InfoTooltip'

interface StatsOverviewProps {
  stats: {
    totalStudents: number
    totalQuests: number
    totalQuestions: number
    totalSubmissions: number
    averageCompletionRate: number
  }
}

export default function StatsOverview({ stats }: StatsOverviewProps) {
  // Handle undefined stats
  const safeStats = stats || {
    totalStudents: 0,
    totalQuests: 0,
    totalQuestions: 0,
    totalSubmissions: 0,
    averageCompletionRate: 0
  }

  const statCards = [
    {
      title: 'Total Students',
      value: safeStats.totalStudents || 0,
      icon: '👥',
      color: 'bg-blue-50 dark:bg-blue-900 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300',
      tooltip: null
    },
    {
      title: 'Active Quests',
      value: safeStats.totalQuests || 0,
      icon: '🏆',
      color: 'bg-green-50 dark:bg-green-900 border-green-200 dark:border-green-700 text-green-700 dark:text-green-300',
      tooltip: null
    },
    {
      title: 'Total Questions',
      value: safeStats.totalQuestions || 0,
      icon: '❓',
      color: 'bg-purple-50 dark:bg-purple-900 border-purple-200 dark:border-purple-700 text-purple-700 dark:text-purple-300',
      tooltip: null
    },
    {
      title: 'Submissions',
      value: safeStats.totalSubmissions || 0,
      icon: '📝',
      color: 'bg-orange-50 dark:bg-orange-900 border-orange-200 dark:border-orange-700 text-orange-700 dark:text-orange-300',
      tooltip: null
    },
    {
      title: 'Avg Completion',
      value: `${safeStats.averageCompletionRate || 0}%`,
      icon: '📊',
      color: 'bg-indigo-50 dark:bg-indigo-900 border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300',
      tooltip: `On average, ${safeStats.averageCompletionRate || 0}% of students complete each quest`
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {statCards.map((stat, index) => (
        <div
          key={index}
          className={`p-6 rounded-lg border-2 ${stat.color}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium opacity-75 flex items-center">
                {stat.title}
                {stat.tooltip && <InfoTooltip tooltip={stat.tooltip} />}
              </p>
              <p className="text-2xl font-bold mt-1">{stat.value}</p>
            </div>
            <div className="text-2xl">{stat.icon}</div>
          </div>
        </div>
      ))}
    </div>
  )
}