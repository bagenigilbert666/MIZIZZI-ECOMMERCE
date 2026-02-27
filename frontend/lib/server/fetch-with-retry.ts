/**
 * Utility for fetching with automatic retries and timeouts
 * Helps handle transient API failures and slow responses
 */

export interface FetchOptions {
  timeout?: number // milliseconds, default 8000
  retries?: number // number of retry attempts, default 2
  backoffMs?: number // initial backoff in ms, default 500
}

const DEFAULT_TIMEOUT = 8000
const DEFAULT_RETRIES = 2
const DEFAULT_BACKOFF = 500

export async function fetchWithRetry(
  url: string,
  options?: FetchOptions & RequestInit,
): Promise<Response> {
  const timeout = options?.timeout ?? DEFAULT_TIMEOUT
  const retries = options?.retries ?? DEFAULT_RETRIES
  const backoffMs = options?.backoffMs ?? DEFAULT_BACKOFF

  // Extract fetch options
  const { timeout: _, retries: __, backoffMs: ___, ...fetchOptions } = options || {}

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      return response
    } catch (error) {
      lastError = error as Error
      clearTimeout(0) // Clear any remaining timeouts

      // Don't retry on the last attempt
      if (attempt < retries) {
        // Exponential backoff: 500ms, 1000ms, 2000ms, etc.
        const waitTime = backoffMs * Math.pow(2, attempt)
        console.log(
          `[v0] Fetch attempt ${attempt + 1} failed for ${url}, retrying in ${waitTime}ms...`,
          error,
        )
        await new Promise((resolve) => setTimeout(resolve, waitTime))
      }
    }
  }

  throw lastError || new Error(`Failed to fetch ${url} after ${retries + 1} attempts`)
}

/**
 * Fetch with a timeout that returns empty data instead of throwing
 * Used for non-critical data that should gracefully degrade
 */
export async function fetchWithGracefulTimeout<T>(
  url: string,
  parseJson: boolean = true,
  timeoutMs: number = 8000,
): Promise<T | null> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
      },
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      console.warn(`[v0] HTTP ${response.status} for ${url}`)
      return null
    }

    return parseJson ? await response.json() : (await response.text()) as T
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        console.warn(`[v0] Timeout fetching ${url} after ${timeoutMs}ms`)
      } else {
        console.error(`[v0] Error fetching ${url}:`, error.message)
      }
    }
    return null
  }
}
