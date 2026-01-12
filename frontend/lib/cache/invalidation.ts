// WebSocket/SSE invalidation client
// Listens for product update events from backend and triggers cache invalidation

type InvalidationCallback = (productId: string | number, version: number) => void

interface InvalidationMessage {
  type: "product.updated" | "product.deleted" | "products.cleared"
  id?: string | number
  version?: number
  ids?: (string | number)[]
  timestamp: string
}

let ws: WebSocket | null = null
let eventSource: EventSource | null = null
let reconnectAttempts = 0
const MAX_RECONNECT_ATTEMPTS = 5
const RECONNECT_DELAY = 3000

const callbacks: InvalidationCallback[] = []

// Start WebSocket connection for real-time invalidation
export function startInvalidation(wsUrl: string, onInvalidation?: InvalidationCallback): () => void {
  if (onInvalidation) {
    callbacks.push(onInvalidation)
  }

  const connect = () => {
    try {
      ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        console.log("[v0] Invalidation WebSocket connected")
        reconnectAttempts = 0
      }

      ws.onmessage = (event) => {
        try {
          const message: InvalidationMessage = JSON.parse(event.data)
          handleInvalidationMessage(message)
        } catch (error) {
          console.warn("[v0] Error parsing invalidation message:", error)
        }
      }

      ws.onerror = (error) => {
        console.error("[v0] WebSocket error:", error)
      }

      ws.onclose = () => {
        console.log("[v0] Invalidation WebSocket closed")
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts++
          setTimeout(connect, RECONNECT_DELAY)
        }
      }
    } catch (error) {
      console.error("[v0] Failed to connect WebSocket:", error)
    }
  }

  connect()

  // Return cleanup function
  return () => {
    if (ws) {
      ws.close()
      ws = null
    }
  }
}

// Start SSE connection as fallback (if WebSocket not available)
export function startSSEInvalidation(sseUrl: string, onInvalidation?: InvalidationCallback): () => void {
  if (onInvalidation) {
    callbacks.push(onInvalidation)
  }

  try {
    eventSource = new EventSource(sseUrl)

    eventSource.onmessage = (event) => {
      try {
        const message: InvalidationMessage = JSON.parse(event.data)
        handleInvalidationMessage(message)
      } catch (error) {
        console.warn("[v0] Error parsing SSE message:", error)
      }
    }

    eventSource.onerror = () => {
      console.log("[v0] SSE connection closed, reconnecting...")
      eventSource?.close()
      eventSource = null
      setTimeout(() => startSSEInvalidation(sseUrl, onInvalidation), RECONNECT_DELAY)
    }

    console.log("[v0] SSE invalidation started")
  } catch (error) {
    console.error("[v0] Failed to start SSE:", error)
  }

  // Return cleanup function
  return () => {
    if (eventSource) {
      eventSource.close()
      eventSource = null
    }
  }
}

// Handle incoming invalidation messages
function handleInvalidationMessage(message: InvalidationMessage): void {
  if (message.type === "product.updated" && message.id && message.version) {
    callbacks.forEach((cb) => cb(message.id!, message.version!))
    window.dispatchEvent(
      new CustomEvent("product-invalidated", {
        detail: { productId: message.id, version: message.version },
      }),
    )
  } else if (message.type === "product.deleted" && message.id) {
    callbacks.forEach((cb) => cb(message.id!, 0))
    window.dispatchEvent(
      new CustomEvent("product-deleted", {
        detail: { productId: message.id! },
      }),
    )
  } else if (message.type === "products.cleared") {
    window.dispatchEvent(new CustomEvent("products-cleared"))
  }
}

// Stop all invalidation connections
export function stopInvalidation(): void {
  if (ws) {
    ws.close()
    ws = null
  }
  if (eventSource) {
    eventSource.close()
    eventSource = null
  }
  callbacks.length = 0
}
