'use client'

import { useEffect, useState } from 'react'
import type { Category } from '@/lib/server/get-categories'
import { getCachedCategories, clearCategoriesCache } from '@/hooks/use-categories-cache'

interface CacheTest {
  testName: string
  status: 'pending' | 'passed' | 'failed'
  message: string
  timestamp: number
}

/**
 * Cache Testing Component - Debug & Verify Cache Operations
 * Shows real-time cache status and allows manual testing
 */
export function CacheTestingPanel() {
  const [tests, setTests] = useState<CacheTest[]>([])
  const [cacheSize, setCacheSize] = useState(0)
  const [isVisible, setIsVisible] = useState(false)

  // Run cache tests on mount
  useEffect(() => {
    runCacheTests()
  }, [])

  const runCacheTests = () => {
    const newTests: CacheTest[] = []
    const now = Date.now()

    // Test 1: Check sessionStorage
    try {
      const sessionData = sessionStorage.getItem('mizizzi_categories_cache')
      newTests.push({
        testName: 'sessionStorage Cache',
        status: sessionData ? 'passed' : 'failed',
        message: sessionData ? `Found ${JSON.parse(sessionData).data?.length || 0} categories` : 'Empty',
        timestamp: now,
      })
    } catch (e) {
      newTests.push({
        testName: 'sessionStorage Cache',
        status: 'failed',
        message: `Error: ${(e as Error).message}`,
        timestamp: now,
      })
    }

    // Test 2: Check localStorage
    try {
      const localData = localStorage.getItem('mizizzi_categories_cache')
      const expiry = localStorage.getItem('mizizzi_categories_cache_expiry')
      
      if (localData && expiry) {
        const expiryTime = parseInt(expiry, 10)
        const remaining = expiryTime - now
        const isValid = remaining > 0
        
        newTests.push({
          testName: 'localStorage Cache',
          status: isValid ? 'passed' : 'failed',
          message: isValid 
            ? `Found ${JSON.parse(localData).data?.length || 0} categories, expires in ${(remaining / 1000).toFixed(0)}s`
            : `Cache expired ${Math.abs(remaining / 1000).toFixed(0)}s ago`,
          timestamp: now,
        })
      } else {
        newTests.push({
          testName: 'localStorage Cache',
          status: 'failed',
          message: 'Empty',
          timestamp: now,
        })
      }
    } catch (e) {
      newTests.push({
        testName: 'localStorage Cache',
        status: 'failed',
        message: `Error: ${(e as Error).message}`,
        timestamp: now,
      })
    }

    // Test 3: Verify cache data integrity
    try {
      const cachedCategories = getCachedCategories()
      newTests.push({
        testName: 'Cache Data Integrity',
        status: cachedCategories && Array.isArray(cachedCategories) && cachedCategories.length > 0 ? 'passed' : 'failed',
        message: cachedCategories && cachedCategories.length > 0
          ? `${cachedCategories.length} categories, first: ${cachedCategories[0]?.name || 'N/A'}`
          : 'No valid cache found',
        timestamp: now,
      })
    } catch (e) {
      newTests.push({
        testName: 'Cache Data Integrity',
        status: 'failed',
        message: `Error: ${(e as Error).message}`,
        timestamp: now,
      })
    }

    // Test 4: Check storage quota
    try {
      if (navigator.storage && navigator.storage.estimate) {
        navigator.storage.estimate().then(({ usage, quota }) => {
          const usedMB = (usage! / 1024 / 1024).toFixed(2)
          const quotaMB = (quota! / 1024 / 1024).toFixed(0)
          setCacheSize(parseFloat(usedMB))
          
          const testResult: CacheTest = {
            testName: 'Storage Quota',
            status: (usage! / quota!) < 0.9 ? 'passed' : 'failed',
            message: `Using ${usedMB}MB of ${quotaMB}MB (${((usage! / quota!) * 100).toFixed(1)}%)`,
            timestamp: now,
          }
          setTests(prev => [...prev.filter(t => t.testName !== 'Storage Quota'), testResult])
        })
      }
    } catch (e) {
      newTests.push({
        testName: 'Storage Quota',
        status: 'failed',
        message: `Error: ${(e as Error).message}`,
        timestamp: now,
      })
    }

    setTests(newTests)
    console.log('[v0] Cache tests completed', newTests)
  }

  const handleClearCache = () => {
    clearCategoriesCache()
    console.log('[v0] Cache cleared manually')
    setTests(prev => [...prev, {
      testName: 'Manual Cache Clear',
      status: 'passed',
      message: 'Cache cleared successfully',
      timestamp: Date.now(),
    }])
    setTimeout(runCacheTests, 500)
  }

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 bg-amber-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-amber-700 z-50"
      >
        Cache Debug (Dev Only)
      </button>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-gray-900 text-white rounded-lg shadow-2xl overflow-hidden z-50 font-mono text-xs">
      <div className="bg-gray-800 px-4 py-3 flex justify-between items-center border-b border-gray-700">
        <span className="font-bold">Cache Testing Panel</span>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-white"
        >
          ✕
        </button>
      </div>

      <div className="max-h-80 overflow-y-auto p-4 space-y-3">
        {tests.length === 0 ? (
          <div className="text-gray-400">Running tests...</div>
        ) : (
          tests.map((test, idx) => (
            <div key={idx} className="border border-gray-700 rounded p-2 bg-gray-950">
              <div className="flex items-center gap-2">
                <span className={`font-bold ${
                  test.status === 'passed' ? 'text-green-400' :
                  test.status === 'failed' ? 'text-red-400' :
                  'text-yellow-400'
                }`}>
                  {test.status === 'passed' ? '✓' : test.status === 'failed' ? '✗' : '○'}
                </span>
                <span className="text-gray-300">{test.testName}</span>
              </div>
              <div className="text-gray-500 ml-6 text-xs mt-1">{test.message}</div>
            </div>
          ))
        )}
      </div>

      <div className="bg-gray-800 px-4 py-3 border-t border-gray-700 space-y-2">
        <button
          onClick={runCacheTests}
          className="w-full bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded text-xs font-medium"
        >
          Re-run Tests
        </button>
        <button
          onClick={handleClearCache}
          className="w-full bg-red-600 hover:bg-red-700 px-3 py-2 rounded text-xs font-medium"
        >
          Clear Cache
        </button>
        <div className="text-gray-400 text-xs">
          Storage: {cacheSize}MB | Tests: {tests.length}
        </div>
      </div>
    </div>
  )
}
