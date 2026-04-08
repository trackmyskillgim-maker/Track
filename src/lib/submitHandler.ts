import { invalidateDashboard } from './hooks/useStudentDashboard'
import { invalidateQuests, updateQuestProgress } from './hooks/useQuests'

interface SubmitResponse {
  success: boolean
  message: string
  data?: {
    isCorrect: boolean
    score: number
    pointsEarned: number
    isFirstCorrectAttempt: boolean
    questCompleted?: boolean
    newAchievement?: string
  }
}

export async function submitQuestion(
  questionId: string,
  questId: string,
  code: string,
  output: string,
  isCorrect: boolean
): Promise<SubmitResponse> {
  try {
    // Use the optimized endpoint
    const response = await fetch('/api/student/submit-optimized', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        questionId,
        code,
        output,
        isCorrect
      })
    })

    if (!response.ok) {
      throw new Error('Submission failed')
    }

    const result = await response.json()

    if (result.success && result.data?.isCorrect) {
      // Optimistically update quest progress
      if (result.data.questCompleted) {
        updateQuestProgress(questId, {
          status: 'completed',
          completionPercentage: 100
        })
      }

      // Invalidate caches to refresh data in background
      // These will refresh in the background without blocking the UI
      setTimeout(() => {
        invalidateDashboard()
        invalidateQuests()
      }, 100)
    }

    return result
  } catch (error) {
    console.error('Submit error:', error)
    return {
      success: false,
      message: 'Failed to submit answer'
    }
  }
}