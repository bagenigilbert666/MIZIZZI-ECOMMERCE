"use client"
import { motion, AnimatePresence } from "framer-motion"
import { X, Shield, Zap, Mail, CheckCircle2, HelpCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

interface AuthHelpGuideProps {
  isOpen: boolean
  onClose: () => void
}

export function AuthHelpGuide({ isOpen, onClose }: AuthHelpGuideProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-white rounded-2xl shadow-2xl z-50 p-6 md:p-8"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-cherry-100 flex items-center justify-center">
                  <HelpCircle className="w-6 h-6 text-cherry-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-serif font-bold text-gray-900">Authentication Guide</h2>
                  <p className="text-sm text-gray-600 mt-1">Choose the best way to access your account</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-gray-100">
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Content */}
            <div className="space-y-6">
              {/* Google OAuth Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center flex-shrink-0">
                    <Zap className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Sign in with Google</h3>
                    <p className="text-sm text-gray-700 mb-4">
                      The fastest and most secure way to access your MIZIZZI account with just one click.
                    </p>

                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Instant Access</p>
                          <p className="text-xs text-gray-600">
                            No password to remember. Sign in with your existing Google account.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Enhanced Security</p>
                          <p className="text-xs text-gray-600">
                            Protected by Google's advanced security systems and two-factor authentication.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Auto Account Creation</p>
                          <p className="text-xs text-gray-600">
                            New users are automatically registered. Your profile picture and name are imported from
                            Google.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 p-3 bg-white/80 rounded-lg border border-blue-200">
                      <p className="text-xs text-gray-700">
                        <strong>How it works:</strong> Click "Sign up with Google" → Select your Google account → You're
                        in! We'll create your MIZIZZI account automatically if you're new.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Email Authentication Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-gradient-to-br from-cherry-50 to-rose-50 rounded-xl p-6 border border-cherry-100"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center flex-shrink-0">
                    <Mail className="w-6 h-6 text-cherry-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Email & Password</h3>
                    <p className="text-sm text-gray-700 mb-4">
                      Traditional authentication method with full control over your credentials.
                    </p>

                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-cherry-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Complete Control</p>
                          <p className="text-xs text-gray-600">
                            Create and manage your own password. No third-party dependencies.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-cherry-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Password Recovery</p>
                          <p className="text-xs text-gray-600">
                            Forgot your password? We'll send a secure reset link to your email.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-cherry-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Email Verification</p>
                          <p className="text-xs text-gray-600">
                            Verify your email address to unlock all features and secure your account.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 p-3 bg-white/80 rounded-lg border border-cherry-200">
                      <p className="text-xs text-gray-700">
                        <strong>How it works:</strong> Enter your email → Create a secure password → Verify your email →
                        Start shopping! You'll receive a welcome email with account setup instructions.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Security Notice */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-gray-50 rounded-xl p-5 border border-gray-200"
              >
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-1">Your Security Matters</h4>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      All authentication methods use industry-standard encryption. Your data is protected with SSL/TLS
                      encryption, secure password hashing, and regular security audits. We never share your personal
                      information with third parties.
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Footer */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <Button onClick={onClose} className="w-full bg-cherry-600 hover:bg-cherry-700 text-white">
                Got it, let's continue
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
