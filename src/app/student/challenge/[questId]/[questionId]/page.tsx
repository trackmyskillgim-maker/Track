'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useParams } from 'next/navigation'

// Debug logging for build troubleshooting
console.log('🔍 [BUILD DEBUG] StudentChallenge: Starting imports')

// Declare components at module scope
let StudentHeader: any, CodeEditor: any, QuestionPanel: any, OutputPanel: any, NavigationControls: any, SuccessModal: any
let simulatePythonExecution: any, compareOutputs: any

try {
  console.log('🔍 [BUILD DEBUG] StudentChallenge: Importing StudentHeader...')
  StudentHeader = require('@/components/student/StudentHeader').default
  console.log('✅ [BUILD DEBUG] StudentChallenge: StudentHeader imported successfully')
} catch {
  console.error('❌ [BUILD DEBUG] StudentChallenge: Failed to import StudentHeader')
  throw new Error('Failed to import StudentHeader')
}

try {
  console.log('🔍 [BUILD DEBUG] StudentChallenge: Importing CodeEditor...')
  CodeEditor = require('@/components/student/CodeEditor').default
  console.log('✅ [BUILD DEBUG] StudentChallenge: CodeEditor imported successfully')
} catch {
  console.error('❌ [BUILD DEBUG] StudentChallenge: Failed to import CodeEditor')
  throw new Error('Failed to import CodeEditor')
}

try {
  console.log('🔍 [BUILD DEBUG] StudentChallenge: Importing QuestionPanel...')
  QuestionPanel = require('@/components/student/QuestionPanel').default
  console.log('✅ [BUILD DEBUG] StudentChallenge: QuestionPanel imported successfully')
} catch {
  console.error('❌ [BUILD DEBUG] StudentChallenge: Failed to import QuestionPanel')
  throw new Error('Failed to import QuestionPanel')
}

try {
  console.log('🔍 [BUILD DEBUG] StudentChallenge: Importing OutputPanel...')
  OutputPanel = require('@/components/student/OutputPanel').default
  console.log('✅ [BUILD DEBUG] StudentChallenge: OutputPanel imported successfully')
} catch {
  console.error('❌ [BUILD DEBUG] StudentChallenge: Failed to import OutputPanel')
  throw new Error('Failed to import OutputPanel')
}

try {
  console.log('🔍 [BUILD DEBUG] StudentChallenge: Importing NavigationControls...')
  NavigationControls = require('@/components/student/NavigationControls').default
  console.log('✅ [BUILD DEBUG] StudentChallenge: NavigationControls imported successfully')
} catch {
  console.error('❌ [BUILD DEBUG] StudentChallenge: Failed to import NavigationControls')
  throw new Error('Failed to import NavigationControls')
}

try {
  console.log('🔍 [BUILD DEBUG] StudentChallenge: Importing SuccessModal...')
  SuccessModal = require('@/components/student/SuccessModal').default
  console.log('✅ [BUILD DEBUG] StudentChallenge: SuccessModal imported successfully')
} catch {
  console.error('❌ [BUILD DEBUG] StudentChallenge: Failed to import SuccessModal')
  throw new Error('Failed to import SuccessModal')
}

let RateLimitNotification: any
try {
  console.log('🔍 [BUILD DEBUG] StudentChallenge: Importing RateLimitNotification...')
  RateLimitNotification = require('@/components/student/RateLimitNotification').default
  console.log('✅ [BUILD DEBUG] StudentChallenge: RateLimitNotification imported successfully')
} catch {
  console.error('❌ [BUILD DEBUG] StudentChallenge: Failed to import RateLimitNotification')
  throw new Error('Failed to import RateLimitNotification')
}

try {
  console.log('🔍 [BUILD DEBUG] StudentChallenge: Importing pyodideExecutor...')
  const pyodideExecutor = require('@/lib/pyodideExecutor')
  simulatePythonExecution = pyodideExecutor.executePyodideTests
  compareOutputs = pyodideExecutor.compareOutputs
  console.log('✅ [BUILD DEBUG] StudentChallenge: pyodideExecutor imported successfully')
} catch {
  console.error('❌ [BUILD DEBUG] StudentChallenge: Failed to import pyodideExecutor')
  throw new Error('Failed to import pyodideExecutor')
}

