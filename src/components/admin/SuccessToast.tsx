'use client'

import { useEffect } from 'react'

interface SuccessToastProps {
  isOpen: boolean
  onClose: () => void
  message: string
  duration?: number
}

export default function SuccessToast({
  isOpen,
  onClose,
  message,
  duration = 3000
}: SuccessToastProps) {
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        onClose()
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [isOpen, onClose, duration])

  if (!isOpen) return null

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right-full duration-300">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 shadow-lg max-w-sm">
        <div className="flex items-start">
          {/* Success Icon */}
          <div className="flex-shrink-0 mr-3">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <div className="text-green-600 text-lg">✓</div>
            </div>
          </div>

          {/* Message */}
          <div className="flex-1">
            <p className="text-sm font-medium text-green-800">
              Success!
            </p>
            <p className="text-sm text-green-700 mt-1">
              {message}
            </p>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="flex-shrink-0 ml-3 text-green-400 hover:text-green-600 transition-colors"
          >
            <span className="sr-only">Close</span>
            <div className="text-lg leading-none">×</div>
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mt-2">
          <div className="h-1 bg-green-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-400 rounded-full transition-all duration-linear"
              style={{
                animation: `shrink ${duration}ms linear forwards`
              }}
            />
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes shrink {
          from { width: 100% }
          to { width: 0% }
        }
      `}</style>
    </div>
  )
}