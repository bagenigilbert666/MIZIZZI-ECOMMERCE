"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RefreshCw, Zap, Database, Clock, CheckCircle2, XCircle, Loader2, Trash2 } from "lucide-react"

const API_BASE_URL = "http://localhost:5000"

interface CacheStats {
  connected: boolean
  stats: {
    errors: number
    hit_rate_percent: number
    hits: number
    misses: number
    sets: number
    total_requests: number
  }
  timestamp: string
  type: string
}

interface TestResult {
  endpoint: string
  status: "success" | "error"
  responseTime: number
  cached: boolean
  cachedAt?: string
  itemCount?: number
  message?: string
}

interface EndpointConfig {
  name: string
  path: string
  description: string
}

const ENDPOINTS: EndpointConfig[] = [
  { name: "Trending", path: "/api/products/featured/trending", description: "Trending products" },
  { name: "Flash Sales", path: "/api/products/featured/flash-sale", description: "Flash sale items" },
  { name: "New Arrivals", path: "/api/products/featured/new-arrivals", description: "New arrival products" },
  { name: "Top Picks", path: "/api/products/featured/top-picks", description: "Top pick products" },
  { name: "Daily Finds", path: "/api/products/featured/daily-finds", description: "Daily finds products" },
  { name: "Luxury Deals", path: "/api/products/featured/luxury-deals", description: "Luxury deal products" },
]

