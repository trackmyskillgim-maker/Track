'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useFilterOptions } from '@/lib/hooks/useFilterOptions'
import { useAdminAnalytics } from '@/lib/hooks/useAdminAnalytics'
import AdminHeader from '@/components/admin/AdminHeader'
import InfoTooltip from '@/components/common/InfoTooltip'

interface EnhancedAnalyticsData {
  overview: {
    totalStudents: number
    totalQuests: number
    totalQuestions: number
    totalSubmissions: number
    averageCompletionRate: number
    averageParticipationRate: number
  }
  questAnalytics: Array<{
    id: string
    title: string
    difficulty: string
    total_questions: number
    students_attempted: number
    students_completed_quest: number
    true_completion_rate: number
    question_completion_rate: number
    participation_rate: number
    participation_category: string
    difficulty_assessment: string
  }>
  highParticipationQuests: Array<any>
  lowParticipationQuests: Array<any>
  topPerformers: Array<{
    username: string
    total_score: number
    completed_questions: number
    quests_participated: number
    quests_completed: number
  }>
  recentActivity: Array<{
    // New RPC field names
    username?: string
    questTitle?: string
    questionTitle?: string
    points?: number
    timestamp?: string
    isCorrect?: boolean
    // Legacy field names (for backwards compatibility)
    student?: string
    quest?: string
    question?: string
    score?: number
    completed_at?: string
  }>
  dailyActivity: Array<{
    date: string
    completions: number
  }>
  classInsights: {
    students_not_started: number
    avg_questions_per_active_student: number
  }
  participationStats: {
    avg_participation_rate: number
    median_participation_rate: number
  }
}

