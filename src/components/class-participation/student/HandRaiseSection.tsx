'use client'

import { useState } from 'react'

interface HandRaiseSectionProps {
  sessionId: string
  questionId: string
  onRaiseHand: () => void
}

export default function HandRaiseSection({ sessionId, questionId, onRaiseHand }: HandRaiseSectionProps) {
  const [raising, setRaising] = useState(false)
  const [error, setError] = useState('')

  const handleRaiseHand = async () => {
    setRaising(true)
    setError('')

    try {
      const res = await fetch('/api/class-participation/student/raise-hand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, questionId })
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to join queue')
      }

      onRaiseHand()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setRaising(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
      <div className="text-5xl mb-4">✋</div>
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
        Ready to Attempt?
      </h3>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Raise your hand to join the queue. You&apos;ll be able to code when the professor grants you access.
      </p>

      {error && (
        <div className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 p-3 rounded-lg text-sm mb-4">
          {error}
        </div>
      )}

      <button
        onClick={handleRaiseHand}
        disabled={raising}
        className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium text-lg transition-colors disabled:opacity-50"
      >
        {raising ? 'Joining Queue...' : '✋ Raise Hand'}
      </button>
    </div>
  )
}