console.log('✅ [BUILD DEBUG] StudentChallenge: All imports completed successfully')

// Import quest cache invalidation
import { invalidateQuests } from '@/lib/hooks/useQuests'

interface Question {
  id: string
  title: string
  description: string
  task: string
  hint?: string
  points: number
  difficulty: string
  starterCode?: string
  expectedOutput: string
  orderIndex: number
  isCompleted: boolean
  userScore?: number
}

interface ChallengeData {
  question: Question
  quest: {
    id: string
    title: string
    totalQuestions: number
  }
  navigation: {
    currentIndex: number
    previousQuestionId?: string
    nextQuestionId?: string
  }
}

export default function ChallengePage() {
  const [data, setData] = useState<ChallengeData | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState<string | null>(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [earnedPoints, setEarnedPoints] = useState(0)
  const [isQuestComplete, setIsQuestComplete] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [isReviewQuestion, setIsReviewQuestion] = useState(false)
  const [achievementData, setAchievementData] = useState<any>(null)

  // Pyodide MVP-style states
  const [pyodideReady, setPyodideReady] = useState(false)
  const [pyodideInitializing, setPyodideInitializing] = useState(false)
  const [testResults, setTestResults] = useState<any[]>([])
  const [testSummary, setTestSummary] = useState('')
  const [output, setOutput] = useState('')

  // Rate limiting states
  const [rateLimitData, setRateLimitData] = useState<{
    submissionsCount: number
    maxSubmissions: number
    remainingSubmissions: number
    isLimitReached: boolean
    timeUntilResetSeconds: number
  } | null>(null)
  const [showRateLimitNotification, setShowRateLimitNotification] = useState(false)

  // Resizable panels state
  const [editorHeight, setEditorHeight] = useState(400) // Default 400px
  const [isResizing, setIsResizing] = useState(false)

  const router = useRouter()
  const params = useParams()
  const questId = params.questId as string
  const questionId = params.questionId as string

  // Fetch rate limit status
  const fetchRateLimitStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/student/rate-limit-status')
      const result = await response.json()

      if (result.success) {
        setRateLimitData(result.data)

        // Show notification if limit is reached or only 1-2 submissions remaining
        if (result.data.isLimitReached || result.data.remainingSubmissions <= 2) {
          setShowRateLimitNotification(true)
        }
      }
    } catch (error) {
      console.error('Failed to fetch rate limit status:', error)
    }
  }, [])

  // Fetch rate limit on mount and after successful submission
  useEffect(() => {
    fetchRateLimitStatus()
  }, [fetchRateLimitStatus])

  // Initialize Pyodide like the MVP
  useEffect(() => {
    const initPyodide = async () => {
      if (pyodideReady || pyodideInitializing) return

      setPyodideInitializing(true)
      try {
        const { initializePyodide } = await import('@/lib/pyodideExecutor')
        const success = await initializePyodide()
        console.log('🔍 Pyodide initialization result:', success)
        setPyodideReady(success)

        if (!success) {
          setError('Failed to initialize Python environment')
        }
      } catch (error) {
        console.error('Failed to initialize Pyodide:', error)
        setError('Failed to initialize Python environment')
      } finally {
        setPyodideInitializing(false)
      }
    }

    initPyodide()
  }, [pyodideReady, pyodideInitializing])

  useEffect(() => {
    if (!questId || !questionId) return

    const fetchChallengeData = async () => {
      try {
        const response = await fetch(`/api/student/challenge/${questId}/${questionId}`)
        if (!response.ok) {
          if (response.status === 401) {
            router.push('/')
            return
          }
          throw new Error('Failed to fetch challenge data')
        }

        const result = await response.json()
        if (result.success) {
          setData(result.data)
          setCode(result.data.question.starterCode || '# Write your code here\n')

          // Load saved code from localStorage
          const savedCode = localStorage.getItem(`code_${questionId}`)
          if (savedCode) {
            setCode(savedCode)
          }
        } else {
          setPageError(result.message)
        }
      } catch {
        setPageError('Failed to load challenge')
        console.error('Challenge error:', 'Failed to load challenge')
      } finally {
        setLoading(false)
      }
    }

    fetchChallengeData()
  }, [questId, questionId, router])

  // Auto-save code to localStorage
  useEffect(() => {
    if (questionId && code) {
      const timeoutId = setTimeout(() => {
        localStorage.setItem(`code_${questionId}`, code)
      }, 1000)
      return () => clearTimeout(timeoutId)
    }
  }, [code, questionId])

  const handleRunCode = useCallback(async () => {
    if (!code.trim() || isRunning || !pyodideReady || !data?.question) return

    setIsRunning(true)
    setError(null)
    setIsCorrect(null)
    setTestResults([])
    setTestSummary('')

    try {
      const { executePyodideTests } = await import('@/lib/pyodideExecutor')

      // Fetch test cases in MVP format - no conversion needed!
      const testResponse = await fetch(`/api/admin/questions/${data.question.id}/test-cases`)
      let mvpTestCases = []

      if (testResponse.ok) {
        const testData = await testResponse.json()
        mvpTestCases = testData.data || []
      }

      // If no test cases found, create a basic one from expected output
      if (mvpTestCases.length === 0 && data.question.expectedOutput) {
        try {
          const expectedOutput = JSON.parse(data.question.expectedOutput)
          mvpTestCases.push({
            inputs: [5], // Default test input
            expectedOutput: expectedOutput,
            description: "Basic test case",
            is_visible: true
          })
        } catch {
          mvpTestCases.push({
            inputs: [5],
            expectedOutput: data.question.expectedOutput,
            description: "Basic test case",
            is_visible: true
          })
        }
      }

      console.log('🧪 Running MVP-style tests:', {
        functionName: (data.question as any).functionName,
        testCases: mvpTestCases
      })

      const result = await executePyodideTests(
        code,
        (data.question as any).functionName || 'main',
        mvpTestCases
      )

      if (result.success) {
        const passedAll = result.passedCount === result.totalCount
        setIsCorrect(passedAll)
        setTestResults(result.results)
        setTestSummary(`${result.passedCount}/${result.totalCount} tests passed`)

        if (result.results.length > 0 && (result.results[0] as any).actualOutput !== null) {
          setOutput(String((result.results[0] as any).actualOutput))
        } else {
          setOutput('Code executed successfully')
        }
        setError(null)

        console.log('✅ MVP test results:', result)

        // Log the test attempt for accuracy tracking
        try {
          await fetch('/api/student/log-test-attempt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              questionId: data.question.id,
              testResults: result
            })
          })
        } catch (logError) {
          console.warn('Failed to log test attempt:', logError)
          // Don't fail the test run if logging fails
        }
      } else {
        setOutput('')
        setError(result.overallError || 'Execution failed')
        setIsCorrect(false)
        setTestResults([])
        console.error('❌ MVP test failed:', result.overallError)

        // Log the failed test attempt for accuracy tracking
        try {
          await fetch('/api/student/log-test-attempt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              questionId: data.question.id,
              testResults: result
            })
          })
        } catch (logError) {
          console.warn('Failed to log test attempt:', logError)
          // Don't fail the test run if logging fails
        }
      }

    } catch (error) {
      setOutput('')
      setError(error instanceof Error ? error.message : 'Execution failed')
      setIsCorrect(false)
      setTestResults([])
      console.error('❌ Pyodide execution error:', error)
    } finally {
      setIsRunning(false)
    }
  }, [code, data, isRunning, pyodideReady])

  const handleSubmit = useCallback(async () => {
    if (!data || !code.trim() || isSubmitting) return

    // Check rate limit before submitting
    if (rateLimitData?.isLimitReached) {
      setShowRateLimitNotification(true)
      return
    }

    setIsSubmitting(true)

    try {
      // Ensure we have test results before submitting
      let clientTestResults = []
      let clientPassedCount = 0
      let clientTotalCount = 0

      // Always run tests synchronously to get fresh results
      console.log('🚀 Running client-side tests for submission...')

      // Always check Pyodide readiness directly rather than relying on React state
      const { isPyodideReady, initializePyodide, executePyodideTests } = await import('@/lib/pyodideExecutor')

      let isPyodideActuallyReady = isPyodideReady()

      // If not ready, try to initialize it
      if (!isPyodideActuallyReady) {
        console.log('🔄 Pyodide not ready, initializing...')
        isPyodideActuallyReady = await initializePyodide()
      }

      console.log('🔍 Submission Pyodide check:', {
        isPyodideActuallyReady,
        functionName: (data.question as any).functionName
      })

      if (isPyodideActuallyReady && (data.question as any).functionName) {
        const testCasesResponse = await fetch(`/api/admin/questions/${data.question.id}/test-cases`)
        const testCasesData = await testCasesResponse.json()

        if (testCasesData.success) {
          const result = await executePyodideTests(
            code,
            (data.question as any).functionName,
            testCasesData.data
          )

          clientTestResults = result.results
          clientPassedCount = result.passedCount
          clientTotalCount = result.totalCount

          console.log(`📊 Client-side test results: ${clientPassedCount}/${clientTotalCount} passed`)

          // Also update the UI state
          setTestResults(result.results)
          setIsCorrect(result.passedCount === result.totalCount)
        } else {
          throw new Error('Failed to load test cases')
        }
      } else {
        throw new Error('Python environment not ready or function name missing')
      }

      const response = await fetch(`/api/student/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          questionId: data.question.id,
          code,
          clientTestResults: {
            results: clientTestResults,
            passedCount: clientPassedCount,
            totalCount: clientTotalCount,
            isCorrect: clientPassedCount === clientTotalCount
          }
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      console.log('Submit result:', result) // Debug log

      // Handle rate limit error
      if (result.rateLimited) {
        setRateLimitData(result.data)
        setShowRateLimitNotification(true)
        alert(result.message)
        return
      }

      if (result.success) {
        if (result.data.isCorrect) {
          // Clear saved code for correct submissions
          localStorage.removeItem(`code_${questionId}`)

          // Refresh rate limit status after successful submission
          await fetchRateLimitStatus()

          // Set success modal data
          setEarnedPoints(result.data.pointsEarned)
          setIsQuestComplete(!data.navigation.nextQuestionId)
          setSuccessMessage(result.message)
          setIsReviewQuestion(result.data.isFirstCorrectAttempt === false)
          setAchievementData(result.data.achievements)
          setShowSuccessModal(true)
        } else {
          // Show test results for incorrect submissions
          const testResults = result.data.testResults
          let message = `${testResults.summary}\n\n`

          if (testResults.visibleTests && testResults.visibleTests.length > 0) {
            message += "Visible test case results:\n"
            testResults.visibleTests.forEach((test: any, index: number) => {
              message += `Test ${index + 1}: ${test.passed ? '✅' : '❌'}\n`

              // AI Script Format - show description instead of input/output
              if (test.input === undefined || test.input === null) {
                message += `  Test: ${test.description || 'AI Test Script'}\n`
                message += `  Result: ${test.passed ? 'Passed' : 'Failed'}\n\n`
              } else {
                // Legacy Format - show input/output
                message += `  Input: ${test.input}\n`
                message += `  Expected: ${test.expected}\n`
                message += `  Got: ${test.actual}\n\n`
              }
            })
          }

          if (testResults.hasHiddenTests) {
            message += "Note: Some test cases are hidden to prevent cheating."
          }

          alert(message)
        }
      } else {
        console.error('Submit failed:', result.message)
        alert(`Failed to submit: ${result.message}`)
      }
    } catch (error) {
      console.error('Submit error:', error)
      alert(`Failed to submit. Please try again. Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsSubmitting(false)
    }
  }, [data, isSubmitting, code, questionId, rateLimitData, fetchRateLimitStatus])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'Enter') {
          e.preventDefault()
          if (e.shiftKey) {
            handleSubmit()
          } else {
            handleRunCode()
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleRunCode, handleSubmit])

  const handleReset = () => {
    if (data?.question.starterCode) {
      setCode(data.question.starterCode)
    } else {
      setCode('# Write your code here\n')
    }
    setOutput('')
    setError(null)
    setIsCorrect(null)
    localStorage.removeItem(`code_${questionId}`)
  }

  const handleToggleHint = () => {
    setShowHint(!showHint)
  }

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false)
  }

  // Resize handlers for splitter
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true)
    e.preventDefault()
  }

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return

    const rightPanel = document.querySelector('.right-panel') as HTMLElement
    if (rightPanel) {
      const rect = rightPanel.getBoundingClientRect()
      const relativeY = e.clientY - rect.top - 80 // Account for header height
      const newHeight = Math.max(200, Math.min(600, relativeY)) // Min 200px, max 600px
      setEditorHeight(newHeight)
    }
  }, [isResizing])

  const handleMouseUp = useCallback(() => {
    setIsResizing(false)
  }, [])

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'row-resize'

      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        document.body.style.cursor = 'default'
      }
    }
  }, [isResizing, handleMouseMove, handleMouseUp])

  const handleNextAction = () => {
    // Always invalidate quest cache when a question is completed to show updated progress
    invalidateQuests()

    if (data?.navigation.nextQuestionId) {
      // Go to next question
      router.push(`/student/challenge/${questId}/${data.navigation.nextQuestionId}`)
    } else {
      // Quest completed - redirect to quests page with completed quest info
      router.push(`/student/quests?completed=${questId}`)
    }
  }

  if (loading || pyodideInitializing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {loading ? 'Loading challenge...' : 'Initializing Python environment...'}
          </p>
          {pyodideInitializing && (
            <p className="text-sm text-gray-500 mt-2">
              🐍 Setting up Pyodide for real-time Python execution
            </p>
          )}
        </div>
      </div>
    )
  }

  if (pageError || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">❌</div>
          <p className="text-gray-600">{pageError || 'Challenge not found'}</p>
          <button
            onClick={() => router.push(`/student/quest/${questId}`)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Back to Quest
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <StudentHeader
        title={data.question.title}
        showBackButton={true}
        backUrl={`/student/quest/${questId}`}
        backText="Back to Quest"
      />

      {/* MVP-style Horizontal Layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Panel - Problem Description */}
        <div className="w-full lg:w-1/2 bg-white lg:border-r flex flex-col min-h-[300px] lg:min-h-0">
          <div className="p-6 border-b bg-white">
            <h3 className="text-xl font-semibold text-gray-800">Problem Description</h3>
          </div>
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="prose prose-sm max-w-none">
              <h4 className="text-lg font-medium text-gray-900 mb-4">{data.question.title}</h4>

              {data.question.description && (
                <div className="mb-6">
                  <h5 className="font-medium text-gray-700 mb-2">Description:</h5>
                  <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                    {data.question.description}
                  </p>
                </div>
              )}

              {data.question.task && (
                <div className="mb-6">
                  <h5 className="font-medium text-gray-700 mb-2">Task:</h5>
                  <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                    {data.question.task}
                  </p>
                </div>
              )}

              {data.question.expectedOutput && (
                <div className="mb-6">
                  <h5 className="font-medium text-gray-700 mb-2">Expected Output:</h5>
                  <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                    {data.question.expectedOutput}
                  </p>
                </div>
              )}

              {showHint && data.question.hint && (
                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h5 className="font-medium text-yellow-800 mb-2">💡 Hint:</h5>
                  <p className="text-yellow-700 whitespace-pre-wrap">{data.question.hint}</p>
                </div>
              )}

              {data.question.hint && (
                <button
                  onClick={handleToggleHint}
                  className="mb-4 text-sm text-blue-600 hover:text-blue-700 underline"
                >
                  {showHint ? 'Hide Hint' : 'Show Hint'}
                </button>
              )}

              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600 space-y-1">
                  <div><strong>Points:</strong> {data.question.points}</div>
                  <div><strong>Difficulty:</strong> {data.question.difficulty}</div>
                  <div><strong>Progress:</strong> Question {data.navigation.currentIndex + 1} of {data.quest.totalQuestions}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Solution */}
        <div className="w-full lg:w-1/2 bg-white flex flex-col right-panel min-h-[400px] lg:min-h-0">
          {/* Solution Header with Actions */}
          <div className="p-4 lg:p-6 border-b bg-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h3 className="text-lg lg:text-xl font-semibold text-gray-800">Your Solution</h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleReset}
                className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Reset
              </button>
              <button
                onClick={handleRunCode}
                disabled={isRunning || !pyodideReady}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRunning ? '⏳ Running...' : '▶️ Run Tests'}
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !code.trim()}
                className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? '⏳ Submitting...' : '✅ Submit'}
              </button>
            </div>
          </div>

          {/* Code Editor */}
          <div
            className="overflow-hidden"
            style={{
              height: `${editorHeight}px`,
              minHeight: '200px',
              maxHeight: `${editorHeight}px`
            }}
          >
            <CodeEditor
              value={code}
              onChange={setCode}
              height={`${editorHeight}px`}
            />
          </div>

          {/* Resizable Splitter */}
          <div
            className={`h-6 bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 border-y border-gray-300 cursor-row-resize hover:from-blue-100 hover:via-blue-200 hover:to-blue-100 hover:border-blue-300 flex items-center justify-center transition-all duration-200 ${
              isResizing ? 'from-blue-200 via-blue-300 to-blue-200 border-blue-400' : ''
            }`}
            onMouseDown={handleMouseDown}
            title="Drag to resize editor and test results"
          >
            <div className="flex items-center gap-1">
              <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
              <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
              <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
              <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
              <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
              <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
            </div>
          </div>

          {/* Test Results Panel */}
          <div
            className="flex flex-col bg-white"
            style={{
              height: `calc(100vh - 64px - ${editorHeight}px - 80px - 24px)`,
              minHeight: '150px',
              maxHeight: '400px'
            }}
          >
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
              <h4 className="text-lg font-medium text-gray-800">Test Results</h4>
              {testSummary && (
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  isCorrect === true ? 'bg-green-100 text-green-800' :
                  isCorrect === false ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {testSummary}
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {isRunning ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-gray-600 text-sm">Running tests...</p>
                  </div>
                </div>
              ) : testResults.length > 0 ? (
                <div className="space-y-3">
                  {testResults.map((result, index) => (
                    <div key={index} className={`p-3 rounded-lg border ${
                      result.passed ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                    }`}>
                      <div className="flex justify-between items-center mb-2">
                        <div className={`flex items-center gap-2 text-sm font-medium ${
                          result.passed ? 'text-green-800' : 'text-red-800'
                        }`}>
                          <span>{result.passed ? '✅' : '❌'}</span>
                          <span>Test {index + 1}</span>
                        </div>
                      </div>
                      <div className="text-sm space-y-1 font-mono text-gray-800">
                        {/* AI Script Format - show description */}
                        {result.inputs === undefined || result.inputs.length === 0 ? (
                          <>
                            {index === 0 ? (
                              // Test 1 - Show full details
                              <>
                                <div className="text-black"><strong>Test:</strong> {result.description}</div>
                                <div className="text-black"><strong>Result:</strong> {result.passed ? 'Passed ✅' : 'Failed ❌'}</div>
                                {result.scriptResult && (
                                  <div className="text-black"><strong>Details:</strong> {JSON.stringify(result.scriptResult)}</div>
                                )}
                              </>
                            ) : (
                              // Test 2+ - Show only pass/fail status
                              <div className="text-black text-center py-1">
                                {result.passed ? 'Passed ✅' : 'Failed ❌'}
                              </div>
                            )}
                          </>
                        ) : (
                          /* Legacy Format - show input/output */
                          <>
                            <div className="text-black"><strong>Input:</strong> {JSON.stringify(result.inputs)}</div>
                            <div className="text-black"><strong>Expected:</strong> {JSON.stringify(result.expectedOutput)}</div>
                            <div className="text-black"><strong>Got:</strong> {JSON.stringify(result.actualOutput)}</div>
                          </>
                        )}
                        {result.error && (
                          <div className="text-red-700"><strong>Error:</strong> {result.error}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : error ? (
                <div className="p-3 rounded-lg border border-red-200 bg-red-50">
                  <div className="text-red-700 font-medium mb-2">❌ Execution Error</div>
                  <div className="text-sm text-red-600 font-mono whitespace-pre-wrap">{error}</div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                  Click &quot;Run Tests&quot; to see results
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={handleSuccessModalClose}
        points={earnedPoints}
        isQuestComplete={isQuestComplete}
        nextAction={handleNextAction}
        message={successMessage}
        isReviewQuestion={isReviewQuestion}
        achievements={achievementData}
      />

      {/* Rate Limit Notification */}
      {showRateLimitNotification && rateLimitData && (
        <RateLimitNotification
          remainingSubmissions={rateLimitData.remainingSubmissions}
          maxSubmissions={rateLimitData.maxSubmissions}
          timeUntilResetSeconds={rateLimitData.timeUntilResetSeconds}
          onClose={() => setShowRateLimitNotification(false)}
        />
      )}
    </div>
  )
}