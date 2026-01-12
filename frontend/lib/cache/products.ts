// IndexedDB wrapper for product metadata caching
// Stores product data for instant display on page load

import type { Product } from "@/types"

const DB_NAME = "product-cache-db"
const DB_VERSION = 1
const STORE_NAME = "products"
const META_STORE_NAME = "metadata"

interface CacheEntry {
  id: string | number
  data: Product
  cachedAt: number
  version: number
}

interface CacheMeta {
  key: string
  value: any
}

let dbInstance: IDBDatabase | null = null

// Initialize IndexedDB connection
async function initDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      dbInstance = request.result
      resolve(dbInstance)
    }

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // Create product store
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" })
        store.createIndex("cachedAt", "cachedAt", { unique: false })
        store.createIndex("version", "version", { unique: false })
      }

      // Create metadata store
      if (!db.objectStoreNames.contains(META_STORE_NAME)) {
        db.createObjectStore(META_STORE_NAME, { keyPath: "key" })
      }
    }
  })
}

// Get a single product from cache
export async function getCachedProduct(id: string | number): Promise<Product | null> {
  try {
    const db = await initDB()
    const transaction = db.transaction(STORE_NAME, "readonly")
    const store = transaction.objectStore(STORE_NAME)

    return new Promise((resolve, reject) => {
      const request = store.get(id)
      request.onsuccess = () => {
        const entry = request.result as CacheEntry | undefined
        resolve(entry ? entry.data : null)
      }
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.warn("[v0] Error getting cached product:", error)
    return null
  }
}

// Get all cached products
export async function getCachedProducts(): Promise<Product[]> {
  try {
    const db = await initDB()
    const transaction = db.transaction(STORE_NAME, "readonly")
    const store = transaction.objectStore(STORE_NAME)

    return new Promise((resolve, reject) => {
      const request = store.getAll()
      request.onsuccess = () => {
        const entries = request.result as CacheEntry[]
        resolve(entries.map((e) => e.data))
      }
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.warn("[v0] Error getting cached products:", error)
    return []
  }
}

// Cache a single product
export async function setCachedProduct(product: Product, version = 1): Promise<void> {
  try {
    const db = await initDB()
    const transaction = db.transaction(STORE_NAME, "readwrite")
    const store = transaction.objectStore(STORE_NAME)

    const entry: CacheEntry = {
      id: product.id,
      data: product,
      cachedAt: Date.now(),
      version,
    }

    return new Promise((resolve, reject) => {
      const request = store.put(entry)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.warn("[v0] Error caching product:", error)
  }
}

// Cache multiple products
export async function setCachedProducts(products: Product[], version = 1): Promise<void> {
  try {
    const db = await initDB()
    const transaction = db.transaction(STORE_NAME, "readwrite")
    const store = transaction.objectStore(STORE_NAME)

    return new Promise((resolve, reject) => {
      let completed = 0
      let hasError = false

      products.forEach((product) => {
        const entry: CacheEntry = {
          id: product.id,
          data: product,
          cachedAt: Date.now(),
          version,
        }

        const request = store.put(entry)

        request.onsuccess = () => {
          completed++
          if (completed === products.length) resolve()
        }

        request.onerror = () => {
          if (!hasError) {
            hasError = true
            reject(request.error)
          }
        }
      })

      if (products.length === 0) resolve()
    })
  } catch (error) {
    console.warn("[v0] Error caching products:", error)
  }
}

// Clear a specific product from cache
export async function clearCachedProduct(id: string | number): Promise<void> {
  try {
    const db = await initDB()
    const transaction = db.transaction(STORE_NAME, "readwrite")
    const store = transaction.objectStore(STORE_NAME)

    return new Promise((resolve, reject) => {
      const request = store.delete(id)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.warn("[v0] Error clearing cached product:", error)
  }
}

// Clear all products from cache
export async function clearAllCachedProducts(): Promise<void> {
  try {
    const db = await initDB()
    const transaction = db.transaction(STORE_NAME, "readwrite")
    const store = transaction.objectStore(STORE_NAME)

    return new Promise((resolve, reject) => {
      const request = store.clear()
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.warn("[v0] Error clearing all cached products:", error)
  }
}

// Store metadata (lastSyncAt, etc.)
export async function setMeta(key: string, value: any): Promise<void> {
  try {
    const db = await initDB()
    const transaction = db.transaction(META_STORE_NAME, "readwrite")
    const store = transaction.objectStore(META_STORE_NAME)

    return new Promise((resolve, reject) => {
      const request = store.put({ key, value })
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.warn("[v0] Error setting metadata:", error)
  }
}

// Get metadata
export async function getMeta(key: string): Promise<any> {
  try {
    const db = await initDB()
    const transaction = db.transaction(META_STORE_NAME, "readonly")
    const store = transaction.objectStore(META_STORE_NAME)

    return new Promise((resolve, reject) => {
      const request = store.get(key)
      request.onsuccess = () => {
        const entry = request.result as CacheMeta | undefined
        resolve(entry ? entry.value : null)
      }
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.warn("[v0] Error getting metadata:", error)
    return null
  }
}

// Evict least recently used entries when storage quota is exceeded
export async function evictOldestEntries(count = 5): Promise<void> {
  try {
    const db = await initDB()
    const transaction = db.transaction(STORE_NAME, "readwrite")
    const store = transaction.objectStore(STORE_NAME)
    const index = store.index("cachedAt")

    return new Promise((resolve, reject) => {
      const request = index.openCursor()
      let deleted = 0

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result as IDBCursorWithValue
        if (cursor && deleted < count) {
          cursor.delete()
          deleted++
          cursor.continue()
        } else {
          resolve()
        }
      }

      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.warn("[v0] Error evicting entries:", error)
  }
}
