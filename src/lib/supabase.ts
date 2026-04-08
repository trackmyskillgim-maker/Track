// Supabase client configuration
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types for our database tables
export interface User {
  id: string
  username: string
  email: string
  password_hash?: string
  role: 'student' | 'admin'
  roll_number?: string
  section?: string
  department?: string
  total_points: number
  current_level: number
  current_streak: number
  max_streak: number
  created_at: string
  last_active: string
  last_streak_date?: string
  is_active: boolean
}

export interface UserProgress {
  id: string
  user_id: string
  question_id: string
  completed: boolean
  score: number
  attempts: number
  best_score: number
  total_time_seconds: number
  best_time_seconds?: number
  first_attempt_correct: boolean
  first_attempt_at?: string
  completed_at?: string
  updated_at: string
}