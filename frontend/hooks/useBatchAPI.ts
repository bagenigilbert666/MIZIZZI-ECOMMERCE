'use client';

import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export interface UIBatchData {
  timestamp: string;
  total_execution_ms: number;
  cached: boolean;
  sections: {
    carousel?: {
      data: Record<string, any[]>;
      count: number;
      success: boolean;
    };
    topbar?: {
      slides: any[];
      count: number;
      success: boolean;
    };
    categories?: {
      featured: any[];
      root: any[];
      featured_count: number;
      root_count: number;
      success: boolean;
    };
    side_panels?: {
      data: Record<string, any[]>;
      count: number;
      success: boolean;
    };
  };
  meta?: {
    sections_fetched: number;
    parallel_execution: boolean;
  };
}

export interface HomepageBatchData {
  timestamp: string;
  total_execution_ms: number;
  cached: boolean;
  sections: {
    flash_sales?: {
      products: any[];
      count: number;
      success: boolean;
    };
    trending?: {
      products: any[];
      count: number;
      success: boolean;
    };
    top_picks?: {
      products: any[];
      count: number;
      success: boolean;
    };
    new_arrivals?: {
      products: any[];
      count: number;
      success: boolean;
    };
    daily_finds?: {
      products: any[];
      count: number;
      success: boolean;
    };
    luxury_deals?: {
      products: any[];
      count: number;
      success: boolean;
    };
  };
  meta?: {
    parallel_execution: boolean;
    cache_hit_response_time_ms: string;
    cache_miss_response_time_ms: string;
  };
}

/**
 * Hook to fetch UI elements from Redis-cached unified batch endpoint
 * Returns carousel, topbar, categories, and side panels in a single request
 * Response time: 5-10ms (cached) or 100-150ms (fresh)
 */
export function useUIBatch(enabled = true) {
  const { data, error, isLoading, mutate } = useSWR<UIBatchData>(
    enabled ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/ui/batch` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000, // 1 minute
      focusThrottleInterval: 60000,
    }
  );

  return {
    data,
    error,
    isLoading,
    refresh: mutate,
    carousel: data?.sections?.carousel?.data || {},
    topbar: data?.sections?.topbar?.slides || [],
    categories: data?.sections?.categories || { featured: [], root: [] },
    sidePanels: data?.sections?.side_panels?.data || {},
    cached: data?.cached || false,
    executionTime: data?.total_execution_ms || 0,
  };
}

/**
 * Hook to fetch homepage products from Redis-cached batch endpoint
 * Returns flash_sales, trending, top_picks, new_arrivals, daily_finds, luxury_deals
 * Response time: 5-10ms (cached) or 130-150ms (fresh)
 */
export function useHomepageBatch(enabled = true, sections = 'all') {
  const { data, error, isLoading, mutate } = useSWR<HomepageBatchData>(
    enabled
      ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/homepage/batch?sections=${sections}`
      : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000, // 1 minute
      focusThrottleInterval: 60000,
    }
  );

  return {
    data,
    error,
    isLoading,
    refresh: mutate,
    flashSales: data?.sections?.flash_sales?.products || [],
    trending: data?.sections?.trending?.products || [],
    topPicks: data?.sections?.top_picks?.products || [],
    newArrivals: data?.sections?.new_arrivals?.products || [],
    dailyFinds: data?.sections?.daily_finds?.products || [],
    luxuryDeals: data?.sections?.luxury_deals?.products || [],
    cached: data?.cached || false,
    executionTime: data?.total_execution_ms || 0,
  };
}

/**
 * Hook to invalidate cache after admin product updates
 */
export async function invalidateBatchCache(productId?: number) {
  try {
    const endpoint = productId
      ? `/api/homepage/batch/cache/invalidate?product_id=${productId}`
      : `/api/homepage/batch/cache/invalidate`;
    
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${endpoint}`,
      { method: 'POST' }
    );
    
    if (response.ok) {
      console.log('Cache invalidated successfully');
      return await response.json();
    }
    throw new Error('Failed to invalidate cache');
  } catch (error) {
    console.error('Cache invalidation error:', error);
  }
}

/**
 * Hook to get cache statistics and performance metrics
 */
export function useCacheStats() {
  const { data, error, isLoading } = useSWR<any>(
    `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/homepage/batch/cache/stats`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateInterval: 30000, // 30 seconds
    }
  );

  return {
    data,
    error,
    isLoading,
    hitRate: data?.performance?.hit_rate_percent || 0,
    cacheHits: data?.performance?.cache_hits || 0,
    cacheMisses: data?.performance?.cache_misses || 0,
  };
}
