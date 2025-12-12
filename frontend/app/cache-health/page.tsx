"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { API_URL } from "@/config"
import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  Loader2,
  Activity,
  Database,
  Zap,
  Server,
  Wifi,
  WifiOff,
  TrendingUp,
  AlertTriangle,
  ArrowLeft,
  Flame,
  BarChart3,
  Layers,
  Gauge,
  ChevronRight,
  Play,
  Settings2,
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
  config?: {
    products_list_ttl: number
    single_product_ttl: number
    featured_ttl: number
    search_ttl: number
    all_products_ttl: number
  }
  warming?: {
    last_warmed: string | null
    is_warming: boolean
    products_cached: number
    categories_cached: string[]
    errors: string[]
  }
  timestamp: string
  type: string
}

interface HealthCheck {
  name: string
  status: "healthy" | "degraded" | "unhealthy" | "checking" | "warming"
  message: string
  latency?: number
  icon?: React.ReactNode
}

interface PingResult {
  success: boolean
  latency: number
  error?: string
}

export default function CacheHealthPage() {
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null)
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([])
  const [loading, setLoading] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [pingResults, setPingResults] = useState<PingResult[]>([])
  const [isWarmingCache, setIsWarmingCache] = useState(false)

  const runHealthChecks = useCallback(async () => {
    setLoading(true)
    const checks: HealthCheck[] = []

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

        // Check 1: API Connection
        checks.push({
          name: "API Server",
          status: "healthy",
          message: `Connected to backend`,
          latency,
          icon: <Server className="h-4 w-4" />,
        })

        // Check 2: Redis Connection
        checks.push({
          name: "Upstash Redis",
          status: data.connected ? "healthy" : "unhealthy",
          message: data.connected ? `Connected (${data.type})` : "Redis not connected",
          latency,
          icon: <Database className="h-4 w-4" />,
        })

        // Check 3: Cache Performance
        const hitRate = data.stats.hit_rate_percent
        const totalRequests = data.stats.total_requests
        const isWarmingUp = totalRequests < 50

        let perfStatus: HealthCheck["status"]
        let perfMessage: string

        if (isWarmingUp) {
          perfStatus = "warming"
          perfMessage = `${hitRate.toFixed(1)}% hit rate (warming up)`
        } else if (hitRate >= 70) {
          perfStatus = "healthy"
          perfMessage = `${hitRate.toFixed(1)}% hit rate`
        } else if (hitRate >= 40) {
          perfStatus = "degraded"
          perfMessage = `${hitRate.toFixed(1)}% hit rate`
        } else {
          perfStatus = "unhealthy"
          perfMessage = `${hitRate.toFixed(1)}% hit rate`
        }

        checks.push({
          name: "Hit Rate",
          status: perfStatus,
          message: perfMessage,
          icon: <Gauge className="h-4 w-4" />,
        })

        // Check 4: Cache Warming Status
        if (data.warming) {
          checks.push({
            name: "Cache Warmth",
            status: data.warming.products_cached > 0 ? "healthy" : "degraded",
            message:
              data.warming.products_cached > 0 ? `${data.warming.products_cached} products cached` : "Cache not warmed",
            icon: <Flame className="h-4 w-4" />,
          })
        }

        // Check 5: Error Rate
        const errorRate = data.stats.total_requests > 0 ? (data.stats.errors / data.stats.total_requests) * 100 : 0
        checks.push({
          name: "Error Rate",
          status: errorRate === 0 ? "healthy" : errorRate < 5 ? "degraded" : "unhealthy",
          message: errorRate === 0 ? "No errors" : `${errorRate.toFixed(2)}% errors`,
          icon: <AlertTriangle className="h-4 w-4" />,
        })
      } else {
        checks.push({
          name: "API Server",
          status: "unhealthy",
          message: `HTTP ${response.status}`,
          latency,
          icon: <Server className="h-4 w-4" />,
        })
      }
    } catch (error) {
      checks.push({
        name: "API Server",
        status: "unhealthy",
        message: error instanceof Error ? error.message : "Connection failed",
        icon: <Server className="h-4 w-4" />,
      })
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

  const warmCache = useCallback(async () => {
    setIsWarmingCache(true)
    try {
      const response = await fetch(`${API_URL}/api/products/cache/warm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
      if (response.ok) {
        // Poll for completion
        const pollInterval = setInterval(async () => {
          await runHealthChecks()
          if (cacheStats?.warming && !cacheStats.warming.is_warming) {
            clearInterval(pollInterval)
            setIsWarmingCache(false)
          }
        }, 2000)

        // Stop polling after 30 seconds regardless
        setTimeout(() => {
          clearInterval(pollInterval)
          setIsWarmingCache(false)
          runHealthChecks()
        }, 30000)
      }
    } catch (error) {
      console.error("Failed to warm cache:", error)
      setIsWarmingCache(false)
    }
  }, [runHealthChecks, cacheStats?.warming])

  useEffect(() => {
    runHealthChecks()
  }, [runHealthChecks])

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(runHealthChecks, 5000)
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
        return "text-emerald-500"
      case "degraded":
        return "text-amber-500"
      case "unhealthy":
        return "text-red-500"
      case "warming":
        return "text-blue-500"
      default:
        return "text-neutral-400"
    }
  }

  const getStatusBgLight = (status: string) => {
    switch (status) {
      case "healthy":
        return "bg-emerald-500/10"
      case "degraded":
        return "bg-amber-500/10"
      case "unhealthy":
        return "bg-red-500/10"
      case "warming":
        return "bg-blue-500/10"
      default:
        return "bg-neutral-500/10"
    }
  }

  const overallHealth = getOverallHealth()
  const avgLatency =
    pingResults.length > 0
      ? Math.round(
          pingResults.filter((r) => r.success).reduce((a, b) => a + b.latency, 0) /
            Math.max(pingResults.filter((r) => r.success).length, 1),
        )
      : null

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Apple-style Header */}
      <header className="sticky top-0 z-50 border-b border-neutral-200/80 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-sm text-neutral-500 transition-colors hover:text-neutral-900"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Link>
            <div className="h-4 w-px bg-neutral-200" />
            <h1 className="text-sm font-semibold text-neutral-900">Cache Health</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                autoRefresh
                  ? "bg-emerald-500/10 text-emerald-600"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              <Activity className={`h-3.5 w-3.5 ${autoRefresh ? "animate-pulse" : ""}`} />
              {autoRefresh ? "Live" : "Manual"}
            </button>
            <Button
              onClick={runHealthChecks}
              disabled={loading}
              size="sm"
              variant="outline"
              className="h-8 rounded-full border-neutral-200 text-xs bg-transparent"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {/* Status Hero */}
        <div className="mb-8">
          <div className={`inline-flex items-center gap-3 rounded-2xl ${getStatusBgLight(overallHealth)} px-5 py-4`}>
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-full ${
                overallHealth === "healthy"
                  ? "bg-emerald-500"
                  : overallHealth === "degraded"
                    ? "bg-amber-500"
                    : overallHealth === "unhealthy"
                      ? "bg-red-500"
                      : overallHealth === "warming"
                        ? "bg-blue-500"
                        : "bg-neutral-400"
              }`}
            >
              {overallHealth === "healthy" ? (
                <Wifi className="h-6 w-6 text-white" />
              ) : overallHealth === "degraded" ? (
                <AlertTriangle className="h-6 w-6 text-white" />
              ) : overallHealth === "unhealthy" ? (
                <WifiOff className="h-6 w-6 text-white" />
              ) : overallHealth === "warming" ? (
                <TrendingUp className="h-6 w-6 text-white" />
              ) : (
                <Loader2 className="h-6 w-6 animate-spin text-white" />
              )}
            </div>
            <div>
              <h2 className={`text-lg font-semibold ${getStatusColor(overallHealth)}`}>
                {overallHealth === "checking"
                  ? "Checking System"
                  : overallHealth === "warming"
                    ? "System Warming Up"
                    : overallHealth === "healthy"
                      ? "All Systems Operational"
                      : overallHealth === "degraded"
                        ? "Degraded Performance"
                        : "System Issues Detected"}
              </h2>
              <p className="text-sm text-neutral-500">
                {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : "Checking..."}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Hit Rate Card */}
          <div className="group rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200/50 transition-all hover:shadow-md">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
                <Gauge className="h-5 w-5 text-emerald-600" />
              </div>
              <ChevronRight className="h-4 w-4 text-neutral-300 transition-transform group-hover:translate-x-0.5" />
            </div>
            <p className="text-2xl font-semibold text-neutral-900 tabular-nums">
              {cacheStats?.stats.hit_rate_percent?.toFixed(1) ?? "—"}%
            </p>
            <p className="text-sm text-neutral-500">Cache Hit Rate</p>
          </div>

          {/* Total Requests Card */}
          <div className="group rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200/50 transition-all hover:shadow-md">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
                <BarChart3 className="h-5 w-5 text-blue-600" />
              </div>
              <ChevronRight className="h-4 w-4 text-neutral-300 transition-transform group-hover:translate-x-0.5" />
            </div>
            <p className="text-2xl font-semibold text-neutral-900 tabular-nums">
              {cacheStats?.stats.total_requests?.toLocaleString() ?? "—"}
            </p>
            <p className="text-sm text-neutral-500">Total Requests</p>
          </div>

          {/* Cache Hits Card */}
          <div className="group rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200/50 transition-all hover:shadow-md">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10">
                <Zap className="h-5 w-5 text-violet-600" />
              </div>
              <ChevronRight className="h-4 w-4 text-neutral-300 transition-transform group-hover:translate-x-0.5" />
            </div>
            <p className="text-2xl font-semibold text-neutral-900 tabular-nums">
              {cacheStats?.stats.hits?.toLocaleString() ?? "—"}
            </p>
            <p className="text-sm text-neutral-500">Cache Hits</p>
          </div>

          {/* Products Cached Card */}
          <div className="group rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200/50 transition-all hover:shadow-md">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
                <Layers className="h-5 w-5 text-amber-600" />
              </div>
              <ChevronRight className="h-4 w-4 text-neutral-300 transition-transform group-hover:translate-x-0.5" />
            </div>
            <p className="text-2xl font-semibold text-neutral-900 tabular-nums">
              {cacheStats?.warming?.products_cached?.toLocaleString() ?? "—"}
            </p>
            <p className="text-sm text-neutral-500">Products Cached</p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Health Checks Panel */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl bg-white shadow-sm ring-1 ring-neutral-200/50">
              <div className="border-b border-neutral-100 px-5 py-4">
                <h3 className="font-semibold text-neutral-900">System Health</h3>
                <p className="text-sm text-neutral-500">Real-time service status</p>
              </div>
              <div className="divide-y divide-neutral-100">
                {healthChecks.map((check, index) => (
                  <div key={index} className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-lg ${getStatusBgLight(check.status)}`}
                      >
                        <span className={getStatusColor(check.status)}>{check.icon}</span>
                      </div>
                      <div>
                        <p className="font-medium text-neutral-900">{check.name}</p>
                        <p className="text-sm text-neutral-500">{check.message}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {check.latency !== undefined && (
                        <span className="text-xs text-neutral-400 tabular-nums">{check.latency}ms</span>
                      )}
                      {check.status === "healthy" ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      ) : check.status === "degraded" ? (
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                      ) : check.status === "unhealthy" ? (
                        <XCircle className="h-5 w-5 text-red-500" />
                      ) : check.status === "warming" ? (
                        <TrendingUp className="h-5 w-5 text-blue-500" />
                      ) : (
                        <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
                      )}
                    </div>
                  </div>
                ))}
                {healthChecks.length === 0 && (
                  <div className="flex items-center justify-center py-12 text-neutral-400">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Cache Actions */}
            <div className="rounded-2xl bg-white shadow-sm ring-1 ring-neutral-200/50">
              <div className="border-b border-neutral-100 px-5 py-4">
                <h3 className="font-semibold text-neutral-900">Quick Actions</h3>
              </div>
              <div className="p-4 space-y-3">
                <Button
                  onClick={warmCache}
                  disabled={isWarmingCache || cacheStats?.warming?.is_warming}
                  className="w-full justify-start gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600"
                >
                  {isWarmingCache || cacheStats?.warming?.is_warming ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Flame className="h-4 w-4" />
                  )}
                  {isWarmingCache || cacheStats?.warming?.is_warming ? "Warming Cache..." : "Warm Cache"}
                </Button>
                <Button
                  onClick={runLatencyTest}
                  variant="outline"
                  className="w-full justify-start gap-2 rounded-xl bg-transparent"
                >
                  <Play className="h-4 w-4" />
                  Run Latency Test
                </Button>
                <Link href="/redis-test" className="block">
                  <Button variant="outline" className="w-full justify-start gap-2 rounded-xl bg-transparent">
                    <Settings2 className="h-4 w-4" />
                    Advanced Testing
                  </Button>
                </Link>
              </div>
            </div>

            {/* Latency Results */}
            {pingResults.length > 0 && (
              <div className="rounded-2xl bg-white shadow-sm ring-1 ring-neutral-200/50">
                <div className="border-b border-neutral-100 px-5 py-4">
                  <h3 className="font-semibold text-neutral-900">Latency Test</h3>
                  <p className="text-sm text-neutral-500">5 consecutive pings</p>
                </div>
                <div className="p-4">
                  <div className="mb-4 flex gap-2">
                    {pingResults.map((result, i) => (
                      <div
                        key={i}
                        className={`flex-1 rounded-lg py-2 text-center ${
                          result.success
                            ? result.latency < 200
                              ? "bg-emerald-500/10 text-emerald-600"
                              : result.latency < 500
                                ? "bg-amber-500/10 text-amber-600"
                                : "bg-red-500/10 text-red-600"
                            : "bg-red-500/10 text-red-600"
                        }`}
                      >
                        {result.success ? (
                          <span className="text-sm font-semibold tabular-nums">{result.latency}</span>
                        ) : (
                          <XCircle className="mx-auto h-4 w-4" />
                        )}
                      </div>
                    ))}
                  </div>
                  {avgLatency !== null && (
                    <div className="rounded-xl bg-neutral-50 p-4 text-center">
                      <p className="text-xs text-neutral-500 uppercase tracking-wider">Average</p>
                      <p
                        className={`text-2xl font-semibold tabular-nums ${
                          avgLatency < 200 ? "text-emerald-600" : avgLatency < 500 ? "text-amber-600" : "text-red-600"
                        }`}
                      >
                        {avgLatency}ms
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Connection Info */}
            <div className="rounded-2xl bg-white shadow-sm ring-1 ring-neutral-200/50">
              <div className="border-b border-neutral-100 px-5 py-4">
                <h3 className="font-semibold text-neutral-900">Connection</h3>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-500">Cache Type</span>
                  <Badge variant={cacheStats?.type === "upstash" ? "default" : "secondary"} className="rounded-full">
                    {cacheStats?.type ?? "—"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-500">Status</span>
                  <span
                    className={`text-sm font-medium ${cacheStats?.connected ? "text-emerald-600" : "text-red-600"}`}
                  >
                    {cacheStats?.connected ? "Connected" : "Disconnected"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-500">Serializer</span>
                  <span className="text-sm font-medium text-neutral-900">
                    {cacheStats?.stats.fast_json ? "orjson" : "standard"}
                  </span>
                </div>
              </div>
            </div>

            {/* Cache Stats Detail */}
            <div className="rounded-2xl bg-white shadow-sm ring-1 ring-neutral-200/50">
              <div className="border-b border-neutral-100 px-5 py-4">
                <h3 className="font-semibold text-neutral-900">Statistics</h3>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-500">Hits</span>
                  <span className="text-sm font-medium text-neutral-900 tabular-nums">
                    {cacheStats?.stats.hits?.toLocaleString() ?? "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-500">Misses</span>
                  <span className="text-sm font-medium text-neutral-900 tabular-nums">
                    {cacheStats?.stats.misses?.toLocaleString() ?? "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-500">Sets</span>
                  <span className="text-sm font-medium text-neutral-900 tabular-nums">
                    {cacheStats?.stats.sets?.toLocaleString() ?? "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-500">Errors</span>
                  <span
                    className={`text-sm font-medium tabular-nums ${
                      (cacheStats?.stats.errors ?? 0) > 0 ? "text-red-600" : "text-neutral-900"
                    }`}
                  >
                    {cacheStats?.stats.errors ?? "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* TTL Configuration */}
            {cacheStats?.config && (
              <div className="rounded-2xl bg-white shadow-sm ring-1 ring-neutral-200/50">
                <div className="border-b border-neutral-100 px-5 py-4">
                  <h3 className="font-semibold text-neutral-900">TTL Settings</h3>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-500">Products List</span>
                    <span className="text-sm font-medium text-neutral-900 tabular-nums">
                      {cacheStats.config.products_list_ttl}s
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-500">Single Product</span>
                    <span className="text-sm font-medium text-neutral-900 tabular-nums">
                      {cacheStats.config.single_product_ttl}s
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-500">Featured</span>
                    <span className="text-sm font-medium text-neutral-900 tabular-nums">
                      {cacheStats.config.featured_ttl}s
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-500">All Products</span>
                    <span className="text-sm font-medium text-neutral-900 tabular-nums">
                      {cacheStats.config.all_products_ttl}s
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Cached Categories */}
            {cacheStats?.warming?.categories_cached && cacheStats.warming.categories_cached.length > 0 && (
              <div className="rounded-2xl bg-white shadow-sm ring-1 ring-neutral-200/50">
                <div className="border-b border-neutral-100 px-5 py-4">
                  <h3 className="font-semibold text-neutral-900">Cached Categories</h3>
                </div>
                <div className="p-4">
                  <div className="flex flex-wrap gap-2">
                    {cacheStats.warming.categories_cached.map((cat, i) => (
                      <Badge key={i} variant="secondary" className="rounded-full text-xs">
                        {cat}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
