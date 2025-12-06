/**
 * Authentication utility functions
 */

/**
 * Get the current authentication token from localStorage
 * @returns The auth token or null if not found
 */
export function getAuthToken(): string | null {
  if (typeof window === "undefined") {
    return null
  }

  // Try admin token first, then regular user token
  return localStorage.getItem("admin_token") || localStorage.getItem("mizizzi_token") || null
}

/**
 * Set the authentication token in localStorage
 * @param token - The token to store
 */
export function setAuthToken(token: string): void {
  if (typeof window === "undefined") {
    return
  }
  localStorage.setItem("mizizzi_token", token)
}

/**
 * Remove the authentication token from localStorage
 */
export function removeAuthToken(): void {
  if (typeof window === "undefined") {
    return
  }
  localStorage.removeItem("mizizzi_token")
  localStorage.removeItem("admin_token")
  localStorage.removeItem("mizizzi_refresh_token")
  localStorage.removeItem("admin_refresh_token")
  localStorage.removeItem("mizizzi_csrf_token")
}

/**
 * Check if user is authenticated
 * @returns true if an auth token exists
 */
export function isAuthenticated(): boolean {
  return getAuthToken() !== null
}

// Minimal auth utilities to satisfy imports like `import { isLoggedIn } from '@/lib/auth'`
export function isLoggedIn(): boolean {
	// Safe on server during SSR
	if (typeof window === "undefined") return false
	// Adjust these keys to match your app's auth storage (token, session, etc.)
	return Boolean(localStorage.getItem("token") || localStorage.getItem("auth"))
}
