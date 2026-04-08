// Achievement Checking Service
// Comprehensive service for checking all achievement categories

import { supabase } from './supabase'

export interface AchievementTrigger {
  type: string
  count?: number
  accuracy?: number
  level?: number
  seconds?: number
  percentage?: number
  unique_questions?: boolean
  subject?: string
}

export interface UnlockedAchievement {
  id: string
  code: string
  name: string
  description: string
  icon: string
  points: number
  badge_tier: string
  category: string
}

export interface AchievementCheckResult {
  newAchievements: UnlockedAchievement[]
  totalPointsEarned: number
  streakBroken: boolean
  currentStreak: number
}

export class AchievementChecker {

  /**
   * Main function to check all achievements after a question submission
   */
  static async checkAchievements(
    userId: string,
    questionId: string,
    isCorrect: boolean,
    isFirstCorrect: boolean
  ): Promise<AchievementCheckResult> {

    const result: AchievementCheckResult = {
      newAchievements: [],
      totalPointsEarned: 0,
      streakBroken: false,
      currentStreak: 0
    }

    try {
      // Update streak counters first
      const streakResult = await this.updateStreakCounters(userId, isCorrect)
      result.streakBroken = streakResult.streakBroken
      result.currentStreak = streakResult.currentStreak

      // Get user data and stats needed for achievement checking
      const userStats = await this.getUserStats(userId)
      const questStats = await this.getQuestStats(userId)

      // Get all active achievements
      const { data: achievements } = await supabase
        .from('achievements')
        .select('*')
        .eq('is_active', true)

      if (!achievements) return result

      // Get already earned achievements to avoid duplicates
      const { data: earnedAchievements } = await supabase
        .from('user_achievements')
        .select('achievement_id')
        .eq('user_id', userId)

      const earnedIds = new Set(earnedAchievements?.map(ua => ua.achievement_id) || [])

      // Check each achievement category
      for (const achievement of achievements) {
        if (earnedIds.has(achievement.id)) continue

        const unlocked = await this.checkIndividualAchievement(
          achievement,
          userStats,
          questStats,
          isCorrect,
          isFirstCorrect
        )

        if (unlocked) {
          // Award the achievement
          await supabase
            .from('user_achievements')
            .insert({
              user_id: userId,
              achievement_id: achievement.id,
              earned_at: new Date().toISOString()
            })

          result.newAchievements.push({
            id: achievement.id,
            code: achievement.code,
            name: achievement.name,
            description: achievement.description,
            icon: achievement.icon,
            points: achievement.points,
            badge_tier: achievement.badge_tier,
            category: achievement.category || 'quest_completion'
          })

          result.totalPointsEarned += achievement.points
        }
      }

      // Update user points and level if any achievements were earned
      if (result.totalPointsEarned > 0) {
        const newTotalPoints = userStats.total_points + result.totalPointsEarned
        const newLevel = Math.floor(newTotalPoints / 100) + 1

        await supabase
          .from('users')
          .update({
            total_points: newTotalPoints,
            current_level: newLevel
          })
          .eq('id', userId)
      }

      return result

    } catch (error) {
      console.error('Achievement checking failed:', error)
      return result
    }
  }

  /**
   * Update consecutive correct streak counters
   */
  static async updateStreakCounters(userId: string, isCorrect: boolean) {
    const { data: user } = await supabase
      .from('users')
      .select('consecutive_correct_streak')
      .eq('id', userId)
      .single()

    let newStreak = 0
    let streakBroken = false

    if (isCorrect) {
      newStreak = (user?.consecutive_correct_streak || 0) + 1
    } else {
      streakBroken = (user?.consecutive_correct_streak || 0) > 0
      newStreak = 0
    }

    await supabase
      .from('users')
      .update({ consecutive_correct_streak: newStreak })
      .eq('id', userId)

    return { currentStreak: newStreak, streakBroken }
  }

