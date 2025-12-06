"use client"

import type { Order } from "@/types"
import { User, Mail, Phone, MapPin, Copy, CheckCircle, Clock, AlertCircle } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"

interface AdminOrderCustomerSectionProps {
  order: Order
}

export function AdminOrderCustomerSection({ order }: AdminOrderCustomerSectionProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const handleCopy = (text: string | undefined, fieldName: string) => {
    // Guard against undefined values - write an empty string if missing
    navigator.clipboard.writeText(text ?? "")
    setCopiedField(fieldName)
    toast({
      title: "Copied!",
      description: `${fieldName} copied to clipboard`,
      duration: 2000,
    })
    setTimeout(() => setCopiedField(null), 2000)
  }

  const customerName =
    (order as any).customer_name ||
    `${order.shipping_address?.first_name || ""} ${order.shipping_address?.last_name || ""}`.trim()

  const shippingAddress = order.shipping_address

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start gap-3">
        <div className="bg-blue-600 rounded-lg p-2">
          <User className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">Customer Information</h3>
          <p className="text-sm sm:text-sm text-gray-600 mt-1">Complete delivery details for this order</p>
        </div>
      </div>

      {/* Customer Contact Section */}
      <div className="bg-white rounded-lg p-3 sm:p-4 border border-blue-100 space-y-3">
        <p className="text-xs font-bold text-blue-700 uppercase tracking-wide">Contact Details</p>

        {/* Name */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between group gap-2">
          <div>
            <p className="text-xs text-gray-500 mb-1 font-medium">CUSTOMER NAME</p>
            <p className="text-base font-semibold text-gray-900 break-words">{customerName}</p>
          </div>
          <button
            onClick={() => handleCopy(customerName, "Customer Name")}
            className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity p-2"
            aria-label="Copy customer name"
          >
            {copiedField === "Customer Name" ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <Copy className="h-4 w-4 text-gray-400 hover:text-gray-600" />
            )}
          </button>
        </div>

        {/* Email */}
        {(order as any).customer_email && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between group pt-2 border-t border-gray-100">
            <div className="flex-1">
              <p className="text-xs text-gray-500 mb-1 font-medium flex items-center gap-1">
                <Mail className="h-3 w-3" /> EMAIL
              </p>
              <a
                href={`mailto:${(order as any).customer_email}`}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium break-words"
              >
                {(order as any).customer_email}
              </a>
            </div>
            <button
              onClick={() => handleCopy((order as any).customer_email, "Email")}
              className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity p-2 ml-0 sm:ml-2"
              aria-label="Copy email"
            >
              {copiedField === "Email" ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              )}
            </button>
          </div>
        )}

        {/* Phone */}
        {(order as any).customer_phone && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between group pt-2 border-t border-gray-100">
            <div className="flex-1">
              <p className="text-xs text-gray-500 mb-1 font-medium flex items-center gap-1">
                <Phone className="h-3 w-3" /> PHONE NUMBER
              </p>
              <a href={`tel:${(order as any).customer_phone}`} className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                {(order as any).customer_phone}
              </a>
            </div>
            <button
              onClick={() => handleCopy((order as any).customer_phone, "Phone")}
              className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity p-2 ml-0 sm:ml-2"
              aria-label="Copy phone"
            >
              {copiedField === "Phone" ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              )}
            </button>
          </div>
        )}
      </div>

      {/* Delivery Address Section - show fallback when no shipping address is available */}
  <div className="bg-white rounded-lg p-3 sm:p-4 border border-green-100 space-y-3">
        <div className="flex items-start gap-2">
          <MapPin className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
          <p className="text-xs font-bold text-green-700 uppercase tracking-wide">Delivery Address</p>
        </div>

        {shippingAddress ? (
          <div className="space-y-3 pl-0 sm:pl-6">
            {/* Name & Recipient */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between group gap-2">
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-1 font-medium">RECIPIENT</p>
                <p className="text-base font-semibold text-gray-900 break-words">
                  {shippingAddress.first_name} {shippingAddress.last_name}
                </p>
              </div>
              <button
                onClick={() =>
                  handleCopy(`${shippingAddress.first_name} ${shippingAddress.last_name}`, "Recipient Name")
                }
                className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity p-2"
              >
                {copiedField === "Recipient Name" ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                )}
              </button>
            </div>

            {/* Street Address */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between group pt-2 border-t border-gray-100">
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-1 font-medium">STREET ADDRESS</p>
                <p className="text-sm text-gray-900 font-medium break-words">{shippingAddress.address_line1}</p>
                {shippingAddress.address_line2 && (
                  <p className="text-sm text-gray-700 mt-1 break-words">{shippingAddress.address_line2}</p>
                )}
              </div>
              <button
                onClick={() =>
                  handleCopy(
                    `${shippingAddress.address_line1}${shippingAddress.address_line2 ? ", " + shippingAddress.address_line2 : ""}`,
                    "Address",
                  )
                }
                className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity p-2 ml-0 sm:ml-2"
              >
                {copiedField === "Address" ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                )}
              </button>
            </div>

            {/* City, State, Postal */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-gray-100">
              <div>
                <p className="text-xs text-gray-500 mb-1 font-medium">CITY</p>
                <p className="text-sm font-medium text-gray-900">{shippingAddress.city}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1 font-medium">STATE/REGION</p>
                <p className="text-sm font-medium text-gray-900">{shippingAddress.state}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1 font-medium">POSTAL CODE</p>
                <p className="text-sm font-medium text-gray-900">{shippingAddress.postal_code}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1 font-medium">COUNTRY</p>
                <p className="text-sm font-medium text-gray-900">{shippingAddress.country || "N/A"}</p>
              </div>
            </div>

            {/* Full Address Copy */}
            <div className="pt-3 border-t border-gray-100">
              <Button
                onClick={() => {
                  const fullAddress = `${shippingAddress.first_name} ${shippingAddress.last_name}\n${shippingAddress.address_line1}${shippingAddress.address_line2 ? "\n" + shippingAddress.address_line2 : ""}\n${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.postal_code}`
                  handleCopy(fullAddress, "Full Address")
                }}
                variant="outline"
                className="w-full text-xs"
              >
                <Copy className="h-3 w-3 mr-2" />
                Copy Full Address
              </Button>
            </div>
          </div>
        ) : (
          // Fallback when no shipping address is set — show customer name & a delivery place hint
          <div className="pl-6">
            <div className="flex items-start justify-between group">
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-1 font-medium">RECIPIENT</p>
                <p className="text-base font-semibold text-gray-900">{customerName || "Customer"}</p>
              </div>
              <button
                onClick={() => handleCopy(customerName, "Recipient Name")}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-2"
              >
                {copiedField === "Recipient Name" ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                )}
              </button>
            </div>

            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-1 font-medium">PLACE TO BE DELIVERED TO</p>
              <p className="text-sm text-gray-900 font-medium">
                {order.billing_address?.address_line1 || order.billing_address?.city || (order as any).customer_email || (order as any).customer_phone || "No address provided"}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions & Notes */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">Important Notes</p>
            <ul className="text-xs text-amber-700 mt-2 space-y-1 list-disc list-inside">
              <li>Verify all address details before shipping</li>
              <li>Confirm customer phone number is reachable</li>
              <li>Check for any special delivery instructions</li>
              <li>Ensure postal code format is correct for the region</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Shipping Info (if available) */}
      {order.shipping_method && (
        <div className="bg-white rounded-lg p-4 border border-gray-100 space-y-3">
          <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Shipping Method</p>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-400" />
            <p className="text-sm font-medium text-gray-900">{order.shipping_method}</p>
          </div>
          {order.tracking_number && (
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-1 font-medium">TRACKING NUMBER</p>
              <div className="flex items-center justify-between group">
                <p className="text-sm font-mono text-gray-900">{order.tracking_number}</p>
                <button
                  onClick={() => handleCopy(order.tracking_number, "Tracking Number")}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-2"
                >
                  {copiedField === "Tracking Number" ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
