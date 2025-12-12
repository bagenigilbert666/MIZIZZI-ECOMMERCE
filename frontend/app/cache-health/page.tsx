"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { API_URL } from "@/config"
import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  Loader2,
  Activity,
  Database,
  Zap,
  Clock,
  Server,
  Wifi,
  WifiOff,
  TrendingUp,
  AlertTriangle,
  ArrowLeft,
  LayoutGrid,
} from "lucide-react"
import Link from "next/link"

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

interface HealthCheck {
  name: string
  status: "healthy" | "degraded" | "unhealthy" | "checking" | "warming"
  message: string
  latency?: number
}

interface PingResult {
  success: boolean
  latency: number
  error?: string
}

interface RouteTestResult {
  route: string
  endpoint: string
  status: "success" | "error" | "pending"
  latency?: number
  cached?: boolean
  cacheHit?: boolean
  error?: string
}

export default function CacheHealthPage() {
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null)
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([])
  const [loading, setLoading] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [pingResults, setPingResults] = useState<PingResult[]>([])
  const [routeTests, setRouteTests] = useState<RouteTestResult[]>([])
  const [testingRoutes, setTestingRoutes] = useState(false)

  const runHealthChecks = useCallback(async () => {
    setLoading(true)
    const checks: HealthCheck[] = []

    // Check 1: API Connection
    const apiCheck: HealthCheck = {
      name: "API Server",
      status: "checking",
      message: "Checking connection...",
    }
    checks.push(apiCheck)
    setHealthChecks([...checks])

    try {
      const startTime = performance.now()
      const response = await fetch(`${API_URL}/api/products/cache/status`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      })
      const latency = Math.round(performance.now() - startTime)

      if (response.ok) {
        const data = await response.json()
        setCacheStats(data)
        checks[0] = {
          name: "API Server",
          status: "healthy",
          message: `Connected to ${API_URL}`,
          latency,
        }

        // Check 2: Redis Connection
        const redisCheck: HealthCheck = {
          name: "Upstash Redis",
          status: data.connected ? "healthy" : "unhealthy",
          message: data.connected ? `Connected (${data.type})` : "Redis not connected - using fallback",
          latency,
        }
        checks.push(redisCheck)

        // Check 3: Cache Performance - smarter logic for warming caches
        const hitRate = data.stats.hit_rate_percent
        const totalRequests = data.stats.total_requests
        const isWarmingUp = totalRequests < 50 // Cache is still warming up

        let perfStatus: HealthCheck["status"]
        let perfMessage: string

        if (isWarmingUp) {
          perfStatus = "warming"
          perfMessage = `Warming up: ${hitRate.toFixed(1)}% hit rate (${data.stats.hits}/${totalRequests} requests)`
        } else if (hitRate >= 70) {
          perfStatus = "healthy"
          perfMessage = `Excellent: ${hitRate.toFixed(1)}% hit rate`
        } else if (hitRate >= 40) {
          perfStatus = "degraded"
          perfMessage = `Moderate: ${hitRate.toFixed(1)}% hit rate - consider longer TTL`
        } else {
          perfStatus = "unhealthy"
          perfMessage = `Low: ${hitRate.toFixed(1)}% hit rate - review caching strategy`
        }

        const perfCheck: HealthCheck = {
          name: "Cache Performance",
          status: perfStatus,
          message: perfMessage,
        }
        checks.push(perfCheck)

        // Check 4: Fast JSON (orjson)
        const jsonCheck: HealthCheck = {
          name: "Fast JSON (orjson)",
          status: data.stats.fast_json ? "healthy" : "warming",
          message: data.stats.fast_json
            ? "orjson enabled - 10x faster serialization"
            : "Using standard JSON (optional optimization)",
        }
        checks.push(jsonCheck)

        // Check 5: Error Rate
        const errorRate = data.stats.total_requests > 0 ? (data.stats.errors / data.stats.total_requests) * 100 : 0
        const errorCheck: HealthCheck = {
          name: "Error Rate",
          status: errorRate === 0 ? "healthy" : errorRate < 5 ? "degraded" : "unhealthy",
          message:
            errorRate === 0
              ? "No errors detected"
              : `${errorRate.toFixed(2)}% error rate (${data.stats.errors} errors)`,
        }
        checks.push(errorCheck)
      } else {
        checks[0] = {
          name: "API Server",
          status: "unhealthy",
          message: `HTTP ${response.status} - ${response.statusText}`,
          latency,
        }
      }
    } catch (error) {
      checks[0] = {
        name: "API Server",
        status: "unhealthy",
        message: error instanceof Error ? error.message : "Connection failed",
      }
    }

    setHealthChecks(checks)
    setLastUpdated(new Date())
    setLoading(false)
  }, [])

  const runLatencyTest = useCallback(async () => {
    const results: PingResult[] = []
    for (let i = 0; i < 5; i++) {
      try {
        const startTime = performance.now()
        await fetch(`${API_URL}/api/products/cache/status`)
        const latency = Math.round(performance.now() - startTime)
        results.push({ success: true, latency })
      } catch (error) {
        results.push({
          success: false,
          latency: 0,
          error: error instanceof Error ? error.message : "Failed",
        })
      }
      await new Promise((r) => setTimeout(r, 200))
    }
    setPingResults(results)
  }, [])

  const runRouteCacheTests = useCallback(async () => {
    setTestingRoutes(true)

    const routes = [
      { name: "Products", endpoint: "/api/products?page=1&per_page=10" },
      { name: "Featured Products", endpoint: "/api/products/featured?limit=10" },
      { name: "Categories", endpoint: "/api/categories?per_page=100" },
      { name: "Categories Tree", endpoint: "/api/categories/tree" },
      { name: "Featured Categories", endpoint: "/api/categories/featured?limit=6" },
      { name: "Carousel", endpoint: "/api/carousel/items?position=homepage" },
      { name: "Footer", endpoint: "/api/footer/settings" },
      { name: "Topbar", endpoint: "/api/topbar/slides" },
      { name: "Theme", endpoint: "/api/theme/active" },
      { name: "Theme CSS", endpoint: "/api/theme/css" },
    ]

    const results: RouteTestResult[] = routes.map((r) => ({
      route: r.name,
      endpoint: r.endpoint,
      status: "pending" as const,
    }))
    setRouteTests([...results])

    // Test each route twice - first to potentially populate cache, second to check cache hit
    for (let i = 0; i < routes.length; i++) {
      const route = routes[i]

      try {
        // First request
        const startTime1 = performance.now()
        const response1 = await fetch(`${API_URL}${route.endpoint}`, {
          headers: { "Content-Type": "application/json" },
        })
        const latency1 = Math.round(performance.now() - startTime1)
        const cacheHeader1 = response1.headers.get("X-Cache")

        // Small delay
        await new Promise((r) => setTimeout(r, 100))

        // Second request (should be cached)
        const startTime2 = performance.now()
        const response2 = await fetch(`${API_URL}${route.endpoint}`, {
          headers: { "Content-Type": "application/json" },
        })
        const latency2 = Math.round(performance.now() - startTime2)
        const cacheHeader2 = response2.headers.get("X-Cache")

        let data: Record<string, unknown> = {}
        try {
          data = await response2.json()
        } catch {
          // Response might not be JSON
        }

        results[i] = {
          route: route.name,
          endpoint: route.endpoint,
          status: response2.ok ? "success" : "error",
          latency: latency2,
          cached: data.cached === true || cacheHeader2 === "HIT",
          cacheHit: cacheHeader2 === "HIT" || latency2 < latency1 * 0.7, // If 2nd request is significantly faster
          error: response2.ok ? undefined : `HTTP ${response2.status}`,
        }
      } catch (error) {
        results[i] = {
          route: route.name,
          endpoint: route.endpoint,
          status: "error",
          error: error instanceof Error ? error.message : "Failed",
        }
      }

      setRouteTests([...results])
    }

    setTestingRoutes(false)
  }, [])

  useEffect(() => {
    runHealthChecks()
  }, [runHealthChecks])

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(runHealthChecks, 10000)
      return () => clearInterval(interval)
    }
  }, [autoRefresh, runHealthChecks])

  const getOverallHealth = () => {
    if (healthChecks.length === 0) return "checking"

    const criticalChecks = healthChecks.filter(
      (c) => c.name === "API Server" || c.name === "Upstash Redis" || c.name === "Error Rate",
    )

    const hasUnhealthyCritical = criticalChecks.some((c) => c.status === "unhealthy")
    if (hasUnhealthyCritical) return "unhealthy"

    const hasDegraded = healthChecks.some((c) => c.status === "degraded")
    if (hasDegraded) return "degraded"

    const hasWarming = healthChecks.some((c) => c.status === "warming")
    if (hasWarming) return "warming"

    return "healthy"
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "text-green-600"
      case "degraded":
        return "text-yellow-600"
      case "unhealthy":
        return "text-red-600"
      case "warming":
        return "text-blue-600"
      default:
        return "text-muted-foreground"
    }
  }

  const getStatusBg = (status: string) => {
    switch (status) {
      case "healthy":
        return "bg-green-100 border-green-200"
      case "degraded":
        return "bg-yellow-100 border-yellow-200"
      case "unhealthy":
        return "bg-red-100 border-red-200"
      case "warming":
        return "bg-blue-100 border-blue-200"
      default:
        return "bg-muted border-border"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />
      case "degraded":
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />
      case "unhealthy":
        return <XCircle className="h-5 w-5 text-red-600" />
      case "warming":
        return <TrendingUp className="h-5 w-5 text-blue-600" />
      default:
        return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    }
  }

  const overallHealth = getOverallHealth()
  const avgLatency =
    pingResults.length > 0
      ? Math.round(
          pingResults.filter((r) => r.success).reduce((a, b) => a + b.latency, 0) /
            pingResults.filter((r) => r.success).length,
        )
      : null

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Cache Health Dashboard</h1>
            <p className="text-muted-foreground">
              Monitor Upstash Redis cache status and performance across all routes
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={autoRefresh ? "border-green-500 text-green-600" : ""}
            >
              <Activity className={`h-4 w-4 mr-1 ${autoRefresh ? "animate-pulse" : ""}`} />
              {autoRefresh ? "Auto" : "Manual"}
            </Button>
            <Button onClick={runHealthChecks} disabled={loading} size="sm">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
              Refresh
            </Button>
          </div>
        </div>

        {/* Overall Status Banner */}
        <Card className={`border-2 ${getStatusBg(overallHealth)}`}>
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div
                  className={`h-16 w-16 rounded-full flex items-center justify-center ${
                    overallHealth === "healthy"
                      ? "bg-green-500"
                      : overallHealth === "degraded"
                        ? "bg-yellow-500"
                        : overallHealth === "unhealthy"
                          ? "bg-red-500"
                          : overallHealth === "warming"
                            ? "bg-blue-500"
                            : "bg-muted"
                  }`}
                >
                  {overallHealth === "healthy" ? (
                    <Wifi className="h-8 w-8 text-white" />
                  ) : overallHealth === "degraded" ? (
                    <AlertTriangle className="h-8 w-8 text-white" />
                  ) : overallHealth === "unhealthy" ? (
                    <WifiOff className="h-8 w-8 text-white" />
                  ) : overallHealth === "warming" ? (
                    <TrendingUp className="h-8 w-8 text-white" />
                  ) : (
                    <Loader2 className="h-8 w-8 text-white animate-spin" />
                  )}
                </div>
                <div>
                  <h2 className={`text-2xl font-bold capitalize ${getStatusColor(overallHealth)}`}>
                    {overallHealth === "checking"
                      ? "Checking..."
                      : overallHealth === "warming"
                        ? "System Warming Up"
                        : overallHealth === "healthy"
                          ? "System Healthy"
                          : overallHealth === "degraded"
                            ? "System Degraded"
                            : "System Unhealthy"}
                  </h2>
                  <p className="text-muted-foreground">
                    {lastUpdated ? `Last checked: ${lastUpdated.toLocaleTimeString()}` : "Checking system health..."}
                  </p>
                  {overallHealth === "warming" && (
                    <p className="text-sm text-blue-600 mt-1">
                      Cache is building up - hit rate will improve with more requests
                    </p>
                  )}
                </div>
              </div>
              {cacheStats && (
                <div className="text-right hidden sm:block">
                  <p className="text-sm text-muted-foreground">Cache Type</p>
                  <Badge variant={cacheStats.type === "upstash" ? "default" : "secondary"}>{cacheStats.type}</Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Health Checks Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {healthChecks.map((check, index) => (
            <Card key={index} className={`border ${getStatusBg(check.status)}`}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(check.status)}
                      <span className="font-semibold">{check.name}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{check.message}</p>
                  </div>
                  {check.latency !== undefined && (
                    <Badge variant="outline" className="text-xs">
                      {check.latency}ms
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Cache Statistics */}
        {cacheStats && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Cache Statistics
              </CardTitle>
              <CardDescription>Real-time cache performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Hit Rate</span>
                    <span className="font-mono font-bold">{cacheStats.stats.hit_rate_percent.toFixed(1)}%</span>
                  </div>
                  <Progress value={cacheStats.stats.hit_rate_percent} className="h-2" />
                </div>

                <div className="rounded-lg border p-4 text-center">
                  <Zap className="h-6 w-6 mx-auto text-green-500 mb-2" />
                  <p className="text-2xl font-bold">{cacheStats.stats.hits}</p>
                  <p className="text-xs text-muted-foreground">Cache Hits</p>
                </div>

                <div className="rounded-lg border p-4 text-center">
                  <Clock className="h-6 w-6 mx-auto text-yellow-500 mb-2" />
                  <p className="text-2xl font-bold">{cacheStats.stats.misses}</p>
                  <p className="text-xs text-muted-foreground">Cache Misses</p>
                </div>

                <div className="rounded-lg border p-4 text-center">
                  <Server className="h-6 w-6 mx-auto text-blue-500 mb-2" />
                  <p className="text-2xl font-bold">{cacheStats.stats.sets}</p>
                  <p className="text-xs text-muted-foreground">Cache Sets</p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Total Requests</p>
                  <p className="text-xl font-bold">{cacheStats.stats.total_requests}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Errors</p>
                  <p className={`text-xl font-bold ${cacheStats.stats.errors > 0 ? "text-red-600" : ""}`}>
                    {cacheStats.stats.errors}
                  </p>
                </div>
                <div
                  className={`rounded-lg border p-4 ${cacheStats.stats.fast_json ? "border-green-200 bg-green-50" : "border-yellow-200 bg-yellow-50"}`}
                >
                  <p className="text-sm text-muted-foreground">JSON Serializer</p>
                  <p
                    className={`text-xl font-bold ${cacheStats.stats.fast_json ? "text-green-600" : "text-yellow-600"}`}
                  >
                    {cacheStats.stats.fast_json ? "orjson" : "standard"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <LayoutGrid className="h-5 w-5" />
                  Route Cache Tests
                </CardTitle>
                <CardDescription>Test caching on all public API routes</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={runRouteCacheTests} disabled={testingRoutes}>
                {testingRoutes ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Zap className="h-4 w-4 mr-1" />}
                Test All Routes
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {routeTests.length > 0 ? (
              <div className="space-y-3">
                {routeTests.map((test, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      test.status === "success"
                        ? "border-green-200 bg-green-50"
                        : test.status === "error"
                          ? "border-red-200 bg-red-50"
                          : "border-muted bg-muted/30"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {test.status === "success" ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : test.status === "error" ? (
                        <XCircle className="h-5 w-5 text-red-600" />
                      ) : (
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      )}
                      <div>
                        <p className="font-medium">{test.route}</p>
                        <p className="text-xs text-muted-foreground font-mono">{test.endpoint}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {test.latency !== undefined && (
                        <Badge variant="outline" className="text-xs">
                          {test.latency}ms
                        </Badge>
                      )}
                      {test.cached !== undefined && (
                        <Badge variant={test.cached ? "default" : "secondary"} className="text-xs">
                          {test.cached ? "Cached" : "Not Cached"}
                        </Badge>
                      )}
                      {test.cacheHit !== undefined && test.cacheHit && (
                        <Badge variant="outline" className="text-xs border-green-500 text-green-600">
                          HIT
                        </Badge>
                      )}
                      {test.error && <span className="text-xs text-red-600">{test.error}</span>}
                    </div>
                  </div>
                ))}

                {/* Summary */}
                {!testingRoutes && routeTests.length > 0 && (
                  <div className="mt-4 p-4 rounded-lg bg-muted/50">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-green-600">
                          {routeTests.filter((t) => t.status === "success").length}
                        </p>
                        <p className="text-xs text-muted-foreground">Passed</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-red-600">
                          {routeTests.filter((t) => t.status === "error").length}
                        </p>
                        <p className="text-xs text-muted-foreground">Failed</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-blue-600">{routeTests.filter((t) => t.cached).length}</p>
                        <p className="text-xs text-muted-foreground">Using Cache</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Click &quot;Test All Routes&quot; to verify caching on all endpoints
              </div>
            )}
          </CardContent>
        </Card>

        {/* Latency Test */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Latency Test
                </CardTitle>
                <CardDescription>Test round-trip response times (5 pings)</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={runLatencyTest}>
                Run Test
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {pingResults.length > 0 ? (
              <div className="space-y-4">
                <div className="flex gap-2">
                  {pingResults.map((result, i) => (
                    <div
                      key={i}
                      className={`flex-1 rounded-lg border p-3 text-center ${
                        result.success
                          ? result.latency < 200
                            ? "border-green-200 bg-green-50"
                            : result.latency < 500
                              ? "border-yellow-200 bg-yellow-50"
                              : "border-red-200 bg-red-50"
                          : "border-red-200 bg-red-50"
                      }`}
                    >
                      {result.success ? (
                        <>
                          <p className="text-lg font-mono font-bold">{result.latency}ms</p>
                          <p className="text-xs text-muted-foreground">Ping {i + 1}</p>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-5 w-5 mx-auto text-red-500" />
                          <p className="text-xs text-red-600">Failed</p>
                        </>
                      )}
                    </div>
                  ))}
                </div>
                {avgLatency !== null && (
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Average Latency</p>
                    <p
                      className={`text-3xl font-mono font-bold ${
                        avgLatency < 200 ? "text-green-600" : avgLatency < 500 ? "text-yellow-600" : "text-red-600"
                      }`}
                    >
                      {avgLatency}ms
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Click &quot;Run Test&quot; to measure latency
              </div>
            )}
          </CardContent>
        </Card>

        {/* Connection Info */}
        <Card>
          <CardHeader>
            <CardTitle>Connection Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">API URL</span>
                <code className="text-xs bg-muted px-2 py-1 rounded">{API_URL}</code>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cache Provider</span>
                <span>{cacheStats?.type || "Unknown"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Update</span>
                <span>{cacheStats?.timestamp || "N/A"}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
