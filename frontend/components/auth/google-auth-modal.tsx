"use client"

import { Modal } from "@/components/ui/modal"
import { motion, AnimatePresence } from "framer-motion"
import { Check } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { GoogleOAuthAPI } from "@/lib/api/google-oauth"
import { useAuth } from "@/contexts/auth/auth-context"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"

interface GoogleAuthModalProps {
  isOpen: boolean
  onClose: () => void
  mode?: "signup" | "signin"
}

type Status = "idle" | "loading" | "success" | "error"

function AppleSpinner({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2.5"
        opacity="0.18"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

function GoogleIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
  )
}

export function GoogleAuthModal({ isOpen, onClose, mode = "signup" }: GoogleAuthModalProps) {
  const [status, setStatus] = useState<Status>("idle")
  const [errorMessage, setErrorMessage] = useState("")
  const { refreshAuthState } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const googleOAuth = useMemo(() => new GoogleOAuthAPI(), [])

  useEffect(() => {
    if (isOpen) {
      setStatus("idle")
      setErrorMessage("")
    }
  }, [isOpen])

  const title = "Continue with Google"
  const subtitle = "Create your account in one step."

  const handleGoogleAuth = async () => {
    setStatus("loading")
    setErrorMessage("")

    try {
      const result = await googleOAuth.authenticateWithGoogle()
      await refreshAuthState()
      setStatus("success")

      toast({
        title: result.is_new_user ? "Welcome to MIZIZZI" : "Welcome back",
        description: result.is_new_user ? "Account created successfully." : "Signed in successfully.",
      })

      setTimeout(() => {
        onClose()
        router.push("/")
      }, 800)
    } catch (error) {
      setStatus("error")
      const msg = error instanceof Error ? error.message : "Authentication failed"
      setErrorMessage(msg)

      toast({
        title: "Couldn't sign in",
        description: msg,
        variant: "destructive",
      })
    }
  }

  const isBusy = status === "loading"
  const isSuccess = status === "success"

  return (
    <Modal open={isOpen} onOpenChange={onClose} size="sm" closeOnEscape closeOnClickOutside>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="w-full"
      >
        {/* Clean Apple-style card */}
        <div className="rounded-2xl bg-white text-neutral-900 shadow-[0_20px_60px_rgba(0,0,0,0.15)] ring-1 ring-black/5 overflow-hidden backdrop-blur-xl">
          {/* Header Section */}
          <div className="px-8 pt-8 pb-6">
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-2"
            >
              <h2 className="text-[22px] font-600 tracking-tight leading-tight">{title}</h2>
              <p className="text-[14px] text-neutral-500 font-400">{subtitle}</p>
            </motion.div>
          </div>

          {/* Divider */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.2, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="h-px bg-gradient-to-r from-transparent via-neutral-200 to-transparent origin-center"
          />

          {/* Content Section */}
          <div className="px-8 py-8">
            <AnimatePresence mode="wait">
              {isSuccess ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.92, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: 12 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="py-8 flex flex-col items-center justify-center text-center space-y-4"
                >
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 200,
                      damping: 20,
                      delay: 0.05,
                    }}
                    className="w-16 h-16 rounded-full bg-gradient-to-br from-neutral-100 to-neutral-50 flex items-center justify-center ring-1 ring-neutral-200/50 shadow-lg shadow-neutral-900/5"
                  >
                    <Check className="w-8 h-8 text-neutral-900" strokeWidth={2.5} />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15, duration: 0.25 }}
                    className="space-y-1"
                  >
                    <p className="text-[16px] font-600">You're all set.</p>
                    <p className="text-[13px] text-neutral-500">Taking you back…</p>
                  </motion.div>
                </motion.div>
              ) : (
                <motion.div
                  key="main"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 12 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="space-y-5"
                >
                  {/* Button */}
                  <motion.button
                    onClick={handleGoogleAuth}
                    disabled={isBusy}
                    whileHover={!isBusy ? { y: -2 } : {}}
                    whileTap={!isBusy ? { scale: 0.98 } : {}}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    className="w-full rounded-xl px-5 py-3.5 flex items-center justify-center gap-3 text-[15px] font-medium transition-all ring-1 ring-neutral-200/80 hover:ring-neutral-300 bg-white hover:bg-neutral-50/80 active:bg-neutral-100 shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-[0_1px_4px_rgba(0,0,0,0.04)]"
                  >
                    {isBusy ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                        className="flex items-center justify-center gap-3"
                      >
                        <AppleSpinner className="w-5 h-5 text-neutral-900" />
                        <span>Signing in…</span>
                      </motion.div>
                    ) : (
                      <>
                        <GoogleIcon className="w-5 h-5 flex-shrink-0" />
                        <span>Continue with Google</span>
                      </>
                    )}
                  </motion.button>

                  {/* Error State - Apple-style */}
                  <AnimatePresence>
                    {status === "error" && errorMessage ? (
                      <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="rounded-xl bg-red-50/60 ring-1 ring-red-500/15 px-4 py-3 backdrop-blur-sm"
                      >
                        <p className="text-[13px] text-red-700 font-600">Couldn't sign in</p>
                        <p className="text-[12px] text-red-600/90 mt-1 leading-snug">{errorMessage}</p>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>

                  {/* Footer text */}
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.15, duration: 0.3 }}
                    className="text-[12px] text-neutral-500 leading-relaxed text-center"
                  >
                    By continuing, you agree to MIZIZZI's{" "}
                    <a
                      className="text-neutral-700 font-500 underline underline-offset-3 hover:text-neutral-900 transition-colors"
                      href="/terms"
                    >
                      Terms
                    </a>{" "}
                    and{" "}
                    <a
                      className="text-neutral-700 font-500 underline underline-offset-3 hover:text-neutral-900 transition-colors"
                      href="/privacy"
                    >
                      Privacy Policy
                    </a>
                    .
                  </motion.p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </Modal>
  )
}

