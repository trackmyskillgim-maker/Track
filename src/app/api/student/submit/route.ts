import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { AchievementChecker, AchievementCheckResult } from '@/lib/achievements'
import { executeUniversalTests, validatePythonSyntax } from '@/lib/pythonExecutor.server'
import { DailyStreakChecker } from '@/lib/dailyStreak'

const MAX_SUBMISSIONS_PER_HOUR = 5

export async function POST(request: NextRequest) {
  try {
    console.log('Submit API called')

    const session = await getSession()
    if (!session || (session.role !== 'student' && session.role !== 'admin')) {
      console.log('Unauthorized access attempt')
      return NextResponse.json({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 })
    }

    const body = await request.json()
    const { questionId, code, clientTestResults } = body

    console.log('Submit data:', { questionId, codeLength: code?.length, hasClientResults: !!clientTestResults })

    if (!questionId || !code) {
      console.log('Missing required fields:', { questionId: !!questionId, code: !!code })
      return NextResponse.json({
        success: false,
        message: 'Missing required fields'
      }, { status: 400 })
    }

    // RATE LIMITING: Check successful submissions in the last hour (only for students)
    if (session.role === 'student') {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

      const { data: recentSuccessfulSubmissions, error: rateLimitError } = await supabase
        .from('attempt_logs')
        .select('id, submitted_at')
        .eq('user_id', session.id)
        .eq('is_correct', true)
        .eq('attempt_type', 'submission')
        .gte('submitted_at', oneHourAgo)

      if (rateLimitError) {
        console.error('Rate limit check error:', rateLimitError)
        // Continue anyway - don't block submission for rate limit check errors
      } else {
        const submissionsCount = recentSuccessfulSubmissions?.length || 0

        if (submissionsCount >= MAX_SUBMISSIONS_PER_HOUR) {
          // Calculate time until next available submission
          const oldestSubmission = recentSuccessfulSubmissions?.[recentSuccessfulSubmissions.length - 1]
          const oldestTime = new Date(oldestSubmission.submitted_at).getTime()
          const resetTime = oldestTime + 60 * 60 * 1000
          const timeUntilReset = Math.max(0, Math.ceil((resetTime - Date.now()) / 1000))

          console.log(`Rate limit reached for user ${session.id}: ${submissionsCount}/${MAX_SUBMISSIONS_PER_HOUR}`)

          return NextResponse.json({
            success: false,
            message: `Rate limit reached: You can only successfully submit ${MAX_SUBMISSIONS_PER_HOUR} questions per hour. Try again in ${Math.ceil(timeUntilReset / 60)} minutes.`,
            rateLimited: true,
            data: {
              submissionsCount,
              maxSubmissions: MAX_SUBMISSIONS_PER_HOUR,
              timeUntilResetSeconds: timeUntilReset
            }
          }, { status: 429 })
        }

        console.log(`Rate limit check passed: ${submissionsCount}/${MAX_SUBMISSIONS_PER_HOUR} submissions`)
      }
    }

    // Get question details and test cases
    const { data: question, error: questionError } = await supabase
      .from('questions')
      .select('points, quest_id, title, function_name')
      .eq('id', questionId)
      .single()

    if (questionError || !question) {
      return NextResponse.json({
        success: false,
        message: 'Question not found'
      }, { status: 404 })
    }

    // Get test cases for this question
    const { data: testCases, error: testCaseError } = await supabase
      .from('question_test_cases')
      .select('input, expected_output, is_visible, description')
      .eq('question_id', questionId)
      .order('order_index')

    if (testCaseError || !testCases || testCases.length === 0) {
      console.error('No test cases found:', testCaseError)
      return NextResponse.json({
        success: false,
        message: 'Question has no test cases configured'
      }, { status: 500 })
    }

    // Use client-side test results if available (MVP Pyodide execution)
    let testResults
    if (clientTestResults) {
      console.log('✅ Using client-side Pyodide test results')
      testResults = {
        success: true,
        passedCount: clientTestResults.passedCount,
        totalCount: clientTestResults.totalCount,
        results: clientTestResults.results
      }
    } else {
      console.log('⚠️ No client results provided, falling back to server-side execution')

      // Validate code syntax first for better error messages
      const syntaxValidation = await validatePythonSyntax(code)
      if (!syntaxValidation.valid) {
        return NextResponse.json({
          success: false,
          message: 'Python syntax error',
          error: syntaxValidation.error,
          testResults: {
            passedCount: 0,
            totalCount: testCases.length,
            results: []
          }
        }, { status: 400 })
      }

      // Ensure function_name is available
      if (!question.function_name) {
        return NextResponse.json({
          success: false,
          message: 'This question is missing function name configuration. Please contact your instructor.'
        }, { status: 500 })
      }

      // Execute code using the server-side universal grading system as fallback
      testResults = await executeUniversalTests(
        code,
        question.function_name,
        testCases.map(tc => ({
          input: tc.input,
          expectedOutput: tc.expected_output,
          description: tc.description
        })),
        10000 // 10 second timeout
      )
    }

    // Handle universal grading system errors
    if (!testResults.success && testResults.overallError) {
      return NextResponse.json({
        success: false,
        message: 'Code execution error',
        error: testResults.overallError,
        testResults: {
          passedCount: 0,
          totalCount: testCases.length,
          results: []
        }
      }, { status: 400 })
    }

    const isCorrect = testResults.success && testResults.passedCount === testResults.totalCount

    console.log('Universal Test execution result:', {
      success: testResults.success,
      passed: testResults.passedCount,
      total: testResults.totalCount,
      isCorrect,
      executionTime: testResults.totalExecutionTime
    })

    // Check if user already has progress for this question
    const { data: existingProgress, error: progressError } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', session.id)
      .eq('question_id', questionId)
      .maybeSingle() // Use maybeSingle to avoid error if no record exists

    // Log for debugging
    console.log('Existing progress:', existingProgress)
    if (progressError) {
      console.log('Progress query error (this may be normal for new questions):', progressError)
    }

    const now = new Date().toISOString()
    const score = isCorrect ? question.points : 0
    let pointsToAward = 0
    let isFirstCorrectAttempt = false
    let userMessage = 'Attempt recorded'

    // Check if user has already completed this question correctly before (BEFORE logging current attempt)
    // FIXED: Only check for previous SUBMISSIONS, not test runs
    if (isCorrect) {
      const { data: previousCorrectAttempts } = await supabase
        .from('attempt_logs')
        .select('id, submitted_at')
        .eq('user_id', session.id)
        .eq('question_id', questionId)
        .eq('is_correct', true)
        .eq('attempt_type', 'submission')  // Only count previous submissions, not test runs
        .order('submitted_at', { ascending: true })

      isFirstCorrectAttempt = !previousCorrectAttempts || previousCorrectAttempts.length === 0
      pointsToAward = isFirstCorrectAttempt ? score : 0

      // Set appropriate user message
      if (isFirstCorrectAttempt) {
        userMessage = `Great job! You earned ${pointsToAward} XP for solving this question!`
      } else {
        userMessage = "You've already mastered this question! No points awarded, but great review practice!"
      }

      console.log(`Question ${questionId}: Previous correct attempts:`, JSON.stringify(previousCorrectAttempts, null, 2))
      console.log(`Question ${questionId}: First correct attempt? ${isFirstCorrectAttempt}, Points to award: ${pointsToAward}`)
    }

    // Note: We don't use user_progress table (it has schema issues with status column)
    // Instead, we use attempt_logs as source of truth and calculate quest_progress from it
    // This architecture is simpler and more reliable

    // Log the attempt (AFTER checking for previous attempts)
    const { error: logError } = await supabase
      .from('attempt_logs')
      .insert({
        user_id: session.id,
        question_id: questionId,
        attempt_number: (existingProgress?.attempts || 0) + 1,
        is_correct: isCorrect,
        submitted_at: now,
        attempt_type: 'submission'  // Mark submissions differently from test runs
      })

    if (logError) {
      console.error('Failed to log attempt:', logError)
      // Don't fail the request for logging errors
    }

    // Update quest progress and user stats if submission was successful
    if (isCorrect) {
      try {

        // ✨ Update daily streak on first correct submission of the day
        const dailyStreakResult = await DailyStreakChecker.updateDailyStreak(session.id)

        console.log('Daily streak update:', {
          streakUpdated: dailyStreakResult.streakUpdated,
          newStreak: dailyStreakResult.newStreak,
          maxStreakBroken: dailyStreakResult.maxStreakBroken,
          isFirstActivityToday: dailyStreakResult.isFirstActivityToday
        })

        // Only update user total points if this is their first correct submission
        if (isFirstCorrectAttempt) {
          const { data: currentUser } = await supabase
            .from('users')
            .select('total_points')
            .eq('id', session.id)
            .single()

          if (currentUser) {
            const newTotalPoints = currentUser.total_points + pointsToAward
            const newLevel = Math.floor(newTotalPoints / 100) + 1

            await supabase
              .from('users')
              .update({
                total_points: newTotalPoints,
                current_level: newLevel
              })
              .eq('id', session.id)
          }
        }

        // Update or create quest progress
        const { data: questProgress } = await supabase
          .from('quest_progress')
          .select('*')
          .eq('user_id', session.id)
          .eq('quest_id', question.quest_id)
          .maybeSingle()

        // Count completed questions in this quest using attempt_logs
        const { data: completedQuestionsData } = await supabase
          .from('attempt_logs')
          .select('question_id, questions!inner(quest_id, points)')
          .eq('user_id', session.id)
          .eq('is_correct', true)
          .eq('questions.quest_id', question.quest_id)

        // Get unique completed questions (a student might have multiple correct attempts)
        const uniqueCompletedQuestions = new Map()
        completedQuestionsData?.forEach(log => {
          if (log.questions && typeof log.questions === 'object' && !Array.isArray(log.questions) && !uniqueCompletedQuestions.has(log.question_id)) {
            const questionData = log.questions as { quest_id: string; points: number }
            uniqueCompletedQuestions.set(log.question_id, questionData.points)
          }
        })

        const completedInQuest = uniqueCompletedQuestions.size
        const totalScore = Array.from(uniqueCompletedQuestions.values()).reduce((sum, points) => sum + points, 0)

        console.log(`Quest ${question.quest_id}: Found ${completedInQuest} completed questions, total score: ${totalScore}`)

        // Get total questions in quest
        const { data: totalQuestionsData } = await supabase
          .from('questions')
          .select('points')
          .eq('quest_id', question.quest_id)
          .eq('is_active', true)

        const totalQuestions = totalQuestionsData?.length || 0
        const maxScore = totalQuestionsData?.reduce((sum, q) => sum + q.points, 0) || 0
        const completionPercentage = totalQuestions > 0 ? (completedInQuest / totalQuestions) * 100 : 0

        if (questProgress) {
          // Update existing quest progress
          await supabase
            .from('quest_progress')
            .update({
              questions_completed: completedInQuest,
              total_questions: totalQuestions,  // FIXED: Added missing field
              total_score: totalScore,
              max_possible_score: maxScore,
              completion_percentage: completionPercentage,
              updated_at: now
            })
            .eq('user_id', session.id)
            .eq('quest_id', question.quest_id)
        } else {
          // Create new quest progress
          await supabase
            .from('quest_progress')
            .insert({
              user_id: session.id,
              quest_id: question.quest_id,
              questions_completed: completedInQuest,
              total_questions: totalQuestions,
              total_score: totalScore,
              max_possible_score: maxScore,
              completion_percentage: completionPercentage,
              is_unlocked: true,
              started_at: now,
              updated_at: now
            })
        }
      } catch (progressError) {
        console.error('Quest progress update failed:', progressError)
        // Don't fail the submission for progress update errors
      }
    }

    // Comprehensive achievement checking
    let achievementResult: AchievementCheckResult = {
      newAchievements: [],
      totalPointsEarned: 0,
      streakBroken: false,
      currentStreak: 0
    }

    try {
      achievementResult = await AchievementChecker.checkAchievements(
        session.id,
        questionId,
        isCorrect,
        isFirstCorrectAttempt
      )

      console.log('Achievement check result:', {
        newAchievements: achievementResult.newAchievements.length,
        totalPointsEarned: achievementResult.totalPointsEarned,
        currentStreak: achievementResult.currentStreak
      })
    } catch (achievementError) {
      console.error('Achievement check failed:', achievementError)
      // Don't fail the submission for achievement errors
    }

    // Calculate final points earned (will be 0 if already completed)
    const finalPointsEarned = isCorrect ? (pointsToAward || 0) : 0

    // Create test results summary for student with enhanced error handling
    const visibleTestResults = testResults.results
      .filter((result: any, index: number) => testCases[index]?.is_visible)
      .map((result: any) => ({
        input: result.input,
        expected: result.expectedOutput,
        actual: result.actualOutput,
        passed: result.passed,
        error: result.error,
        executionTime: result.executionTime
      }))

    const testSummary = isCorrect
      ? `All ${testResults.totalCount} test cases passed! ✅`
      : `${testResults.passedCount}/${testResults.totalCount} test cases passed`

    console.log('Submit successful:', { isCorrect, score, pointsEarned: finalPointsEarned })

    return NextResponse.json({
      success: true,
      message: isCorrect ? userMessage : testSummary,
      data: {
        isCorrect,
        score,
        pointsEarned: finalPointsEarned,
        isFirstCorrectAttempt: isCorrect ? isFirstCorrectAttempt : false,
        testResults: {
          passed: testResults.passedCount,
          total: testResults.totalCount,
          summary: testSummary,
          visibleTests: visibleTestResults,
          hasHiddenTests: testCases.some(tc => !tc.is_visible)
        },
        achievements: {
          newAchievements: achievementResult.newAchievements,
          totalAchievementPoints: achievementResult.totalPointsEarned,
          currentStreak: achievementResult.currentStreak,
          streakBroken: achievementResult.streakBroken
        }
      }
    })

  } catch (error) {
    console.error('Submit API error:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
}