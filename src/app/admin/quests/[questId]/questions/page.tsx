'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuestWithQuestions, removeQuestionOptimistic, type AdminQuestion } from '@/lib/hooks/useQuestQuestions'
import AdminHeader from '@/components/admin/AdminHeader'

export default function QuestQuestionsPage() {
  const params = useParams()
  const router = useRouter()
  const questId = params.questId as string

  const { quest, questions, isLoading, isError, mutateQuestions } = useQuestWithQuestions(questId)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<AdminQuestion | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [newlyAddedQuestionId, setNewlyAddedQuestionId] = useState<string | null>(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ id: string; title: string } | null>(null)

  // Auto-clear success message after 4 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null)
        setNewlyAddedQuestionId(null)
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [successMessage])

  const handleDeleteQuestion = async (questionId: string, questionTitle: string) => {
    // Show custom confirmation modal
    setDeleteConfirmation({ id: questionId, title: questionTitle })
  }

  const confirmDelete = async () => {
    if (!deleteConfirmation) return

    const { id: questionId, title: questionTitle } = deleteConfirmation
    setDeleteConfirmation(null)

    // Apply optimistic update
    removeQuestionOptimistic(questId, questionId)

    try {
      const response = await fetch(`/api/admin/questions/${questionId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        // Success - show animated success message
        setSuccessMessage(`Question "${questionTitle}" deleted successfully! 🗑️`)
        mutateQuestions() // Refresh to get real data
      } else {
        throw new Error('Failed to delete question')
      }
    } catch {
      console.error('Delete question error:', 'Failed to delete question')
      alert('Failed to delete question')
      // Revert optimistic update on error
      mutateQuestions()
    }
  }

  // Only show loading if we have no data at all (first load)
  if (isLoading && (!quest && questions.length === 0)) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminHeader title="Question Management" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading questions...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader title="Question Management" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <div className="flex items-center mb-2">
            <button
              onClick={() => router.push('/admin/quests')}
              className="text-blue-600 hover:text-blue-800 mr-2"
            >
              ← Back to Quests
            </button>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">
            Questions for: {quest?.title || 'Loading...'}
          </h2>
          <p className="text-gray-600">Manage questions within this quest</p>
        </div>

        {isError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {isError?.message || 'Failed to load quest questions'}
          </div>
        )}

        {/* Success message - Fixed center overlay */}
        {successMessage && (
          <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
            <div className="bg-green-50 border-2 border-green-300 text-green-800 px-8 py-6 rounded-xl shadow-2xl animate-slideInDown pointer-events-auto max-w-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="mr-4 relative">
                    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                        <path d="M5 13l4 4L19 7"></path>
                      </svg>
                    </div>
                    <div className="absolute inset-0 w-8 h-8 rounded-full bg-green-400 animate-ping opacity-75"></div>
                  </div>
                  <span className="font-semibold text-xl">{successMessage}</span>
                </div>
                <button
                  onClick={() => setSuccessMessage(null)}
                  className="text-green-600 hover:text-green-800 ml-6 text-xl font-bold"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-800">
                All Questions ({questions.length})
              </h3>
              <button
                onClick={() => setShowCreateModal(true)}
                className={`bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all duration-300 ${
                  newlyAddedQuestionId ? 'animate-bounce' : ''
                }`}
              >
                Add New Question
              </button>
            </div>

            {questions.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">❓</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Questions Yet</h3>
                <p className="text-gray-600 mb-4">
                  Get started by adding your first question to this quest.
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Add First Question
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {questions
                  .sort((a, b) => a.order_index - b.order_index)
                  .map((question, index) => (
                    <div
                      key={question.id}
                      className={`border rounded-lg p-4 transition-all duration-500 ${
                        newlyAddedQuestionId === question.id
                          ? 'border-green-300 bg-green-50 shadow-lg scale-[1.02]'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-medium text-gray-500">
                              Question {index + 1}
                            </span>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              question.difficulty === 'Easy' ? 'bg-green-100 text-green-800' :
                              question.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {question.difficulty}
                            </span>
                            <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                              {question.points} pts
                            </span>
                          </div>
                          <h4 className="text-lg font-medium text-gray-900 mb-2">
                            {question.title}
                          </h4>
                          <p className="text-gray-600 mb-2">{question.description}</p>
                          <div className="text-sm text-gray-500">
                            <p><strong>Task:</strong> {question.task}</p>
                            {question.hint && <p><strong>Hint:</strong> {question.hint}</p>}
                            <p><strong>Expected Output:</strong> {question.expected_output}</p>
                            {question.max_attempts && (
                              <p><strong>Max Attempts:</strong> {question.max_attempts}</p>
                            )}
                            {question.time_limit_seconds && (
                              <p><strong>Time Limit:</strong> {question.time_limit_seconds}s</p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => setEditingQuestion(question)}
                            className="text-blue-600 hover:text-blue-800 px-3 py-1 text-sm border border-blue-200 rounded hover:bg-blue-50"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteQuestion(question.id, question.title)}
                            className="text-red-600 hover:text-red-800 px-3 py-1 text-sm border border-red-200 rounded hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {(showCreateModal || editingQuestion) && (
        <QuestionModal
          question={editingQuestion}
          questId={questId}
          onClose={() => {
            setShowCreateModal(false)
            setEditingQuestion(null)
          }}
          onSave={(newQuestion) => {
            if (editingQuestion) {
              setSuccessMessage(`Question "${newQuestion.title}" updated successfully! ✨`)
            } else {
              setSuccessMessage(`New question "${newQuestion.title}" added successfully! 🎉`)
              setNewlyAddedQuestionId(newQuestion.id)
            }
            // Refresh the questions data from server
            mutateQuestions()
            setShowCreateModal(false)
            setEditingQuestion(null)
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl animate-slideInDown">
            <div className="flex items-start mb-6">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-red-600" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Question?</h3>
                <p className="text-gray-600 mb-1">
                  Are you sure you want to delete:
                </p>
                <p className="font-semibold text-gray-900 mb-3">
                  &quot;{deleteConfirmation.title}&quot;
                </p>
                <p className="text-sm text-red-600">
                  ⚠️ This action cannot be undone. All test cases and student attempts will be permanently removed.
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirmation(null)}
                className="px-6 py-2.5 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-6 py-2.5 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Delete Question
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface QuestionModalProps {
  question: AdminQuestion | null
  questId: string
  onClose: () => void
  onSave: (question: AdminQuestion) => void
}

function QuestionModal({ question, questId, onClose, onSave }: QuestionModalProps) {
  const [formData, setFormData] = useState({
    title: question?.title || '',
    description: question?.description || '',
    task: question?.task || '',
    starter_code: question?.starter_code || `def solve_problem():\n    # Write your solution here\n    pass`,
    hint: question?.hint || '',
    expected_output: question?.expected_output || '',
    function_name: question?.function_name || '',
    solution_code: question?.solution_code || '',
    points: question?.points || 10,
    max_attempts: question?.max_attempts || 3,
    time_limit_seconds: question?.time_limit_seconds || 300,
    difficulty: question?.difficulty || 'Easy' as const,
    tags: question?.tags?.join(', ') || ''
  })
  const [testCases, setTestCases] = useState([
    { test_script: '', is_visible: true, description: '' },
    { test_script: '', is_visible: false, description: '' }
  ])
  const [saving, setSaving] = useState(false)
  const [loadingTestCases, setLoadingTestCases] = useState(false)

  // Fetch existing test cases when editing a question
  useEffect(() => {
    if (question?.id) {
      const fetchTestCases = async () => {
        setLoadingTestCases(true)
        try {
          const response = await fetch(`/api/admin/questions/${question.id}/test-cases?format=raw`)
          if (response.ok) {
            const result = await response.json()
            if (result.success && result.data && result.data.length > 0) {
              // Transform database format to form format - AI test scripts
              const formattedTestCases = result.data.map((tc: any) => ({
                test_script: tc.test_script || '',
                is_visible: tc.is_visible || false,
                description: tc.description || ''
              }))
              setTestCases(formattedTestCases)
              console.log('✅ Loaded test cases:', formattedTestCases.length)
            } else {
              console.log('⚠️ No test cases found in response')
            }
          } else {
            console.error('❌ Failed to fetch test cases:', response.status, response.statusText)
          }
        } catch (error) {
          console.error('❌ Failed to fetch test cases:', error)
          alert('Failed to load test cases. Please check console for details.')
        } finally {
          setLoadingTestCases(false)
        }
      }

      fetchTestCases()
    }
  }, [question?.id])

  const addTestCase = () => {
    setTestCases([...testCases, { test_script: '', is_visible: false, description: '' }])
  }

  const removeTestCase = (index: number) => {
    if (testCases.length > 2) { // Keep at least 2 test cases
      setTestCases(testCases.filter((_, i) => i !== index))
    }
  }

  const updateTestCase = (index: number, field: string, value: string | boolean) => {
    const updated = [...testCases]
    updated[index] = { ...updated[index], [field]: value }
    setTestCases(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      // Validate test cases
      const validTestCases = testCases.filter(tc => tc.test_script.trim())
      if (validTestCases.length < 2) {
        alert('Please provide at least 2 complete test scripts')
        setSaving(false)
        return
      }

      const payload = {
        ...formData,
        quest_id: questId,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0),
        order_index: question?.order_index || 0,
        test_cases: validTestCases
      }

      const url = question
        ? `/api/admin/questions/${question.id}`
        : `/api/admin/quests/${questId}/questions`

      const method = question ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          onSave(result.data)
        } else {
          throw new Error(result.message)
        }
      } else {
        throw new Error('Failed to save question')
      }
    } catch (err) {
      console.error('Save question error:', err)
      alert('Failed to save question')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          {question ? 'Edit Question' : 'Create New Question'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Difficulty
              </label>
              <select
                value={formData.difficulty}
                onChange={(e) => setFormData({...formData, difficulty: e.target.value as 'Easy' | 'Medium' | 'Hard'})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description *
            </label>
            <textarea
              required
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
              rows={3}
              placeholder="Explain the problem students need to solve. Be clear about the requirements and constraints."
            />
            <p className="text-xs text-gray-500 mt-1">📝 This is the main problem statement students will see</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Task *
            </label>
            <textarea
              required
              value={formData.task}
              onChange={(e) => setFormData({...formData, task: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
              rows={2}
              placeholder="Create a function that takes X as input and returns Y. Example: Write a function that calculates the area of a circle given its radius."
            />
            <p className="text-xs text-gray-500 mt-1">🎯 Specific instructions for what the student should implement</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Function Name *
            </label>
            <input
              type="text"
              required
              value={formData.function_name}
              onChange={(e) => setFormData({...formData, function_name: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white font-mono"
              placeholder="e.g., double_number, reverse_string, calculate_area"
            />
            <p className="text-xs text-gray-500 mt-1">🔧 The exact name of the function students will implement. Must match the function definition in starter code!</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Starter Code *
              </label>
              <textarea
                required
                value={formData.starter_code}
                onChange={(e) => setFormData({...formData, starter_code: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white font-mono"
                rows={4}
                placeholder="def function_name(parameter):&#10;    # Students write their solution here&#10;    pass"
              />
              <p className="text-xs text-gray-500 mt-1">💻 Function skeleton that students will complete. Must include function definition!</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Solution Code
              </label>
              <textarea
                value={formData.solution_code}
                onChange={(e) => setFormData({...formData, solution_code: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white font-mono"
                rows={4}
                placeholder="# Reference solution..."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hint
            </label>
            <textarea
              value={formData.hint}
              onChange={(e) => setFormData({...formData, hint: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
              rows={2}
              placeholder="Optional hint for struggling students..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expected Output Format (Display Only) *
            </label>
            <textarea
              required
              value={formData.expected_output}
              onChange={(e) => setFormData({...formData, expected_output: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white font-mono"
              rows={3}
              placeholder="Example format only - for display to students. Actual testing uses test cases below."
            />
            <p className="text-xs text-gray-500 mt-1">📄 For student reference only. Universal grader uses test cases below for actual evaluation!</p>
          </div>

          {/* Test Cases Section */}
          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-lg font-medium text-gray-900 flex items-center">
                  AI Test Scripts
                  {loadingTestCases && (
                    <div className="ml-2 w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  )}
                </h4>
                <p className="text-sm text-gray-600">AI-generated Python test scripts - Universal solution for ANY Python question type</p>
              </div>
              <button
                type="button"
                onClick={addTestCase}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Add Test Case
              </button>
            </div>

            <div className="space-y-4">
              {testCases.map((testCase, index) => (
                <div key={index} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="font-medium text-gray-800">
                      Test Case {index + 1} {testCase.is_visible ? '(Visible to students)' : '(Hidden)'}
                    </h5>
                    {testCases.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeTestCase(index)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      AI Test Script
                      <span className="text-xs text-orange-600 font-normal ml-2">(Make test cases DIFFERENT from Expected Output)</span>
                    </label>
                    <textarea
                      value={testCase.test_script}
                      onChange={(e) => updateTestCase(index, 'test_script', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white font-mono"
                      rows={8}
                      placeholder={`import pandas as pd

def run_test():
    # Create test data
    df = pd.DataFrame({
        'name': ['Alice', 'Bob'],
        'age': [25, 30]
    })

    # Call student's function
    result = filter_adults(df)

    # Check result
    expected = pd.DataFrame({
        'name': ['Bob'],
        'age': [30]
    }, index=[1])

    return result.equals(expected)

passed = run_test()`}
                    />
                    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded">
                      <p className="text-sm text-blue-800 font-medium">🤖 AI Test Script Instructions:</p>
                      <ul className="text-xs text-blue-700 mt-1 space-y-1">
                        <li>• Write a complete Python test script that creates test data</li>
                        <li>• Call the student&apos;s function with the test data</li>
                        <li>• Compare result with expected output using proper methods</li>
                        <li>• Script must end with: <code className="bg-blue-100 px-1 rounded">passed = run_test()</code></li>
                        <li>• Use appropriate comparisons: <code className="bg-blue-100 px-1 rounded">df.equals()</code> for DataFrames, <code className="bg-blue-100 px-1 rounded">np.allclose()</code> for arrays</li>
                      </ul>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description (Optional)
                      </label>
                      <input
                        type="text"
                        value={testCase.description}
                        onChange={(e) => updateTestCase(index, 'description', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                        placeholder="e.g., Basic test case, Edge case with negative numbers"
                      />
                    </div>
                    <div className="flex items-center">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={testCase.is_visible}
                          onChange={(e) => updateTestCase(index, 'is_visible', e.target.checked)}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700">Visible to students (as example)</span>
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h6 className="font-medium text-yellow-800 mb-2">💡 Test Case Guidelines:</h6>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• <strong>Input formats:</strong> Single values (5), multiple values (5,3), or lists ([1,2,3])</li>
                <li>• <strong>Visible test cases:</strong> Students can see these as examples (usually 1-2)</li>
                <li>• <strong>Hidden test cases:</strong> Students cannot see these (usually 2-5) - prevents cheating</li>
                <li>• <strong>Minimum:</strong> At least 2 test cases required</li>
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Points
              </label>
              <input
                type="number"
                min="1"
                value={formData.points}
                onChange={(e) => setFormData({...formData, points: parseInt(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Attempts
              </label>
              <input
                type="number"
                min="1"
                value={formData.max_attempts}
                onChange={(e) => setFormData({...formData, max_attempts: parseInt(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Time Limit (seconds)
              </label>
              <input
                type="number"
                min="30"
                value={formData.time_limit_seconds}
                onChange={(e) => setFormData({...formData, time_limit_seconds: parseInt(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({...formData, tags: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
              placeholder="loops, variables, functions"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : (question ? 'Update Question' : 'Create Question')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}