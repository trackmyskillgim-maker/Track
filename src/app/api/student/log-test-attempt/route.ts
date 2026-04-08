import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { AchievementChecker } from '@/lib/achievements'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || (session.role !== 'student' && session.role !== 'admin')) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 })
    }

    const body = await request.json()
    const { questionId, testResults } = body

    if (!questionId || !testResults) {
      return NextResponse.json({
        success: false,
        message: 'Missing required fields'
      }, { status: 400 })
    }

    // Get question details
    const { data: question, error: questionError } = await supabase
      .from('questions')
      .select('id, title')
      .eq('id', questionId)
      .single()

    if (questionError || !question) {
      return NextResponse.json({
        success: false,
        message: 'Question not found'
      }, { status: 404 })
    }

    // Calculate if this test run was successful
    const isCorrect = testResults.success && testResults.passedCount === testResults.totalCount

    // Get current attempt number for this question by this user
    const { count: existingAttempts } = await supabase
      .from('attempt_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', session.id)
      .eq('question_id', questionId)

    const attemptNumber = (existingAttempts || 0) + 1

    // Log the test attempt
    // Note: attempt_type column will be added in database migration
    const { error: logError } = await supabase
      .from('attempt_logs')
      .insert({
        user_id: session.id,
        question_id: questionId,
        attempt_number: attemptNumber,
        is_correct: isCorrect,
        submitted_at: new Date().toISOString(),
        attempt_type: 'test_run'  // Track test runs separately from submissions
      })

    if (logError) {
      console.error('Failed to log test attempt:', logError)
      return NextResponse.json({
        success: false,
        message: 'Failed to log test attempt'
      }, { status: 500 })
    }

    // Check for achievements after logging the test attempt
    let achievementResult = null
    try {
      // Check if this is the first time they're getting this question correct
      const isFirstCorrect = isCorrect && attemptNumber === 1

      achievementResult = await AchievementChecker.checkAchievements(
        session.id,
        questionId,
        isCorrect,
        isFirstCorrect
      )

      console.log('Achievement check result for test run:', achievementResult)
    } catch (achievementError) {
      console.error('Achievement checking failed for test run:', achievementError)
      // Don't fail the API call if achievement checking fails
    }

    return NextResponse.json({
      success: true,
      data: {
        attemptNumber,
        isCorrect,
        message: isCorrect ?
          `Great! All ${testResults.passedCount} tests passed on attempt ${attemptNumber}` :
          `${testResults.passedCount}/${testResults.totalCount} tests passed. Keep trying!`,
        achievements: achievementResult?.newAchievements || [],
        achievementPoints: achievementResult?.totalPointsEarned || 0
      }
    })

  } catch (error) {
    console.error('Test attempt logging error:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
}