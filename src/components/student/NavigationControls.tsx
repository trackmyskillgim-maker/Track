'use client'

import Link from 'next/link'

interface NavigationControlsProps {
  questId: string
  currentQuestionIndex: number
  totalQuestions: number
  previousQuestionId?: string
  nextQuestionId?: string
  questTitle: string
  canSubmit: boolean
  isSubmitting: boolean
  onSubmit: () => void
  onReset: () => void
}

export default function NavigationControls({
  questId,
  currentQuestionIndex,
  totalQuestions,
  previousQuestionId,
  nextQuestionId,
  questTitle,
  canSubmit,
  isSubmitting,
  onSubmit,
  onReset
}: NavigationControlsProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      {/* Progress Indicator */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
          <span>Question Progress</span>
          <span>{currentQuestionIndex + 1} of {totalQuestions}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Quest Info */}
      <div className="mb-4 pb-4 border-b border-gray-200">
        <h3 className="font-medium text-gray-800">{questTitle}</h3>
        <p className="text-sm text-gray-600">Question {currentQuestionIndex + 1}</p>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        {/* Submit Solution */}
        <button
          onClick={onSubmit}
          disabled={!canSubmit || isSubmitting}
          className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
            canSubmit && !isSubmitting
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isSubmitting ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Submitting...
            </div>
          ) : (
            'Submit Solution'
          )}
        </button>

        {/* Reset Code */}
        <button
          onClick={onReset}
          disabled={isSubmitting}
          className="w-full py-2 px-4 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Reset Code
        </button>
      </div>

      {/* Navigation */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex justify-between space-x-3">
          {/* Previous Question */}
          {previousQuestionId ? (
            <Link
              href={`/student/challenge/${questId}/${previousQuestionId}`}
              className="flex-1 py-2 px-3 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors text-center text-sm"
            >
              ← Previous
            </Link>
          ) : (
            <div className="flex-1 py-2 px-3 rounded border border-gray-200 text-gray-400 text-center text-sm cursor-not-allowed">
              ← Previous
            </div>
          )}

          {/* Back to Quest */}
          <Link
            href={`/student/quest/${questId}`}
            className="flex-1 py-2 px-3 rounded border border-blue-300 text-blue-700 hover:bg-blue-50 transition-colors text-center text-sm"
          >
            Quest Overview
          </Link>

          {/* Next Question */}
          {nextQuestionId ? (
            <Link
              href={`/student/challenge/${questId}/${nextQuestionId}`}
              className="flex-1 py-2 px-3 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors text-center text-sm"
            >
              Next →
            </Link>
          ) : (
            <div className="flex-1 py-2 px-3 rounded border border-gray-200 text-gray-400 text-center text-sm cursor-not-allowed">
              Next →
            </div>
          )}
        </div>
      </div>

      {/* Keyboard Shortcuts */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <h4 className="text-xs font-medium text-gray-700 mb-2">Keyboard Shortcuts:</h4>
        <div className="text-xs text-gray-600 space-y-1">
          <div className="flex justify-between">
            <span>Run Code:</span>
            <span className="font-mono bg-gray-100 px-1 rounded">Ctrl + Enter</span>
          </div>
          <div className="flex justify-between">
            <span>Submit:</span>
            <span className="font-mono bg-gray-100 px-1 rounded">Ctrl + Shift + Enter</span>
          </div>
        </div>
      </div>
    </div>
  )
}