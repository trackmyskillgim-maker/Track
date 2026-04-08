import { supabase } from './supabase'

interface DailyStreakResult {
  streakUpdated: boolean
  newStreak: number
  maxStreakBroken: boolean
  isFirstActivityToday: boolean
}

export class DailyStreakChecker {

  /**
   * Check and update daily streak when student makes a correct submission
   * Only counts once per day (first correct submission)
   *
   * @param userId - User ID to update streak for
   * @returns Result of streak update operation
   */
  static async updateDailyStreak(userId: string): Promise<DailyStreakResult> {
    try {
      // Get user's current streak data
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('current_streak, max_streak, last_streak_date')
        .eq('id', userId)
        .single()

      if (userError || !user) {
        console.error('Failed to fetch user for daily streak:', userError)
        return {
          streakUpdated: false,
          newStreak: 0,
          maxStreakBroken: false,
          isFirstActivityToday: false
        }
      }

      // Get today's date (UTC midnight for consistency across timezones)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayString = today.toISOString().split('T')[0] // YYYY-MM-DD format

      // Get last streak date
      const lastStreakDate = user.last_streak_date
        ? new Date(user.last_streak_date)
        : null

      // If last streak date is today, don't update (already counted today)
      if (lastStreakDate) {
        const lastStreakString = new Date(lastStreakDate).toISOString().split('T')[0]
        if (lastStreakString === todayString) {
          return {
            streakUpdated: false,
            newStreak: user.current_streak || 0,
            maxStreakBroken: false,
            isFirstActivityToday: false
          }
        }
      }

      // Calculate new streak based on last activity date
      let newStreak = 1 // Default: start new streak

      if (lastStreakDate) {
        // Calculate yesterday's date
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayString = yesterday.toISOString().split('T')[0]

        const lastStreakString = new Date(lastStreakDate).toISOString().split('T')[0]

        if (lastStreakString === yesterdayString) {
          // Activity was yesterday → continue streak
          newStreak = (user.current_streak || 0) + 1
          console.log(`Daily streak continued: ${user.current_streak} → ${newStreak}`)
        } else {
          // Missed day(s) → reset streak to 1
          newStreak = 1
          console.log(`Daily streak reset (was ${user.current_streak}, missed days)`)
        }
      } else {
        // First ever activity → start at 1
        console.log('Starting first daily streak')
      }

      // Check if max streak was broken (new personal best)
      const currentMaxStreak = user.max_streak || 0
      const newMaxStreak = Math.max(newStreak, currentMaxStreak)
      const maxStreakBroken = newMaxStreak > currentMaxStreak

      if (maxStreakBroken) {
        console.log(`🎉 New personal best streak: ${currentMaxStreak} → ${newMaxStreak}`)
      }

      // Update user's streak data in database
      const { error: updateError } = await supabase
        .from('users')
        .update({
          current_streak: newStreak,
          max_streak: newMaxStreak,
          last_streak_date: todayString
        })
        .eq('id', userId)

      if (updateError) {
        console.error('Failed to update daily streak:', updateError)
        return {
          streakUpdated: false,
          newStreak: user.current_streak || 0,
          maxStreakBroken: false,
          isFirstActivityToday: false
        }
      }

      return {
        streakUpdated: true,
        newStreak,
        maxStreakBroken,
        isFirstActivityToday: true
      }

    } catch (error) {
      console.error('Daily streak update failed with exception:', error)
      return {
        streakUpdated: false,
        newStreak: 0,
        maxStreakBroken: false,
        isFirstActivityToday: false
      }
    }
  }

  /**
   * Check if user has activity today (for dashboard display)
   * Used to show "streak active today" indicator
   *
   * @param userId - User ID to check
   * @returns True if user has submitted today
   */
  static async hasActivityToday(userId: string): Promise<boolean> {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('last_streak_date')
        .eq('id', userId)
        .single()

      if (error || !user || !user.last_streak_date) {
        return false
      }

      const today = new Date().toISOString().split('T')[0]
      const lastStreakDate = new Date(user.last_streak_date).toISOString().split('T')[0]

      return today === lastStreakDate

    } catch (error) {
      console.error('Failed to check activity today:', error)
      return false
    }
  }
}
