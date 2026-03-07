'use client'

import { useEffect } from "react"

/**
 * PERFORMANCE MONITORING HOOK
 * 
 * Tracks Core Web Vitals and key performance metrics:
 * - First Contentful Paint (FCP) - when first content appears
 * - Largest Contentful Paint (LCP) - when largest element paints
 * - Cumulative Layout Shift (CLS) - visual stability
 * - First Input Delay (FID) - responsiveness to user input
 * - Time to Interactive (TTI) - when page becomes interactive
 * 
 * Logs metrics to console and can send to analytics service.
 * 
 * Usage:
 * usePerformanceMonitoring("homepage")
 */
export function usePerformanceMonitoring(pageName: string = "page") {
  useEffect(() => {
    // Use PerformanceObserver to track metrics
    if (!("PerformanceObserver" in window)) {
      console.warn("[Performance] PerformanceObserver not supported")
      return
    }

    // Track Core Web Vitals
    try {
      // Largest Contentful Paint
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1]
        console.log(
          `[Performance ${pageName}] Largest Contentful Paint (LCP): ${Math.round(lastEntry.renderTime || lastEntry.loadTime)}ms`
        )
      })
      lcpObserver.observe({ entryTypes: ["largest-contentful-paint"] })

      // Cumulative Layout Shift
      let clsValue = 0
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if ((entry as any).hadRecentInput) continue
          clsValue += (entry as any).value
        }
        console.log(`[Performance ${pageName}] Cumulative Layout Shift (CLS): ${clsValue.toFixed(3)}`)
      })
      clsObserver.observe({ entryTypes: ["layout-shift"] })

      // First Input Delay
      const fidObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          console.log(`[Performance ${pageName}] First Input Delay (FID): ${Math.round((entry as any).processingDuration)}ms`)
        }
      })
      fidObserver.observe({ entryTypes: ["first-input"] })

      return () => {
        lcpObserver.disconnect()
        clsObserver.disconnect()
        fidObserver.disconnect()
      }
    } catch (error) {
      console.warn("[Performance] Error monitoring metrics:", error)
    }
  }, [pageName])
}

/**
 * MEASURE SECTION LOAD TIME
 * 
 * Measures how long a specific section takes to render.
 * Useful for identifying slow-loading deferred sections.
 * 
 * Usage:
 * const { startMeasure, endMeasure } = useMeasureSection("luxury-deals")
 */
export function useMeasureSection(sectionName: string) {
  const startMeasure = () => {
    const startMark = `${sectionName}-start`
    performance.mark(startMark)
    return startMark
  }

  const endMeasure = (startMark: string) => {
    const endMark = `${sectionName}-end`
    performance.mark(endMark)
    performance.measure(sectionName, startMark, endMark)

    const measure = performance.getEntriesByName(sectionName)[0]
    console.log(`[Performance] Section "${sectionName}" loaded in ${Math.round((measure as any).duration)}ms`)

    // Clean up marks
    performance.clearMarks(startMark)
    performance.clearMarks(endMark)
  }

  return { startMeasure, endMeasure }
}

/**
 * LOG PERFORMANCE METRICS ON PAGE LOAD
 * 
 * Logs navigation timing data after page fully loads.
 * Helps identify bottlenecks in initial page load.
 */
export function logNavigationTiming() {
  if (!("performance" in window) || !("PerformanceNavigationTiming" in window)) {
    return
  }

  const onLoad = () => {
    try {
      const navTiming = performance.getEntriesByType("navigation")[0] as any
      if (!navTiming) return

      console.group("[Performance] Navigation Timing")
      console.log(`DNS lookup: ${Math.round(navTiming.domainLookupEnd - navTiming.domainLookupStart)}ms`)
      console.log(`TCP connection: ${Math.round(navTiming.connectEnd - navTiming.connectStart)}ms`)
      console.log(`Request time: ${Math.round(navTiming.responseStart - navTiming.requestStart)}ms`)
      console.log(`Response time: ${Math.round(navTiming.responseEnd - navTiming.responseStart)}ms`)
      console.log(`DOM processing: ${Math.round(navTiming.domInteractive - navTiming.domLoading)}ms`)
      console.log(`Total load time: ${Math.round(navTiming.loadEventEnd - navTiming.fetchStart)}ms`)
      console.groupEnd()
    } catch (error) {
      console.warn("[Performance] Error logging navigation timing:", error)
    }
  }

  if (document.readyState === "complete") {
    onLoad()
  } else {
    window.addEventListener("load", onLoad, { once: true })
  }
}
