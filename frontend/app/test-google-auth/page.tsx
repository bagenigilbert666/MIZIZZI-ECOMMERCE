"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, CheckCircle2, XCircle, Info } from "lucide-react"
import { googleOAuthAPI } from "@/lib/api/google-oauth"
import { isLoggedIn } from "@/lib/auth"
import { useRouter } from "next/navigation"

export default function TestGoogleAuthPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false)
  const [result, setResult] = useState<{
    type: "success" | "error" | "info"
    message: string
    details?: any
  } | null>(null)
  const [googleConfig, setGoogleConfig] = useState<any>(null)
  const [googleStatus, setGoogleStatus] = useState<any>(null)
  const router = useRouter()

  // Check login status whenever localStorage changes
  useEffect(() => {
    const checkLoginStatus = () => {
      setIsUserLoggedIn(isLoggedIn())
    }

    // Check on mount
    checkLoginStatus()

    // Listen for storage events (logout in other tabs)
    window.addEventListener('storage', checkLoginStatus)
    
    return () => {
      window.removeEventListener('storage', checkLoginStatus)
    }
  }, [])

  const handleTestConfig = async () => {
    setIsLoading(true)
    setResult(null)
    try {
      const config = await googleOAuthAPI.getGoogleConfig()
      setGoogleConfig(config)
      setResult({
        type: "success",
        message: "Google OAuth is configured!",
        details: config,
      })
    } catch (error: any) {
      setResult({
        type: "error",
        message: error.message || "Failed to get Google config",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleTestLogin = async () => {
    setIsLoading(true)
    setResult(null)
    try {
      console.log("[v0] Starting Google login test")
      const response = await googleOAuthAPI.authenticateWithGoogle()

      setResult({
        type: "success",
        message: response.is_new_user ? "Successfully registered with Google!" : "Successfully logged in with Google!",
        details: {
          user: response.user,
          is_new_user: response.is_new_user,
        },
      })

      // Redirect to home page after 2 seconds
      setTimeout(() => {
        router.push("/")
      }, 2000)
    } catch (error: any) {
      console.error("[v0] Google login test error:", error)
      setResult({
        type: "error",
        message: error.message || "Failed to login with Google",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleTestStatus = async () => {
    setIsLoading(true)
    setResult(null)
    try {
      const status = await googleOAuthAPI.getGoogleStatus()
      setGoogleStatus(status)
      setResult({
        type: "info",
        message: status.google_linked ? `Google account linked: ${status.google_email}` : "No Google account linked",
        details: status,
      })
    } catch (error: any) {
      setResult({
        type: "error",
        message: error.message || "Failed to get Google status",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleTestLogout = async () => {
    setIsLoading(true)
    setResult(null)
    try {
      const response = await googleOAuthAPI.logoutGoogle()
      setResult({
        type: "success",
        message: "Successfully logged out from Google",
        details: response,
      })

      // Redirect to login page after 2 seconds
      setTimeout(() => {
        router.push("/auth")
      }, 2000)
    } catch (error: any) {
      setResult({
        type: "error",
        message: error.message || "Failed to logout",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleTestServerHealth = async () => {
    setIsLoading(true)
    setResult(null)
    try {
      const health = await googleOAuthAPI.checkServerHealth()
      setResult({
        type: health.available ? "success" : "error",
        message: health.message,
      })
    } catch (error: any) {
      setResult({
        type: "error",
        message: error.message || "Failed to check server health",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold">Google OAuth Test Suite</CardTitle>
            <CardDescription>Test all Google OAuth authentication endpoints and functionality</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Server Health Check */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">1. Server Health Check</h3>
              <p className="text-sm text-muted-foreground">Verify backend server is running</p>
              <Button onClick={handleTestServerHealth} disabled={isLoading} className="w-full">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  "Check Server Health"
                )}
              </Button>
            </div>

            {/* Google Config Test */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">2. Google OAuth Configuration</h3>
              <p className="text-sm text-muted-foreground">Check if Google OAuth is configured on the backend</p>
              <Button onClick={handleTestConfig} disabled={isLoading} className="w-full">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  "Test Google Config"
                )}
              </Button>
              {googleConfig && (
                <div className="mt-2 p-3 bg-gray-100 rounded-md">
                  <p className="text-sm font-mono">
                    <strong>Client ID:</strong> {googleConfig.client_id?.substring(0, 30)}...
                  </p>
                  <p className="text-sm font-mono">
                    <strong>Configured:</strong> {googleConfig.configured ? "Yes" : "No"}
                  </p>
                </div>
              )}
            </div>

            {/* Google Login Test */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">3. Google Login/Register</h3>
              <p className="text-sm text-muted-foreground">
                Test complete Google OAuth flow (opens Google Sign-In popup)
              </p>
              <Button onClick={handleTestLogin} disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-700">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    Sign in with Google
                  </>
                )}
              </Button>
            </div>

            {/* Google Status Test */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">4. Google Account Status</h3>
              <p className="text-sm text-muted-foreground">Check if current user has linked Google account</p>
              <Button
                onClick={handleTestStatus}
                disabled={isLoading || !isUserLoggedIn}
                variant="outline"
                className="w-full bg-transparent"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  "Check Google Status"
                )}
              </Button>
              {!isUserLoggedIn && (
                <p className="text-sm text-yellow-600">
                  ⚠️ Please sign in with Google first to check account status
                </p>
              )}
              {googleStatus && (
                <div className="mt-2 p-3 bg-gray-100 rounded-md">
                  <p className="text-sm font-mono">
                    <strong>Linked:</strong> {googleStatus.google_linked ? "Yes" : "No"}
                  </p>
                  {googleStatus.google_email && (
                    <p className="text-sm font-mono">
                      <strong>Email:</strong> {googleStatus.google_email}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Google Logout Test */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">5. Google Logout</h3>
              <p className="text-sm text-muted-foreground">Logout from current Google session</p>
              <Button onClick={handleTestLogout} disabled={isLoading || !isUserLoggedIn} variant="destructive" className="w-full">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Logging out...
                  </>
                ) : (
                  "Logout from Google"
                )}
              </Button>
              {!isUserLoggedIn && (
                <p className="text-sm text-yellow-600">
                  ⚠️ Please sign in with Google first to test logout
                </p>
              )}
            </div>

            {/* Result Display */}
            {result && (
              <Alert
                variant={result.type === "error" ? "destructive" : "default"}
                className={
                  result.type === "success"
                    ? "border-green-500 bg-green-50"
                    : result.type === "info"
                      ? "border-blue-500 bg-blue-50"
                      : ""
                }
              >
                {result.type === "success" && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                {result.type === "error" && <XCircle className="h-4 w-4" />}
                {result.type === "info" && <Info className="h-4 w-4 text-blue-600" />}
                <AlertDescription>
                  <p className="font-semibold">{result.message}</p>
                  {result.details && (
                    <pre className="mt-2 text-xs bg-white p-2 rounded overflow-auto max-h-40">
                      {JSON.stringify(result.details, null, 2)}
                    </pre>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Instructions Card */}
        <Card>
          <CardHeader>
            <CardTitle>Testing Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <strong>1.</strong> First, check server health to ensure backend is running
            </p>
            <p>
              <strong>2.</strong> Test Google config to verify OAuth credentials are set
            </p>
            <p>
              <strong>3.</strong> Click "Sign in with Google" to test the complete OAuth flow
            </p>
            <p>
              <strong>4.</strong> After login, check Google status to see linked account info
            </p>
            <p>
              <strong>5.</strong> Test logout to clear the session
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
