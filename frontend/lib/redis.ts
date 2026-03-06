import { Redis } from '@upstash/redis'

// Initialize Redis client with Upstash credentials
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL || 'https://nearby-rabbit-63956.upstash.io',
  token: process.env.UPSTASH_REDIS_TOKEN || '',
})

export default redis

// Cache configuration
export const CACHE_CONFIG = {
  PRODUCTS_LIST: {
    key: 'products:list',
    ttl: 5 * 60, // 5 minutes
  },
  PRODUCTS_CATEGORY: {
    key: 'products:category',
    ttl: 10 * 60, // 10 minutes
  },
  PRODUCT_DETAIL: {
    key: 'product:detail',
    ttl: 15 * 60, // 15 minutes
  },
  PRODUCT_IMAGES: {
    key: 'product:images',
    ttl: 30 * 60, // 30 minutes
  },
}

// Utility functions for cache operations
export async function getCachedData<T>(key: string): Promise<T | null> {
  try {
    const data = await redis.get(key)
    if (data) {
      console.log(`[v0] Cache HIT: ${key}`)
      return data as T
    }
    console.log(`[v0] Cache MISS: ${key}`)
    return null
  } catch (error) {
    console.error(`[v0] Redis GET error for ${key}:`, error)
    return null
  }
}

export async function setCachedData<T>(key: string, value: T, ttl: number = 300): Promise<void> {
  try {
    await redis.setex(key, ttl, JSON.stringify(value))
    console.log(`[v0] Cache SET: ${key} (TTL: ${ttl}s)`)
  } catch (error) {
    console.error(`[v0] Redis SET error for ${key}:`, error)
  }
}

export async function invalidateCache(pattern: string): Promise<void> {
  try {
    // Get all keys matching the pattern
    const keys = await redis.keys(`${pattern}*`)
    if (keys && keys.length > 0) {
      await redis.del(...keys)
      console.log(`[v0] Cache INVALIDATED: ${pattern}* (${keys.length} keys)`)
    }
  } catch (error) {
    console.error(`[v0] Redis DEL error for pattern ${pattern}:`, error)
  }
}

export async function clearAllCache(): Promise<void> {
  try {
    await redis.flushdb()
    console.log(`[v0] All cache cleared`)
  } catch (error) {
    console.error(`[v0] Redis FLUSHDB error:`, error)
  }
}
