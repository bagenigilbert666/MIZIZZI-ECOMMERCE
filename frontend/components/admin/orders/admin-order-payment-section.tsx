"use client"

import { formatCurrency } from "@/lib/utils"
import { CreditCard, CheckCircle2, Clock, Smartphone, Banknote, MapPin, Truck, Info, Copy, Check } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { Order } from "@/types"
import { useState } from "react"

interface AdminOrderPaymentSectionProps {
  order: Order
}

export function AdminOrderPaymentSection({ order }: AdminOrderPaymentSectionProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const subtotal = order.subtotal || 0
  const shipping = order.shipping || order.shipping_cost || 0
  const tax = order.tax || 0
  const total = order.total || order.total_amount || 0

  const paymentStatus = order.payment_status?.toLowerCase() || "pending"
  const isPaymentConfirmed = paymentStatus === "confirmed" || paymentStatus === "paid"

  const getPaymentMethodDetails = () => {
    const method = order.payment_method?.toLowerCase() || "cash_on_delivery"

    if (method.includes("mpesa") || method.includes("m-pesa") || method.includes("safaricom")) {
      return {
        provider: "Pesapal",
        channel: "M-Pesa (Safaricom)",
        icon: Smartphone,
        color: "text-green-600",
        bgColor: "bg-green-50",
        borderColor: "border-green-200",
        description: "Mobile money payment via Safaricom M-Pesa",
      }
    } else if (method.includes("airtel")) {
      return {
        provider: "Pesapal",
        channel: "Airtel Money",
        icon: Smartphone,
        color: "text-red-600",
        bgColor: "bg-red-50",
        borderColor: "border-red-200",
        description: "Mobile money payment via Airtel Money",
      }
    } else if (method.includes("card") || method.includes("visa") || method.includes("mastercard")) {
      return {
        provider: "Pesapal",
        channel: "Card Payment",
        icon: CreditCard,
        color: "text-blue-600",
        bgColor: "bg-blue-50",
        borderColor: "border-blue-200",
        description: "Credit/Debit card via Visa or Mastercard",
      }
    } else if (method.includes("pesapal")) {
      return {
        provider: "Pesapal",
        channel: "Pesapal Pay",
        icon: CreditCard,
        color: "text-indigo-600",
        bgColor: "bg-indigo-50",
        borderColor: "border-indigo-200",
        description: "Direct Pesapal wallet payment",
      }
    } else {
      return {
        provider: "Cash",
        channel: "Cash on Delivery",
        icon: Banknote,
        color: "text-gray-600",
        bgColor: "bg-gray-50",
        borderColor: "border-gray-200",
        description: "Payment collected upon delivery",
      }
    }
  }

  const paymentDetails = getPaymentMethodDetails()
  const PaymentIcon = paymentDetails.icon

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const getShippingDetails = () => {
    const address = order.shipping_address
    const city = address?.city || ""
    const state = address?.state || ""

    // Determine if local or long distance
    const isLocalDelivery = city.toLowerCase().includes("nairobi") || state.toLowerCase().includes("nairobi")

    return {
      method: order.shipping_method || "Standard Delivery",
      isLocal: isLocalDelivery,
      zone: isLocalDelivery ? "Nairobi Metro" : `${city || state || "Outside Nairobi"}`,
      note:
        shipping === 0
          ? "Shipping calculated separately based on delivery distance"
          : isLocalDelivery
            ? "Local delivery within Nairobi area"
            : "Long-distance delivery - price varies by location",
    }
  }

  const shippingDetails = getShippingDetails()

  return (
    <div className="bg-white border border-gray-100 rounded-lg overflow-hidden">
      <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <CreditCard className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">Payment & Shipping</h3>
              <p className="text-xs text-gray-600 mt-0.5">Transaction and delivery cost details</p>
            </div>
          </div>
          <Badge
            variant="outline"
            className={`text-xs font-medium px-3 py-1.5 ${
              isPaymentConfirmed
                ? "bg-green-50 text-green-700 border-green-200"
                : "bg-amber-50 text-amber-700 border-amber-200"
            }`}
          >
            {isPaymentConfirmed ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                Payment Confirmed
              </>
            ) : (
              <>
                <Clock className="h-3.5 w-3.5 mr-1.5" />
                Payment Pending
              </>
            )}
          </Badge>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded ${paymentDetails.bgColor}`}>
              <PaymentIcon className={`h-4 w-4 ${paymentDetails.color}`} />
            </div>
            <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Payment Method</h4>
          </div>

          <div className={`p-4 rounded-lg border-2 ${paymentDetails.borderColor} ${paymentDetails.bgColor}`}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-base font-bold ${paymentDetails.color}`}>{paymentDetails.channel}</span>
                  <Badge variant="secondary" className="text-xs">
                    via {paymentDetails.provider}
                  </Badge>
                </div>
                <p className="text-xs text-gray-600">{paymentDetails.description}</p>
              </div>
              <button
                onClick={() => handleCopy(paymentDetails.channel, "payment")}
                className="p-1.5 hover:bg-white/50 rounded transition-colors"
                title="Copy payment method"
              >
                {copiedField === "payment" ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4 text-gray-400" />
                )}
              </button>
            </div>

            <div className="flex items-center gap-2 pt-3 border-t border-gray-200/50">
              <Info className="h-3.5 w-3.5 text-gray-500" />
              <span className="text-xs text-gray-600">
                {isPaymentConfirmed
                  ? "Payment has been successfully processed and verified"
                  : "Awaiting payment confirmation from payment provider"}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded bg-blue-50">
              <Truck className="h-4 w-4 text-blue-600" />
            </div>
            <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Shipping Details</h4>
          </div>

          <div className="p-4 rounded-lg border-2 border-blue-200 bg-blue-50">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Shipping Method:</span>
                <span className="text-sm font-bold text-blue-700">{shippingDetails.method}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Delivery Zone:</span>
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-blue-600" />
                  <span className="text-sm font-bold text-blue-700">{shippingDetails.zone}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-blue-200/50">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-blue-800 mb-1">Distance-Based Pricing</p>
                    <p className="text-xs text-gray-700">{shippingDetails.note}</p>
                  </div>
                </div>
              </div>

              {shipping === 0 && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-amber-800">
                      <span className="font-semibold">Note:</span> Shipping cost will be calculated and communicated to
                      customer based on exact delivery distance from warehouse to{" "}
                      {order.shipping_address?.city || "destination"}.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t-2 border-gray-200">
          <div className="flex justify-between text-sm py-2">
            <span className="text-gray-600 font-medium">Subtotal:</span>
            <span className="font-semibold text-gray-900">{formatCurrency(subtotal)}</span>
          </div>

          <div className="flex justify-between text-sm py-2">
            <div className="flex items-center gap-2">
              <span className="text-gray-600 font-medium">Shipping:</span>
              {shipping === 0 && (
                <Badge variant="outline" className="text-xs">
                  To be calculated
                </Badge>
              )}
            </div>
            <span className={`font-semibold ${shipping === 0 ? "text-amber-600" : "text-gray-900"}`}>
              {shipping === 0 ? "TBD" : formatCurrency(shipping)}
            </span>
          </div>

          {tax > 0 && (
            <div className="flex justify-between text-sm py-2">
              <span className="text-gray-600 font-medium">Tax (VAT):</span>
              <span className="font-semibold text-gray-900">{formatCurrency(tax)}</span>
            </div>
          )}

          <div className="flex justify-between items-center pt-3 mt-3 border-t-2 border-gray-300">
            <span className="text-base font-bold text-gray-900">Total Amount:</span>
            <div className="text-right">
              <span className="text-xl font-bold text-indigo-600">{formatCurrency(total)}</span>
              {shipping === 0 && <p className="text-xs text-amber-600 mt-1">+ Shipping (TBD)</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
