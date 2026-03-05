'use client'

import { useEffect, useState } from 'react'

interface TestResult {
  endpoint: string
  status: 'loading' | 'success' | 'error'
  data?: any
  error?: string
  duration?: number
}

export default function TestUIBatchPage() {
  const [results, setResults] = useState<TestResult[]>([
    { endpoint: '/api/ui/batch', status: 'loading' },
    { endpoint: '/api/ui/batch?sections=carousel', status: 'loading' },
    { endpoint: '/api/ui/batch?sections=categories', status: 'loading' },
    { endpoint: '/api/ui/batch?sections=carousel,categories', status: 'loading' },
  ])

  useEffect(() => {
    const testEndpoints = async () => {
      const endpoints = [
        '/api/ui/batch',
        '/api/ui/batch?sections=carousel',
        '/api/ui/batch?sections=categories',
        '/api/ui/batch?sections=carousel,categories',
      ]

      const newResults = await Promise.all(
        endpoints.map(async (endpoint) => {
          const startTime = performance.now()
          try {
            const response = await fetch(endpoint)
            const data = await response.json()
            const duration = performance.now() - startTime

            return {
              endpoint,
              status: response.ok ? 'success' : 'error',
              data,
              duration,
              error: response.ok ? undefined : `HTTP ${response.status}`,
            } as TestResult
          } catch (error) {
            const duration = performance.now() - startTime
            return {
              endpoint,
              status: 'error',
              error: error instanceof Error ? error.message : 'Unknown error',
              duration,
            } as TestResult
          }
        })
      )

      setResults(newResults)
    }

    testEndpoints()
  }, [])

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">UI Batch API Test</h1>

        <div className="space-y-6">
          {results.map((result) => (
            <div
              key={result.endpoint}
              className={`border rounded-lg p-6 ${
                result.status === 'loading'
                  ? 'border-gray-300 bg-gray-50'
                  : result.status === 'success'
                    ? 'border-green-300 bg-green-50'
                    : 'border-red-300 bg-red-50'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold">{result.endpoint}</h2>
                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className={`inline-block w-3 h-3 rounded-full ${
                        result.status === 'loading'
                          ? 'bg-gray-400'
                          : result.status === 'success'
                            ? 'bg-green-500'
                            : 'bg-red-500'
                      }`}
                    />
                    <span className="text-sm font-medium capitalize">{result.status}</span>
                    {result.duration && (
                      <span className="text-sm text-gray-600">({result.duration.toFixed(2)}ms)</span>
                    )}
                  </div>
                </div>
              </div>

              {result.error && <div className="text-red-600 text-sm mb-4">{result.error}</div>}

              {result.data && (
                <div className="bg-white rounded p-4 overflow-x-auto">
                  <pre className="text-xs text-gray-600 whitespace-pre-wrap break-words">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 p-4 bg-blue-50 border border-blue-300 rounded">
          <h3 className="font-semibold text-blue-900 mb-2">Integration Notes</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>✓ Frontend batch API route created at /api/ui/batch</li>
            <li>✓ Server-side function getUIBatch() created for data fetching</li>
            <li>✓ Homepage refactored to use unified batch API</li>
            <li>✓ Categories page optimized to use batch API</li>
            <li>✓ Supports selective sections fetching (carousel, categories, sidePanels)</li>
            <li>✓ Implements React cache() for request deduplication</li>
            <li>✓ Uses Next.js ISR with 60s revalidate time</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
