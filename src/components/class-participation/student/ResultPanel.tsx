'use client'

import { useEffect, useState } from 'react'

interface ResultPanelProps {
  result: {
    result: string
    feedback: string
    xpAwarded: number
  }
}

export default function ResultPanel({ result }: ResultPanelProps) {
  const [showAnimation, setShowAnimation] = useState(false)

  useEffect(() => {
    if (result.xpAwarded > 0) {
      setShowAnimation(true)
      setTimeout(() => setShowAnimation(false), 2000)
    }
  }, [result.xpAwarded])

  const isPassed = result.result === 'pass'
  const isFailed = result.result === 'fail'
  const isPending = result.result === 'evaluation_pending' || result.result === 'eval_pending'

  return (
    <div className={`rounded-lg shadow p-8 text-center ${
      isPassed ? 'bg-green-50 dark:bg-green-900/20 border-2 border-green-500' :
      isPending ? 'bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-500' :
      'bg-red-50 dark:bg-red-900/20 border-2 border-red-500'
    }`}>
      {/* Result Icon */}
      <div className="text-6xl mb-4">
        {isPassed ? '🎉' : isPending ? '⏳' : '❌'}
      </div>

      {/* Result Title */}
      <h2 className={`text-3xl font-bold mb-3 ${
        isPassed ? 'text-green-700 dark:text-green-300' :
        isPending ? 'text-yellow-700 dark:text-yellow-300' :
        'text-red-700 dark:text-red-300'
      }`}>
        {isPassed ? 'PASSED!' : isPending ? 'Awaiting Evaluation' : 'Not Quite...'}
      </h2>

      {/* Feedback - Only show if there's actual feedback */}
      {result.feedback && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-6">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            {isPassed ? 'Professor Feedback:' : isFailed ? 'Professor Feedback:' : 'AI Feedback:'}
          </p>
          <p className="text-gray-800 dark:text-gray-200">
            {result.feedback}
          </p>
        </div>
      )}

      {/* XP Award */}
      {result.xpAwarded > 0 && (
        <div className="relative">
          <div className={`inline-block bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-6 py-3 rounded-full font-bold text-xl ${
            showAnimation ? 'animate-bounce' : ''
          }`}>
            +{result.xpAwarded} XP Earned! 🌟
          </div>
        </div>
      )}

      {/* Professor Approved Message */}
      {isPassed && (
        <div className="mt-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
          <p className="text-sm font-medium text-green-900 dark:text-green-200 mb-2">
            ✅ Approved by Professor
          </p>
          <p className="text-sm text-green-700 dark:text-green-300">
            Congratulations! Your solution has been approved and you've earned {result.xpAwarded} XP.
          </p>
        </div>
      )}

      {/* Professor Rejected Message */}
      {isFailed && (
        <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
          <p className="text-sm font-medium text-red-900 dark:text-red-200 mb-2">
            ❌ Not Approved
          </p>
          <p className="text-sm text-red-700 dark:text-red-300">
            Your submission was not approved by the professor. Please review the feedback and try again when the code editor reopens.
          </p>
        </div>
      )}

      {/* Pending Evaluation Message */}
      {isPending && (
        <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
          <p className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">
            ✅ Submitted Successfully
          </p>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Your submission is awaiting professor evaluation. The professor will review your code in class and award points accordingly.
          </p>
        </div>
      )}

      {/* View Leaderboard Link */}
      {isPassed && (
        <a
          href="/student/leaderboard"
          target="_blank"
          className="inline-block mt-4 text-blue-600 dark:text-blue-400 hover:underline"
        >
          View Leaderboard →
        </a>
      )}
    </div>
  )
}