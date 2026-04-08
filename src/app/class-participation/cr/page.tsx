'use client'

import { useRouter } from 'next/navigation'
import StudentHeader from '@/components/student/StudentHeader'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface Subject {
  id: string
  name: string
  subject_code: string | null
  batch: string
  course: string
  section: string | null
  is_elective: boolean
}

interface Session {
  id: string
  topic: string
  difficulty: string
  year: string
  course: string
  section: string
  subject_id: string | null
  status: string
  created_at: string
  ended_at: string | null
}

export default function CRDashboard() {
  const router = useRouter()

  const { data, isLoading, error } = useSWR(
    '/api/class-participation/cr/dashboard',
    fetcher,
    { refreshInterval: 5000 } // Refresh every 5 seconds
  )

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <StudentHeader title="CR Dashboard" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">Loading...</div>
        </div>
      </div>
    )
  }

  if (error || !data?.success) {
    return (
      <div className="min-h-screen bg-gray-50">
        <StudentHeader title="CR Dashboard" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {data?.message || 'Failed to load CR dashboard. You may not be a Course Representative.'}
          </div>
          <button
            onClick={() => router.push('/student/dashboard')}
            className="mt-4 text-blue-600 hover:text-blue-700"
          >
            ← Back to Student Dashboard
          </button>
        </div>
      </div>
    )
  }

  const subjects: Subject[] = data.data?.subjects || []
  const activeSessions: Session[] = data.data?.active_sessions || []
  const pastSessions: Session[] = data.data?.past_sessions || []

  return (
    <div className="min-h-screen bg-gray-50">
      <StudentHeader title="CR Dashboard" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Course Representative Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage class participation sessions for your subjects</p>
        </div>

        {/* Managed Subjects */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Your Subjects</h2>
          {subjects.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
              You are not assigned as CR for any subjects yet.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {subjects.map((subject) => (
                <div key={subject.id} className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
                  <h3 className="font-semibold text-gray-900">{subject.name}</h3>
                  {subject.subject_code && (
                    <p className="text-sm text-gray-500">{subject.subject_code}</p>
                  )}
                  <p className="text-sm text-gray-600 mt-1">
                    {subject.batch} • {subject.course}
                    {subject.is_elective ? ' • Elective' : ` • Section ${subject.section}`}
                  </p>
                  <div className="mt-2">
                    <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                      CR
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active Sessions */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Active Sessions
            {activeSessions.length > 0 && (
              <span className="ml-2 text-sm bg-green-100 text-green-800 px-2 py-1 rounded">
                {activeSessions.length}
              </span>
            )}
          </h2>
          {activeSessions.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
              No active sessions for your subjects right now.
            </div>
          ) : (
            <div className="space-y-4">
              {activeSessions.map((session) => (
                <div key={session.id} className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{session.topic}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {session.year} • {session.course} • Section {session.section}
                      </p>
                      <div className="flex gap-2 mt-2">
                        <span className={`px-2 py-1 text-xs rounded ${
                          session.difficulty === 'Easy'
                            ? 'bg-green-100 text-green-800'
                            : session.difficulty === 'Medium'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {session.difficulty}
                        </span>
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                          Active
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Started {new Date(session.created_at).toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => router.push(`/class-participation/cr/session/${session.id}`)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      Manage Session
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Past Sessions */}
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Recent Past Sessions</h2>
          {pastSessions.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
              No past sessions found.
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Topic
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Class
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Difficulty
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ended
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pastSessions.map((session) => (
                    <tr key={session.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {session.topic}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {session.course} - {session.section}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {session.difficulty}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {session.ended_at && new Date(session.ended_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <button
                          onClick={() => router.push(`/class-participation/cr/session/${session.id}`)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Help/Info */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">CR Responsibilities:</h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Manage student queue during active class participation sessions</li>
            <li>Approve or skip students waiting to attempt questions</li>
            <li>Monitor live submission results</li>
            <li>Assist the professor in smooth session management</li>
          </ul>
          <p className="text-xs text-blue-700 mt-2">
            <strong>Note:</strong> Only admins can create or end sessions. CRs can only manage them.
          </p>
        </div>
      </div>
    </div>
  )
}
