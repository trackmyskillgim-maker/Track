'use client'

interface StatsGridProps {
  stats: {
    total_quests?: number
    completed_quests?: number
    completed_questions?: number
    achievements?: number
  } | null
}

export default function StatsGrid({ stats }: StatsGridProps) {
  // Handle null stats or missing properties with safe defaults
  const safeStats = {
    total_quests: stats?.total_quests ?? 0,
    completed_quests: stats?.completed_quests ?? 0,
    completed_questions: stats?.completed_questions ?? 0,
    achievements: stats?.achievements ?? 0
  }

  const statItems = [
    {
      title: 'Quests Completed',
      value: `${safeStats.completed_quests}/${safeStats.total_quests}`,
      icon: '🏆',
      color: 'border-yellow-500 text-yellow-600'
    },
    {
      title: 'Questions Solved',
      value: safeStats.completed_questions,
      icon: '💡',
      color: 'border-green-500 text-green-600'
    },
    {
      title: 'Achievements',
      value: safeStats.achievements,
      icon: '🏅',
      color: 'border-purple-500 text-purple-600'
    },
    {
      title: 'Completion Rate',
      value: safeStats.total_quests > 0 ? `${Math.round((safeStats.completed_quests / safeStats.total_quests) * 100)}%` : '0%',
      icon: '📊',
      color: 'border-blue-500 text-blue-600'
    }
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {statItems.map((item, index) => (
        <div key={index} className={`bg-white rounded-lg shadow-md p-4 border-l-4 ${item.color}`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-gray-800">{item.value}</div>
              <div className="text-sm text-gray-600">{item.title}</div>
            </div>
            <div className="text-3xl">{item.icon}</div>
          </div>
        </div>
      ))}
    </div>
  )
}