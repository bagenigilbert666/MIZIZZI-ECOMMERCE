"use client"

import Image from "next/image"
import { formatCurrency } from "@/lib/utils"
import type { ProductImage } from "@/types"
import { ShoppingBag } from "lucide-react"

interface OrderItem {
  id?: string
  product_id?: string
  product_name?: string
  name?: string
  price?: number
  quantity?: number
  total?: number
  thumbnail_url?: string
  image_url?: string
}

interface OrderItemsProps {
  items: OrderItem[]
  productImages: Record<string, ProductImage[]>
}

export function OrderItems({ items, productImages }: OrderItemsProps) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
      <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-3.5 w-3.5 text-gray-500" />
          <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider">Items in Your Order</h3>
        </div>
      </div>

      <div className="divide-y divide-gray-50">
        {items.map((item, index) => {
          const itemName = item.product_name || item.name || "Product"
          const productId = item.product_id
          const images = productId ? productImages[productId] : null
          const itemImage =
            images && images.length > 0
              ? images[0].url
              : item.thumbnail_url || item.image_url || "/placeholder.svg?height=80&width=80"
          const itemPrice = item.price || 0
          const itemQuantity = item.quantity || 1
          const itemTotal = item.total || itemPrice * itemQuantity

          return (
            <div
              key={item.id || index}
              className="p-4 hover:bg-gray-50/50 transition-colors duration-150 group cursor-pointer"
            >
              <div className="flex gap-4 items-center">
                <div className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 relative rounded-lg overflow-hidden border border-gray-100 bg-gray-50">
                  <Image
                    src={itemImage || "/placeholder.svg"}
                    alt={itemName}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-200"
                    sizes="80px"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = "/placeholder.svg?height=80&width=80"
                    }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 text-sm leading-tight mb-1.5 group-hover:text-gray-700 transition-colors">
                    {itemName}
                  </h4>
                  <div className="flex gap-3 text-xs text-gray-500 mb-2">
                    <span>
                      Qty: <span className="font-medium text-gray-700">{itemQuantity}</span>
                    </span>
                    <span>•</span>
                    <span>
                      Price: <span className="font-medium text-gray-700">{formatCurrency(itemPrice)}</span>
                    </span>
                  </div>
                  <p className="text-base font-semibold text-gray-900">{formatCurrency(itemTotal)}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
