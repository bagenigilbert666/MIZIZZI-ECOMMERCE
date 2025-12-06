"use client"

import type React from "react"

import Image from "next/image"
import { formatCurrency } from "@/lib/utils"
import { ShoppingBag, Package, Copy, CheckCircle2, AlertCircle } from "lucide-react"
import { useState } from "react"
import { toast } from "@/components/ui/use-toast"
import type { Order } from "@/types"

interface AdminOrderItemsSectionProps {
  items: any[]
  order: Order
  productImages?: Record<string, any[]>
}

export function AdminOrderItemsSection({ items = [], order, productImages = {} }: AdminOrderItemsSectionProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
    toast({
      description: "Copied to clipboard",
    })
  }

  const customerName =
    (order as any).customer_name ||
    `${order.shipping_address?.first_name || ""} ${order.shipping_address?.last_name || ""}`.trim() ||
    "Customer"

  const deliveryAddress = order.shipping_address
    ? `${order.shipping_address.address_line1}${order.shipping_address.address_line2 ? ", " + order.shipping_address.address_line2 : ""}, ${order.shipping_address.city}, ${order.shipping_address.state} ${order.shipping_address.postal_code}`
    : "No address provided"

  const getStatusBadge = () => {
    const status = order.status?.toLowerCase() || "pending"

    const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
      pending: {
        label: "Pending",
        color: "text-yellow-700",
        bgColor: "bg-yellow-100",
        icon: <AlertCircle className="h-3 w-3" />,
      },
      confirmed: {
        label: "Confirmed",
        color: "text-blue-700",
        bgColor: "bg-blue-100",
        icon: <CheckCircle2 className="h-3 w-3" />,
      },
      processing: {
        label: "Processing",
        color: "text-purple-700",
        bgColor: "bg-purple-100",
        icon: <Package className="h-3 w-3" />,
      },
      packed: {
        label: "Packed",
        color: "text-green-700",
        bgColor: "bg-green-100",
        icon: <CheckCircle2 className="h-3 w-3" />,
      },
      shipped: {
        label: "Shipped",
        color: "text-blue-700",
        bgColor: "bg-blue-100",
        icon: <CheckCircle2 className="h-3 w-3" />,
      },
      delivered: {
        label: "Delivered",
        color: "text-green-700",
        bgColor: "bg-green-100",
        icon: <CheckCircle2 className="h-3 w-3" />,
      },
      cancelled: {
        label: "Cancelled",
        color: "text-red-700",
        bgColor: "bg-red-100",
        icon: <AlertCircle className="h-3 w-3" />,
      },
    }

    const config = statusConfig[status] || statusConfig.pending
    return config
  }

  if (!items || items.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <Package className="h-10 w-10 text-gray-300 mx-auto mb-3" />
        <p className="text-sm font-medium text-gray-600">No items in this order</p>
        <p className="text-xs text-gray-500 mt-1">Items will appear once the order is confirmed</p>
      </div>
    )
  }

  const totalItems = items.reduce((sum, item) => sum + (item.quantity || 1), 0)
  const totalValue = items.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0)

  const statusBadge = getStatusBadge()

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Header Section */}
      <div className="px-4 md:px-6 py-3 md:py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-start justify-between mb-2 md:mb-3">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="p-1.5 md:p-2 bg-blue-100 rounded-lg">
              <ShoppingBag className="h-4 w-4 md:h-5 md:w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm md:text-base font-bold text-gray-900">Order Items</h3>
              <p className="text-[11px] md:text-xs text-gray-600 mt-0.5 md:mt-1">
                {totalItems} item{totalItems !== 1 ? "s" : ""} • {formatCurrency(totalValue)} total
              </p>
            </div>
          </div>
        </div>

        {/* Delivery Info Banner */}
        <div className="mt-3 md:mt-4 p-2.5 md:p-3 bg-white rounded-lg border border-gray-100 flex items-start gap-2 md:gap-3">
          <div className="text-blue-600 mt-0.5">
            <CheckCircle2 className="h-3.5 w-3.5 md:h-4 md:w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] md:text-xs font-semibold text-gray-900">
              Delivering to: <span className="text-blue-600">{customerName}</span>
            </p>
            <p className="text-[11px] md:text-xs text-gray-600 mt-1 line-clamp-2">{deliveryAddress}</p>
          </div>
        </div>
      </div>

      {/* Items List */}
      <div className="divide-y divide-gray-100">
        {items.map((item, index) => {
          const product = item.product || {}
          const itemName = product.name || item.product_name || item.name || "Product"
          const productId = item.product_id || product.id
          const images = productId ? productImages[productId] : null

          const itemImage =
            product.thumbnail_url || (images && images.length > 0 ? images[0].url : "/diverse-products-still-life.png")
          const itemPrice = item.price || 0
          const itemQuantity = item.quantity || 1
          const itemTotal = item.total || itemPrice * itemQuantity
          const itemSku = product.sku || item.sku || "N/A"

          return (
            <div key={item.id || index} className="p-3 md:p-5 hover:bg-blue-50/30 transition-all duration-200">
              <div className="flex gap-3 md:gap-4 items-start">
                {/* Product Image */}
                <div className="flex-shrink-0 w-16 h-16 md:w-20 md:h-20 relative rounded-lg overflow-hidden border border-gray-200 bg-gray-50 shadow-sm">
                  <Image
                    src={itemImage || "/placeholder.svg?height=80&width=80&query=product"}
                    alt={itemName}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 64px, 80px"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = "/diverse-products-still-life.png"
                    }}
                  />
                </div>

                {/* Product Details */}
                <div className="flex-1 min-w-0">
                  {/* Name and Status */}
                  <div className="flex items-start justify-between gap-2 mb-1.5 md:mb-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 text-xs md:text-sm leading-snug">{itemName}</h4>
                      <p className="text-[10px] md:text-xs text-gray-500 mt-0.5 md:mt-1">
                        Item {index + 1} of {totalItems}
                      </p>
                    </div>
                  </div>

                  {/* SKU and Variant */}
                  {(itemSku || item.variant) && (
                    <div className="flex flex-wrap gap-1.5 md:gap-2 mb-2 md:mb-3">
                      {itemSku && (
                        <button
                          onClick={() => copyToClipboard(itemSku, `sku-${index}`)}
                          className="inline-flex items-center gap-1 px-1.5 md:px-2 py-0.5 md:py-1 bg-gray-100 hover:bg-gray-200 rounded text-[10px] md:text-xs text-gray-700 transition-colors"
                        >
                          <span className="font-mono text-[10px] md:text-[11px]">SKU: {itemSku}</span>
                          {copiedId === `sku-${index}` ? (
                            <CheckCircle2 className="h-2.5 w-2.5 md:h-3 md:w-3 text-green-600" />
                          ) : (
                            <Copy className="h-2.5 w-2.5 md:h-3 md:w-3" />
                          )}
                        </button>
                      )}
                      {item.variant && (
                        <span className="inline-flex items-center px-1.5 md:px-2 py-0.5 md:py-1 bg-amber-50 rounded text-[10px] md:text-xs text-amber-700 border border-amber-200">
                          {item.variant.color && `${item.variant.color}`}
                          {item.variant.color && item.variant.size && " • "}
                          {item.variant.size && `${item.variant.size}`}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Detailed Pricing Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-2 p-2 md:p-3 bg-gray-50 rounded-lg border border-gray-100 mb-2">
                    <div>
                      <span className="block text-[9px] md:text-[10px] font-semibold text-gray-600 uppercase mb-0.5 md:mb-1">
                        Qty
                      </span>
                      <span className="block text-xs md:text-sm font-bold text-gray-900">{itemQuantity}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] md:text-[10px] font-semibold text-gray-600 uppercase mb-0.5 md:mb-1">
                        Unit Price
                      </span>
                      <span className="block text-xs md:text-sm font-bold text-gray-900">
                        {formatCurrency(itemPrice)}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[9px] md:text-[10px] font-semibold text-gray-600 uppercase mb-0.5 md:mb-1">
                        Item Total
                      </span>
                      <span className="block text-xs md:text-sm font-bold text-blue-600">
                        {formatCurrency(itemTotal)}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[9px] md:text-[10px] font-semibold text-gray-600 uppercase mb-0.5 md:mb-1">
                        Status
                      </span>
                      <span
                        className={`inline-flex items-center gap-0.5 md:gap-1 text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 md:py-1 rounded ${statusBadge.bgColor}`}
                      >
                        {statusBadge.icon}
                        <span className={`${statusBadge.color} font-semibold`}>{statusBadge.label}</span>
                      </span>
                    </div>
                  </div>

                  {/* Additional Info */}
                  {item.notes && (
                    <div className="flex gap-2 p-2 bg-yellow-50 border border-yellow-100 rounded text-[10px] md:text-xs text-yellow-800 mt-2">
                      <AlertCircle className="h-3 w-3 md:h-3.5 md:w-3.5 flex-shrink-0 mt-0.5" />
                      <p>{item.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer Summary */}
      <div className="px-4 md:px-6 py-3 md:py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm text-gray-600">
          <Package className="h-3.5 w-3.5 md:h-4 md:w-4 text-gray-500" />
          <span>
            Total:{" "}
            <span className="font-bold text-gray-900">
              {totalItems} item{totalItems !== 1 ? "s" : ""}
            </span>
          </span>
        </div>
        <div className="text-right">
          <p className="text-[10px] md:text-xs text-gray-600 mb-0.5 md:mb-1">Order Value</p>
          <p className="text-base md:text-lg font-bold text-gray-900">{formatCurrency(totalValue)}</p>
        </div>
      </div>
    </div>
  )
}
