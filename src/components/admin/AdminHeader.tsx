'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { mutate } from 'swr'
import { clearAllSWRCache } from '@/lib/providers/SWRProvider'

interface AdminHeaderProps {
  title: string
}

interface UserInfo {
  username: string
  is_super_admin: boolean
}

export default function AdminHeader({ title }: AdminHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const router = useRouter()

  useEffect(() => {
    // Fetch user info from session
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setUserInfo({
            username: data.user.username || '',
            is_super_admin: data.user.is_super_admin || false
          })
        }
      })
      .catch(err => console.error('Failed to fetch user info:', err))
  }, [])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      // Clear all SWR cache to prevent showing previous user's data
      await mutate(() => true, undefined, { revalidate: false })
      // Also manually clear the global cache Map
      clearAllSWRCache()
      // Use window.location for full page reload to ensure clean slate
      window.location.href = '/'
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  return (
    <div className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center space-x-2 sm:space-x-4">
            <Link
              href="/admin/dashboard"
              className="text-lg sm:text-2xl font-bold transition-colors"
            >
              <span className="bg-gradient-to-r from-blue-600 via-teal-500 to-green-500 bg-clip-text text-transparent">
                TrackMySkill
              </span>
              <span className="text-gray-600 ml-2">
                {userInfo?.is_super_admin
                  ? 'Admin'
                  : userInfo?.username
                    ? `Prof. ${userInfo.username}`
                    : 'Admin'}
              </span>
            </Link>
            {title && title !== 'Dashboard' && (
              <>
                <span className="hidden lg:inline text-gray-400">|</span>
                <h1 className="hidden lg:block text-xl font-semibold text-gray-700">{title}</h1>
              </>
            )}
          </div>

          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="xl:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>

            {/* Navigation Links */}
            <nav className="hidden xl:flex items-center space-x-3">
              <Link
                href="/admin/dashboard"
                className="text-gray-600 hover:text-gray-900 px-3 py-1 rounded transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/admin/quests"
                className="text-gray-600 hover:text-gray-900 px-3 py-1 rounded transition-colors"
              >
                Quests
              </Link>
              <Link
                href="/admin/students"
                className="text-gray-600 hover:text-gray-900 px-3 py-1 rounded transition-colors"
              >
                Students
              </Link>
              <Link
                href="/admin/subjects"
                className="text-gray-600 hover:text-gray-900 px-3 py-1 rounded transition-colors"
              >
                Subjects
              </Link>
              <Link
                href="/admin/leaderboard"
                className="text-gray-600 hover:text-gray-900 px-3 py-1 rounded transition-colors"
              >
                Leaderboard
              </Link>
              <Link
                href="/admin/analytics"
                className="text-gray-600 hover:text-gray-900 px-3 py-1 rounded transition-colors"
              >
                Analytics
              </Link>
              <Link
                href="/class-participation/admin"
                className="text-gray-600 hover:text-gray-900 px-3 py-1 rounded transition-colors"
              >
                Class Participation
              </Link>
              {userInfo?.is_super_admin && (
                <Link
                  href="/admin/create-admin"
                  className="text-purple-600 hover:text-purple-700 px-3 py-1 rounded border border-purple-300 hover:border-purple-400 transition-colors"
                >
                  Create Admin
                </Link>
              )}
            </nav>

            <div className="border-l border-gray-300 pl-2 sm:pl-4 flex items-center space-x-2 sm:space-x-3">
              <Link
                href="/student/dashboard"
                className="hidden sm:inline text-blue-600 hover:text-blue-800 px-3 py-1 rounded border border-blue-300 hover:border-blue-400 transition-colors text-sm"
              >
                View as Student
              </Link>
              <button
                onClick={handleLogout}
                className="text-gray-500 hover:text-gray-700 px-2 sm:px-3 py-1 rounded border border-gray-300 hover:border-gray-400 transition-colors text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="xl:hidden pb-4">
            <nav className="flex flex-col space-y-2">
              <Link
                href="/admin/dashboard"
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-3 py-2 rounded transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Dashboard
              </Link>
              <Link
                href="/admin/quests"
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-3 py-2 rounded transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Quests
              </Link>
              <Link
                href="/admin/students"
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-3 py-2 rounded transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Students
              </Link>
              <Link
                href="/admin/subjects"
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-3 py-2 rounded transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Subjects
              </Link>
              <Link
                href="/admin/leaderboard"
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-3 py-2 rounded transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Leaderboard
              </Link>
              <Link
                href="/admin/analytics"
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-3 py-2 rounded transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Analytics
              </Link>
              <Link
                href="/class-participation/admin"
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-3 py-2 rounded transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Class Participation
              </Link>
              <Link
                href="/student/dashboard"
                className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-3 py-2 rounded border border-blue-300 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                View as Student
              </Link>
              {userInfo?.is_super_admin && (
                <Link
                  href="/admin/create-admin"
                  className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 px-3 py-2 rounded border border-purple-300 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Create Admin
                </Link>
              )}
            </nav>
          </div>
        )}
      </div>
    </div>
  )
}