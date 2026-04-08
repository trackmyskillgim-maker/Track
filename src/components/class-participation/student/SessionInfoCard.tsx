'use client'

export default function SessionInfoCard({ session }: { session: any }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {session.topic}
          </h2>
          <div className="flex items-center space-x-3 text-sm text-gray-600 dark:text-gray-400">
            <span className={`px-2 py-1 rounded ${
              session.difficulty === 'Easy' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' :
              session.difficulty === 'Medium' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200' :
              'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
            }`}>
              {session.difficulty}
            </span>
            <span>•</span>
            <span>{session.year}</span>
            <span>•</span>
            <span>{session.course} {session.section}</span>
          </div>
        </div>
        <span className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full text-sm font-medium">
          🟢 Active
        </span>
      </div>

      {session.is_published && session.question_text && (
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mt-4">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Question:</h3>
          <pre className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200 font-mono">
            {session.question_text}
          </pre>
        </div>
      )}
    </div>
  )
}