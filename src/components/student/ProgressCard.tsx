'use client'

interface ProgressCardProps {
  user: {
    username?: string
    total_points?: number
    current_level?: number
    points_to_next_level?: number
    level_progress?: number
    current_streak?: number
    max_streak?: number
  } | null
}

export default function ProgressCard({ user }: ProgressCardProps) {
  // Handle null user or missing properties with safe defaults
  const safeUser = {
    username: user?.username ?? 'Student',
    total_points: user?.total_points ?? 0,
    current_level: user?.current_level ?? 1,
    points_to_next_level: user?.points_to_next_level ?? 100,
    level_progress: user?.level_progress ?? 0,
    current_streak: user?.current_streak ?? 0,
    max_streak: user?.max_streak ?? 0
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-800">Welcome back, {safeUser.username}! 👋</h3>
          <p className="text-gray-600">Level {safeUser.current_level} Python Adventurer</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-blue-600">{safeUser.total_points}</div>
          <div className="text-sm text-gray-500">Total XP</div>
        </div>
      </div>

      {/* XP Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>Level {safeUser.current_level}</span>
          <span>{safeUser.points_to_next_level} XP to next level</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-300"
            style={{ width: `${safeUser.level_progress}%` }}
          ></div>
        </div>
      </div>

      {/* Streak Counter */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <span className="text-2xl mr-2">🔥</span>
          <div>
            <div className="font-semibold text-gray-800">{safeUser.current_streak} day streak</div>
            <div className="text-sm text-gray-500">Best: {safeUser.max_streak} days</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-purple-600">Level {safeUser.current_level}</div>
          <div className="text-sm text-gray-500">Current Level</div>
        </div>
      </div>
    </div>
  )
}