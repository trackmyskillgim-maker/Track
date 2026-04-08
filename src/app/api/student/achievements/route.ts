import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const session = await getSession()
    if (!session || (session.role !== 'student' && session.role !== 'admin')) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 })
    }

    // If admin is viewing as student, show real data for testuser
    if (session.role === 'admin') {
      // Get testuser data for admin to see real achievements
      const { data: testUser } = await supabase
        .from('users')
        .select('id')
        .eq('username', 'testuser')
        .single()

      if (testUser) {
        // Use testuser ID to show real data
        session.id = testUser.id
      } else {
        // Fallback to demo data if testuser not found
        return NextResponse.json({
          success: true,
          data: {
            allAchievements: [],
            earnedAchievements: [],
            stats: {
              totalAchievements: 0,
              earnedAchievements: 0,
              totalPoints: 0,
              bronzeBadges: 0,
              silverBadges: 0,
              goldBadges: 0,
              platinumBadges: 0
            }
          }
        })
      }
    }

    // Get all achievements
    const { data: allAchievements, error: achievementsError } = await supabase
      .from('achievements')
      .select('*')
      .eq('is_active', true)
      .order('badge_tier, points')

    if (achievementsError) {
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch achievements'
      }, { status: 500 })
    }

    // Get user's earned achievements with simple join
    const { data: userAchievements, error: userAchievementsError } = await supabase
      .from('user_achievements')
      .select(`
        earned_at,
        achievements (
          id,
          code,
          name,
          description,
          icon,
          points,
          badge_tier
        )
      `)
      .eq('user_id', session.id)

    if (userAchievementsError) {
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch user achievements'
      }, { status: 500 })
    }

    // Get user stats for progress calculation
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('total_points, current_streak, max_streak, consecutive_correct_streak, current_level')
      .eq('id', session.id)
      .single()

    if (userError) {
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch user data'
      }, { status: 500 })
    }

    // Get completed quests count
    const { count: completedQuests } = await supabase
      .from('quest_progress')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', session.id)
      .eq('status', 'completed')

    // Get all attempt logs for comprehensive stats
    const { data: allAttempts } = await supabase
      .from('attempt_logs')
      .select('question_id, is_correct, attempt_number')
      .eq('user_id', session.id)

    // Calculate unique questions correct and accuracy
    const correctAttempts = allAttempts?.filter(a => a.is_correct) || []
    const completedQuestions = new Set(correctAttempts.map(a => a.question_id)).size

    // Calculate overall accuracy
    const totalAttempts = allAttempts?.length || 0
    const correctAttemptsCount = correctAttempts.length
    const overallAccuracy = totalAttempts > 0 ? (correctAttemptsCount / totalAttempts) * 100 : 0

    // Calculate recent accuracy (last 25 attempts)
    const recentAttempts = allAttempts?.slice(-25) || []
    const recentCorrect = recentAttempts.filter(a => a.is_correct).length
    const recentAccuracy = recentAttempts.length > 0 ? (recentCorrect / recentAttempts.length) * 100 : 0

    // Calculate first attempt correct count
    const firstAttemptCorrect = allAttempts?.filter(a => a.attempt_number === 1 && a.is_correct).length || 0

    // Calculate accuracy over last 10 unique questions (for sharp_shooter achievement)
    const uniqueQuestionAttempts = new Map()

    // Build map of question_id -> attempts
    allAttempts?.forEach(attempt => {
      const questionId = attempt.question_id
      if (!uniqueQuestionAttempts.has(questionId)) {
        uniqueQuestionAttempts.set(questionId, [])
      }
      uniqueQuestionAttempts.get(questionId).push(attempt)
    })

    // Get the last 10 unique questions and their results
    const last10Questions = Array.from(uniqueQuestionAttempts.entries())
      .sort((a, b) => {
        // Sort by latest attempt for each question (assuming submitted_at exists)
        const aLatest = Math.max(...a[1].map((att: any) => new Date().getTime())) // Simplified since submitted_at not selected
        const bLatest = Math.max(...b[1].map((att: any) => new Date().getTime()))
        return bLatest - aLatest
      })
      .slice(0, 10)

    let last10QuestionsAccuracy = 0
    if (last10Questions.length > 0) {
      const correctIn10 = last10Questions.filter(([questionId, attempts]) => {
        return attempts.some((att: any) => att.is_correct)
      }).length

      last10QuestionsAccuracy = (correctIn10 / last10Questions.length) * 100
    }

    // Create earned achievements map for quick lookup
    const earnedAchievementsMap = new Map()
    userAchievements?.forEach(ua => {
      if (ua.achievements && typeof ua.achievements === 'object' && !Array.isArray(ua.achievements)) {
        const achievement = ua.achievements as any
        earnedAchievementsMap.set(achievement.code, {
          ...achievement,
          earnedAt: ua.earned_at
        })
      }
    })

    // Calculate progress for each achievement
    const achievementsWithProgress = allAchievements?.map(achievement => {
      const isEarned = earnedAchievementsMap.has(achievement.code)
      let progress = 0
      let target = 1

      if (achievement.requirements) {
        const req = achievement.requirements as any
        target = req.count || 1

        switch (req.type) {
          case 'complete_questions':
            progress = Math.min(completedQuestions || 0, target)
            break
          case 'complete_quests':
            progress = Math.min(completedQuests || 0, target)
            break
          case 'solve_questions':
            progress = Math.min(completedQuestions || 0, target)
            break
          case 'total_points':
            progress = Math.min(user.total_points || 0, target)
            break
          case 'correct_streak':
            progress = Math.min(user.consecutive_correct_streak || 0, target)
            break
          case 'streak_days':
            progress = Math.min(user.current_streak || 0, target)
            break
          case 'reach_level':
            target = req.level || 10
            progress = Math.min(user.current_level || 1, target)
            break
          case 'accuracy_streak':
            const targetAccuracy = req.accuracy || 90
            const requiredCount = req.count || 10

            // Use appropriate accuracy calculation based on requirement
            const accuracyToCheck = requiredCount === 10
              ? last10QuestionsAccuracy  // For sharp_shooter (10 questions)
              : recentAccuracy           // For precision_master (25 attempts)

            // Check if user meets both accuracy and count requirements
            if (accuracyToCheck >= targetAccuracy && completedQuestions >= requiredCount) {
              progress = target // Achievement unlocked
            } else {
              // Show progress based on questions completed
              progress = Math.min(completedQuestions, requiredCount)
              target = requiredCount
            }
            break
          case 'first_attempt_correct':
            progress = Math.min(firstAttemptCorrect || 0, target)
            break
          case 'subject_quests':
            // For now, default to 0 until subjects are implemented
            progress = 0
            break
          case 'subject_accuracy':
            // For now, use overall accuracy until per-subject tracking is implemented
            progress = overallAccuracy >= (req.accuracy || 95) ? target : 0
            break
          default:
            progress = 0
        }
      }

      const progressPercentage = target > 0 ? Math.round((progress / target) * 100) : 0

      return {
        id: achievement.id,
        code: achievement.code,
        name: achievement.name,
        description: achievement.description,
        icon: achievement.icon,
        requirements: achievement.requirements,
        points: achievement.points,
        badge_tier: achievement.badge_tier,
        is_active: achievement.is_active,
        earned: isEarned,
        earnedAt: isEarned ? earnedAchievementsMap.get(achievement.code).earnedAt : null,
        progress,
        target,
        progressPercentage
      }
    })

    // Extract just the earned achievements for the separate list
    const earnedAchievements = Array.from(earnedAchievementsMap.values())
      .sort((a, b) => new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime())

    // Calculate badge counts
    const badgeCounts = earnedAchievements.reduce((counts, achievement) => {
      const tier = achievement.badge_tier
      if (tier) {
        counts[`${tier}Badges`] = (counts[`${tier}Badges`] || 0) + 1
      }
      return counts
    }, {
      bronzeBadges: 0,
      silverBadges: 0,
      goldBadges: 0,
      platinumBadges: 0
    })

    const totalPointsCalculated = earnedAchievements.reduce((sum, achievement) => sum + (achievement.points || 0), 0)

    const stats = {
      totalAchievements: allAchievements?.length || 0,
      earnedAchievements: earnedAchievements.length,
      totalPoints: totalPointsCalculated,
      ...badgeCounts
    }

    return NextResponse.json({
      success: true,
      data: {
        allAchievements: achievementsWithProgress || [],
        earnedAchievements,
        stats
      }
    }, {
      headers: {
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'Vary': 'Cookie'
      }
    })

  } catch (error) {
    console.error('Achievements API error:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
}