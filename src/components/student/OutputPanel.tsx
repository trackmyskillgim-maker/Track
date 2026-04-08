'use client'

interface OutputPanelProps {
  output: string
  error: string | null
  expectedOutput?: string
  isCorrect?: boolean | null
  isRunning: boolean
}

export default function OutputPanel({
  output,
  error,
  expectedOutput,
  isCorrect,
  isRunning
}: OutputPanelProps) {
  return (
    <div className="bg-white rounded-lg shadow-md">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center">
          <span className="mr-2">🖥️</span>
          Output
          {isRunning && (
            <div className="ml-3 flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-sm text-blue-600">Running...</span>
            </div>
          )}
        </h2>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Actual Output */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Your Output:</h3>
          <div className="bg-gray-900 text-green-400 font-mono text-sm p-4 rounded border min-h-[100px] overflow-auto">
            {isRunning ? (
              <div className="flex items-center">
                <div className="animate-pulse">Running code...</div>
              </div>
            ) : error ? (
              <div className="text-red-400">
                <div className="font-semibold mb-1">Error:</div>
                <pre className="whitespace-pre-wrap">{error}</pre>
              </div>
            ) : output ? (
              <pre className="whitespace-pre-wrap">{output}</pre>
            ) : (
              <div className="text-gray-500 italic">No output yet. Click &quot;Run Code&quot; to see results.</div>
            )}
          </div>
        </div>

        {/* Expected Output (if provided) */}
        {expectedOutput && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Expected Output:</h3>
            <div className="bg-gray-100 border text-gray-800 font-mono text-sm p-4 rounded min-h-[60px]">
              <pre className="whitespace-pre-wrap">{expectedOutput}</pre>
            </div>
          </div>
        )}

        {/* Result Status */}
        {isCorrect !== null && !isRunning && (
          <div className={`border rounded-lg p-4 ${
            isCorrect
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          }`}>
            <div className={`flex items-center ${
              isCorrect ? 'text-green-800' : 'text-red-800'
            }`}>
              <span className="mr-2 text-xl">
                {isCorrect ? '✅' : '❌'}
              </span>
              <div>
                <div className="font-semibold">
                  {isCorrect ? 'Correct!' : 'Not quite right'}
                </div>
                <div className="text-sm">
                  {isCorrect
                    ? 'Great job! Your solution is correct.'
                    : 'Your output doesn&apos;t match the expected result. Try again!'
                  }
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tips */}
        {!isRunning && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="text-blue-800 text-sm">
              <div className="font-medium mb-1 flex items-center">
                <span className="mr-1">💡</span>
                Tips:
              </div>
              <ul className="space-y-1 text-xs">
                <li>• Use print() to display output</li>
                <li>• Check your indentation (Python is sensitive to spacing)</li>
                <li>• Make sure your output exactly matches the expected result</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}