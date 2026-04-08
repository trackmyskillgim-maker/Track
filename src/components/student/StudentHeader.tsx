'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { mutate } from 'swr'
import { clearAllSWRCache } from '@/lib/providers/SWRProvider'

interface StudentHeaderProps {
  title: string
  showBackButton?: boolean
  backUrl?: string
  backText?: string
}

export default function StudentHeader({
  title,
  showBackButton = false,
  backUrl = '/student/dashboard',
  backText = 'Back to Dashboard'
}: StudentHeaderProps) {
  const [isAdmin, setIsAdmin] = useState(false)
  const [isCR, setIsCR] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Check if current user is admin viewing as student
    const checkUserRole = async () => {
      try {
        const response = await fetch('/api/auth/session')
        if (response.ok) {
          const data = await response.json()
          setIsAdmin(data.user?.role === 'admin')
        }
      } catch (error) {
        console.error('Failed to check user role:', error)
      }
    }
    
    // Check if current user is a CR
    const checkCRStatus = async () => {
      try {
        const response = await fetch('/api/student/is-cr')
        if (response.ok) {
          const data = await response.json()
          setIsCR(data.isCR === true)
        }
      } catch (error) {
        console.error('Failed to check CR status:', error)
      }
    }
    
    checkUserRole()
    checkCRStatus()
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
              href="/student/dashboard"
              className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-blue-600 via-teal-500 to-green-500 bg-clip-text text-transparent transition-colors"
            >
              TrackMySkill
            </Link>
            {showBackButton && (
              <>
                <span className="hidden sm:inline text-gray-400">|</span>
                <Link
                  href={backUrl}
                  className="hidden sm:flex text-blue-600 hover:text-blue-800 items-center space-x-1"
                >
                  <span>←</span>
                  <span>{backText}</span>
                </Link>
              </>
            )}
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
              className="lg:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100"
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
            <nav className="hidden lg:flex items-center space-x-3">
              <Link
                href="/student/dashboard"
                className="text-gray-600 hover:text-gray-900 px-3 py-1 rounded transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/student/quests"
                className="text-gray-600 hover:text-gray-900 px-3 py-1 rounded transition-colors"
              >
                Quests
              </Link>
              <Link
                href="/student/achievements"
                className="text-gray-600 hover:text-gray-900 px-3 py-1 rounded transition-colors"
              >
                Achievements
              </Link>
              <Link
                href="/student/leaderboard"
                className="text-gray-600 hover:text-gray-900 px-3 py-1 rounded transition-colors"
              >
                Leaderboard
              </Link>
              <Link
                href="/class-participation/student"
                className="text-gray-600 hover:text-gray-900 px-3 py-1 rounded transition-colors"
              >
                Class Participation
              </Link>
              {isCR && (
                <Link
                  href="/class-participation/cr"
                  className="text-purple-600 hover:text-purple-800 px-3 py-1 rounded border border-purple-300 hover:border-purple-400 transition-colors font-medium"
                >
                  CR Panel
                </Link>
              )}
            </nav>

            <div className="border-l border-gray-300 pl-2 sm:pl-4 flex items-center space-x-2 sm:space-x-3">
              {isAdmin && (
                <Link
                  href="/admin/dashboard"
                  className="hidden sm:inline text-blue-600 hover:text-blue-800 px-3 py-1 rounded border border-blue-300 hover:border-blue-400 transition-colors text-sm"
                >
                  Back to Admin
                </Link>
              )}
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
          <div className="lg:hidden pb-4">
            <nav className="flex flex-col space-y-2">
              <Link
                href="/student/dashboard"
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-3 py-2 rounded transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Dashboard
              </Link>
              <Link
                href="/student/quests"
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-3 py-2 rounded transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Quests
              </Link>
              <Link
                href="/student/achievements"
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-3 py-2 rounded transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Achievements
              </Link>
              <Link
                href="/student/leaderboard"
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-3 py-2 rounded transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Leaderboard
              </Link>
              <Link
                href="/class-participation/student"
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-3 py-2 rounded transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Class Participation
              </Link>
              {isCR && (
                <Link
                  href="/class-participation/cr"
                  className="text-purple-600 hover:text-purple-800 hover:bg-purple-50 px-3 py-2 rounded border border-purple-300 transition-colors font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  CR Panel
                </Link>
              )}
              {isAdmin && (
                <Link
                  href="/admin/dashboard"
                  className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-3 py-2 rounded border border-blue-300 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Back to Admin
                </Link>
              )}
            </nav>
          </div>
        )}
      </div>
    </div>
  )
}
