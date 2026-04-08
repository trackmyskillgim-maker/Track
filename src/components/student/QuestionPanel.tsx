'use client'

interface QuestionPanelProps {
  question: {
    title: string
    description: string
    task: string
    hint?: string
    points: number
    difficulty: string
  }
  showHint: boolean
  onToggleHint: () => void
}

export default function QuestionPanel({ question, showHint, onToggleHint }: QuestionPanelProps) {
  const getDifficultyColor = () => {
    switch (question.difficulty.toLowerCase()) {
      case 'easy': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'hard': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md">
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{question.title}</h1>
            <div className="flex items-center space-x-3">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor()}`}>
                {question.difficulty}
              </span>
              <div className="flex items-center text-sm text-gray-600">
                <span className="mr-1">💎</span>
                {question.points} XP
              </div>
            </div>
          </div>
        </div>
        <p className="text-gray-700 leading-relaxed">{question.description}</p>
      </div>

      {/* Task */}
      <div className="p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
          <span className="mr-2">📝</span>
          Your Task
        </h2>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <p className="text-blue-900 font-medium">{question.task}</p>
        </div>

        {/* Hint Section */}
        {question.hint && (
          <div className="mb-4">
            <button
              onClick={onToggleHint}
              className="flex items-center text-yellow-600 hover:text-yellow-800 font-medium mb-2"
            >
              <span className="mr-2">💡</span>
              {showHint ? 'Hide Hint' : 'Show Hint'}
              <span className="ml-1">{showHint ? '▼' : '▶'}</span>
            </button>

            {showHint && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-900">{question.hint}</p>
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="font-medium text-gray-800 mb-2 flex items-center">
            <span className="mr-2">ℹ️</span>
            Instructions
          </h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Write your Python code in the editor on the right</li>
            <li>• Click &quot;Run Code&quot; to test your solution</li>
            <li>• Click &quot;Submit Solution&quot; when your output matches the expected result</li>
            <li>• Your progress is automatically saved</li>
          </ul>
        </div>
      </div>
    </div>
  )
}