type Status = "idle" | "loading" | "success" | "error"

function AppleSpinner({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2.5"
        opacity="0.18"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

function GoogleIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
  )
}

export function GoogleAuthModal({ isOpen, onClose, mode = "signup" }: GoogleAuthModalProps) {
  const [status, setStatus] = useState<Status>("idle")
  const [errorMessage, setErrorMessage] = useState("")
  const { refreshAuthState } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  // avoid re-creating class instance every render
  const googleOAuth = useMemo(() => new GoogleOAuthAPI(), [])

  useEffect(() => {
    if (isOpen) {
      setStatus("idle")
      setErrorMessage("")
    }
  }, [isOpen])

  const title = mode === "signup" ? "Continue with Google" : "Sign in with Google"
  const subtitle =
    mode === "signup"
      ? "Create your account in one step."
      : "Welcome back — you’re one tap away."

  const handleGoogleAuth = async () => {
    setStatus("loading")
    setErrorMessage("")

    try {
      const result = await googleOAuth.authenticateWithGoogle()
      await refreshAuthState()
      setStatus("success")

      toast({
        title: result.is_new_user ? "Welcome to MIZIZZI" : "Welcome back",
        description: result.is_new_user ? "Account created successfully." : "Signed in successfully.",
      })

      setTimeout(() => {
        onClose()
        router.push("/")
      }, 900) // snappier, more “Apple”
    } catch (error) {
      setStatus("error")
      const msg = error instanceof Error ? error.message : "Authentication failed"
      setErrorMessage(msg)

      toast({
        title: "Couldn’t sign in",
        description: msg,
        variant: "destructive",
      })
    }
  }

  const isBusy = status === "loading"
  const isSuccess = status === "success"

  return (
    <Modal open={isOpen} onOpenChange={onClose} size="sm" closeOnEscape closeOnClickOutside>
      <div className="w-full">
        {/* Apple-like card */}
        <div className="rounded-2xl bg-white text-neutral-900 shadow-[0_24px_80px_rgba(0,0,0,0.18)] ring-1 ring-black/5 overflow-hidden">
          {/* Header */}
          <div className="px-6 pt-6 pb-4">
            <div className="space-y-1">
              <h2 className="text-[20px] font-semibold tracking-tight">{title}</h2>
              <p className="text-[13px] text-neutral-500">{subtitle}</p>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-neutral-100" />

          {/* Body */}
          <div className="px-6 py-6">
            <AnimatePresence mode="wait">
              {isSuccess ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.98, y: 6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98, y: 6 }}
                  transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
                  className="py-6 flex flex-col items-center justify-center text-center"
                >
                  <motion.div
                    initial={{ scale: 0.85 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 18 }}
                    className="w-14 h-14 rounded-full bg-neutral-900 flex items-center justify-center"
                  >
                    <Check className="w-7 h-7 text-white" strokeWidth={2.5} />
                  </motion.div>
                  <div className="mt-4 space-y-1">
                    <p className="text-[15px] font-semibold">
                      {mode === "signup" ? "You’re all set." : "Signed in."}
                    </p>
                    <p className="text-[13px] text-neutral-500">Taking you back…</p>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="main"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
                  className="space-y-4"
                >
                  {/* Button */}
                  <button
                    onClick={handleGoogleAuth}
                    disabled={isBusy}
                    className={[
                      "w-full rounded-xl px-4 py-3",
                      "flex items-center justify-center gap-3",
                      "text-[14px] font-medium",
                      "transition-all",
                      "ring-1 ring-black/10",
                      "bg-white hover:bg-neutral-50 active:bg-neutral-100",
                      "shadow-[0_1px_0_rgba(0,0,0,0.03)]",
                      "disabled:opacity-60 disabled:cursor-not-allowed",
                    ].join(" ")}
                  >
                    {isBusy ? (
                      <>
                        <AppleSpinner className="w-5 h-5 text-neutral-900" />
                        <span>Signing in…</span>
                      </>
                    ) : (
                      <>
                        <GoogleIcon className="w-5 h-5" />
                        <span>{mode === "signup" ? "Continue with Google" : "Continue with Google"}</span>
                      </>
                    )}
                  </button>

                  {/* Error (minimal, Apple-ish) */}
                  <AnimatePresence>
                    {status === "error" && errorMessage ? (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        transition={{ duration: 0.18 }}
                        className="rounded-xl bg-red-50 ring-1 ring-red-500/15 px-4 py-3"
                      >
                        <p className="text-[13px] text-red-700 font-medium">Couldn’t sign in</p>
                        <p className="text-[12px] text-red-700/80 mt-1">{errorMessage}</p>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>

                  {/* Fine print */}
                  <p className="text-[12px] text-neutral-500 leading-relaxed">
                    By continuing, you agree to MIZIZZI’s{" "}
                    <a className="text-neutral-900 underline underline-offset-4" href="/terms">
                      Terms
                    </a>{" "}
                    and{" "}
                    <a className="text-neutral-900 underline underline-offset-4" href="/privacy">
                      Privacy Policy
                    </a>
                    .
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Optional: subtle backdrop vibe if your Modal doesn’t already add one */}
        <div className="pointer-events-none" aria-hidden="true" />
      </div>
    </Modal>
  )
}
