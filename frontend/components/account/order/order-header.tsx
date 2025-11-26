"use client"

import type React from "react"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatDate } from "@/lib/utils"
import type { Order } from "@/types"
import { Package, Truck, CheckCircle2, XCircle, RotateCcw, Clock, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface OrderHeaderProps {
  order: Order
  itemCount: number
  total: number
  onCancelOrder?: () => void
}

export function OrderHeader({ order, itemCount, total, onCancelOrder }: OrderHeaderProps) {
  const getStatusInfo = (status: string) => {
    const statusLower = status?.toLowerCase() || ""

    const statusMap: Record<string, { color: string; icon: React.ReactNode; label: string; dotColor: string }> = {
      pending: {
        color: "bg-amber-50/50 text-amber-700 border-amber-200/50",
        icon: <Clock className="h-3.5 w-3.5" />,
        label: "Pending",
        dotColor: "bg-amber-500",
      },
      confirmed: {
        color: "bg-blue-50/50 text-blue-700 border-blue-200/50",
        icon: <CheckCircle2 className="h-3.5 w-3.5" />,
        label: "Confirmed",
        dotColor: "bg-blue-500",
      },
      processing: {
        color: "bg-indigo-50/50 text-indigo-700 border-indigo-200/50",
        icon: <Package className="h-3.5 w-3.5" />,
        label: "Processing",
        dotColor: "bg-indigo-500",
      },
      shipped: {
        color: "bg-purple-50/50 text-purple-700 border-purple-200/50",
        icon: <Truck className="h-3.5 w-3.5" />,
        label: "Shipped",
        dotColor: "bg-purple-500",
      },
      delivered: {
        color: "bg-green-50/50 text-green-700 border-green-200/50",
        icon: <CheckCircle2 className="h-3.5 w-3.5" />,
        label: "Delivered",
        dotColor: "bg-green-500",
      },
      cancelled: {
        color: "bg-red-50/50 text-red-700 border-red-200/50",
        icon: <XCircle className="h-3.5 w-3.5" />,
        label: "Cancelled",
        dotColor: "bg-red-500",
      },
      returned: {
        color: "bg-gray-100/50 text-gray-700 border-gray-200/50",
        icon: <RotateCcw className="h-3.5 w-3.5" />,
        label: "Returned",
        dotColor: "bg-gray-500",
      },
    }

    return statusMap[statusLower] || statusMap.pending
  }

  const statusInfo = getStatusInfo(order.status)

  return (
    <div className="bg-gradient-to-b from-white to-gray-50/30 border border-gray-100 rounded-xl p-5 shadow-sm">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-start gap-4">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900 tracking-tight">Order #{order.order_number}</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {itemCount} {itemCount === 1 ? "item" : "items"} • {formatDate(order.created_at)}
                </p>
              </div>
            </div>
            <div className="pt-1">
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-0.5">Order Total</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(total)}</p>
            </div>
          </div>

          <div className="flex flex-col gap-2 w-full sm:w-auto">
            <Badge
              className={`${statusInfo.color} border px-3 py-1.5 font-medium flex items-center gap-2 text-xs w-fit`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${statusInfo.dotColor} animate-pulse`} />
              {statusInfo.label}
            </Badge>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8 px-3 rounded-lg border-gray-200 hover:bg-gray-50 bg-transparent"
              >
                <Share2 className="h-3 w-3 mr-1" />
                Share
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