export default function AdminAnalytics() {
  // Applied filters (used for API calls)
  const [appliedBatch, setAppliedBatch] = useState<string>('all')
  const [appliedCourse, setAppliedCourse] = useState<string>('all')
  const [appliedSection, setAppliedSection] = useState<string>('all')
  const [appliedSubject, setAppliedSubject] = useState<string>('all')

  // Temporary filters (user selection before applying)
  const [selectedBatch, setSelectedBatch] = useState<string>('all')
  const [selectedCourse, setSelectedCourse] = useState<string>('all')
  const [selectedSection, setSelectedSection] = useState<string>('all')
  const [selectedSubject, setSelectedSubject] = useState<string>('all')

  // Fetch subjects for dropdown
  const [subjects, setSubjects] = useState<Array<{ id: string; name: string; subject_code: string }>>([])
  const [subjectsLoading, setSubjectsLoading] = useState(false)

  useEffect(() => {
    const fetchSubjects = async () => {
      setSubjectsLoading(true)
      try {
        const response = await fetch('/api/admin/subjects/my-subjects')
        const data = await response.json()
        if (data.success) {
          const subjectsData = Array.isArray(data.data) ? data.data : (data.data?.subjects || [])
          setSubjects(subjectsData)
        }
      } catch (error) {
        console.error('Failed to fetch subjects:', error)
        setSubjects([])
      } finally {
        setSubjectsLoading(false)
      }
    }
    fetchSubjects()
  }, [])

  const { filterOptions, isLoading: filterOptionsLoading } = useFilterOptions()
  const { data: analyticsData, isLoading: loading, isError, mutate } = useAdminAnalytics(
    appliedBatch,
    appliedCourse,
    appliedSection,
    appliedSubject
  )
  const router = useRouter()

  const handleApplyFilters = () => {
    setAppliedBatch(selectedBatch)
    setAppliedCourse(selectedCourse)
    setAppliedSection(selectedSection)
    setAppliedSubject(selectedSubject)
  }

  const handleClearFilters = () => {
    setSelectedBatch('all')
    setSelectedCourse('all')
    setSelectedSection('all')
    setSelectedSubject('all')
    setAppliedBatch('all')
    setAppliedCourse('all')
    setAppliedSection('all')
    setAppliedSubject('all')
  }

  const hasUnappliedChanges =
    selectedBatch !== appliedBatch ||
    selectedCourse !== appliedCourse ||
    selectedSection !== appliedSection ||
    selectedSubject !== appliedSubject

  const error = isError ? 'Failed to load analytics data' : null

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <AdminHeader title="Analytics Dashboard" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-300">Loading analytics data...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <AdminHeader title="Analytics Dashboard" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded mb-6">
            {error}
          </div>
        </div>
      </div>
    )
  }

  if (!analyticsData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <AdminHeader title="Analytics Dashboard" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📊</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2 dark:text-white">No Analytics Data Available</h3>
            <p className="text-gray-600 dark:text-gray-300">Start adding students and quests to see analytics.</p>
          </div>
        </div>
      </div>
    )
  }

  const data = analyticsData as EnhancedAnalyticsData

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AdminHeader title="Analytics Dashboard" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Professor Analytics Dashboard</h2>
          <p className="text-gray-600 dark:text-gray-300">Comprehensive insights into student learning progress and engagement</p>
        </div>

        {/* Filter Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Filter Analytics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Year Filter */}
            <div>
              <label htmlFor="batch-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Batch
              </label>
              <select
                id="batch-filter"
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 dark:bg-gray-700 dark:text-white"
                disabled={filterOptionsLoading}
              >
                <option value="all">All Batches</option>
                {filterOptions?.batches.map((batch) => (
                  <option key={batch} value={batch}>{batch}</option>
                ))}
              </select>
            </div>

            {/* Course Filter */}
            <div>
              <label htmlFor="course-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Course
              </label>
              <select
                id="course-filter"
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 dark:bg-gray-700 dark:text-white"
                disabled={filterOptionsLoading}
              >
                <option value="all">All Courses</option>
                {filterOptions?.courses.map((course) => (
                  <option key={course} value={course}>{course}</option>
                ))}
              </select>
            </div>

            {/* Section Filter */}
            <div>
              <label htmlFor="section-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Section
              </label>
              <select
                id="section-filter"
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 dark:bg-gray-700 dark:text-white"
                disabled={filterOptionsLoading}
              >
                <option value="all">All Sections</option>
                {filterOptions?.sections.map((section) => (
                  <option key={section} value={section}>Section {section}</option>
                ))}
              </select>
            </div>

            {/* Subject Filter */}
            <div>
              <label htmlFor="subject-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Subject
              </label>
              <select
                id="subject-filter"
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 dark:bg-gray-700 dark:text-white"
                disabled={subjectsLoading}
              >
                <option value="all">All Subjects</option>
                {subjects?.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name} {subject.subject_code ? `(${subject.subject_code})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Apply and Clear Filters Buttons */}
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={handleApplyFilters}
              disabled={!hasUnappliedChanges}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Apply Filters
              {hasUnappliedChanges && (
                <span className="inline-flex items-center justify-center w-2 h-2 bg-yellow-400 rounded-full"></span>
              )}
            </button>

            {(appliedBatch !== 'all' || appliedCourse !== 'all' || appliedSection !== 'all' || appliedSubject !== 'all') && (
              <button
                onClick={handleClearFilters}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md text-sm font-medium transition-colors"
              >
                Clear All Filters
              </button>
            )}
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="text-3xl font-bold text-blue-900">{data.overview?.totalStudents || 0}</div>
            <div className="text-sm text-gray-900 flex items-center">
              Total Students
              <InfoTooltip tooltip={`${data.overview?.totalStudents || 0} students are registered on the platform`} />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="text-3xl font-bold text-green-900">{data.overview?.totalQuests || 0}</div>
            <div className="text-sm text-gray-900 flex items-center">
              Active Quests
              <InfoTooltip tooltip={`${data.overview?.totalQuests || 0} quests are currently available for students`} />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="text-3xl font-bold text-purple-900">{data.overview?.totalQuestions || 0}</div>
            <div className="text-sm text-gray-900 flex items-center">
              Total Questions
              <InfoTooltip tooltip={`${data.overview?.totalQuestions || 0} questions across all ${data.overview?.totalQuests || 0} quests`} />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="text-3xl font-bold text-orange-900">{data.overview?.totalSubmissions || 0}</div>
            <div className="text-sm text-gray-900 flex items-center">
              Correct Submissions
              <InfoTooltip tooltip={`Students have answered ${data.overview?.totalSubmissions || 0} questions correctly in total`} />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="text-3xl font-bold text-red-900">{data.overview?.averageCompletionRate || 0}%</div>
            <div className="text-sm text-gray-900 flex items-center">
              Avg Quest Completion
              <InfoTooltip tooltip={`On average, ${data.overview?.averageCompletionRate || 0}% of students complete each quest`} />
            </div>
          </div>
        </div>

        {/* Class Overview */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <span className="mr-2">🎓</span>
            Class Overview
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-900">{data.overview?.averageParticipationRate || 0}%</div>
              <div className="text-sm text-blue-900 flex items-center justify-center">
                Average Participation Rate
                <InfoTooltip tooltip={`On average, ${data.overview?.averageParticipationRate || 0}% of students attempt at least one question in each quest`} />
              </div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-900">{data.classInsights?.avg_questions_per_active_student?.toFixed(1) || '0.0'}</div>
              <div className="text-sm text-green-900 flex items-center justify-center">
                Avg Questions per Active Student
                <InfoTooltip tooltip={`Active students complete an average of ${data.classInsights?.avg_questions_per_active_student?.toFixed(1) || '0.0'} questions each`} />
              </div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-900">{Math.round((data.overview?.totalSubmissions || 0) / (data.overview?.totalStudents || 1) * 100) / 100}</div>
              <div className="text-sm text-purple-900 flex items-center justify-center">
                Avg Submissions per Student
                <InfoTooltip tooltip={`Each of the ${data.overview?.totalStudents || 0} students has submitted an average of ${Math.round((data.overview?.totalSubmissions || 0) / (data.overview?.totalStudents || 1) * 100) / 100} correct answers`} />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* High Participation Quests */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                <span className="mr-2">🔥</span>
                Popular Quests (High Participation)
              </h3>
              <div className="space-y-4">
                {data.highParticipationQuests?.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No high participation quests yet</p>
                ) : (
                  data.highParticipationQuests?.map((quest) => (
                    <div key={quest.id} className="border border-green-200 bg-green-50 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <h5 className="font-medium text-gray-900">{quest.title}</h5>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${
                            quest.difficulty?.toLowerCase() === 'beginner' ? 'bg-green-500' :
                            quest.difficulty?.toLowerCase() === 'intermediate' ? 'bg-yellow-500' :
                            quest.difficulty?.toLowerCase() === 'advanced' ? 'bg-red-500' : 'bg-gray-500'
                          }`}>
                            {quest.difficulty || 'Unknown'}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div>
                          <span className="text-gray-600 dark:text-gray-300 flex items-center">
                            Participation:
                            <InfoTooltip tooltip={`${quest.students_attempted} out of ${data.overview?.totalStudents} students attempted at least one question in this quest`} />
                          </span>
                          <span className="font-medium text-green-600 ml-1">{quest.participation_rate?.toFixed(1)}%</span>
                          <div className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">{quest.students_attempted} of {data.overview?.totalStudents} students</div>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-300 flex items-center">
                            Progress:
                            <InfoTooltip tooltip={`${quest.question_completion_rate?.toFixed(1)}% of all questions in this quest have been answered correctly by at least one student`} />
                          </span>
                          <span className="font-medium text-blue-600 ml-1">{quest.question_completion_rate?.toFixed(1)}%</span>
                          <div className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">questions answered</div>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-300 flex items-center">
                            Finished:
                            <InfoTooltip tooltip={`Of all ${data.overview?.totalStudents} students in the class, ${quest.students_completed_quest} (${quest.true_completion_rate?.toFixed(1)}%) completed ALL questions in this quest`} />
                          </span>
                          <span className="font-medium text-purple-600 ml-1">{quest.true_completion_rate?.toFixed(1)}%</span>
                          <div className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">{quest.students_completed_quest} students done</div>
                        </div>
                      </div>
                      <div className="mt-2">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="h-2 rounded-full bg-green-500"
                            style={{ width: `${Math.min(quest.participation_rate || 0, 100)}%` }}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {quest.total_questions} questions • Difficulty: {quest.difficulty}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Low Participation Quests */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                <span className="mr-2">📉</span>
                Quests Needing Attention (Low Participation)
              </h3>
              <div className="space-y-4">
                {data.lowParticipationQuests?.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">All quests have good participation!</p>
                ) : (
                  data.lowParticipationQuests?.map((quest) => (
                    <div key={quest.id} className="border border-orange-200 bg-orange-50 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <h5 className="font-medium text-gray-900">{quest.title}</h5>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${
                            quest.difficulty?.toLowerCase() === 'beginner' ? 'bg-green-500' :
                            quest.difficulty?.toLowerCase() === 'intermediate' ? 'bg-yellow-500' :
                            quest.difficulty?.toLowerCase() === 'advanced' ? 'bg-red-500' : 'bg-gray-500'
                          }`}>
                            {quest.difficulty || 'Unknown'}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div>
                          <span className="text-gray-600 dark:text-gray-300 flex items-center">
                            Participation:
                            <InfoTooltip tooltip={`${quest.students_attempted} out of ${data.overview?.totalStudents} students attempted at least one question in this quest`} />
                          </span>
                          <span className="font-medium text-orange-600 ml-1">{quest.participation_rate?.toFixed(1)}%</span>
                          <div className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">{quest.students_attempted} of {data.overview?.totalStudents} students</div>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-300 flex items-center">
                            Progress:
                            <InfoTooltip tooltip={`${quest.question_completion_rate?.toFixed(1)}% of all questions in this quest have been answered correctly by at least one student`} />
                          </span>
                          <span className="font-medium text-blue-600 ml-1">{quest.question_completion_rate?.toFixed(1)}%</span>
                          <div className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">questions answered</div>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-300 flex items-center">
                            Finished:
                            <InfoTooltip tooltip={`Of all ${data.overview?.totalStudents} students in the class, ${quest.students_completed_quest} (${quest.true_completion_rate?.toFixed(1)}%) completed ALL questions in this quest`} />
                          </span>
                          <span className="font-medium text-purple-600 ml-1">{quest.true_completion_rate?.toFixed(1)}%</span>
                          <div className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">{quest.students_completed_quest} students done</div>
                        </div>
                      </div>
                      <div className="mt-2">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="h-2 rounded-full bg-orange-500"
                            style={{ width: `${Math.max(quest.participation_rate || 0, 5)}%` }}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {quest.total_questions} questions • Difficulty: {quest.difficulty}
                        </div>
                      </div>
                      {quest.participation_rate === 0 && (
                        <div className="mt-2 p-2 bg-red-100 rounded text-xs text-red-700">
                          💡 Consider reviewing quest content or prerequisites
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Student Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
          {/* Top Performers */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <span className="mr-2">🏆</span>
              Top Student Performers
            </h3>
            <div className="space-y-3">
              {(() => {
                // Calculate ranks with tie handling
                const topPerformers = data.topPerformers?.slice(0, 7) || []
                let currentRank = 1
                return topPerformers.map((student, index) => {
                  // Update rank if score decreased from previous student
                  if (index > 0 && topPerformers[index - 1].total_score > student.total_score) {
                    currentRank = index + 1
                  }
                  const rank = currentRank
                  const medalEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
                  const getRankColor = (r: number) => {
                    switch (r) {
                      case 1: return 'text-yellow-600 bg-yellow-50'
                      case 2: return 'text-gray-600 bg-gray-50'
                      case 3: return 'text-orange-600 bg-orange-50'
                      default: return 'text-blue-900 bg-blue-50'
                    }
                  }
                  return (
                    <div key={student.username} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${getRankColor(rank)}`}>
                          {medalEmoji}
                        </div>
                      <div>
                        <div className="font-medium text-gray-900">{student.username}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-300">
                          {student.completed_questions} questions completed • {student.quests_completed} quests finished
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg text-blue-600">{student.total_score}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">points</div>
                    </div>
                  </div>
                );
              })
            })()}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <span className="mr-2">📈</span>
              Recent Student Activity
            </h3>
            <div className="space-y-3">
              {data.recentActivity?.slice(0, 7).map((activity, index) => {
                const formatDate = (dateString: string) => {
                  try {
                    const date = new Date(dateString);
                    const now = new Date();
                    const diffMs = now.getTime() - date.getTime();
                    const diffMins = Math.floor(diffMs / (1000 * 60));
                    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

                    if (diffMins < 60) return `${diffMins}m ago`;
                    if (diffHours < 24) return `${diffHours}h ago`;
                    return `${diffDays}d ago`;
                  } catch {
                    return 'Recently';
                  }
                };

                // Map RPC field names to expected format
                const student = activity.username || activity.student
                const quest = activity.questTitle || activity.quest
                const question = activity.questionTitle || activity.question
                const score = activity.points || activity.score
                const completedAt = activity.timestamp || activity.completed_at
                const isCorrect = activity.isCorrect !== undefined ? activity.isCorrect : true

                return (
                  <div key={index} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900">{student}</span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {isCorrect ? 'completed' : 'attempted'}
                        </span>
                        {isCorrect ? (
                          <span className="text-green-600">✓</span>
                        ) : (
                          <span className="text-red-600">✗</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                        <span className="font-medium">{quest}</span>
                        <span className="mx-1">→</span>
                        <span>{question}</span>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {completedAt ? formatDate(completedAt) : 'Recently'}
                        </span>
                        {isCorrect && score && (
                          <span className="text-sm font-medium text-green-600">
                            +{score} XP
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 text-center">
              <button
                onClick={() => router.push('/admin/quest-participation')}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
              >
                View Complete Participation Analysis →
              </button>
            </div>
          </div>
        </div>

        {/* Daily Activity Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mt-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <span className="mr-2">📅</span>
            Student Activity (Last 7 Days)
          </h3>
          <div className="space-y-3">
            {data.dailyActivity?.slice(-7).map((day) => (
              <div key={day.date} className="flex items-center space-x-4">
                <div className="w-20 text-sm text-gray-600 dark:text-gray-300">
                  {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
                <div className="flex-1">
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div
                      className="bg-green-500 h-4 rounded-full flex items-center justify-end pr-2"
                      style={{
                        width: `${Math.max((day.completions / Math.max(...(data.dailyActivity?.map(d => d.completions) || [1]))) * 100, 8)}%`
                      }}
                    >
                      <span className="text-xs text-white font-medium">{day.completions}</span>
                    </div>
                  </div>
                </div>
                <div className="w-24 text-sm text-gray-600 text-right">
                  {day.completions} submission{day.completions !== 1 ? 's' : ''}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              📊 <strong>Insight:</strong> Peak activity days show when students are most engaged with learning.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}