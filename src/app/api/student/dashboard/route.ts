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

    // If admin is viewing as student, show demo data
    if (session.role === 'admin') {
      return NextResponse.json({
        success: true,
        data: {
          user: {
            id: 'admin-demo',
            username: 'Admin (Demo View)',
            email: 'admin@demo.com',
            totalPoints: 150,
            currentLevel: 2,
            pointsToNextLevel: 50,
            levelProgress: 50,
            currentStreak: 3,
            maxStreak: 5,
            lastActive: new Date().toISOString()
          },
          stats: {
            totalQuests: 3,
            completedQuests: 1,
            completedQuestions: 5,
            achievements: 2
          },
          recentActivity: [
            {
              completed_at: new Date().toISOString(),
              questions: {
                title: 'Demo Question: Variables',
                quests: {
                  title: 'Python Basics'
                }
              }
            },
            {
              completed_at: new Date(Date.now() - 86400000).toISOString(),
              questions: {
                title: 'Demo Question: Functions',
                quests: {
                  title: 'Python Functions'
                }
              }
            }
          ],
          achievements: [
            {
              earned_at: new Date().toISOString(),
              achievements: {
                id: 'demo-1',
                name: 'First Steps',
                description: 'Complete your first challenge',
                icon: '🎯'
              }
            }
          ]
        }
      })
    }

    // Get user data with stats
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.id)
      .single()

    if (userError) {
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch user data'
      }, { status: 500 })
    }

    // Get student's enrolled subjects
    const { data: enrollments } = await supabase
      .from('student_subjects')
      .select('subject_id')
      .eq('student_id', session.id)

    const enrolledSubjectIds = enrollments?.map(e => e.subject_id) || []

    // Get total quests count (only from enrolled subjects)
    let totalQuests = 0
    if (enrolledSubjectIds.length > 0) {
      const { count } = await supabase
        .from('quests')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .in('subject_id', enrolledSubjectIds)
      totalQuests = count || 0
    }

    // Get completed quests count
    const { count: completedQuests } = await supabase
      .from('quest_progress')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', session.id)
      .eq('status', 'completed')

    // Get total questions completed from attempt_logs
    const { data: correctAttempts } = await supabase
      .from('attempt_logs')
      .select('question_id')
      .eq('user_id', session.id)
      .eq('is_correct', true)

    // Count unique questions completed
    const uniqueCompletedQuestions = new Set(correctAttempts?.map(a => a.question_id) || [])
    const completedQuestions = uniqueCompletedQuestions.size

    // Get recent activity from attempt_logs (last 5 unique correct submissions)
    const { data: recentAttempts } = await supabase
      .from('attempt_logs')
      .select(`
        submitted_at,
        question_id,
        questions (
          title,
          quests (
            title
          )
        )
      `)
      .eq('user_id', session.id)
      .eq('is_correct', true)
      .order('submitted_at', { ascending: false })
      .limit(20) // Get more to deduplicate

    // Deduplicate by question_id and take the most recent for each question
    const seenQuestions = new Set()
    const recentActivity = recentAttempts?.filter(attempt => {
      if (seenQuestions.has(attempt.question_id)) {
        return false
      }
      seenQuestions.add(attempt.question_id)
      return true
    }).slice(0, 5).map(attempt => ({
      completed_at: attempt.submitted_at,
      questions: attempt.questions
    })) || []

    // Get user's achievements
    const { data: userAchievements } = await supabase
      .from('user_achievements')
      .select(`
        earned_at,
        achievements (
          id,
          name,
          description,
          icon
        )
      `)
      .eq('user_id', session.id)

    // Calculate current level (every 100 points = 1 level)
    const currentLevel = Math.floor(user.total_points / 100) + 1
    const pointsToNextLevel = 100 - (user.total_points % 100)
    const levelProgress = ((user.total_points % 100) / 100) * 100

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          totalPoints: user.total_points,
          currentLevel,
          pointsToNextLevel,
          levelProgress,
          currentStreak: user.current_streak,
          maxStreak: user.max_streak,
          lastActive: user.last_active
        },
        stats: {
          totalQuests: totalQuests || 0,
          completedQuests: completedQuests || 0,
          completedQuestions: completedQuestions,
          achievements: userAchievements?.length || 0
        },
        recentActivity: recentActivity || [],
        achievements: userAchievements || []
      }
    }, {
      headers: {
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'Vary': 'Cookie'
      }
    })

  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
}