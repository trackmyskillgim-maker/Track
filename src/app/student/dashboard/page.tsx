'use client'

import { useStudentDashboard } from '@/lib/hooks/useStudentDashboard'

// Declare components at module scope
let StudentHeader: any
let ProgressCard: any
let StatsGrid: any
let RecentActivity: any
let QuickActions: any

try {
  StudentHeader = require('@/components/student/StudentHeader').default
  ProgressCard = require('@/components/student/ProgressCard').default
  StatsGrid = require('@/components/student/StatsGrid').default
  RecentActivity = require('@/components/student/RecentActivity').default
  QuickActions = require('@/components/student/QuickActions').default
} catch {
  throw new Error('Failed to import components')
}

export default function StudentDashboard() {
  const { data, isLoading, isError } = useStudentDashboard()

  // Only show loading if we have no data at all (first load)
  if (isLoading && !data) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">❌</div>
          <p className="text-gray-600 dark:text-gray-300">{isError?.message || 'Failed to load dashboard'}</p>
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <StudentHeader title="Dashboard" />

      {/* Dashboard Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Progress Overview */}
          <ProgressCard user={data.user} />

          {/* Stats Grid */}
          <StatsGrid stats={data.stats} />

          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Activity */}
            <RecentActivity activities={data.recentActivity} />

            {/* Quick Actions */}
            <QuickActions stats={data.stats} />
          </div>
        </div>
      </div>
    </div>
  )
}