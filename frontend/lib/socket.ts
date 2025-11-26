"use client"

// Lightweight proxy that exposes a socket-like API backed by the app's websocket service.
// This makes runtime imports like "@/lib/socket" and window.socket / window.__MIZIZZI_SOCKET__ work,
// allowing the SWR hook in use-swr-product.ts to attach cache invalidation listeners.

import { websocketService } from "@/services/websocket"

type AnyFunc = (...args: any[]) => any

const socketProxy = {
  // Register handler (maps to websocketService.on)
  on(event: string, cb: AnyFunc) {
    return websocketService.on(event, cb)
  },

  // Remove handler
  off(event: string, cb: AnyFunc) {
    return websocketService.off(event, cb)
  },

  // Emit event to server
  emit(event: string, data?: any) {
    return websocketService.emit(event, data)
  },

  // Subscribe alias
  subscribe<T = any>(event: string, cb: (data: T) => void) {
    return websocketService.subscribe(event, cb)
  },

  // Expose the underlying socket instance (may be null before connection)
  getSocket() {
    return websocketService.getSocket()
  },

  // Expose connection status
  isConnected() {
    return websocketService.getConnectionStatus?.() ?? false
  },

  // Expose the whole service for advanced debugging if needed
  _service: websocketService,
}

if (typeof window !== "undefined") {
  ;(window as any).__MIZIZZI_SOCKET__ = socketProxy
  ;(window as any).socket = socketProxy
  ;(window as any).io = socketProxy
}

export default socketProxy
export { socketProxy }
