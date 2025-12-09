"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RefreshCw, Zap, Database, Clock, CheckCircle2, XCircle, Loader2, Trash2, Rocket } from "lucide-react"

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
    fast_json?: boolean
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
  fastCache?: boolean
  payloadSize?: number
}

interface EndpointConfig {
  name: string
  path: string
  description: string
  fast?: boolean
}

const ENDPOINTS: EndpointConfig[] = [
  { name: "Trending", path: "/api/products/featured/trending", description: "Trending products" },
  { name: "Flash Sales", path: "/api/products/featured/flash-sale", description: "Flash sale items" },
  { name: "New Arrivals", path: "/api/products/featured/new-arrivals", description: "New arrival products" },
  { name: "Top Picks", path: "/api/products/featured/top-picks", description: "Top pick products" },
  { name: "Daily Finds", path: "/api/products/featured/daily-finds", description: "Daily finds products" },
  { name: "Luxury Deals", path: "/api/products/featured/luxury-deals", description: "Luxury deal products" },
]

const FAST_ENDPOINTS: EndpointConfig[] = [
  {
    name: "Fast Trending",
    path: "/api/products/featured/fast/trending",
    description: "Ultra-fast trending",
    fast: true,
  },
  {
    name: "Fast Flash Sales",
    path: "/api/products/featured/fast/flash-sale",
    description: "Ultra-fast flash sales",
    fast: true,
  },
  {
    name: "Fast New Arrivals",
    path: "/api/products/featured/fast/new-arrivals",
    description: "Ultra-fast new arrivals",
    fast: true,
  },
  {
    name: "Fast Top Picks",
    path: "/api/products/featured/fast/top-picks",
    description: "Ultra-fast top picks",
    fast: true,
  },
  {
    name: "Fast Daily Finds",
    path: "/api/products/featured/fast/daily-finds",
    description: "Ultra-fast daily finds",
    fast: true,
  },
  {
    name: "Fast Luxury Deals",
    path: "/api/products/featured/fast/luxury-deals",
    description: "Ultra-fast luxury deals",
    fast: true,
  },
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
        const text = await response.text()
        const data = JSON.parse(text)

        return {
          endpoint: endpoint.name,
          status: "success",
          responseTime: Math.round(endTime - startTime),
          cached: response.headers.get("X-Cache") === "HIT" || !!data.cached_at || !!data.ts,
          cachedAt: data.cached_at || data.ts,
          itemCount: data.items?.length || data.products?.length || data.count || 0,
          fastCache: response.headers.get("X-Fast-Cache") === "true" || endpoint.fast,
          payloadSize: text.length,
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

    await fetchCacheStats()
    setLoading(false)
  }, [testEndpoint, fetchCacheStats])

  const runFastTests = useCallback(async () => {
    setLoading(true)
    setTestResults([])

    const results: TestResult[] = []
    for (const endpoint of FAST_ENDPOINTS) {
      const result = await testEndpoint(endpoint)
      results.push(result)
      setTestResults([...results])
    }

    await fetchCacheStats()
    setLoading(false)
  }, [testEndpoint, fetchCacheStats])

  const runComparisonTest = useCallback(async () => {
    setLoading(true)
    setTestResults([])

    const results: TestResult[] = []

    // Test standard endpoint twice
    const standard1 = await testEndpoint(ENDPOINTS[0])
    standard1.endpoint = "Standard (1st)"
    results.push(standard1)
    setTestResults([...results])

    await new Promise((r) => setTimeout(r, 100))

    const standard2 = await testEndpoint(ENDPOINTS[0])
    standard2.endpoint = "Standard (2nd - cached)"
    results.push(standard2)
    setTestResults([...results])

    await new Promise((r) => setTimeout(r, 100))

    // Test fast endpoint twice
    const fast1 = await testEndpoint(FAST_ENDPOINTS[0])
    fast1.endpoint = "Fast (1st)"
    results.push(fast1)
    setTestResults([...results])

    await new Promise((r) => setTimeout(r, 100))

    const fast2 = await testEndpoint(FAST_ENDPOINTS[0])
    fast2.endpoint = "Fast (2nd - cached)"
    results.push(fast2)
    setTestResults([...results])

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

  const formatSize = (bytes?: number) => {
    if (!bytes) return "-"
    if (bytes < 1024) return `${bytes}B`
    return `${(bytes / 1024).toFixed(1)}KB`
  }

  const getPerformanceBadge = (ms: number) => {
    if (ms < 50) return { variant: "default" as const, label: "Excellent", color: "bg-green-500" }
    if (ms < 100) return { variant: "default" as const, label: "Good", color: "bg-emerald-500" }
    if (ms < 300) return { variant: "secondary" as const, label: "OK", color: "bg-yellow-500" }
    if (ms < 800) return { variant: "secondary" as const, label: "Slow", color: "bg-orange-500" }
    return { variant: "destructive" as const, label: "Very Slow", color: "bg-red-500" }
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Redis Cache Performance Testing</h1>
          <p className="text-muted-foreground">Test standard vs ultra-fast optimized endpoints</p>
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
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
                    <span className="text-sm font-medium">Cache Sets</span>
                  </div>
                  <p className="mt-2 text-2xl font-bold">{cacheStats.stats.sets}</p>
                  <p className="text-xs text-muted-foreground">Operations</p>
                </div>

                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-purple-500" />
                    <span className="text-sm font-medium">Misses</span>
                  </div>
                  <p className="mt-2 text-2xl font-bold">{cacheStats.stats.misses}</p>
                  <p className="text-xs text-muted-foreground">{cacheStats.stats.errors} errors</p>
                </div>

                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2">
                    <Rocket className="h-5 w-5 text-emerald-500" />
                    <span className="text-sm font-medium">Fast JSON</span>
                  </div>
                  <p className="mt-2 text-2xl font-bold">{cacheStats.stats.fast_json ? "orjson" : "standard"}</p>
                  <p className="text-xs text-muted-foreground">
                    {cacheStats.stats.fast_json ? "10x faster" : "Default"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <p>Click &quot;Check Connection&quot; to load cache statistics</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Test Actions - Updated with new buttons */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Performance Tests</CardTitle>
            <CardDescription>Compare standard vs ultra-fast optimized endpoints</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button onClick={runAllTests} disabled={loading} variant="outline">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
              Test Standard Endpoints
            </Button>
            <Button onClick={runFastTests} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Rocket className="mr-2 h-4 w-4" />}
              Test FAST Endpoints
            </Button>
            <Button variant="secondary" onClick={runComparisonTest} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
              Standard vs Fast Comparison
            </Button>
          </CardContent>
        </Card>

        {/* Test Results - Enhanced with payload size and performance badges */}
        {testResults.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Test Results</CardTitle>
              <CardDescription>Response times, cache status, and payload sizes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {testResults.map((result, index) => {
                  const perf = getPerformanceBadge(result.responseTime)
                  return (
                    <div key={index} className="flex items-center justify-between rounded-lg border p-4">
                      <div className="flex items-center gap-3">
                        {result.status === "success" ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{result.endpoint}</p>
                            {result.fastCache && (
                              <Badge
                                variant="outline"
                                className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200"
                              >
                                <Rocket className="h-3 w-3 mr-1" />
                                Fast
                              </Badge>
                            )}
                          </div>
                          {result.status === "success" ? (
                            <p className="text-sm text-muted-foreground">
                              {result.itemCount} items • {formatSize(result.payloadSize)}
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
                        <Badge variant={perf.variant}>{perf.label}</Badge>
                        <div className="text-right min-w-[80px]">
                          <p
                            className={`font-mono text-lg font-bold ${result.responseTime < 100 ? "text-green-600" : result.responseTime < 300 ? "text-yellow-600" : "text-red-600"}`}
                          >
                            {result.responseTime}ms
                          </p>
                          <p className="text-xs text-muted-foreground">Response</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Summary - Enhanced */}
              {testResults.length > 1 && (
                <div className="mt-6 rounded-lg bg-muted/50 p-4">
                  <h4 className="font-medium">Summary</h4>
                  <div className="mt-2 grid gap-4 text-sm sm:grid-cols-4">
                    <div>
                      <span className="text-muted-foreground">Avg Response:</span>{" "}
                      <span
                        className={`font-mono font-bold ${
                          Math.round(testResults.reduce((acc, r) => acc + r.responseTime, 0) / testResults.length) < 100
                            ? "text-green-600"
                            : "text-yellow-600"
                        }`}
                      >
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
                    <div>
                      <span className="text-muted-foreground">Avg Payload:</span>{" "}
                      <span className="font-mono font-medium">
                        {formatSize(
                          Math.round(
                            testResults.reduce((acc, r) => acc + (r.payloadSize || 0), 0) / testResults.length,
                          ),
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Expected Performance - New section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Expected Performance After Optimization</CardTitle>
            <CardDescription>Target benchmarks for optimized endpoints</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium">Step</th>
                    <th className="text-left py-2 font-medium">Before</th>
                    <th className="text-left py-2 font-medium">After (Target)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2">Redis GET</td>
                    <td className="py-2 text-red-500">50-200ms</td>
                    <td className="py-2 text-green-500 font-medium">1-5ms</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2">JSON Serialization</td>
                    <td className="py-2 text-red-500">100-500ms</td>
                    <td className="py-2 text-green-500 font-medium">0ms (pre-serialized)</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2">Total Backend</td>
                    <td className="py-2 text-red-500">800-2800ms</td>
                    <td className="py-2 text-green-500 font-medium">5-20ms</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2">Frontend Fetch</td>
                    <td className="py-2 text-red-500">800-2800ms</td>
                    <td className="py-2 text-green-500 font-medium">20-100ms</td>
                  </tr>
                  <tr>
                    <td className="py-2">Payload Size</td>
                    <td className="py-2 text-red-500">~3-5KB per product</td>
                    <td className="py-2 text-green-500 font-medium">~200B per product (80% smaller)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Endpoints Reference - Updated with fast endpoints */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Standard Endpoints</CardTitle>
              <CardDescription>Original endpoints (full product data)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                {ENDPOINTS.map((endpoint) => (
                  <div key={endpoint.path} className="rounded-lg border p-3">
                    <p className="font-medium">{endpoint.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">{endpoint.path}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Rocket className="h-5 w-5 text-emerald-500" />
                Fast Endpoints (Optimized)
              </CardTitle>
              <CardDescription>Ultra-lightweight responses (6 fields only)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                {FAST_ENDPOINTS.map((endpoint) => (
                  <div key={endpoint.path} className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3">
                    <p className="font-medium text-emerald-800">{endpoint.name}</p>
                    <p className="font-mono text-xs text-emerald-600">{endpoint.path}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
