'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export default function FeatureCardsCachePage() {
  const [status, setStatus] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState<any>(null)
  const [error, setError] = useState<string>('')

  const checkCacheStatus = async () => {
    setLoading(true)
    setError('')
    setStatus('Checking cache status...')
    
    try {
      // Check frontend API
      const frontendRes = await fetch('/api/feature-cards')
      const frontendData = await frontendRes.json()
      
      // Check backend API
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
      const backendRes = await fetch(`${backendUrl}/api/feature-cards`)
      const backendData = await backendRes.json()

      setResponse({
        frontend: {
          status: frontendRes.status,
          count: Array.isArray(frontendData) ? frontendData.length : 0,
          cacheControl: frontendRes.headers.get('cache-control'),
          timestamp: new Date().toISOString()
        },
        backend: {
          status: backendRes.status,
          count: Array.isArray(backendData) ? backendData.length : 0,
          timestamp: new Date().toISOString()
        }
      })
      setStatus('Cache status retrieved successfully')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setStatus('Failed to check cache')
    } finally {
      setLoading(false)
    }
  }

  const invalidateCache = async () => {
    setLoading(true)
    setError('')
    setStatus('Invalidating cache...')

    try {
      const token = prompt('Enter CACHE_INVALIDATION_TOKEN (leave blank if not required):')
      
      const res = await fetch('/api/feature-cards/invalidate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      })

      const data = await res.json()
      
      if (!res.ok) {
        setError(data.error || 'Cache invalidation failed')
        setStatus('Invalidation failed')
      } else {
        setResponse(data)
        setStatus('Cache invalidated successfully')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setStatus('Invalidation error')
    } finally {
      setLoading(false)
    }
  }

  const testBypassCache = async () => {
    setLoading(true)
    setError('')
    setStatus('Testing bypass cache...')

    try {
      const res = await fetch('/api/feature-cards?bypass_cache=true')
      const data = await res.json()
      
      setResponse({
        bypassTest: {
          status: res.status,
          count: Array.isArray(data) ? data.length : 0,
          cacheControl: res.headers.get('cache-control'),
          timestamp: new Date().toISOString()
        }
      })
      setStatus('Bypass cache test completed')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setStatus('Bypass test failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Feature Cards Cache Diagnostic</h1>

        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Caching Overview</h2>
          <div className="space-y-2 text-sm text-gray-600">
            <p><strong>Frontend API Route:</strong> 1 minute cache (60s) with stale-while-revalidate</p>
            <p><strong>Homepage Data Service:</strong> 30 second revalidation</p>
            <p><strong>Backend Redis:</strong> 5 minute TTL (300s)</p>
            <p><strong>Homepage Page:</strong> 30 second ISR revalidation</p>
            <p className="text-amber-700 mt-4">
              <strong>⚠️ Issue:</strong> Updates may take up to 5 minutes to fully propagate through all cache layers
            </p>
          </div>
        </Card>

        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Cache Controls</h2>
          <div className="space-y-3">
            <Button 
              onClick={checkCacheStatus}
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              {loading ? 'Checking...' : 'Check Cache Status'}
            </Button>
            
            <Button 
              onClick={testBypassCache}
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              {loading ? 'Testing...' : 'Test Bypass Cache'}
            </Button>
            
            <Button 
              onClick={invalidateCache}
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700"
            >
              {loading ? 'Invalidating...' : 'Force Cache Invalidation'}
            </Button>
          </div>
        </Card>

        {status && (
          <Card className="p-6 mb-6">
            <h3 className="font-semibold mb-2">Status</h3>
            <p className="text-sm text-gray-600">{status}</p>
          </Card>
        )}

        {error && (
          <Card className="p-6 mb-6 border-red-200 bg-red-50">
            <h3 className="font-semibold text-red-700 mb-2">Error</h3>
            <p className="text-sm text-red-600">{error}</p>
          </Card>
        )}

        {response && (
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Response</h3>
            <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-96">
              {JSON.stringify(response, null, 2)}
            </pre>
          </Card>
        )}

        <Card className="p-6 mt-6 bg-blue-50 border-blue-200">
          <h3 className="font-semibold mb-2 text-blue-900">Troubleshooting Guide</h3>
          <ul className="text-sm text-blue-800 space-y-2">
            <li><strong>1.</strong> Check the cache status to see current fetch times</li>
            <li><strong>2.</strong> Update backend data (feature cards)</li>
            <li><strong>3.</strong> Click "Force Cache Invalidation" to clear all caches</li>
            <li><strong>4.</strong> Wait 30 seconds for page ISR revalidation</li>
            <li><strong>5.</strong> Refresh the homepage to see updates</li>
            <li><strong>Alternative:</strong> Use "Test Bypass Cache" to immediately see latest data</li>
          </ul>
        </Card>
      </div>
    </div>
  )
}