  /**
   * Get comprehensive user statistics for achievement checking
   */
  static async getUserStats(userId: string) {
    // Get user basic data
    const { data: user } = await supabase
      .from('users')
      .select('total_points, current_level, consecutive_correct_streak')
      .eq('id', userId)
      .single()

    // Get completed questions count
    const { data: correctAttempts } = await supabase
      .from('attempt_logs')
      .select('question_id, submitted_at, is_correct')
      .eq('user_id', userId)
      .eq('is_correct', true)

    const uniqueQuestionsCorrect = new Set(correctAttempts?.map(a => a.question_id) || []).size

    // Get total attempts for accuracy calculation
    const { data: allAttempts } = await supabase
      .from('attempt_logs')
      .select('is_correct')
      .eq('user_id', userId)

    const totalAttempts = allAttempts?.length || 0
    const correctAttemptsCount = allAttempts?.filter(a => a.is_correct).length || 0
    const overallAccuracy = totalAttempts > 0 ? (correctAttemptsCount / totalAttempts) * 100 : 0

    // Get first attempt correct count
    const { data: firstAttempts } = await supabase
      .from('attempt_logs')
      .select('question_id, attempt_number, is_correct')
      .eq('user_id', userId)
      .eq('attempt_number', 1)
      .eq('is_correct', true)

    const firstAttemptCorrectCount = firstAttempts?.length || 0

    // Calculate accuracy over recent attempts (last 25)
    const recentAttempts = allAttempts?.slice(-25) || []
    const recentCorrect = recentAttempts.filter(a => a.is_correct).length
    const recentAccuracy = recentAttempts.length > 0 ? (recentCorrect / recentAttempts.length) * 100 : 0

    // Calculate accuracy over last 10 unique questions (for sharp_shooter achievement)
    const uniqueQuestionAttempts = new Map()

    // Build map of question_id -> latest attempt result
    allAttempts?.forEach((attempt: any) => {
      const questionId = attempt.question_id
      if (!uniqueQuestionAttempts.has(questionId)) {
        uniqueQuestionAttempts.set(questionId, [])
      }
      uniqueQuestionAttempts.get(questionId).push(attempt)
    })

    // Get the last 10 unique questions and their best results
    const last10Questions = Array.from(uniqueQuestionAttempts.entries())
      .sort((a, b) => {
        // Sort by latest attempt date for each question
        const aLatest = Math.max(...a[1].map((att: any) => new Date(att.submitted_at).getTime()))
        const bLatest = Math.max(...b[1].map((att: any) => new Date(att.submitted_at).getTime()))
        return bLatest - aLatest
      })
      .slice(0, 10)

    let last10QuestionsAccuracy = 0
    if (last10Questions.length > 0) {
      const correctIn10 = last10Questions.filter(([questionId, attempts]) => {
        // Check if any attempt for this question was correct
        return attempts.some((att: any) => att.is_correct)
      }).length

      last10QuestionsAccuracy = (correctIn10 / last10Questions.length) * 100
    }

    // Calculate Review & Persistence statistics
    const questionAttemptStats = new Map()

    // Group all attempts by question to analyze patterns
    allAttempts?.forEach((attempt: any) => {
      const questionId = attempt.question_id
      if (!questionAttemptStats.has(questionId)) {
        questionAttemptStats.set(questionId, {
          attempts: [],
          hasCorrect: false,
          hasIncorrect: false
        })
      }

      const stats = questionAttemptStats.get(questionId)
      stats.attempts.push(attempt)

      if (attempt.is_correct) {
        stats.hasCorrect = true
      } else {
        stats.hasIncorrect = true
      }
    })

    // Calculate review success count (questions solved after initially failing)
    let reviewSuccessCount = 0
    let debugFixesCount = 0
    let persistenceVictoryCount = 0
    let explorationQuestionsCount = 0
    let perfectAccuracyCount = 0

    questionAttemptStats.forEach((stats, questionId) => {
      const attempts = stats.attempts.sort((a: any, b: any) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime())

      if (attempts.length === 0) return

      // Perfect accuracy: solved on first try
      if (attempts.length === 1 && attempts[0].is_correct) {
        perfectAccuracyCount++
      }

      // Review success: has both incorrect and correct attempts, with correct after incorrect
      if (stats.hasCorrect && stats.hasIncorrect) {
        const firstAttempt = attempts[0]
        const hasCorrectAfterIncorrect = attempts.some((attempt: any, index: number) =>
          attempt.is_correct && index > 0 && attempts.slice(0, index).some((prev: any) => !prev.is_correct)
        )

        if (hasCorrectAfterIncorrect) {
          reviewSuccessCount++
        }
      }

      // Debug fixes: count total incorrect attempts that were later corrected
      if (stats.hasCorrect) {
        const incorrectCount = attempts.filter((a: any) => !a.is_correct).length
        debugFixesCount += incorrectCount
      }

      // Persistence victory: solved after 3+ attempts
      if (stats.hasCorrect && attempts.length >= 3) {
        persistenceVictoryCount++
      }

      // Exploration attempts: 5+ attempts on a question (shows exploration)
      if (attempts.length >= 5) {
        explorationQuestionsCount++
      }
    })

    return {
      ...user,
      total_points: user?.total_points || 0,
      current_level: user?.current_level || 1,
      consecutive_correct_streak: user?.consecutive_correct_streak || 0,
      uniqueQuestionsCorrect,
      overallAccuracy,
      recentAccuracy,
      last10QuestionsAccuracy,
      firstAttemptCorrectCount,
      totalAttempts,
      correctAttemptsCount,
      // New Review & Persistence stats
      reviewSuccessCount,
      debugFixesCount,
      persistenceVictoryCount,
      explorationQuestionsCount,
      perfectAccuracyCount
    }
  }

