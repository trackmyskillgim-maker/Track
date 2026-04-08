'use client'

import { useState } from 'react'
import ProfessorEvaluationModal from './ProfessorEvaluationModal'

interface QuestionSubmissions {
  question_id: string
  question_text: string
  question_order: number
  fail: any[]
  eval_pending: any[]
  pass: any[]
}

interface SubmissionsDashboardProps {
  sessionId: string
  submissions: {
    questions?: QuestionSubmissions[]
  }
  onSubmissionUpdate: () => void
  userRole: 'admin' | 'student' // For CR restrictions
}

export default function SubmissionsDashboard({
  sessionId,
  submissions,
  onSubmissionUpdate,
  userRole
}: SubmissionsDashboardProps) {
  const [expandedCode, setExpandedCode] = useState<string | null>(null)
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set())
  const [evaluationModalOpen, setEvaluationModalOpen] = useState(false)
  const [selectedColumn, setSelectedColumn] = useState<'eval_pending' | 'fail' | null>(null)

  const isProfessor = userRole === 'admin'

  // Get submissions for evaluation modal based on selected column
  const getSubmissionsForModal = () => {
    const latestQuestion = submissions.questions?.[0]
    if (!latestQuestion || !selectedColumn) return []

    return latestQuestion[selectedColumn] || []
  }

  // Handle evaluation from modal
  const handleEvaluate = async (submissionId: string, approved: boolean, points: number) => {
    try {
      const res = await fetch('/api/class-participation/admin/evaluate-submission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId,
          approved,
          points,
          sessionId
        })
      })

      if (!res.ok) {
        throw new Error('Evaluation failed')
      }

      // Refresh submissions
      onSubmissionUpdate()
    } catch (error) {
      console.error('Evaluation error:', error)
      throw error
    }
  }

  // Open evaluation modal for a specific column
  const openEvaluationModal = (column: 'eval_pending' | 'fail') => {
    if (!isProfessor) return // CR cannot evaluate
    setSelectedColumn(column)
    setEvaluationModalOpen(true)
  }

  const SubmissionCard = ({ submission, columnType, isClickable }: { submission: any; columnType: string; isClickable: boolean }) => {
    return (
      <div
        className={`border rounded-lg p-3 transition-all ${
          columnType === 'pass' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' :
          columnType === 'fail' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' :
          columnType === 'eval_pending' ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' :
          'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700'
        } ${isClickable ? 'cursor-pointer hover:shadow-md hover:scale-[1.02]' : ''}`}
        onClick={() => isClickable && openEvaluationModal(columnType as 'eval_pending' | 'fail')}
      >
        <div className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
          {submission.username}
          {submission.session_submission_count > 1 && (
            <span className="px-2 py-0.5 bg-blue-500 text-white rounded-full text-xs font-medium">
              {submission.session_submission_count}Q
            </span>
          )}
          {submission.xp_awarded > 0 && (
            <span className="ml-auto px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-xs font-medium rounded">
              +{submission.xp_awarded} XP
            </span>
          )}
        </div>
      </div>
    )
  }

  // Calculate total across all questions (3 columns only)
  const totalSubmissions = submissions.questions
    ? submissions.questions.reduce((total, q) => {
        return total + (q.fail?.length || 0) + (q.eval_pending?.length || 0) + (q.pass?.length || 0)
      }, 0)
    : 0

  const hasQuestions = submissions.questions && submissions.questions.length > 0

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Submissions Dashboard
        </h3>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Total: {totalSubmissions}
        </div>
      </div>

      {totalSubmissions === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          No submissions yet
        </div>
      ) : hasQuestions ? (
        <div className="space-y-4">
          {submissions.questions!.map((question, index) => {
            const questionTotal = (question.fail?.length || 0) + (question.eval_pending?.length || 0) + (question.pass?.length || 0)
            const questionNumber = index + 1 // Dynamic numbering: 1, 2, 3...
            const isLatest = index === 0 // First question is latest
            const isExpanded = isLatest || expandedQuestions.has(question.question_id)

            return (
              <div key={question.question_id} className={`border rounded-lg ${isLatest ? 'border-blue-300 dark:border-blue-700' : 'border-gray-200 dark:border-gray-700'}`}>
                {/* Question Header - Always Visible */}
                <div
                  className={`p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors ${isLatest ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                  onClick={() => {
                    if (!isLatest) { // Can't collapse latest question
                      setExpandedQuestions(prev => {
                        const newSet = new Set(prev)
                        if (newSet.has(question.question_id)) {
                          newSet.delete(question.question_id)
                        } else {
                          newSet.add(question.question_id)
                        }
                        return newSet
                      })
                    }
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {!isLatest && (
                        <span className="text-gray-500 dark:text-gray-400">
                          {isExpanded ? '▼' : '▶'}
                        </span>
                      )}
                      <h4 className={`text-md font-semibold ${isLatest ? 'text-blue-900 dark:text-blue-200' : 'text-gray-900 dark:text-white'}`}>
                        Question {questionNumber} {isLatest && <span className="text-xs font-normal text-blue-600 dark:text-blue-400">(Current)</span>}
                      </h4>
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {questionTotal} submission{questionTotal !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {!isExpanded && (
                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                      {question.question_text}
                    </div>
                  )}
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="p-4 pt-0">
                    <div className="mb-4 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 rounded p-3">
                      <p className="whitespace-pre-wrap">{question.question_text}</p>
                    </div>

                    {/* Submissions Grid - 3 Columns */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Fail Column */}
                      <div>
                        <h5 className="font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center text-sm">
                          <span className="w-3 h-3 bg-red-500 rounded-full mr-2"></span>
                          Fail ({question.fail?.length || 0})
                        </h5>
                        <div className="space-y-3">
                          {question.fail?.map((sub: any) => (
                            <SubmissionCard
                              key={sub.submission_id}
                              submission={sub}
                              columnType="fail"
                              isClickable={isProfessor && isLatest}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Eval Pending Column */}
                      <div>
                        <h5 className="font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center text-sm">
                          <span className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></span>
                          Eval Pending ({question.eval_pending?.length || 0})
                        </h5>
                        <div className="space-y-3">
                          {question.eval_pending?.map((sub: any) => (
                            <SubmissionCard
                              key={sub.submission_id}
                              submission={sub}
                              columnType="eval_pending"
                              isClickable={isProfessor && isLatest}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Pass Column */}
                      <div>
                        <h5 className="font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center text-sm">
                          <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                          Pass ({question.pass?.length || 0})
                        </h5>
                        <div className="space-y-3">
                          {question.pass?.map((sub: any) => (
                            <SubmissionCard
                              key={sub.submission_id}
                              submission={sub}
                              columnType="pass"
                              isClickable={false}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : null}

      {/* Professor Evaluation Modal */}
      <ProfessorEvaluationModal
        isOpen={evaluationModalOpen}
        onClose={() => {
          setEvaluationModalOpen(false)
          setSelectedColumn(null)
        }}
        submissions={getSubmissionsForModal()}
        onEvaluate={handleEvaluate}
      />
    </div>
  )
}