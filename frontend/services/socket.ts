import { io } from "socket.io-client"
import getBackendUrl from "@/lib/api"

// Build ws/wss base URL and socket.io path from backend base URL
async function buildWebSocketOptions() {
  // getBackendUrl may return a Promise<AxiosResponse> or a string; await and extract string
  // e.g. "https://mizizzi-ecommerce-1.onrender.com"
  const resp = await getBackendUrl({})
  const backend = typeof resp === "string" ? resp : (resp && (resp as any).data) || ""

  try {
    const u = new URL(backend)
    const protocol = u.protocol === "https:" ? "wss:" : "ws:"
    // host includes hostname and port if present
    const host = u.host
    // preserve any base pathname on the backend (e.g. /api-prefix), trim trailing slash
    const basePath = (u.pathname && u.pathname !== "/") ? u.pathname.replace(/\/$/, "") : ""
    // socket.io server path (standard is /socket.io). If backend has a basePath, append socket.io to it.
    const socketPath = `${basePath || ""}/socket.io`
    const url = `${protocol}//${host}${basePath}`

    return {
      url,
      path: socketPath || "/socket.io",
    }
  } catch (err) {
    // Fallback: assume Render domain without pathname
    const fallbackResp = await getBackendUrl({}).catch(() => null)
    const fallback = fallbackResp ? (typeof fallbackResp === "string" ? fallbackResp : (fallbackResp as any).data) : ""
    const fallbackHost = fallback ? fallback.replace(/^https?:\/\//, "").replace(/\/$/, "") : ""
    return {
      url: `wss://${fallbackHost}`,
      path: "/socket.io",
    }
  }
}

export async function createSocket() {
  const { url, path } = await buildWebSocketOptions()
  // Use websocket transport explicitly to avoid polling attempts to localhost
  return io(url, {
    path,
    transports: ["websocket"],
    autoConnect: false,
    // ...other options like auth can be added here
  })
}