/**
 * Google OAuth Setup and Initialization
 * Handles initialization of Google OAuth configuration
 */

import { logGoogleOAuthStatus, validateGoogleOAuthSetup } from "./google-oauth-config"

/**
 * Initialize Google OAuth setup on app start
 * Validates configuration and logs status
 */
export const initializeGoogleOAuth = (): void => {
  if (typeof window === "undefined") return

  // Only log in development
  if (process.env.NODE_ENV === "development") {
    console.log("[v0] Initializing Google OAuth configuration...")
    logGoogleOAuthStatus()
  }

  // Validate setup
  const validation = validateGoogleOAuthSetup()
  if (!validation.isValid) {
    console.warn("[v0] Google OAuth configuration incomplete:", validation.errors)
  }
}

/**
 * Check if Google OAuth is ready to use
 */
export const isGoogleOAuthReady = (): boolean => {
  const validation = validateGoogleOAuthSetup()
  return validation.isValid && typeof window !== "undefined"
}
