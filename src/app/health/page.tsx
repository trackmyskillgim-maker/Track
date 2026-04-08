'use client'

import { useEffect, useState } from 'react'

export default function HealthCheck() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [health, setHealth] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch('/api/health')
        const data = await response.json()
        setHealth(data)
      } catch {
        setHealth({ status: 'error', error: 'Failed to fetch health' })
      } finally {
        setLoading(false)
      }
    }

    checkHealth()
  }, [])

  if (loading) {
    return <div className="p-8">Loading health check...</div>
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">System Health Check</h1>

      <div className="bg-gray-100 p-4 rounded-lg">
        <h2 className="font-semibold mb-2">Status:
          <span className={health?.status === 'ok' ? 'text-green-600' : 'text-red-600'}>
            {health?.status || 'unknown'}
          </span>
        </h2>

        <h3 className="font-semibold mt-4 mb-2">Environment Variables:</h3>
        <ul className="space-y-1">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {health?.environment && Object.entries(health.environment).map(([key, value]: [string, any]) => (
            <li key={key} className="flex justify-between">
              <span>{key}:</span>
              <span className={value === true ? 'text-green-600' : value === false ? 'text-red-600' : 'text-blue-600'}>
                {value?.toString()}
              </span>
            </li>
          ))}
        </ul>

        <h3 className="font-semibold mt-4 mb-2">Client-side Environment:</h3>
        <ul className="space-y-1">
          <li className="flex justify-between">
            <span>NEXT_PUBLIC_SUPABASE_URL:</span>
            <span className={process.env.NEXT_PUBLIC_SUPABASE_URL ? 'text-green-600' : 'text-red-600'}>
              {process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing'}
            </span>
          </li>
          <li className="flex justify-between">
            <span>NEXT_PUBLIC_SUPABASE_ANON_KEY:</span>
            <span className={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'text-green-600' : 'text-red-600'}>
              {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing'}
            </span>
          </li>
        </ul>

        {health?.error && (
          <div className="mt-4 p-2 bg-red-100 text-red-700 rounded">
            Error: {health.error}
          </div>
        )}

        <pre className="mt-4 text-xs bg-white p-2 rounded overflow-auto">
          {JSON.stringify(health, null, 2)}
        </pre>
      </div>
    </div>
  )
}