"use client"
import { motion } from "framer-motion"
import { CheckCircle } from "lucide-react"

export function SuccessScreen() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="flex flex-col items-center justify-center space-y-6 text-center py-12"
    >
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{
          type: "spring",
          stiffness: 100,
          damping: 15,
          delay: 0.2,
        }}
        className="relative"
      >
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2.5, repeat: Number.POSITIVE_INFINITY }}
          className="absolute inset-0 rounded-full bg-green-100/50 blur-lg"
        />
        <div className="relative rounded-full bg-green-100 p-4">
          <CheckCircle className="h-14 w-14 text-green-600" strokeWidth={1.5} />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="space-y-2 max-w-xs"
      >
        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">You're all set!</h1>
        <p className="text-sm text-gray-600 leading-relaxed">
          Welcome to Mizizzi. Your account is ready and you're being redirected to your dashboard.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="flex items-center justify-center gap-1.5 pt-2"
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 1.4,
              repeat: Number.POSITIVE_INFINITY,
              delay: i * 0.2,
            }}
            className="h-2 w-2 rounded-full bg-cherry-600"
          />
        ))}
      </motion.div>
    </motion.div>
  )
}