export default function RedisTestPage() {
  const [apiUrl, setApiUrl] = useState(API_BASE_URL)
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null)
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [loading, setLoading] = useState(false)
  const [statsLoading, setStatsLoading] = useState(false)
  const [clearingCache, setClearingCache] = useState(false)

  const fetchCacheStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const startTime = performance.now()
      const response = await fetch(`${apiUrl}/api/products/cache/status`)
      const data = await response.json()
      const endTime = performance.now()

      setCacheStats({
        ...data,
        responseTime: Math.round(endTime - startTime),
      })
    } catch (error) {
      console.error("Failed to fetch cache stats:", error)
      setCacheStats(null)
    } finally {
      setStatsLoading(false)
    }
  }, [apiUrl])

  const testEndpoint = useCallback(
    async (endpoint: EndpointConfig): Promise<TestResult> => {
      const startTime = performance.now()
      try {
        const response = await fetch(`${apiUrl}${endpoint.path}`)
        const endTime = performance.now()
        const data = await response.json()

        return {
          endpoint: endpoint.name,
          status: "success",
          responseTime: Math.round(endTime - startTime),
          cached: !!data.cached_at,
          cachedAt: data.cached_at,
          itemCount: data.items?.length || data.products?.length || 0,
        }
      } catch (error) {
        const endTime = performance.now()
        return {
          endpoint: endpoint.name,
          status: "error",
          responseTime: Math.round(endTime - startTime),
          cached: false,
          message: error instanceof Error ? error.message : "Unknown error",
        }
      }
    },
    [apiUrl],
  )

  const runAllTests = useCallback(async () => {
    setLoading(true)
    setTestResults([])

    const results: TestResult[] = []
    for (const endpoint of ENDPOINTS) {
      const result = await testEndpoint(endpoint)
      results.push(result)
      setTestResults([...results])
    }

    // Fetch updated cache stats after tests
    await fetchCacheStats()
    setLoading(false)
  }, [testEndpoint, fetchCacheStats])

  const runCacheComparisonTest = useCallback(async () => {
    setLoading(true)
    setTestResults([])

    const endpoint = ENDPOINTS[0] // Use trending endpoint for comparison

    // First request (likely cache miss)
    const firstResult = await testEndpoint(endpoint)
    firstResult.endpoint = `${endpoint.name} (1st request)`
    setTestResults([firstResult])

    // Small delay
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Second request (should be cache hit)
    const secondResult = await testEndpoint(endpoint)
    secondResult.endpoint = `${endpoint.name} (2nd request)`
    setTestResults([firstResult, secondResult])

    // Fetch updated cache stats
    await fetchCacheStats()
    setLoading(false)
  }, [testEndpoint, fetchCacheStats])

  const clearCache = useCallback(async () => {
    setClearingCache(true)
    try {
      const response = await fetch(`${apiUrl}/api/products/cache/clear`, {
        method: "POST",
      })
      if (response.ok) {
        await fetchCacheStats()
        setTestResults([])
      }
    } catch (error) {
      console.error("Failed to clear cache:", error)
    } finally {
      setClearingCache(false)
    }
  }, [apiUrl, fetchCacheStats])

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Redis Cache Testing</h1>
          <p className="text-muted-foreground">Test and monitor your backend Redis caching performance</p>
        </div>

        {/* API Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">API Configuration</CardTitle>
            <CardDescription>Configure the backend API URL for testing</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-4">
              <div className="flex-1 space-y-2">
                <Label htmlFor="api-url">Backend API URL</Label>
                <Input
                  id="api-url"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  placeholder="http://localhost:5000"
                />
              </div>
              <Button onClick={fetchCacheStats} disabled={statsLoading}>
                {statsLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Check Connection
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Cache Stats */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Cache Status</CardTitle>
              <CardDescription>Real-time Redis cache statistics</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchCacheStats} disabled={statsLoading}>
                {statsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              </Button>
              <Button variant="destructive" size="sm" onClick={clearCache} disabled={clearingCache}>
                {clearingCache ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Clear Cache
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {cacheStats ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2">
                    {cacheStats.connected ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    <span className="text-sm font-medium">Connection</span>
                  </div>
                  <p className="mt-2 text-2xl font-bold">{cacheStats.connected ? "Connected" : "Disconnected"}</p>
                  <p className="text-xs text-muted-foreground">Type: {cacheStats.type}</p>
                </div>

                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-yellow-500" />
                    <span className="text-sm font-medium">Hit Rate</span>
                  </div>
                  <p className="mt-2 text-2xl font-bold">{cacheStats.stats.hit_rate_percent.toFixed(1)}%</p>
                  <p className="text-xs text-muted-foreground">
                    {cacheStats.stats.hits} hits / {cacheStats.stats.total_requests} requests
                  </p>
                </div>

                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-blue-500" />
                    <span className="text-sm font-medium">Cache Operations</span>
                  </div>
                  <p className="mt-2 text-2xl font-bold">{cacheStats.stats.sets}</p>
                  <p className="text-xs text-muted-foreground">Sets performed</p>
                </div>

                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-purple-500" />
                    <span className="text-sm font-medium">Misses</span>
                  </div>
                  <p className="mt-2 text-2xl font-bold">{cacheStats.stats.misses}</p>
                  <p className="text-xs text-muted-foreground">{cacheStats.stats.errors} errors</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <p>Click "Check Connection" to load cache statistics</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Test Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Test Actions</CardTitle>
            <CardDescription>Run cache performance tests against your API</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button onClick={runAllTests} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
              Test All Endpoints
            </Button>
            <Button variant="secondary" onClick={runCacheComparisonTest} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Cache Hit/Miss Comparison
            </Button>
          </CardContent>
        </Card>

        {/* Test Results */}
        {testResults.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Test Results</CardTitle>
              <CardDescription>Response times and cache status for each endpoint</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {testResults.map((result, index) => (
                  <div key={index} className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex items-center gap-3">
                      {result.status === "success" ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                      <div>
                        <p className="font-medium">{result.endpoint}</p>
                        {result.status === "success" ? (
                          <p className="text-sm text-muted-foreground">
                            {result.itemCount} items returned
                            {result.cachedAt && ` • Cached at ${new Date(result.cachedAt).toLocaleTimeString()}`}
                          </p>
                        ) : (
                          <p className="text-sm text-red-500">{result.message}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={result.cached ? "default" : "secondary"}>
                        {result.cached ? "Cache Hit" : "Cache Miss"}
                      </Badge>
                      <div className="text-right">
                        <p className="font-mono text-lg font-bold">{result.responseTime}ms</p>
                        <p className="text-xs text-muted-foreground">Response time</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary */}
              {testResults.length > 1 && (
                <div className="mt-6 rounded-lg bg-muted/50 p-4">
                  <h4 className="font-medium">Summary</h4>
                  <div className="mt-2 grid gap-2 text-sm sm:grid-cols-3">
                    <div>
                      <span className="text-muted-foreground">Avg Response Time:</span>{" "}
                      <span className="font-mono font-medium">
                        {Math.round(testResults.reduce((acc, r) => acc + r.responseTime, 0) / testResults.length)}ms
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Cache Hits:</span>{" "}
                      <span className="font-mono font-medium">
                        {testResults.filter((r) => r.cached).length} / {testResults.length}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Success Rate:</span>{" "}
                      <span className="font-mono font-medium">
                        {Math.round(
                          (testResults.filter((r) => r.status === "success").length / testResults.length) * 100,
                        )}
                        %
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Endpoints Reference */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Available Endpoints</CardTitle>
            <CardDescription>API endpoints available for testing</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {ENDPOINTS.map((endpoint) => (
                <div key={endpoint.path} className="rounded-lg border p-3">
                  <p className="font-medium">{endpoint.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">{endpoint.path}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
