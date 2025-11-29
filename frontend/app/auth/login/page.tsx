import { AuthLayout } from "@/components/auth/auth-layout"
import { AuthSteps } from "@/components/auth/auth-steps"

export default function LoginPage() {
  return (
    <AuthLayout>
      <div className="mx-auto w-full max-w-md">
        <h1 className="text-4xl font-bold text-center mb-8">Sign In</h1>
        {/* @ts-ignore */}
        <AuthSteps initialFlow="login" />
        <div className="mt-8 text-center text-base text-gray-600">
          <p>
            By continuing, you agree to our{" "}
            <a href="/terms" className="text-cherry-700 hover:text-cherry-800 font-bold">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="/privacy" className="text-cherry-700 hover:text-cherry-800 font-bold">
              Privacy Policy
            </a>
            . Experience premium quality shopping with Mizizzi.
          </p>
        </div>
      </div>
    </AuthLayout>
  )
}

