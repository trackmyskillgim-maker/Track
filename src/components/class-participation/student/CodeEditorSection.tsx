'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'

// Dynamically import Monaco Editor (client-side only)
const Editor = dynamic(() => import('@monaco-editor/react'), { ssr: false })

interface CodeEditorSectionProps {
  sessionId: string
  question: string
  onSubmit: (result: any) => void
}

export default function CodeEditorSection({
  sessionId,
  onSubmit
}: CodeEditorSectionProps) {
  const [code, setCode] = useState('# Write your code here\n')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!code.trim() || code.trim() === '# Write your code here') {
      setError('Please write some code before submitting')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/class-participation/student/submit-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, code })
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to submit code')
      }

      onSubmit(data)
    } catch (err: any) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      <div className="bg-blue-600 text-white px-6 py-3">
        <h3 className="font-semibold">🚀 Your Turn! Code Editor Unlocked</h3>
      </div>

      <div className="p-6 space-y-4">
        {/* Code Editor */}
        <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
          <Editor
            height="400px"
            defaultLanguage="python"
            value={code}
            onChange={(value) => setCode(value || '')}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true
            }}
          />
        </div>

        {error && (
          <div className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium text-lg transition-colors disabled:opacity-50"
        >
          {submitting ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Evaluating with Gemini AI...
            </span>
          ) : (
            '✅ Submit Code'
          )}
        </button>
      </div>
    </div>
  )
}