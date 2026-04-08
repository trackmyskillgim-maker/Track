'use client'

import { useRouter } from 'next/navigation'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import StudentHeader from '@/components/student/StudentHeader'
import { useQuestDetail } from '@/lib/hooks/useQuestDetail'

interface Question {
  id: string
  title: string
  description: string
  task: string
  difficulty: string
  points: number
  orderIndex: number
  isCompleted: boolean
  userScore?: number
}

interface QuestDetail {
  id: string
  title: string
  description: string
  difficulty: string
  estimatedTime: string
  totalQuestions: number
  completedQuestions: number
  questions: Question[]
}

export default function QuestDetailPage() {
  const router = useRouter()
  const params = useParams()
  const questId = params.questId as string

  const { quest, isLoading: loading, isError } = useQuestDetail(questId)

  // Handle error with redirect
  if (isError && isError.message?.includes('401')) {
    router.push('/')
    return null
  }

  const error = isError ? 'Failed to load quest details' : null

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading quest...</p>
        </div>
      </div>
    )
  }

  if (error || !quest) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">❌</div>
          <p className="text-gray-600">{error || 'Quest not found'}</p>
          <Link
            href="/student/quests"
            className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Back to Quests
          </Link>
        </div>
      </div>
    )
  }

  const getDifficultyColor = () => {
    switch (quest.difficulty.toLowerCase()) {
      case 'beginner': return 'bg-green-100 text-green-800'
      case 'intermediate': return 'bg-yellow-100 text-yellow-800'
      case 'advanced': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getNextQuestion = () => {
    const nextQuestion = quest.questions.find((q: any) => !q.isCompleted) || quest.questions[0]
    return nextQuestion
  }

  const isNextQuestion = (question: Question, index: number) => {
    if (question.isCompleted) return false
    // First incomplete question that's unlocked
    const isUnlocked = index === 0 || quest.questions[index - 1]?.isCompleted
    const firstIncompleteIndex = quest.questions.findIndex((q: any) => !q.isCompleted)
    const isNext = isUnlocked && firstIncompleteIndex === index


    return isNext
  }

  const completionPercentage = quest.totalQuestions > 0 ?
    Math.round((quest.completedQuestions / quest.totalQuestions) * 100) : 0

  return (
    <div className="min-h-screen bg-gray-50">
      <StudentHeader
        title={quest.title}
        showBackButton={true}
        backUrl="/student/quests"
        backText="Back to Quests"
      />

      {/* Quest Info Bar */}
      <div className="bg-white border-b px-4 sm:px-6 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-end space-x-4">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getDifficultyColor()}`}>
            {quest.difficulty}
          </span>
          <span className="text-gray-600">{quest.estimatedTime}</span>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quest Overview */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quest Info */}
            <div className="lg:col-span-2">
              <h2 className="text-xl font-semibold text-gray-800 mb-3">Quest Overview</h2>
              <p className="text-gray-600 mb-4">{quest.description}</p>
              <div className="flex items-center space-x-6 text-sm text-gray-500">
                <div className="flex items-center">
                  <span className="mr-1">⏱️</span>
                  {quest.estimatedTime}
                </div>
                <div className="flex items-center">
                  <span className="mr-1">📚</span>
                  {quest.totalQuestions} questions
                </div>
              </div>
            </div>

            {/* Progress */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Progress</h3>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  {completionPercentage}%
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${completionPercentage}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600">
                  {quest.completedQuestions}/{quest.totalQuestions} completed
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Questions List */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-800">Questions</h2>
            {quest.completedQuestions < quest.totalQuestions && (
              <Link
                href={`/student/challenge/${quest.id}/${getNextQuestion().id}`}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg font-medium flex items-center space-x-2"
              >
                <span>{quest.completedQuestions === 0 ? '🚀 Start Quest' : '⚔️ Continue Learning'}</span>
              </Link>
            )}
          </div>

          <div className="space-y-4">
            {quest.questions.map((question: any, index: number) => (
              <div
                key={question.id}
                className={`border rounded-lg p-4 transition-all relative ${
                  question.isCompleted
                    ? 'bg-green-50 border-green-200'
                    : isNextQuestion(question, index)
                    ? 'bg-gradient-to-r from-blue-50 to-purple-50 border-blue-300 shadow-md ring-2 ring-blue-300 ring-opacity-50'
                    : index === 0 || quest.questions[index - 1]?.isCompleted
                    ? 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                    : 'bg-gray-50 border-gray-200 opacity-60'
                }`}
              >
                {isNextQuestion(question, index) && (
                  <div className="absolute -top-2 -right-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
                    NEXT
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      question.isCompleted
                        ? 'bg-green-500 text-white'
                        : index === 0 || quest.questions[index - 1]?.isCompleted
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-300 text-gray-600'
                    }`}>
                      {question.isCompleted ? '✓' : index + 1}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{question.title}</h3>
                      <p className="text-sm text-gray-600">{question.task}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    {question.isCompleted && (
                      <div className="text-green-600 font-medium">
                        {question.userScore || question.points} XP
                      </div>
                    )}
                    <div className="text-sm text-gray-500">
                      {question.points} XP
                    </div>
                    {(index === 0 || quest.questions[index - 1]?.isCompleted) && (
                      <Link
                        href={`/student/challenge/${quest.id}/${question.id}`}
                        className={`px-3 py-1 rounded text-sm font-medium ${
                          question.isCompleted
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                        }`}
                      >
                        {question.isCompleted ? 'Review' : 'Start'}
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}