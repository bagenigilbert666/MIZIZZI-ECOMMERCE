import { getAuthToken } from "../auth"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://mizizzi-ecommerce-1.onrender.com"

const ALLOWED_ADMIN_EMAILS = [
  "info.contactgilbertdev@gmail.com",
  // Add more admin emails here as needed
]

export interface AdminGoogleAuthResponse {
  status: "success" | "error"
  message: string
  user?: {
    id: string
    email: string
    name: string
    google_id?: string
    profile_picture?: string
    role: string
  }
  access_token?: string
  refresh_token?: string
  csrf_token?: string
  is_new_user?: boolean
}

export interface GoogleConfigResponse {
  status: "success" | "error"
  client_id: string
  configured: boolean
}

class AdminGoogleOAuthAPI {
  private isAllowedAdminEmail(email: string): boolean {
    return ALLOWED_ADMIN_EMAILS.includes(email.toLowerCase())
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit & { timeout?: number } = {}): Promise<T> {
    const token = getAuthToken()
    const timeoutMs = options.timeout || 60000
    delete options.timeout

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
          ...options.headers,
        },
        signal: controller.signal,
        ...options,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error("[v0] API Error Response:", {
          status: response.status,
          statusText: response.statusText,
          errorData,
          endpoint,
        })
        // Extract error message from backend response format
        const errorMessage = errorData.error || errorData.message || `HTTP error! status: ${response.status}`
        throw new Error(errorMessage)
      }

      return await response.json()
    } catch (error: any) {
      if (error.name === "AbortError") {
        throw new Error("Request timed out. Please check your connection and try again.")
      }
      throw error
    }
  }

  async getGoogleConfig(options: { timeout?: number; retries?: number } = {}): Promise<GoogleConfigResponse> {
    const timeout = options.timeout || 45000 // Increased from 10s to 45s for cold starts
    const maxRetries = options.retries ?? 2
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`[v0] Retrying getGoogleConfig (attempt ${attempt + 1}/${maxRetries + 1})...`)
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt))
        }

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), timeout)

        const response = await fetch(`${API_BASE_URL}/api/auth/google-config`, {
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        const data = await response.json().catch(() => ({}))

        if (!response.ok || data.configured === false) {
          // If backend says not configured, try frontend fallback from NEXT_PUBLIC_GOOGLE_CLIENT_ID
          const envClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ""
          if (envClientId) {
            console.warn(
              "[v0] Google OAuth not configured on server, falling back to NEXT_PUBLIC_GOOGLE_CLIENT_ID from frontend env",
            )
            return {
              status: "success",
              client_id: envClientId,
              configured: true,
            }
          }

          console.warn("[v0] Google OAuth not configured on server:", data.message)
          return {
            status: "error",
            client_id: "",
            configured: false,
          }
        }

        // Ensure client_id exists
        if (!data.client_id) {
          const envClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ""
          if (envClientId) {
            console.warn("[v0] Server returned empty client_id, using NEXT_PUBLIC_GOOGLE_CLIENT_ID fallback")
            return {
              status: "success",
              client_id: envClientId,
              configured: true,
            }
          }

          console.warn("[v0] Server returned no client_id for Google OAuth")
          return {
            status: "error",
            client_id: "",
            configured: false,
          }
        }

        return {
          status: "success",
          client_id: data.client_id,
          configured: true,
        }
      } catch (error: any) {
        lastError = error
        console.warn(`[v0] getGoogleConfig attempt ${attempt + 1} failed:`, error.message)

        if (error.name === "AbortError") {
          if (attempt === maxRetries) {
            throw new Error(
              "Server is taking too long to respond. The server may be waking up - please try again in a moment.",
            )
          }
          continue
        }

        throw error
      }
    }

    throw lastError || new Error("Failed to get Google config after retries")
  }

  async loginWithGoogle(googleToken: string): Promise<AdminGoogleAuthResponse> {
    try {
      if (!googleToken || !googleToken.trim()) {
        throw new Error("Google token is required")
      }

      console.log("[v0] Admin: Sending Google token to backend for authentication")

      // Backend returns: { access_token, refresh_token, csrf_token, user, is_new_user }
      // We need: { status, message, user, access_token, refresh_token, csrf_token, is_new_user }
      const response = await this.makeRequest<any>("/api/admin/auth/google-login", {
        method: "POST",
        body: JSON.stringify({ token: googleToken }),
      })

      console.log("[v0] Admin Google OAuth raw response:", response)

      const normalizedResponse: AdminGoogleAuthResponse = {
        status: response.access_token ? "success" : "error",
        message: response.access_token ? "Authentication successful" : "Authentication failed",
        user: response.user,
        access_token: response.access_token,
        refresh_token: response.refresh_token,
        csrf_token: response.csrf_token,
        is_new_user: response.is_new_user,
      }

      if (normalizedResponse.user && normalizedResponse.user.role !== "admin") {
        throw new Error("You don't have admin privileges to access this area")
      }

      if (normalizedResponse.user && !this.isAllowedAdminEmail(normalizedResponse.user.email)) {
        throw new Error("This email is not authorized for admin access")
      }

      if (normalizedResponse.access_token) {
        localStorage.setItem("admin_token", normalizedResponse.access_token)
        localStorage.setItem("mizizzi_token", normalizedResponse.access_token)
        console.log("[v0] Admin access token stored")
      }

      if (normalizedResponse.refresh_token) {
        localStorage.setItem("admin_refresh_token", normalizedResponse.refresh_token)
        localStorage.setItem("mizizzi_refresh_token", normalizedResponse.refresh_token)
        console.log("[v0] Admin refresh token stored")
      }

      if (normalizedResponse.csrf_token) {
        localStorage.setItem("mizizzi_csrf_token", normalizedResponse.csrf_token)
        console.log("[v0] CSRF token stored")
      }

      if (normalizedResponse.user) {
        localStorage.setItem("admin_user", JSON.stringify(normalizedResponse.user))
        console.log("[v0] Admin user data stored")
      }

      return normalizedResponse
    } catch (error: any) {
      console.error("[v0] Admin Google login error:", error)
      throw error
    }
  }

  async getGoogleToken(): Promise<string> {
    return new Promise((resolve, reject) => {
      console.log("[v0] Getting Google token for admin login")

      if (!window.google) {
        console.log("[v0] Loading Google Sign-In script")
        const script = document.createElement("script")
        script.src = "https://accounts.google.com/gsi/client"
        script.async = true
        script.defer = true
        script.onload = () => {
          console.log("[v0] Google Sign-In script loaded")
          this.initializeGoogleSignIn(resolve, reject)
        }
        script.onerror = () => {
          console.error("[v0] Failed to load Google Sign-In library")
          reject(new Error("Failed to load Google Sign-In library"))
        }
        document.head.appendChild(script)
      } else {
        console.log("[v0] Google Sign-In script already loaded")
        this.initializeGoogleSignIn(resolve, reject)
      }
    })
  }

  private async initializeGoogleSignIn(
    resolve: (token: string) => void,
    reject: (error: Error) => void,
  ): Promise<void> {
    try {
      const config = await this.getGoogleConfig()

      // Accept fallback case where frontend env provided the client id
      if (!config.configured || !config.client_id) {
        console.error("[v0] Google OAuth not configured on server and no frontend fallback available")
        reject(
          new Error(
            "Google Sign-In is not available. Ensure GOOGLE_CLIENT_ID is set on the backend, or set NEXT_PUBLIC_GOOGLE_CLIENT_ID in the frontend environment.",
          ),
        )
        return
      }

      const clientId = config.client_id

      console.log("[v0] Initializing Google Sign-In for admin with clientId:", clientId.substring(0, 20) + "...")

      if (!window.google?.accounts?.id) {
        reject(new Error("Google Sign-In library not loaded correctly"))
        return
      }

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response: any) => {
          console.log("[v0] Google callback received for admin")
          if (response.credential) {
            console.log("[v0] Credential received, resolving with token")
            resolve(response.credential)
          } else {
            console.log("[v0] No credential in response")
            reject(new Error("No credential received from Google"))
          }
        },
      })

      console.log("[v0] Creating button container for admin")

      const container = document.createElement("div")
      container.id = "google-signin-button-container-admin"
      container.style.display = "none"
      document.body.appendChild(container)

      console.log("[v0] Rendering Google Sign-In button for admin")

      if (!window.google?.accounts?.id) {
        reject(new Error("Lost connection to Google Sign-In library"))
        return
      }

      window.google.accounts.id.renderButton(container, {
        theme: "outline",
        size: "large",
        type: "standard",
      })

      console.log("[v0] Looking for button to click")

      setTimeout(() => {
        const button = container.querySelector("div[role='button']") as HTMLElement | null
        if (button) {
          console.log("[v0] Triggering Google Sign-In button click for admin")
          button.click()
        } else {
          const fallbackButton = container.querySelector("button") as HTMLButtonElement | null
          if (fallbackButton) {
            console.log("[v0] Triggering Google Sign-In button click (fallback) for admin")
            fallbackButton.click()
          } else {
            console.error("[v0] Failed to find Google Sign-In button")
            console.log("[v0] Container contents:", container.innerHTML)
            reject(new Error("Failed to render Google Sign-In button"))
          }
        }
      }, 500)
    } catch (error) {
      console.error("[v0] Error in initializeGoogleSignIn:", error)
      reject(error instanceof Error ? error : new Error("Failed to initialize Google Sign-In"))
    }
  }

  async authenticateWithGoogle(): Promise<AdminGoogleAuthResponse> {
    try {
      console.log("[v0] Starting Admin Google OAuth flow")

      const googleToken = await this.getGoogleToken()

      console.log("[v0] Got Google token, authenticating admin with backend")

      const response = await this.loginWithGoogle(googleToken)

      console.log("[v0] Admin Google authentication successful")

      return response
    } catch (error) {
      console.error("[v0] Admin Google authentication flow error:", error)
      throw error
    }
  }
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void
          prompt: (callback?: (notification: any) => void) => void
          renderButton: (element: HTMLElement, config: any) => void
        }
        oauth2: {
          initTokenClient: (config: any) => {
            requestAccessToken: () => void
          }
        }
      }
    }
  }
}

export { AdminGoogleOAuthAPI }
export const adminGoogleOAuthAPI = new AdminGoogleOAuthAPI()
