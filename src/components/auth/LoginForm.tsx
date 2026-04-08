'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface LoginFormProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onLogin?: (user: any) => void
}

export default function LoginForm({ onLogin }: LoginFormProps) {
  const [activeTab, setActiveTab] = useState<'student' | 'admin'>('student')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const router = useRouter()

  // Student login form state
  const [studentLoginForm, setStudentLoginForm] = useState({
    email: '',
    password: ''
  })

  // Admin form state
  const [adminForm, setAdminForm] = useState({
    username: '',
    password: ''
  })

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...studentLoginForm,
          type: 'student'
        }),
      })

      const data = await response.json()

      if (data.success) {
        onLogin?.(data.user)
        router.push('/student/dashboard')
      } else {
        setError(data.message || 'Login failed. Please check your credentials.')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...adminForm,
          type: 'admin'
        }),
      })

      const data = await response.json()

      if (data.success) {
        onLogin?.(data.user)
        router.push('/admin/dashboard')
      } else {
        setError(data.message || 'Invalid admin credentials')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-teal-50 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/4 w-96 h-96 bg-teal-100/40 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-1/2 -right-1/4 w-96 h-96 bg-blue-100/40 rounded-full blur-3xl"></div>
      </div>

      <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8 relative z-10">
        <div className="w-full max-w-7xl">
          <div className="flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-32">
            {/* Left side - Branding */}
            <div className="flex-shrink-0">
              <div className="flex justify-center items-center">
                {/* Logo */}
                <div className="relative">
                  <Image
                    src="/trackmyskill-logo.jpg"
                    alt="TrackMySkill Logo"
                    width={300}
                    height={300}
                    className="relative rounded-3xl shadow-lg border-2 border-gray-200/50"
                    priority
                  />
                </div>
              </div>
            </div>

            {/* Right side - Portal Selection + Forms */}
            <div className="flex-1 max-w-lg w-full space-y-6">
              {/* Tab Selection - Now above forms */}
              <div className="flex rounded-2xl p-1.5 bg-white/80 backdrop-blur-md border border-gray-200 shadow-lg">
                <button
                  className={`flex-1 py-4 px-8 rounded-xl text-base font-bold transition-all duration-300 ${
                    activeTab === 'student'
                      ? 'bg-gradient-to-r from-teal-500 to-green-500 text-white shadow-md shadow-green-500/20'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                  onClick={() => setActiveTab('student')}
                >
                  Student Portal
                </button>
                <button
                  className={`flex-1 py-4 px-8 rounded-xl text-base font-bold transition-all duration-300 ${
                    activeTab === 'admin'
                      ? 'bg-gradient-to-r from-teal-500 to-green-500 text-white shadow-md shadow-green-500/20'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                  onClick={() => setActiveTab('admin')}
                >
                  Admin Portal
                </button>
              </div>

              {/* Forms container */}
              <div>
              {/* Error Message */}
              {error && (
                <div className="mb-6 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm backdrop-blur-sm animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span>{error}</span>
                  </div>
                </div>
              )}

              {/* Student Form */}
              <div className={`rounded-3xl shadow-xl p-8 bg-white/90 backdrop-blur-xl border border-gray-200 transition-all duration-300 ${
                activeTab === 'student' ? 'block' : 'hidden'
              }`}>
                {/* Header */}
                <div className="mb-8">
                  <h2 className="text-4xl font-black text-gray-800 mb-3 tracking-tight">
                    Welcome Back!
                  </h2>
                  <p className="text-gray-600 text-base">
                    Continue your learning journey
                  </p>
                </div>

                {/* Info message for new students */}
                <div className="mb-6 px-4 py-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-sm">
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <span>
                      <strong>New students:</strong> Your account must be created by an administrator before you can login. Please contact your course administrator.
                    </span>
                  </div>
                </div>

                <form onSubmit={handleStudentSubmit} className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="loginEmail">
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="loginEmail"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200"
                      placeholder="Enter your email"
                      value={studentLoginForm.email}
                      onChange={(e) => setStudentLoginForm(prev => ({ ...prev, email: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="loginPassword">
                      Password
                    </label>
                    <input
                      type="password"
                      id="loginPassword"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200"
                      placeholder="Enter your password"
                      value={studentLoginForm.password}
                      onChange={(e) => setStudentLoginForm(prev => ({ ...prev, password: e.target.value }))}
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-teal-500 to-green-500 text-white font-semibold py-3 px-4 rounded-lg hover:from-teal-600 hover:to-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md shadow-green-500/10"
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Signing In...
                      </span>
                    ) : 'Sign In'}
                  </button>
                  <div className="text-center">
                    <button
                      type="button"
                      className="text-sm text-teal-600 hover:text-teal-700 underline transition-colors duration-200"
                      onClick={() => setShowForgotPassword(true)}
                    >
                      Forgot Password?
                    </button>
                  </div>
                </form>
              </div>

              {/* Admin Form */}
              <div className={`rounded-3xl shadow-xl p-8 bg-white/90 backdrop-blur-xl border border-gray-200 transition-all duration-300 ${
                activeTab === 'admin' ? 'block' : 'hidden'
              }`}>
                <div className="mb-8">
                  <h2 className="text-4xl font-black text-gray-800 mb-3 tracking-tight">
                    Admin Access
                  </h2>
                  <p className="text-gray-600 text-base">
                    Secure administrator portal
                  </p>
                </div>

                <form onSubmit={handleAdminSubmit} className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="adminUsername">
                      Username
                    </label>
                    <input
                      type="text"
                      id="adminUsername"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200"
                      placeholder="Admin username"
                      value={adminForm.username}
                      onChange={(e) => setAdminForm(prev => ({ ...prev, username: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="adminPassword">
                      Password
                    </label>
                    <input
                      type="password"
                      id="adminPassword"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200"
                      placeholder="Admin password"
                      value={adminForm.password}
                      onChange={(e) => setAdminForm(prev => ({ ...prev, password: e.target.value }))}
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-teal-500 to-green-500 text-white font-semibold py-3 px-4 rounded-lg hover:from-teal-600 hover:to-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md shadow-green-500/10"
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Signing In...
                      </span>
                    ) : 'Access Dashboard'}
                  </button>
                </form>
              </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-gray-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center">
              <div className="mb-6">
                <div className="text-5xl mb-4">🔒</div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Forgot Password?</h3>
              </div>
              <p className="text-gray-600 mb-8 text-sm">
                Please contact the administrator to reset your password.
              </p>
              <button
                className="w-full bg-gradient-to-r from-teal-500 to-green-500 text-white font-bold py-3.5 px-4 rounded-xl hover:from-teal-600 hover:to-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-white transition-all duration-200 shadow-lg"
                onClick={() => setShowForgotPassword(false)}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
