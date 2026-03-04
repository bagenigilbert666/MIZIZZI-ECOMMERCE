'use client'

/**
 * Performance monitoring utility for categories caching
 * Log performance metrics to identify optimization benefits
 */

interface PerformanceMetrics {
  serverDataTime: number
  cacheHitTime: number
  isCached: boolean
  cacheSource: 'sessionStorage' | 'localStorage' | 'server'
}

let metrics: PerformanceMetrics[] = []

export function recordCacheMetric(
  isCached: boolean,
  source: 'sessionStorage' | 'localStorage' | 'server',
  time: number
) {
  metrics.push({
    serverDataTime: 0,
    cacheHitTime: time,
    isCached,
    cacheSource: source,
  })

  // Log to console only in development
  if (process.env.NODE_ENV === 'development') {
    console.log(
      `[v0] Categories loaded from ${source} in ${time}ms (cached: ${isCached})`
    )
  }
}

export function getPerformanceMetrics() {
  if (metrics.length === 0) return null

  const avgCacheTime =
    metrics.reduce((sum, m) => sum + m.cacheHitTime, 0) / metrics.length
  const cachedCount = metrics.filter((m) => m.isCached).length
  const cacheHitRate = (cachedCount / metrics.length) * 100

  return {
    totalLoads: metrics.length,
    averageLoadTime: avgCacheTime,
    cacheHitRate: cacheHitRate.toFixed(2),
    lastMetric: metrics[metrics.length - 1],
  }
}

export function resetMetrics() {
  metrics = []
}
