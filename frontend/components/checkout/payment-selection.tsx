"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CreditCard, Shield, CheckCircle2, ArrowRight, Lock, Truck } from "lucide-react"
import { cn } from "@/lib/utils"
import Image from "next/image"

interface PaymentSelectionProps {
  selectedMethod?: string
  onMethodSelect: (method: string) => void
  amount: number
  cartData?: any
  shippingAddress?: any
  billingAddress?: any
  isProcessingPayment?: boolean // Added prop to control loading state from parent
}

export function PaymentSelection({
  selectedMethod,
  onMethodSelect,
  amount,
  cartData,
  shippingAddress,
  billingAddress,
  isProcessingPayment = false, // Accept loading state from parent
}: PaymentSelectionProps) {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)
  const [loadingMethod, setLoadingMethod] = useState<string | null>(null)

  const paymentMethods = [
    {
      id: "pesapal",
      title: "Pesapal",
      subtitle: "Cards & Mobile Money",
      description: "Pay securely with M-PESA, Visa, Mastercard & more",
      icon: CreditCard,
      logo: "/pesapal-logo.png",
      popular: true,
    },
    {
      id: "cod",
      title: "Cash on Delivery",
      subtitle: "Pay at Your Door",
      description: "Settle payment when your order arrives",
      icon: Truck,
      logo: "",
      popular: false,
    },
  ]

  const cherry = {
    border: "border-[#7B1E1E]",
    ring: "ring-[#7B1E1E]/30",
    bg: "bg-[#7B1E1E]",
    hover: "hover:bg-[#691818]",
    text: "text-[#7B1E1E]",
  }

  const handleMethodSelect = (methodId: string) => {
    setLoadingMethod(methodId)
    // Delay to show the loading animation
    setTimeout(() => {
      onMethodSelect(methodId)
    }, 100)
  }

  const isLoading = isProcessingPayment || loadingMethod !== null

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md"
          >
            {/* Mizizzi Logo */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              className="bg-white/95 backdrop-blur-xl rounded-[28px] shadow-2xl p-10 flex flex-col items-center gap-6 border border-white/20"
              style={{
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1)",
              }}
            >
              {/* Mizizzi Logo */}
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                className="relative"
              >
                <Image
                  src="/images/screenshot-20from-202025-02-18-2013-30-22.png"
                  alt="Mizizzi"
                  width={80}
                  height={80}
                  className="rounded-2xl"
                />
              </motion.div>

              {/* Apple-style spinner with 12 bars */}
              <div className="relative w-14 h-14">
                {[...Array(12)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute left-1/2 top-0 w-[3px] h-[10px] -ml-[1.5px] rounded-full bg-[#7B1E1E]"
                    style={{
                      transformOrigin: "center 28px",
                      transform: `rotate(${i * 30}deg)`,
                    }}
                    animate={{
                      opacity: [0.2, 1, 0.2],
                    }}
                    transition={{
                      duration: 1,
                      repeat: Number.POSITIVE_INFINITY,
                      delay: i * (1 / 12),
                      ease: "easeInOut",
                    }}
                  />
                ))}
              </div>

              <div className="text-center space-y-2">
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                  className="text-xl font-semibold text-gray-900"
                >
                  Opening Payment Gateway
                </motion.p>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.4 }}
                  className="text-sm text-gray-500"
                >
                  Connecting to secure payment...
                </motion.p>
              </div>

              {/* Progress dots */}
              <div className="flex gap-2">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 rounded-full bg-[#7B1E1E]"
                    animate={{
                      scale: [1, 1.3, 1],
                      opacity: [0.4, 1, 0.4],
                    }}
                    transition={{
                      duration: 1.2,
                      repeat: Number.POSITIVE_INFINITY,
                      delay: i * 0.2,
                      ease: "easeInOut",
                    }}
                  />
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="text-center space-y-2">
        <h1 className="text-3xl font-semibold text-gray-900">Choose Payment Method</h1>
        <p className="text-gray-500 text-lg">Select how you'd like to complete your order</p>
      </div>

      <Card className="border border-gray-200 shadow-sm rounded-2xl bg-white">
        <CardContent className="p-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Order Total</p>
            <p className="text-3xl font-semibold text-gray-900">KES {amount.toLocaleString()}</p>
          </div>
          <div className="text-right space-y-1 text-sm text-gray-500">
            <p>1 item</p>
            <p>Subtotal: KES {(amount * 0.86).toLocaleString()}</p>
            <p>Shipping: Free</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap justify-center gap-6 text-sm">
        <div className="flex items-center gap-2 text-gray-600">
          <Shield className="h-4 w-4 text-green-600" />
          <span>SSL Encrypted</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600">
          <CheckCircle2 className={`h-4 w-4 ${cherry.text}`} />
          <span>PCI DSS Certified</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600">
          <Lock className="h-4 w-4 text-purple-600" />
          <span>CBK Regulated</span>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {paymentMethods.map((method, index) => {
          const isSelected = selectedMethod === method.id
          const Icon = method.icon
          const isMethodLoading = isLoading && (loadingMethod === method.id || isProcessingPayment)

          return (
            <motion.div
              key={method.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className="relative"
            >
              <Card
                onClick={() => !isLoading && handleMethodSelect(method.id)}
                onMouseEnter={() => setHoveredCard(method.id)}
                onMouseLeave={() => setHoveredCard(null)}
                className={cn(
                  "group relative h-full cursor-pointer rounded-2xl border bg-white transition-all duration-300",
                  isSelected
                    ? `${cherry.border} shadow-lg ring-2 ${cherry.ring}`
                    : "border-gray-200 hover:border-gray-300 hover:shadow-md",
                  isLoading && "opacity-75 cursor-wait",
                )}
              >
                {method.popular && (
                  <div
                    className={`absolute top-4 right-4 ${cherry.bg} text-white text-xs px-3 py-1 rounded-full font-medium shadow`}
                  >
                    Most Popular
                  </div>
                )}

                <CardContent className="p-8 flex flex-col items-center text-center space-y-5">
                  {method.logo ? (
                    <Image
                      src={method.logo || "/placeholder.svg"}
                      alt={method.title}
                      width={80}
                      height={40}
                      className="h-10 w-auto object-contain"
                    />
                  ) : (
                    <div className="p-3 rounded-xl bg-gray-100">
                      <Icon className="h-8 w-8 text-gray-600" />
                    </div>
                  )}

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{method.title}</h3>
                    <p className="text-sm text-gray-500">{method.subtitle}</p>
                  </div>

                  <p className="text-sm text-gray-500 leading-relaxed">{method.description}</p>

                  <Button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (!isLoading) {
                        handleMethodSelect(method.id)
                      }
                    }}
                    disabled={isLoading}
                    variant="default"
                    className={cn(
                      "w-full h-11 rounded-xl font-medium transition-all relative",
                      isSelected
                        ? `${cherry.bg} text-white ${cherry.hover}`
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200",
                      isLoading && "cursor-wait",
                    )}
                  >
                    {isMethodLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 1,
                            repeat: Number.POSITIVE_INFINITY,
                            ease: "linear",
                          }}
                          className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white"
                        />
                        Loading...
                      </span>
                    ) : (
                      <>
                        Continue with {method.title}
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      <div className="text-center text-sm text-gray-400 pt-8">
        Transactions are encrypted & secured by <span className={`font-medium ${cherry.text}`}>Pesapal</span>
      </div>
    </div>
  )
}

export default PaymentSelection
