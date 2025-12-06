import { getAuthToken } from "../auth"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://mizizzi-ecommerce-1.onrender.com"

const ALLOWED_ADMIN_EMAILS = [
  "info.contactgilbertdev@gmail.com",
  // Add more admin emails here as needed
]

export interface AdminGoogleAuthResponse {
  message?: string
  error?: string
  user?: {
    id: string
    email: string
    name: string
    google_id?: string
    profile_picture?: string
    role: string
    is_google_user?: boolean
    email_verified?: boolean
  }
  access_token?: string
  refresh_token?: string
  csrf_token?: string
  is_new_user?: boolean
}

export interface GoogleConfigResponse {
  status?: "success" | "error"
  client_id: string
  configured: boolean
}

let googleAuthResolve: ((token: string) => void) | null = null
let googleAuthReject: ((error: Error) => void) | null = null
let isGoogleInitialized = false
let cachedClientId: string | null = null

class AdminGoogleOAuthAPI {
  private isAllowedAdminEmail(email: string): boolean {
    return ALLOWED_ADMIN_EMAILS.includes(email.toLowerCase())
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit & { timeout?: number } = {}): Promise<T> {
    const token = getAuthToken()
    const timeoutMs = options.timeout || 30000
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
        credentials: "include",
        ...options,
      })

      clearTimeout(timeoutId)

      const responseText = await response.text()

      let data: any
      try {
        data = responseText ? JSON.parse(responseText) : {}
      } catch (e) {
        throw new Error(`Server returned invalid JSON: ${response.status}`)
      }

      if (!response.ok) {
        throw new Error(data.error || data.message || data.msg || `HTTP error! status: ${response.status}`)
      }

      return data as T
    } catch (error: any) {
      if (error.name === "AbortError") {
        throw new Error("Request timed out. Please check your connection and try again.")
      }
      throw error
    }
  }

  async getGoogleConfig(options: { timeout?: number } = {}): Promise<GoogleConfigResponse> {
    const timeout = options.timeout || 10000
    return await this.makeRequest<GoogleConfigResponse>("/api/auth/google-config", { timeout })
  }

  async loginWithGoogle(googleToken: string): Promise<AdminGoogleAuthResponse> {
    try {
      if (!googleToken || !googleToken.trim()) {
        throw new Error("Google token is required")
      }

      const response = await this.makeRequest<AdminGoogleAuthResponse>("/api/admin/auth/google-login", {
        method: "POST",
        body: JSON.stringify({ token: googleToken }),
      })

      // Backend returns user directly, check if it exists
      if (!response.user && !response.access_token) {
        throw new Error(response.error || "Authentication failed - no user data received")
      }

      // Validate admin role
      if (response.user && response.user.role !== "admin") {
        throw new Error("You don't have admin privileges to access this area")
      }

      // Validate allowed email
      if (response.user && !this.isAllowedAdminEmail(response.user.email)) {
        throw new Error("This email is not authorized for admin access")
      }

      // Store admin tokens
      if (response.access_token) {
        localStorage.setItem("admin_token", response.access_token)
        localStorage.setItem("mizizzi_token", response.access_token)
      }

      if (response.refresh_token) {
        localStorage.setItem("admin_refresh_token", response.refresh_token)
        localStorage.setItem("mizizzi_refresh_token", response.refresh_token)
      }

      if (response.csrf_token) {
        localStorage.setItem("mizizzi_csrf_token", response.csrf_token)
      }

      // Store admin user data
      if (response.user) {
        localStorage.setItem("admin_user", JSON.stringify(response.user))
      }

      return response
    } catch (error: any) {
      throw error
    }
  }

  async preloadGoogleSignIn(): Promise<void> {
    if (isGoogleInitialized) return

    try {
      // Load script if not present
      if (!window.google) {
        await this.loadGoogleScript()
      }

      // Get client ID
      const config = await this.getGoogleConfig()
      if (!config.configured || !config.client_id) {
        throw new Error("Google OAuth is not configured")
      }

      cachedClientId = config.client_id

      // Initialize Google Sign-In
      window.google!.accounts.id.initialize({
        client_id: cachedClientId,
        callback: this.handleGoogleCallback,
        auto_select: false,
        cancel_on_tap_outside: true,
      })

      isGoogleInitialized = true
    } catch (error) {
      console.error("Failed to preload Google Sign-In:", error)
    }
  }

  private loadGoogleScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.google) {
        resolve()
        return
      }

      const script = document.createElement("script")
      script.src = "https://accounts.google.com/gsi/client"
      script.async = true
      script.defer = true
      script.onload = () => resolve()
      script.onerror = () => reject(new Error("Failed to load Google Sign-In library"))
      document.head.appendChild(script)
    })
  }

  private handleGoogleCallback = (response: any) => {
    if (response.credential) {
      if (googleAuthResolve) {
        googleAuthResolve(response.credential)
        googleAuthResolve = null
        googleAuthReject = null
      }
    } else {
      if (googleAuthReject) {
        googleAuthReject(new Error("No credential received from Google"))
        googleAuthResolve = null
        googleAuthReject = null
      }
    }
  }

  triggerGooglePrompt(): Promise<string> {
    return new Promise((resolve, reject) => {
      googleAuthResolve = resolve
      googleAuthReject = reject

      if (!window.google?.accounts?.id) {
        reject(new Error("Google Sign-In not initialized. Please refresh the page."))
        return
      }

      // Use prompt() for One Tap - this works better with popup blockers
      window.google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed()) {
          const reason = notification.getNotDisplayedReason()
          console.log("Prompt not displayed:", reason)

          // If prompt fails, fall back to rendering a button
          if (reason === "opt_out_or_no_session" || reason === "suppressed_by_user") {
            this.showGoogleButtonFallback(resolve, reject)
          } else {
            reject(new Error(`Google Sign-In unavailable: ${reason}`))
          }
        } else if (notification.isSkippedMoment()) {
          const reason = notification.getSkippedReason()
          console.log("Prompt skipped:", reason)
          // User closed the prompt
          reject(new Error("Sign-in was cancelled"))
        } else if (notification.isDismissedMoment()) {
          const reason = notification.getDismissedReason()
          console.log("Prompt dismissed:", reason)
          if (reason !== "credential_returned") {
            reject(new Error("Sign-in was dismissed"))
          }
          // If credential_returned, the callback will handle it
        }
      })
    })
  }

  private showGoogleButtonFallback(resolve: (token: string) => void, reject: (error: Error) => void): void {
    // Create a visible modal with Google button
    const overlay = document.createElement("div")
    overlay.id = "google-signin-overlay"
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `

    const modal = document.createElement("div")
    modal.style.cssText = `
      background: white;
      padding: 32px;
      border-radius: 12px;
      text-align: center;
      max-width: 400px;
    `

    const title = document.createElement("h3")
    title.textContent = "Sign in with Google"
    title.style.cssText = "margin: 0 0 8px 0; font-size: 18px; font-weight: 600;"

    const subtitle = document.createElement("p")
    subtitle.textContent = "Click the button below to continue"
    subtitle.style.cssText = "margin: 0 0 20px 0; color: #666; font-size: 14px;"

    const buttonContainer = document.createElement("div")
    buttonContainer.id = "google-signin-button-fallback"
    buttonContainer.style.cssText = "display: flex; justify-content: center;"

    const cancelBtn = document.createElement("button")
    cancelBtn.textContent = "Cancel"
    cancelBtn.style.cssText = `
      margin-top: 16px;
      padding: 8px 24px;
      border: 1px solid #ddd;
      background: white;
      border-radius: 6px;
      cursor: pointer;
    `
    cancelBtn.onclick = () => {
      overlay.remove()
      reject(new Error("Sign-in was cancelled"))
    }

    modal.appendChild(title)
    modal.appendChild(subtitle)
    modal.appendChild(buttonContainer)
    modal.appendChild(cancelBtn)
    overlay.appendChild(modal)
    document.body.appendChild(overlay)

    // Update callbacks to also close overlay
    googleAuthResolve = (token: string) => {
      overlay.remove()
      resolve(token)
    }
    googleAuthReject = (error: Error) => {
      overlay.remove()
      reject(error)
    }

    // Render Google button in the modal
    window.google!.accounts.id.renderButton(buttonContainer, {
      theme: "outline",
      size: "large",
      type: "standard",
      text: "signin_with",
      width: 280,
    })
  }

  async authenticateWithGoogle(): Promise<AdminGoogleAuthResponse> {
    try {
      // Ensure initialized
      if (!isGoogleInitialized) {
        await this.preloadGoogleSignIn()
      }

      // Trigger prompt - this happens synchronously on user click
      const googleToken = await this.triggerGooglePrompt()

      // Authenticate with backend
      const response = await this.loginWithGoogle(googleToken)

      return response
    } catch (error) {
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
