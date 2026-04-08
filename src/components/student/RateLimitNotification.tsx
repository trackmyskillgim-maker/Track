'use client'

import { useEffect, useState } from 'react'

interface RateLimitNotificationProps {
  remainingSubmissions: number
  maxSubmissions: number
  timeUntilResetSeconds: number
  onClose: () => void
}

export default function RateLimitNotification({
  remainingSubmissions,
  maxSubmissions,
  timeUntilResetSeconds,
  onClose
}: RateLimitNotificationProps) {
  const [timeLeft, setTimeLeft] = useState(timeUntilResetSeconds)
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    if (timeLeft <= 0) return

    const interval = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1))
    }, 1000)

    return () => clearInterval(interval)
  }, [timeLeft])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(onClose, 300) // Wait for animation to finish
  }

  if (remainingSubmissions > 0) {
    // Warning notification (not at limit yet)
    return (
      <div className={`fixed top-20 right-4 z-50 transition-all duration-300 ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}>
        <div className="bg-yellow-50 dark:bg-yellow-900/30 border-l-4 border-yellow-400 p-4 rounded-lg shadow-lg max-w-sm animate-slide-in-right">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Submission Limit Warning
              </h3>
              <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                <p className="mb-2">
                  You have <span className="font-bold text-yellow-900 dark:text-yellow-100">{remainingSubmissions}</span> successful
                  {remainingSubmissions === 1 ? ' submission' : ' submissions'} remaining this hour.
                </p>
                <div className="w-full bg-yellow-200 dark:bg-yellow-800 rounded-full h-2">
                  <div
                    className="bg-yellow-600 dark:bg-yellow-400 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${(remainingSubmissions / maxSubmissions) * 100}%` }}
                  />
                </div>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="ml-3 flex-shrink-0 text-yellow-400 hover:text-yellow-500"
            >
              <span className="sr-only">Close</span>
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Limit reached notification
  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-md mx-4 transform transition-all duration-300 ${isVisible ? 'scale-100' : 'scale-95'}`}>
        {/* Animated header */}
        <div className="bg-gradient-to-r from-red-500 to-orange-500 p-6 rounded-t-lg">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-white/20 rounded-full p-3 animate-bounce">
              <svg className="h-12 w-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white text-center">
            Submission Limit Reached!
          </h2>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="text-center mb-6">
            <p className="text-gray-700 dark:text-gray-300 text-lg mb-4">
              You've successfully submitted <span className="font-bold text-red-600 dark:text-red-400">{maxSubmissions}</span> questions
              in the last hour.
            </p>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              This limit helps ensure focused learning and prevents rushing through questions.
            </p>

            {/* Countdown timer */}
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Next submission available in:
              </p>
              <div className="flex items-center justify-center space-x-2">
                <svg className="h-5 w-5 text-gray-500 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-3xl font-bold text-gray-900 dark:text-white font-mono">
                  {formatTime(timeLeft)}
                </span>
              </div>
            </div>

            {/* Suggestions */}
            <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
              <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
                💡 What you can do now:
              </h4>
              <ul className="text-sm text-blue-800 dark:text-blue-300 text-left space-y-1">
                <li>• Review your previous solutions</li>
                <li>• Practice with test cases (unlimited)</li>
                <li>• Read question hints and descriptions</li>
                <li>• Take a break and come back refreshed</li>
              </ul>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col space-y-2">
            <button
              onClick={handleClose}
              className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              I Understand
            </button>
            <p className="text-xs text-center text-gray-500 dark:text-gray-400">
              You can still run test cases without limit
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
