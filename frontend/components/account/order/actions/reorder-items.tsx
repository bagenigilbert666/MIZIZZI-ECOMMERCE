"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { RotateCcw, Loader2 } from "lucide-react"
import type { OrderItem } from "@/types"

interface ReorderItemsProps {
  orderId: string
  orderNumber: string
  items?: OrderItem[]
  isLoading?: boolean
}

export function ReorderItems({ orderId, orderNumber, items = [], isLoading = false }: ReorderItemsProps) {
  const [isReordering, setIsReordering] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleReorder = async () => {
    if (!items || items.length === 0) {
      setError("No items to reorder")
      return
    }

    setIsReordering(true)
    setError(null)
    try {
      // Store items in localStorage for cart
      const cartItems = items.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
      }))

      localStorage.setItem("reorder_items", JSON.stringify(cartItems))

      // Redirect to cart
      window.location.href = "/cart"
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reorder items")
      console.error("Reorder error:", err)
    } finally {
      setIsReordering(false)
    }
  }

  return (
    <div className="flex-shrink-0">
      <Button
        variant="outline"
        size="sm"
        onClick={handleReorder}
        disabled={isLoading || isReordering || !items || items.length === 0}
        className="flex items-center gap-1.5 justify-center h-9 px-3 whitespace-nowrap bg-white hover:bg-gray-50 border-gray-200 hover:border-gray-300 rounded-lg text-xs font-medium"
      >
        {isReordering ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
        {isReordering ? "Adding..." : "Reorder"}
      </Button>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}
