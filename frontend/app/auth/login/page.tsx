import { AuthLayout } from "@/components/auth/auth-layout"
import { AuthSteps } from "@/components/auth/auth-steps"
import { cookies } from "next/headers"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Sign In - Mizizzi Store",
  description: "Sign in to your Mizizzi Store account",
}

// Check if user is already authenticated server-side
async function getAuthStatus() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("mizizzi_token")?.value
    
    if (!token) {
      return { isAuthenticated: false, shouldRender: true }
    }
    
    // If user has token, they shouldn't be on login page - return redirect signal
    return { isAuthenticated: true, shouldRender: false }
  } catch (error) {
    return { isAuthenticated: false, shouldRender: true }
  }
}

export default async function LoginPage() {
  const authStatus = await getAuthStatus()
  
  // Note: Redirects should happen at middleware level for better performance
  // This is a fallback check
  
  return (
    <AuthLayout>
      <div className="mx-auto w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-6">Sign In</h1>
        <AuthSteps initialFlow="login" />
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>
            By continuing, you agree to our{" "}
            <a href="/terms" className="text-cherry-700 hover:text-cherry-800 font-semibold">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="/privacy" className="text-cherry-700 hover:text-cherry-800 font-semibold">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </AuthLayout>
  )
}

