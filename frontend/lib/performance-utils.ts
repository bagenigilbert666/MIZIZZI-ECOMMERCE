'use client';

import React from "react"

/**
 * Performance optimization utilities for categories page
 * Includes image preloading, caching strategies, and animation optimization
 */

/**
 * Prefetch images for optimal loading performance
 * Uses link rel="prefetch" for non-critical images
 */
export function prefetchImages(
  imageUrls: string[],
  options: { priority?: 'high' | 'low'; as?: 'image' } = {}
) {
  const { priority = 'low', as = 'image' } = options

  imageUrls.forEach((url) => {
    if (!url) return

    // Check if already prefetched
    const existing = document.querySelector(`link[href="${url}"]`)
    if (existing) return

    const link = document.createElement('link')
    link.rel = priority === 'high' ? 'prefetch' : 'prefetch'
    link.href = url
    link.as = as as any
    
    if (priority === 'high') {
      link.fetchPriority = 'high'
    }

    document.head.appendChild(link)
  })
}

/**
 * Preload critical images for above-the-fold content
 */
export function preloadCriticalImages(imageUrls: string[]) {
  imageUrls.forEach((url) => {
    if (!url) return

    const link = document.createElement('link')
    link.rel = 'preload'
    link.href = url
    link.as = 'image'
    link.fetchPriority = 'high'

    document.head.appendChild(link)
  })
}

/**
 * Image cache strategy using IndexedDB
 * Stores image blob URLs for faster subsequent loads
 */
export class ImageCacheManager {
  private dbName = 'mizizzi_image_cache'
  private storeName = 'images'
  private db: IDBDatabase | null = null
  private initPromise: Promise<void>

  constructor() {
    this.initPromise = this.initDB()
  }

  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) {
        reject(new Error('IndexedDB not supported'))
        return
      }

      const request = indexedDB.open(this.dbName, 1)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'url' })
        }
      }
    })
  }

  async get(url: string): Promise<Blob | null> {
    await this.initPromise

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const tx = this.db.transaction(this.storeName, 'readonly')
      const store = tx.objectStore(this.storeName)
      const request = store.get(url)

      request.onsuccess = () => {
        const result = request.result
        resolve(result ? result.blob : null)
      }
      request.onerror = () => reject(request.error)
    })
  }

  async set(url: string, blob: Blob): Promise<void> {
    await this.initPromise

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const tx = this.db.transaction(this.storeName, 'readwrite')
      const store = tx.objectStore(this.storeName)
      const request = store.put({
        url,
        blob,
        timestamp: Date.now(),
      })

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async clear(): Promise<void> {
    await this.initPromise

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const tx = this.db.transaction(this.storeName, 'readwrite')
      const store = tx.objectStore(this.storeName)
      const request = store.clear()

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }
}

/**
 * Debounce utility for search/filter operations
 * Prevents excessive re-renders during rapid input changes
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}

/**
 * Request Idle Callback polyfill with timeout fallback
 */
export function requestIdleCallback(
  callback: () => void,
  options?: { timeout?: number }
): number {
  if ('requestIdleCallback' in window) {
    return window.requestIdleCallback(callback, options)
  }

  // Fallback for browsers without requestIdleCallback
  const timeoutId = setTimeout(callback, options?.timeout ?? 1000)
  return timeoutId as unknown as number
}

/**
 * Intersection Observer hook factory
 * Detects when elements enter viewport
 */
export function createIntersectionObserver(
  callback: (entry: IntersectionObserverEntry) => void,
  options?: IntersectionObserverInit
): IntersectionObserver {
  // Wrap a single-entry callback into the IntersectionObserverCallback signature
  const observerCallback: IntersectionObserverCallback = (entries, observer) => {
    const entry = entries[0]
    if (entry) {
      callback(entry)
    }
  }

  return new IntersectionObserver(observerCallback, {
    threshold: 0.1,
    rootMargin: '50px',
    ...options,
  })
}

/**
 * Lazy load component detection
 * Returns true if component should be rendered
 */
export function useLazyLoad(
  ref: React.RefObject<HTMLElement>,
  options?: IntersectionObserverInit
): boolean {
  const [isVisible, setIsVisible] = React.useState(false)

  React.useEffect(() => {
    if (!ref.current) return

    const observer = createIntersectionObserver(
      (entry) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.unobserve(entry.target)
        }
      },
      options
    )

    observer.observe(ref.current)

    return () => observer.disconnect()
  }, [ref, options])

  return isVisible
}

/**
 * Transform animations helper
 * Ensures only GPU-accelerated properties (transform, opacity)
 */
export const animationOptimizations = {
  // Use transform instead of left/top
  translateX: (value: string) => `translateX(${value})`,
  translateY: (value: string) => `translateY(${value})`,
  scale: (value: number) => `scale(${value})`,

  // Combine with will-change for optimal performance
  willChange: 'transform, opacity',
  backfaceVisibility: 'hidden',
  perspective: 1000,
}

/**
 * Check if device supports smooth animations
 */
export function supportsMotion(): boolean {
  if (typeof window === 'undefined') return false

  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  return !mediaQuery.matches
}

/**
 * Batch DOM updates to prevent layout thrashing
 */
export class DOMBatcher {
  private readQueue: Array<() => void> = []
  private writeQueue: Array<() => void> = []
  private scheduled = false

  read(callback: () => void) {
    this.readQueue.push(callback)
    this.schedule()
  }

  write(callback: () => void) {
    this.writeQueue.push(callback)
    this.schedule()
  }

  private schedule() {
    if (this.scheduled) return

    this.scheduled = true
    requestAnimationFrame(() => {
      this.readQueue.forEach((cb) => cb())
      this.readQueue = []

      requestAnimationFrame(() => {
        this.writeQueue.forEach((cb) => cb())
        this.writeQueue = []
        this.scheduled = false
      })
    })
  }
}

/**
 * Memory-efficient scroll position restoration
 */
export function saveScrollPosition(key: string) {
  if (typeof window === 'undefined') return

  const position = window.scrollY
  sessionStorage.setItem(key, JSON.stringify(position))
}

export function restoreScrollPosition(key: string) {
  if (typeof window === 'undefined') return

  const position = sessionStorage.getItem(key)
  if (position) {
    window.scrollTo(0, JSON.parse(position))
    sessionStorage.removeItem(key)
  }
}
