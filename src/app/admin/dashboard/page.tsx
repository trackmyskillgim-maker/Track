'use client'

import { useRouter } from 'next/navigation'
import { useAdminAnalytics } from '@/lib/hooks/useAdminAnalytics'
import AdminHeader from '@/components/admin/AdminHeader'
import StatsOverview from '@/components/admin/StatsOverview'
import RecentActivityPanel from '@/components/admin/RecentActivityPanel'
import TopPerformersPanel from '@/components/admin/TopPerformersPanel'
import InfoTooltip from '@/components/common/InfoTooltip'

export default function AdminDashboard() {
  const router = useRouter()
  const { data, isLoading, isError } = useAdminAnalytics()

  // Only show loading if we have no data at all (first load)
  if (isLoading && !data) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <AdminHeader title="Dashboard" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-300">Loading dashboard...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <AdminHeader title="Dashboard" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AdminHeader title="Dashboard" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Stats Overview */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Platform Overview</h2>
            <StatsOverview stats={data.overview} />
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Activity */}
            <RecentActivityPanel activities={data.recentActivity} />

            {/* Top Performers */}
            <TopPerformersPanel performers={data.topPerformers} />
          </div>

          {/* Quest Analytics */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center">
              <span className="mr-2">📊</span>
              Quest Performance Analytics
            </h3>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Quest Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Questions
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Students Attempted
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      <span className="flex items-center">
                        Completion Rate
                        <InfoTooltip
                          tooltip="Shows what % of all students in the class completed this quest (answered all questions correctly)"
                          position="bottom"
                        />
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {(data.questAnalytics || []).map((quest: any) => (
                    <tr key={quest.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {quest.title}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-gray-300">
                          {quest.total_questions || quest.totalQuestions}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-gray-300">
                          {quest.students_attempted || quest.studentsAttempted}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex flex-col">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {Math.round(quest.true_completion_rate || quest.completion_rate || quest.completionRate || 0)}%
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {quest.students_completed_quest || 0} of {quest.total_students_in_subject || data.overview?.totalStudents || data.overview?.total_students || 0} students
                            </div>
                          </div>
                          <div className="ml-4 flex-1 max-w-xs">
                            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${quest.true_completion_rate || quest.completion_rate || quest.completionRate || 0}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center">
              <span className="mr-2">⚡</span>
              Quick Actions
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <button
                onClick={() => router.push('/admin/quests')}
                className="p-4 border-2 border-blue-200 dark:border-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900 transition-colors text-left"
              >
                <div className="text-2xl mb-2">📝</div>
                <div className="font-medium text-gray-900 dark:text-white">Manage Quests</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Create and edit quests and questions</div>
              </button>

              <button
                onClick={() => router.push('/admin/students')}
                className="p-4 border-2 border-green-200 dark:border-green-700 rounded-lg hover:bg-green-50 dark:hover:bg-green-900 transition-colors text-left"
              >
                <div className="text-2xl mb-2">👥</div>
                <div className="font-medium text-gray-900 dark:text-white">Student Management</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Monitor student progress and performance</div>
              </button>

              <button
                onClick={() => router.push('/admin/analytics')}
                className="p-4 border-2 border-purple-200 dark:border-purple-700 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900 transition-colors text-left"
              >
                <div className="text-2xl mb-2">📈</div>
                <div className="font-medium text-gray-900 dark:text-white">Detailed Analytics</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">View comprehensive reports and insights</div>
              </button>

              <button
                onClick={() => router.push('/student/dashboard')}
                className="p-4 border-2 border-orange-200 dark:border-orange-700 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900 transition-colors text-left"
              >
                <div className="text-2xl mb-2">👁️</div>
                <div className="font-medium text-gray-900 dark:text-white">View as Student</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Experience the platform from student perspective</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}