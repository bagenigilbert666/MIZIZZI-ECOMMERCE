"use client"

import { formatCurrency } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"
import { CreditCard, Shield } from "lucide-react"

interface OrderPaymentInfoProps {
  paymentMethod: string
  subtotal: number
  shipping: number
  tax: number
  total: number
}

export function OrderPaymentInfo({ paymentMethod, subtotal, shipping, tax, total }: OrderPaymentInfoProps) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <CreditCard className="h-3.5 w-3.5 text-gray-500" />
        <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider">Payment Information</h3>
      </div>
      <div className="space-y-3">
        <div>
          <p className="text-[10px] text-gray-500 mb-1.5 uppercase tracking-wide">Payment Method</p>
          <p className="text-sm text-gray-900 font-medium">
            {paymentMethod || "Pay on delivery with Mobile Money and Bank Cards"}
          </p>
          <div className="flex items-center gap-1.5 mt-2">
            <Shield className="h-3 w-3 text-green-600" />
            <span className="text-[10px] text-green-600 font-medium">Secure Payment</span>
          </div>
        </div>
        <Separator className="my-3" />
        <div>
          <p className="text-[10px] text-gray-500 mb-2.5 uppercase tracking-wide">Payment Details</p>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 text-xs">Items total:</span>
              <span className="text-gray-900 font-medium text-xs">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 text-xs">Delivery Fees:</span>
              <span className="text-gray-900 font-medium text-xs">{formatCurrency(shipping)}</span>
            </div>
            {tax > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600 text-xs">Tax:</span>
                <span className="text-gray-900 font-medium text-xs">{formatCurrency(tax)}</span>
              </div>
            )}
            <Separator className="my-2" />
            <div className="flex justify-between text-sm font-semibold pt-1">
              <span className="text-gray-900">Total:</span>
              <span className="text-gray-900">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