  /**
   * Get quest-related statistics
   */
  static async getQuestStats(userId: string) {
    // Get completed quests count
    const { count: completedQuests } = await supabase
      .from('quest_progress')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'completed')

    // Get quest completion by subject
    const { data: questsWithSubject } = await supabase
      .from('quest_progress')
      .select(`
        status,
        quests (subject, difficulty)
      `)
      .eq('user_id', userId)
      .eq('status', 'completed')

    const subjectStats: Record<string, number> = {}
    const difficultyStats: Record<string, number> = { Beginner: 0, Intermediate: 0, Advanced: 0 }

    questsWithSubject?.forEach(qp => {
      const quest = qp.quests as any
      if (quest?.subject) {
        subjectStats[quest.subject] = (subjectStats[quest.subject] || 0) + 1
      }
      if (quest?.difficulty) {
        difficultyStats[quest.difficulty] = (difficultyStats[quest.difficulty] || 0) + 1
      }
    })

    const completedAllDifficulties = difficultyStats.Beginner > 0 &&
                                    difficultyStats.Intermediate > 0 &&
                                    difficultyStats.Advanced > 0

    return {
      completedQuests: completedQuests || 0,
      subjectStats,
      difficultyStats,
      completedAllDifficulties
    }
  }

  /**
   * Check if an individual achievement should be unlocked
   */
  static async checkIndividualAchievement(
    achievement: any,
    userStats: any,
    questStats: any,
    isCorrect: boolean,
    isFirstCorrect: boolean
  ): Promise<boolean> {

    const requirements = achievement.requirements as AchievementTrigger

    if (!requirements.type) return false

    switch (requirements.type) {
      // A. Quest Completion
      case 'complete_quests':
        return questStats.completedQuests >= (requirements.count || 1)

      // B. Question Solving
      case 'solve_questions':
        return userStats.uniqueQuestionsCorrect >= (requirements.count || 1)

      // C. Accuracy Performance
      case 'accuracy_streak':
        const targetAccuracy = requirements.accuracy || 90
        const requiredCount = requirements.count || 10

        // Use appropriate accuracy calculation based on requirement
        const accuracyToCheck = requiredCount === 10
          ? userStats.last10QuestionsAccuracy  // For sharp_shooter (10 questions)
          : userStats.recentAccuracy           // For precision_master (25 attempts)

        return accuracyToCheck >= targetAccuracy &&
               userStats.uniqueQuestionsCorrect >= requiredCount

      case 'complete_all_difficulties':
        return questStats.completedAllDifficulties

      // D. Correct Answer Streaks
      case 'correct_streak':
        return userStats.consecutive_correct_streak >= (requirements.count || 5)

      // E. Level Milestones
      case 'reach_level':
        return userStats.current_level >= (requirements.level || 10)

      // F. Subject Mastery
      case 'subject_quests':
        if (requirements.subject) {
          const subjectCount = questStats.subjectStats[requirements.subject] || 0
          return subjectCount >= (requirements.count || 5)
        }
        return false

      case 'subject_accuracy':
        // This would need more complex logic to track per-subject accuracy
        // For now, use overall accuracy as approximation
        return userStats.overallAccuracy >= (requirements.accuracy || 95)

      // G. Special Achievements
      case 'complete_all_chapter_quests':
        // Assuming a chapter = all quests with same subject
        const subjects = Object.keys(questStats.subjectStats)
        return subjects.length >= 3 // At least 3 different subjects completed

      case 'complete_subjects':
        const completedSubjects = Object.values(questStats.subjectStats).filter((count: any) => count >= 5).length
        return completedSubjects >= (requirements.count || 5)

      case 'first_attempt_correct':
        return userStats.firstAttemptCorrectCount >= (requirements.count || 50)

      // H. Review & Persistence Achievements (NEW)
      case 'review_success':
        // Questions solved after initially failing them
        return userStats.reviewSuccessCount >= (requirements.count || 10)

      case 'debug_fixes':
        // Failed attempts that were later corrected
        return userStats.debugFixesCount >= (requirements.count || 50)

      case 'persistence_victory':
        // Questions solved after 3+ attempts
        return userStats.persistenceVictoryCount >= (requirements.count || 25)

      case 'exploration_attempts':
        // Questions with 5+ attempts each (showing exploration)
        return userStats.explorationQuestionsCount >= (requirements.count || 20)

      case 'perfect_accuracy':
        // Questions with 100% accuracy (solved on first try)
        return userStats.perfectAccuracyCount >= (requirements.count || 25)

      // Legacy types for backward compatibility
      case 'complete_questions':
        return userStats.uniqueQuestionsCorrect >= (requirements.count || 1)

      case 'total_points':
        return userStats.total_points >= (requirements.count || 100)

      case 'streak_days':
        return userStats.consecutive_correct_streak >= (requirements.count || 7)

      default:
        console.warn(`Unknown achievement type: ${requirements.type}`)
        return false
    }
  }

  /**
   * Get achievement progress for display purposes
   */
  static async getAchievementProgress(userId: string, achievementId: string) {
    const userStats = await this.getUserStats(userId)
    const questStats = await this.getQuestStats(userId)

    const { data: achievement } = await supabase
      .from('achievements')
      .select('*')
      .eq('id', achievementId)
      .single()

    if (!achievement) return null

    const requirements = achievement.requirements as AchievementTrigger
    let progress = 0
    let target = requirements.count || 1

    switch (requirements.type) {
      case 'complete_quests':
        progress = questStats.completedQuests
        break
      case 'solve_questions':
      case 'complete_questions':
        progress = userStats.uniqueQuestionsCorrect
        break
      case 'correct_streak':
        progress = userStats.consecutive_correct_streak
        break
      case 'reach_level':
        progress = userStats.current_level
        target = requirements.level || 10
        break
      case 'first_attempt_correct':
        progress = userStats.firstAttemptCorrectCount
        break
      case 'review_success':
        progress = userStats.reviewSuccessCount
        break
      case 'debug_fixes':
        progress = userStats.debugFixesCount
        break
      case 'persistence_victory':
        progress = userStats.persistenceVictoryCount
        break
      case 'exploration_attempts':
        progress = userStats.explorationQuestionsCount
        break
      case 'perfect_accuracy':
        progress = userStats.perfectAccuracyCount
        break
      default:
        progress = 0
    }

    const progressPercentage = target > 0 ? Math.min((progress / target) * 100, 100) : 0

    return {
      progress: Math.min(progress, target),
      target,
      progressPercentage
    }
  }
}

export default AchievementChecker