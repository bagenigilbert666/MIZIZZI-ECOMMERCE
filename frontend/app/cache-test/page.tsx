"use client"

import { useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import {
  RefreshCw,
  Database,
  CheckCircle2,
  XCircle,
  Loader2,
  Trash2,
  Flame,
  Activity,
  Server,
  Layers,
  Package,
  Tag,
  TrendingUp,
  BarChart3,
  Gauge,
  Timer,
  ArrowRight,
  Play,
} from "lucide-react"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://mizizzi-ecommerce.onrender.com"

// Types
interface CacheStats {
  connected: boolean
  type: string
  stats: {
    hits: number
    misses: number
    sets: number
    errors: number
    hit_rate_percent: number
    total_requests: number
    fast_json?: boolean
  }
  timestamp: string
}

interface TestResult {
  id: string
  endpoint: string
  category: "products" | "featured" | "categories"
  status: "success" | "error" | "pending"
  responseTime: number
  cached: boolean
  itemCount?: number
  payloadSize?: number
  backendTime?: number
  message?: string
  timestamp: Date
}

interface EndpointConfig {
  id: string
  name: string
  path: string
  category: "products" | "featured" | "categories"
  description: string
}

interface LatencyComparison {
  endpoint: string
  firstCall: number
  secondCall: number
  improvement: number
  cached: boolean
}

// Endpoint configurations
const PRODUCT_ENDPOINTS: EndpointConfig[] = [
  {
    id: "products-all",
    name: "All Products",
    path: "/api/products/",
    category: "products",
    description: "Fetch all products",
  },
  {
    id: "products-page1",
    name: "Products Page 1",
    path: "/api/products/?page=1&per_page=20",
    category: "products",
    description: "Paginated products",
  },
  {
    id: "products-search",
    name: "Product Search",
    path: "/api/products/search?q=shirt",
    category: "products",
    description: "Search products",
  },
]

const FEATURED_ENDPOINTS: EndpointConfig[] = [
  {
    id: "featured-trending",
    name: "Trending",
    path: "/api/products/featured/trending",
    category: "featured",
    description: "Trending products",
  },
  {
    id: "featured-flash",
    name: "Flash Sales",
    path: "/api/products/featured/flash-sale",
    category: "featured",
    description: "Flash sale items",
  },
  {
    id: "featured-new",
    name: "New Arrivals",
    path: "/api/products/featured/new-arrivals",
    category: "featured",
    description: "New arrival products",
  },
  {
    id: "featured-top",
    name: "Top Picks",
    path: "/api/products/featured/top-picks",
    category: "featured",
    description: "Top pick products",
  },
  {
    id: "featured-daily",
    name: "Daily Finds",
    path: "/api/products/featured/daily-finds",
    category: "featured",
    description: "Daily finds",
  },
  {
    id: "featured-luxury",
    name: "Luxury Deals",
    path: "/api/products/featured/luxury-deals",
    category: "featured",
    description: "Luxury deals",
  },
]

const CATEGORY_ENDPOINTS: EndpointConfig[] = [
  {
    id: "categories-all",
    name: "All Categories",
    path: "/api/categories/",
    category: "categories",
    description: "Fetch all categories",
  },
  {
    id: "categories-tree",
    name: "Category Tree",
    path: "/api/categories/tree",
    category: "categories",
    description: "Hierarchical tree",
  },
  {
    id: "categories-featured",
    name: "Featured Categories",
    path: "/api/categories/featured",
    category: "categories",
    description: "Featured categories",
  },
  {
    id: "categories-popular",
    name: "Popular Categories",
    path: "/api/categories/popular",
    category: "categories",
    description: "Most popular",
  },
]

const ALL_ENDPOINTS = [...PRODUCT_ENDPOINTS, ...FEATURED_ENDPOINTS, ...CATEGORY_ENDPOINTS]

export default function CacheTestPage() {
  const [apiUrl, setApiUrl] = useState(API_BASE_URL)
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null)
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [latencyComparisons, setLatencyComparisons] = useState<LatencyComparison[]>([])
  const [loading, setLoading] = useState(false)
  const [statsLoading, setStatsLoading] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [testProgress, setTestProgress] = useState(0)
  const [activeTab, setActiveTab] = useState("overview")
  const [isRunningFullTest, setIsRunningFullTest] = useState(false)

  // Fetch cache stats
  const fetchCacheStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const response = await fetch(`${apiUrl}/api/products/cache/status`)
      const data = await response.json()
      setCacheStats(data)
    } catch (error) {
      console.error("Failed to fetch cache stats:", error)
      setCacheStats(null)
    } finally {
      setStatsLoading(false)
    }
  }, [apiUrl])

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchCacheStats, 5000)
      return () => clearInterval(interval)
    }
  }, [autoRefresh, fetchCacheStats])

  // Initial load
  useEffect(() => {
    fetchCacheStats()
  }, [fetchCacheStats])

  // Test single endpoint
  const testEndpoint = useCallback(
    async (endpoint: EndpointConfig): Promise<TestResult> => {
      const startTime = performance.now()
      try {
        const response = await fetch(`${apiUrl}${endpoint.path}`)
        const endTime = performance.now()
        const text = await response.text()
        const data = JSON.parse(text)

        const cacheTimeMs = response.headers.get("X-Cache-Time-Ms")
        const backendTime = cacheTimeMs ? Number.parseFloat(cacheTimeMs) : undefined

        return {
          id: endpoint.id,
          endpoint: endpoint.name,
          category: endpoint.category,
          status: "success",
          responseTime: Math.round(endTime - startTime),
          cached: response.headers.get("X-Cache") === "HIT" || !!data.cached_at,
          itemCount: data.items?.length || data.products?.length || data.categories?.length || data.count || 0,
          payloadSize: text.length,
          backendTime,
          timestamp: new Date(),
        }
      } catch (error) {
        const endTime = performance.now()
        return {
          id: endpoint.id,
          endpoint: endpoint.name,
          category: endpoint.category,
          status: "error",
          responseTime: Math.round(endTime - startTime),
          cached: false,
          message: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date(),
        }
      }
    },
    [apiUrl],
  )

  // Run all tests
  const runAllTests = useCallback(async () => {
    setLoading(true)
    setIsRunningFullTest(true)
    setTestResults([])
    setTestProgress(0)

    const results: TestResult[] = []
    const total = ALL_ENDPOINTS.length

    for (let i = 0; i < ALL_ENDPOINTS.length; i++) {
      const endpoint = ALL_ENDPOINTS[i]
      const result = await testEndpoint(endpoint)
      results.push(result)
      setTestResults([...results])
      setTestProgress(((i + 1) / total) * 100)
      await new Promise((r) => setTimeout(r, 100))
    }

    await fetchCacheStats()
    setLoading(false)
    setIsRunningFullTest(false)
  }, [testEndpoint, fetchCacheStats])

  // Run category-specific tests
  const runCategoryTests = useCallback(
    async (category: "products" | "featured" | "categories") => {
      setLoading(true)
      const endpoints =
        category === "products" ? PRODUCT_ENDPOINTS : category === "featured" ? FEATURED_ENDPOINTS : CATEGORY_ENDPOINTS

      const results: TestResult[] = testResults.filter((r) => r.category !== category)

      for (const endpoint of endpoints) {
        const result = await testEndpoint(endpoint)
        results.push(result)
        setTestResults([...results])
        await new Promise((r) => setTimeout(r, 100))
      }

      await fetchCacheStats()
      setLoading(false)
    },
    [testEndpoint, fetchCacheStats, testResults],
  )

  // Run latency comparison test
  const runLatencyComparison = useCallback(async () => {
    setLoading(true)
    setLatencyComparisons([])

    const comparisons: LatencyComparison[] = []
    const testEndpoints = [PRODUCT_ENDPOINTS[0], FEATURED_ENDPOINTS[0], CATEGORY_ENDPOINTS[0]]

    for (const endpoint of testEndpoints) {
      // First call (potentially cold)
      const first = await testEndpoint(endpoint)
      await new Promise((r) => setTimeout(r, 200))
      // Second call (should be cached)
      const second = await testEndpoint(endpoint)

      const improvement =
        first.responseTime > 0 ? Math.round(((first.responseTime - second.responseTime) / first.responseTime) * 100) : 0

      comparisons.push({
        endpoint: endpoint.name,
        firstCall: first.responseTime,
        secondCall: second.responseTime,
        improvement: Math.max(0, improvement),
        cached: second.cached,
      })
      setLatencyComparisons([...comparisons])
    }

    await fetchCacheStats()
    setLoading(false)
  }, [testEndpoint, fetchCacheStats])

  // Warm cache
  const warmCache = useCallback(async () => {
    setLoading(true)
    try {
      await Promise.all([
        fetch(`${apiUrl}/api/products/cache/warm`, { method: "POST" }),
        fetch(`${apiUrl}/api/products/featured/cache/warm`, { method: "POST" }),
        fetch(`${apiUrl}/api/categories/cache/warm`, { method: "POST" }),
      ])
      await fetchCacheStats()
    } catch (error) {
      console.error("Failed to warm cache:", error)
    } finally {
      setLoading(false)
    }
  }, [apiUrl, fetchCacheStats])

  // Clear cache
  const clearCache = useCallback(async () => {
    setLoading(true)
    try {
      await fetch(`${apiUrl}/api/products/cache/clear`, { method: "POST" })
      setTestResults([])
      setLatencyComparisons([])
      await fetchCacheStats()
    } catch (error) {
      console.error("Failed to clear cache:", error)
    } finally {
      setLoading(false)
    }
  }, [apiUrl, fetchCacheStats])

  // Helpers
  const formatSize = (bytes?: number) => {
    if (!bytes) return "-"
    if (bytes < 1024) return `${bytes}B`
    return `${(bytes / 1024).toFixed(1)}KB`
  }

  const getStatusColor = (ms: number) => {
    if (ms < 100) return "text-green-600"
    if (ms < 300) return "text-amber-600"
    return "text-red-600"
  }

  const getStatusBg = (ms: number) => {
    if (ms < 100) return "bg-green-500"
    if (ms < 300) return "bg-amber-500"
    return "bg-red-500"
  }

  const getCategoryStats = (category: "products" | "featured" | "categories") => {
    const results = testResults.filter((r) => r.category === category)
    const successful = results.filter((r) => r.status === "success")
    const cached = successful.filter((r) => r.cached)
    const avgTime =
      successful.length > 0 ? Math.round(successful.reduce((a, b) => a + b.responseTime, 0) / successful.length) : 0
    return { total: results.length, successful: successful.length, cached: cached.length, avgTime }
  }

  const overallStats = {
    products: getCategoryStats("products"),
    featured: getCategoryStats("featured"),
    categories: getCategoryStats("categories"),
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-neutral-200/80 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900">
              <Activity className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-neutral-900">Cache Performance Test</h1>
              <p className="text-xs text-neutral-500">Products, Featured & Categories</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch id="auto-refresh" checked={autoRefresh} onCheckedChange={setAutoRefresh} />
              <Label htmlFor="auto-refresh" className="text-xs text-neutral-600">
                Auto-refresh
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${cacheStats?.connected ? "bg-green-500" : "bg-red-500"}`} />
              <span className="text-xs font-medium text-neutral-600">
                {cacheStats?.connected ? "Connected" : "Disconnected"}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Status Hero */}
        <div className="mb-8 overflow-hidden rounded-2xl bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 p-8 text-white">
          <div className="flex items-start justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Server className="h-5 w-5 text-neutral-400" />
                <span className="text-sm text-neutral-400">Upstash Redis</span>
              </div>
              <h2 className="mb-1 text-3xl font-semibold tracking-tight">
                {cacheStats?.connected ? "Cache Operational" : "Cache Offline"}
              </h2>
              <p className="text-neutral-400">
                {cacheStats?.stats.hit_rate_percent.toFixed(1)}% hit rate across {cacheStats?.stats.total_requests || 0}{" "}
                requests
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={warmCache}
                disabled={loading}
                className="bg-white/10 hover:bg-white/20 text-white border-0"
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Flame className="mr-2 h-4 w-4" />}
                Warm Cache
              </Button>
              <Button
                onClick={clearCache}
                disabled={loading}
                variant="destructive"
                className="bg-red-500/20 hover:bg-red-500/30 text-red-300 border-0"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Clear
              </Button>
            </div>
          </div>

          {/* Stats Row */}
          <div className="mt-8 grid grid-cols-5 gap-4">
            <div className="rounded-xl bg-white/5 p-4">
              <div className="text-xs text-neutral-400 mb-1">Hit Rate</div>
              <div className="text-2xl font-semibold">{cacheStats?.stats.hit_rate_percent.toFixed(1) || 0}%</div>
            </div>
            <div className="rounded-xl bg-white/5 p-4">
              <div className="text-xs text-neutral-400 mb-1">Total Requests</div>
              <div className="text-2xl font-semibold">{cacheStats?.stats.total_requests || 0}</div>
            </div>
            <div className="rounded-xl bg-white/5 p-4">
              <div className="text-xs text-neutral-400 mb-1">Cache Hits</div>
              <div className="text-2xl font-semibold text-green-400">{cacheStats?.stats.hits || 0}</div>
            </div>
            <div className="rounded-xl bg-white/5 p-4">
              <div className="text-xs text-neutral-400 mb-1">Cache Misses</div>
              <div className="text-2xl font-semibold text-amber-400">{cacheStats?.stats.misses || 0}</div>
            </div>
            <div className="rounded-xl bg-white/5 p-4">
              <div className="text-xs text-neutral-400 mb-1">Errors</div>
              <div className="text-2xl font-semibold text-red-400">{cacheStats?.stats.errors || 0}</div>
            </div>
          </div>
        </div>

        {/* API Configuration */}
        <Card className="mb-6 border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-end gap-4">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="api-url" className="text-xs text-neutral-500">
                  Backend API URL
                </Label>
                <Input
                  id="api-url"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  placeholder="http://localhost:5000"
                  className="h-9 border-neutral-200"
                />
              </div>
              <Button onClick={fetchCacheStats} disabled={statsLoading} size="sm" variant="outline">
                {statsLoading ? (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-3.5 w-3.5" />
                )}
                Refresh Stats
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white border border-neutral-200 p-1 h-auto">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-neutral-900 data-[state=active]:text-white px-4 py-2"
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="products"
              className="data-[state=active]:bg-neutral-900 data-[state=active]:text-white px-4 py-2"
            >
              <Package className="mr-2 h-4 w-4" />
              Products
            </TabsTrigger>
            <TabsTrigger
              value="featured"
              className="data-[state=active]:bg-neutral-900 data-[state=active]:text-white px-4 py-2"
            >
              <TrendingUp className="mr-2 h-4 w-4" />
              Featured
            </TabsTrigger>
            <TabsTrigger
              value="categories"
              className="data-[state=active]:bg-neutral-900 data-[state=active]:text-white px-4 py-2"
            >
              <Layers className="mr-2 h-4 w-4" />
              Categories
            </TabsTrigger>
            <TabsTrigger
              value="latency"
              className="data-[state=active]:bg-neutral-900 data-[state=active]:text-white px-4 py-2"
            >
              <Gauge className="mr-2 h-4 w-4" />
              Latency Test
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Run All Tests Button */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-neutral-900">Comprehensive Cache Test</h3>
                    <p className="text-sm text-neutral-500">
                      Test all {ALL_ENDPOINTS.length} endpoints across Products, Featured, and Categories
                    </p>
                  </div>
                  <Button onClick={runAllTests} disabled={loading} size="lg">
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                    {loading ? "Running Tests..." : "Run All Tests"}
                  </Button>
                </div>
                {isRunningFullTest && (
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-xs text-neutral-500">
                      <span>Testing endpoints...</span>
                      <span>{Math.round(testProgress)}%</span>
                    </div>
                    <Progress value={testProgress} className="h-2" />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Category Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
              {/* Products Summary */}
              <Card className="border-0 shadow-sm overflow-hidden">
                <div className="h-1 bg-blue-500" />
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
                        <Package className="h-4 w-4 text-blue-600" />
                      </div>
                      <CardTitle className="text-base">Products</CardTitle>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => runCategoryTests("products")} disabled={loading}>
                      <Play className="h-3 w-3" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-2xl font-semibold">
                        {overallStats.products.cached}/{overallStats.products.total}
                      </div>
                      <div className="text-xs text-neutral-500">Cached</div>
                    </div>
                    <div>
                      <div className={`text-2xl font-semibold ${getStatusColor(overallStats.products.avgTime)}`}>
                        {overallStats.products.avgTime}ms
                      </div>
                      <div className="text-xs text-neutral-500">Avg Response</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Featured Summary */}
              <Card className="border-0 shadow-sm overflow-hidden">
                <div className="h-1 bg-amber-500" />
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100">
                        <TrendingUp className="h-4 w-4 text-amber-600" />
                      </div>
                      <CardTitle className="text-base">Featured</CardTitle>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => runCategoryTests("featured")} disabled={loading}>
                      <Play className="h-3 w-3" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-2xl font-semibold">
                        {overallStats.featured.cached}/{overallStats.featured.total}
                      </div>
                      <div className="text-xs text-neutral-500">Cached</div>
                    </div>
                    <div>
                      <div className={`text-2xl font-semibold ${getStatusColor(overallStats.featured.avgTime)}`}>
                        {overallStats.featured.avgTime}ms
                      </div>
                      <div className="text-xs text-neutral-500">Avg Response</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Categories Summary */}
              <Card className="border-0 shadow-sm overflow-hidden">
                <div className="h-1 bg-green-500" />
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100">
                        <Layers className="h-4 w-4 text-green-600" />
                      </div>
                      <CardTitle className="text-base">Categories</CardTitle>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => runCategoryTests("categories")} disabled={loading}>
                      <Play className="h-3 w-3" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-2xl font-semibold">
                        {overallStats.categories.cached}/{overallStats.categories.total}
                      </div>
                      <div className="text-xs text-neutral-500">Cached</div>
                    </div>
                    <div>
                      <div className={`text-2xl font-semibold ${getStatusColor(overallStats.categories.avgTime)}`}>
                        {overallStats.categories.avgTime}ms
                      </div>
                      <div className="text-xs text-neutral-500">Avg Response</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* All Test Results */}
            {testResults.length > 0 && (
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">All Test Results</CardTitle>
                  <CardDescription>
                    {testResults.filter((r) => r.status === "success").length} successful,{" "}
                    {testResults.filter((r) => r.cached).length} cached
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {testResults.map((result) => (
                      <div
                        key={result.id}
                        className="flex items-center justify-between rounded-lg border border-neutral-100 bg-neutral-50 p-3"
                      >
                        <div className="flex items-center gap-3">
                          {result.status === "success" ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{result.endpoint}</span>
                              <Badge
                                variant="outline"
                                className={`text-[10px] px-1.5 py-0 ${
                                  result.category === "products"
                                    ? "border-blue-200 bg-blue-50 text-blue-700"
                                    : result.category === "featured"
                                      ? "border-amber-200 bg-amber-50 text-amber-700"
                                      : "border-green-200 bg-green-50 text-green-700"
                                }`}
                              >
                                {result.category}
                              </Badge>
                            </div>
                            {result.status === "success" && (
                              <span className="text-xs text-neutral-500">
                                {result.itemCount} items · {formatSize(result.payloadSize)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant={result.cached ? "default" : "secondary"} className="text-[10px]">
                            {result.cached ? "HIT" : "MISS"}
                          </Badge>
                          <span className={`font-mono text-sm font-semibold ${getStatusColor(result.responseTime)}`}>
                            {result.responseTime}ms
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-6">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
                      <Package className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle>Products Cache Test</CardTitle>
                      <CardDescription>Test caching for product listing and search endpoints</CardDescription>
                    </div>
                  </div>
                  <Button onClick={() => runCategoryTests("products")} disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                    Test Products
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {PRODUCT_ENDPOINTS.map((endpoint) => {
                    const result = testResults.find((r) => r.id === endpoint.id)
                    return (
                      <div
                        key={endpoint.id}
                        className="flex items-center justify-between rounded-xl border border-neutral-100 bg-white p-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-100">
                            <Database className="h-4 w-4 text-neutral-600" />
                          </div>
                          <div>
                            <div className="font-medium text-neutral-900">{endpoint.name}</div>
                            <div className="text-xs text-neutral-500">{endpoint.description}</div>
                          </div>
                        </div>
                        {result ? (
                          <div className="flex items-center gap-3">
                            {result.status === "success" ? (
                              <>
                                <span className="text-xs text-neutral-500">{result.itemCount} items</span>
                                <Badge variant={result.cached ? "default" : "secondary"}>
                                  {result.cached ? "CACHED" : "MISS"}
                                </Badge>
                                <span className={`font-mono text-lg font-bold ${getStatusColor(result.responseTime)}`}>
                                  {result.responseTime}ms
                                </span>
                              </>
                            ) : (
                              <Badge variant="destructive">Error</Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-neutral-400">Not tested</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Featured Tab */}
          <TabsContent value="featured" className="space-y-6">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
                      <TrendingUp className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <CardTitle>Featured Products Cache Test</CardTitle>
                      <CardDescription>Test caching for trending, flash sales, new arrivals, and more</CardDescription>
                    </div>
                  </div>
                  <Button onClick={() => runCategoryTests("featured")} disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                    Test Featured
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2">
                  {FEATURED_ENDPOINTS.map((endpoint) => {
                    const result = testResults.find((r) => r.id === endpoint.id)
                    return (
                      <div
                        key={endpoint.id}
                        className="flex items-center justify-between rounded-xl border border-neutral-100 bg-white p-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50">
                            <Tag className="h-4 w-4 text-amber-600" />
                          </div>
                          <div>
                            <div className="font-medium text-neutral-900">{endpoint.name}</div>
                            <div className="text-xs text-neutral-500">{endpoint.description}</div>
                          </div>
                        </div>
                        {result ? (
                          <div className="flex items-center gap-2">
                            <Badge variant={result.cached ? "default" : "secondary"} className="text-[10px]">
                              {result.cached ? "HIT" : "MISS"}
                            </Badge>
                            <span className={`font-mono font-bold ${getStatusColor(result.responseTime)}`}>
                              {result.responseTime}ms
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-neutral-400">-</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories" className="space-y-6">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100">
                      <Layers className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <CardTitle>Categories Cache Test</CardTitle>
                      <CardDescription>
                        Test caching for category listing, tree structure, and popular categories
                      </CardDescription>
                    </div>
                  </div>
                  <Button onClick={() => runCategoryTests("categories")} disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                    Test Categories
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {CATEGORY_ENDPOINTS.map((endpoint) => {
                    const result = testResults.find((r) => r.id === endpoint.id)
                    return (
                      <div
                        key={endpoint.id}
                        className="flex items-center justify-between rounded-xl border border-neutral-100 bg-white p-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50">
                            <Layers className="h-4 w-4 text-green-600" />
                          </div>
                          <div>
                            <div className="font-medium text-neutral-900">{endpoint.name}</div>
                            <div className="text-xs text-neutral-500">{endpoint.description}</div>
                          </div>
                        </div>
                        {result ? (
                          <div className="flex items-center gap-3">
                            {result.status === "success" ? (
                              <>
                                <span className="text-xs text-neutral-500">{result.itemCount} items</span>
                                <Badge variant={result.cached ? "default" : "secondary"}>
                                  {result.cached ? "CACHED" : "MISS"}
                                </Badge>
                                <span className={`font-mono text-lg font-bold ${getStatusColor(result.responseTime)}`}>
                                  {result.responseTime}ms
                                </span>
                              </>
                            ) : (
                              <Badge variant="destructive">Error</Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-neutral-400">Not tested</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Latency Comparison Tab */}
          <TabsContent value="latency" className="space-y-6">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100">
                      <Gauge className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <CardTitle>Latency Comparison Test</CardTitle>
                      <CardDescription>
                        Compare response times between cold (first call) and cached (second call) requests
                      </CardDescription>
                    </div>
                  </div>
                  <Button onClick={runLatencyComparison} disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Timer className="mr-2 h-4 w-4" />}
                    Run Comparison
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {latencyComparisons.length > 0 ? (
                  <div className="space-y-4">
                    {latencyComparisons.map((comparison, index) => (
                      <div key={index} className="rounded-xl border border-neutral-100 bg-white p-6">
                        <div className="mb-4 flex items-center justify-between">
                          <h4 className="font-semibold text-neutral-900">{comparison.endpoint}</h4>
                          {comparison.improvement > 0 && (
                            <Badge className="bg-green-100 text-green-700 border-0">
                              {comparison.improvement}% faster
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-6">
                          <div className="text-center">
                            <div className="text-xs text-neutral-500 mb-1">First Call (Cold)</div>
                            <div className={`text-3xl font-bold ${getStatusColor(comparison.firstCall)}`}>
                              {comparison.firstCall}ms
                            </div>
                          </div>
                          <div className="flex items-center justify-center">
                            <ArrowRight className="h-6 w-6 text-neutral-300" />
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-neutral-500 mb-1">Second Call (Cached)</div>
                            <div className={`text-3xl font-bold ${getStatusColor(comparison.secondCall)}`}>
                              {comparison.secondCall}ms
                            </div>
                            {comparison.cached && (
                              <Badge variant="default" className="mt-1 text-[10px]">
                                CACHE HIT
                              </Badge>
                            )}
                          </div>
                        </div>
                        {/* Visual comparison bar */}
                        <div className="mt-4 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-neutral-500 w-16">Cold</span>
                            <div className="flex-1 h-3 bg-neutral-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${getStatusBg(comparison.firstCall)} transition-all duration-500`}
                                style={{ width: `${Math.min((comparison.firstCall / 1000) * 100, 100)}%` }}
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-neutral-500 w-16">Cached</span>
                            <div className="flex-1 h-3 bg-neutral-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${getStatusBg(comparison.secondCall)} transition-all duration-500`}
                                style={{ width: `${Math.min((comparison.secondCall / 1000) * 100, 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-neutral-400">
                    <Gauge className="h-12 w-12 mb-4 opacity-50" />
                    <p>Click &quot;Run Comparison&quot; to test cache performance</p>
                    <p className="text-xs mt-1">This will test Products, Featured, and Categories endpoints</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Performance Legend */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm">Performance Legend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-green-500" />
                    <span className="text-sm text-neutral-600">Excellent (&lt;100ms)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-amber-500" />
                    <span className="text-sm text-neutral-600">Good (100-300ms)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-red-500" />
                    <span className="text-sm text-neutral-600">Slow (&gt;300ms)</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
