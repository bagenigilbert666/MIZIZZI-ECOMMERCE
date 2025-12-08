"use client"

import useSWR, { type SWRConfiguration } from "swr"

const CACHE_PREFIX = "mizizzi_swr_"

function getFromLocalStorage<T>(key: string): T | undefined {
  if (typeof window === "undefined") return undefined
  try {
    const cached = localStorage.getItem(`${CACHE_PREFIX}${key}`)
    if (cached) {
      const parsed = JSON.parse(cached)
      return parsed.data as T
    }
  } catch {
    // Ignore localStorage errors
  }
  return undefined
}

function saveToLocalStorage<T>(key: string, data: T): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify({ data, timestamp: Date.now() }))
  } catch {
    // Ignore localStorage errors (quota exceeded, etc.)
  }
}

interface UseSWRWithLocalStorageOptions<T> extends SWRConfiguration<T> {
  fallbackData?: T
}

export function useSWRWithLocalStorage<T>(
  key: string | null,
  fetcher: ((url: string) => Promise<T>) | null,
  options?: UseSWRWithLocalStorageOptions<T>,
) {
  const localStorageData = key ? getFromLocalStorage<T>(key) : undefined
  const initialData = localStorageData ?? options?.fallbackData

  const { data, error, isLoading, isValidating, mutate } = useSWR<T>(key, fetcher, {
    ...options,
    fallbackData: initialData,
    revalidateOnMount: true,
    revalidateOnFocus: false,
    keepPreviousData: true,
    onSuccess: (newData) => {
      if (key && newData) {
        saveToLocalStorage(key, newData)
      }
      options?.onSuccess?.(newData, key!, { ...options } as any)
    },
  })

  return {
    data: data ?? initialData,
    error,
    isLoading: isLoading && !initialData, // Only show loading if no cached data
    isValidating,
    mutate,
    isFromCache: !!localStorageData && !data,
  }
}

interface PanelItem {
  id: number
  title: string
  metric: string
  description: string
  icon_name: string
  image_url: string
  gradient: string
  features: string[]
  is_active: boolean
}

interface PanelResponse {
  items: PanelItem[]
}

interface MappedPanelItem {
  id: number
  title: string
  metric: string
  description: string
  icon_name: string
  image: string
  gradient: string
  features: string[]
  is_active: boolean
}

export function usePanelData(panelType: string, position: string, fallbackData: MappedPanelItem[]) {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
  const key = `panel_${panelType}_${position}`

  const fetcher = async (): Promise<MappedPanelItem[]> => {
    const response = await fetch(`${API_BASE_URL}/api/panels/items?panel_type=${panelType}&position=${position}`)
    if (!response.ok) {
      throw new Error("Failed to fetch panel data")
    }
    const data: PanelResponse = await response.json()
    if (data.items && data.items.length > 0) {
      return data.items.map((item) => ({
        id: item.id,
        title: item.title,
        metric: item.metric,
        description: item.description,
        icon_name: item.icon_name,
        image: item.image_url,
        gradient: item.gradient,
        features: item.features,
        is_active: item.is_active,
      }))
    }
    return fallbackData
  }

  return useSWRWithLocalStorage<MappedPanelItem[]>(key, fetcher, {
    fallbackData,
  })
}
