/**
 * Google OAuth Configuration and Utilities
 * Centralized configuration for Google OAuth across the application
 */

interface GoogleOAuthConfig {
  clientId: string
  scopes: string[]
  redirectUri: string
  discoveryDocs: string[]
}

export const getGoogleOAuthConfig = (): GoogleOAuthConfig => {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

  if (!clientId) {
    console.error("[v0] NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set in environment variables")
  }

  return {
    clientId: clientId || "",
    scopes: ["profile", "email"],
    redirectUri: typeof window !== "undefined" ? window.location.origin : "",
    discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"],
  }
}

/**
 * Validate Google OAuth setup
 */
export const validateGoogleOAuthSetup = (): {
  isValid: boolean
  errors: string[]
} => {
  const errors: string[] = []
  const config = getGoogleOAuthConfig()

  if (!config.clientId) {
    errors.push("NEXT_PUBLIC_GOOGLE_CLIENT_ID environment variable is not set")
  }

  if (config.clientId && config.clientId.length < 20) {
    errors.push("NEXT_PUBLIC_GOOGLE_CLIENT_ID appears to be invalid (too short)")
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Log Google OAuth configuration status for debugging
 */
export const logGoogleOAuthStatus = (): void => {
  const validation = validateGoogleOAuthSetup()

  if (validation.isValid) {
    console.log("[v0] ✓ Google OAuth is properly configured")
  } else {
    console.error("[v0] ✗ Google OAuth configuration issues:")
    validation.errors.forEach((error) => {
      console.error(`  - ${error}`)
    })
  }
}
