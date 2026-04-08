import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST() {
  try {
    // Sample quests data
    const quests = [
      {
        title: 'Python Basics',
        description: 'Learn the fundamentals of Python programming',
        difficulty: 'Beginner',
        estimated_time: '30 minutes',
        order_index: 1,
        is_active: true
      },
      {
        title: 'Variables and Data Types',
        description: 'Master Python variables, strings, numbers, and basic operations',
        difficulty: 'Beginner',
        estimated_time: '45 minutes',
        order_index: 2,
        is_active: true
      },
      {
        title: 'Conditional Logic',
        description: 'Learn if statements, else, elif, and boolean logic',
        difficulty: 'Intermediate',
        estimated_time: '60 minutes',
        order_index: 3,
        is_active: true
      }
    ]

    // Check if quests already exist
    const { data: existingQuests } = await supabase
      .from('quests')
      .select('id, title')

    const questsData: any[] = existingQuests || []

    if (questsData.length === 0) {
      // Insert quests
      const { data: newQuests, error: questsError } = await supabase
        .from('quests')
        .insert(quests)
        .select()

      if (questsError) {
        throw new Error(`Failed to insert quests: ${questsError?.message || 'Unknown error'}`)
      }

      if (newQuests) {
        questsData.push(...newQuests)
      }
    }

    // Sample questions for each quest
    const questions = [
      // Python Basics Quest
      {
        quest_id: questsData![0].id,
        title: 'Hello World',
        description: 'Write your first Python program',
        task: 'Print "Hello, World!" to the console',
        starter_code: '# Write your code here\n',
        expected_output: 'Hello, World!',
        hint: 'Use the print() function to display text',
        points: 10,
        order_index: 1
      },
      {
        quest_id: questsData![0].id,
        title: 'Simple Math',
        description: 'Perform basic arithmetic operations',
        task: 'Calculate and print the result of 15 + 25',
        starter_code: '# Calculate 15 + 25\n',
        expected_output: '40',
        hint: 'Use the + operator for addition',
        points: 10,
        order_index: 2
      },
      // Variables Quest
      {
        quest_id: questsData![1].id,
        title: 'Create Variables',
        description: 'Learn to store data in variables',
        task: 'Create a variable named "name" with your name and print it',
        starter_code: '# Create a variable and print it\nname = \nprint(name)',
        expected_output: 'John|Jane|Student|Alice|Bob',
        hint: 'Assign a string value to the variable name',
        points: 15,
        order_index: 1
      },
      {
        quest_id: questsData![1].id,
        title: 'String Operations',
        description: 'Work with text data',
        task: 'Create two variables: first_name and last_name, then print them together',
        starter_code: '# Create name variables\nfirst_name = "John"\nlast_name = "Doe"\n# Print full name',
        expected_output: 'John Doe',
        hint: 'Use string concatenation with + or f-strings',
        points: 15,
        order_index: 2
      },
      // Conditional Logic Quest
      {
        quest_id: questsData![2].id,
        title: 'If Statement',
        description: 'Make decisions in your code',
        task: 'Write code that prints "Positive" if a number is greater than 0',
        starter_code: 'number = 5\n# Write your if statement here\n',
        expected_output: 'Positive',
        hint: 'Use if statement to check if number > 0',
        points: 20,
        order_index: 1
      }
    ]

    // Check if questions already exist
    const { data: existingQuestions } = await supabase
      .from('questions')
      .select('id')

    if (!existingQuestions || existingQuestions.length === 0) {
      // Insert questions
      const { error: questionsError } = await supabase
        .from('questions')
        .insert(questions)

      if (questionsError) {
        throw new Error(`Failed to insert questions: ${questionsError?.message || 'Unknown error'}`)
      }
    }

    // Sample achievements
    const achievements = [
      {
        code: 'first_steps',
        name: 'First Steps',
        description: 'Complete your first question',
        icon: '🎯',
        requirements: { type: 'complete_questions', count: 1 },
        points: 5,
        badge_tier: 'bronze'
      },
      {
        code: 'getting_started',
        name: 'Getting Started',
        description: 'Complete your first quest',
        icon: '🏆',
        requirements: { type: 'complete_quests', count: 1 },
        points: 10,
        badge_tier: 'bronze'
      },
      {
        code: 'point_collector',
        name: 'Point Collector',
        description: 'Earn your first 50 points',
        icon: '💎',
        requirements: { type: 'total_points', count: 50 },
        points: 15,
        badge_tier: 'silver'
      },
      {
        code: 'dedicated_learner',
        name: 'Dedicated Learner',
        description: 'Maintain a 3-day learning streak',
        icon: '🔥',
        requirements: { type: 'streak_days', count: 3 },
        points: 20,
        badge_tier: 'silver'
      }
    ]

    // Check if achievements already exist
    const { data: existingAchievements } = await supabase
      .from('achievements')
      .select('id')

    if (!existingAchievements || existingAchievements.length === 0) {
      // Insert achievements
      const { error: achievementsError } = await supabase
        .from('achievements')
        .insert(achievements)

      if (achievementsError) {
        throw new Error(`Failed to insert achievements: ${achievementsError?.message || 'Unknown error'}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Sample data inserted successfully',
      data: {
        quests: questsData!.length,
        questions: questions.length,
        achievements: achievements.length
      }
    })

  } catch (error) {
    console.error('Sample data setup error:', error)
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to setup sample data'
    }, { status: 500 })
  }
}