"use client"

import type React from "react"

import { formatDate } from "@/lib/utils"
import type { Order } from "@/types"
import { Package, Truck, CheckCircle2, XCircle, PackageCheck, RotateCcw } from "lucide-react"

interface TimelineStep {
  label: string
  status: "completed" | "current" | "pending" | "cancelled" | "returned"
  icon: React.ReactNode
  date?: string | null
  description?: string
}

interface OrderTimelineProps {
  order: Order
  status: string
}

export function OrderTimeline({ order, status }: OrderTimelineProps) {
  const getOrderTimeline = (): TimelineStep[] => {
    const statusLower = status?.toLowerCase() || ""

    const timeline: TimelineStep[] = [
      {
        label: "Order Placed",
        status: "completed",
        icon: <CheckCircle2 className="h-4 w-4" />,
        date: order?.created_at,
        description: "Your order has been successfully placed and is being prepared for processing.",
      },
      {
        label: "Confirmed",
        status: ["confirmed", "processing", "shipped", "delivered"].includes(statusLower) ? "completed" : "current",
        icon: <Package className="h-4 w-4" />,
        date: ["confirmed", "processing", "shipped", "delivered"].includes(statusLower) ? order?.updated_at : undefined,
        description: ["confirmed", "processing", "shipped", "delivered"].includes(statusLower)
          ? "Your order has been confirmed and is being prepared for dispatch."
          : "Waiting for order confirmation...",
      },
      {
        label: "Processing",
        status: ["processing", "shipped", "delivered"].includes(statusLower)
          ? "completed"
          : statusLower === "confirmed"
            ? "pending"
            : "pending",
        icon: <Truck className="h-4 w-4" />,
        date: ["processing", "shipped", "delivered"].includes(statusLower) ? order?.updated_at : undefined,
        description: ["processing", "shipped", "delivered"].includes(statusLower)
          ? "Your order is currently being processed, and we will notify you once the item has been shipped."
          : undefined,
      },
      {
        label: "Shipped",
        status: ["shipped", "delivered"].includes(statusLower) ? "completed" : "pending",
        icon: <Truck className="h-4 w-4" />,
        date: ["shipped", "delivered"].includes(statusLower) ? order?.updated_at : undefined,
        description: ["shipped", "delivered"].includes(statusLower)
          ? "Your order has been dispatched and is on its way to the delivery location."
          : undefined,
      },
      {
        label: "Delivered",
        status: statusLower === "delivered" ? "completed" : "pending",
        icon: <PackageCheck className="h-4 w-4" />,
        date: statusLower === "delivered" ? order?.updated_at : undefined,
        description:
          statusLower === "delivered"
            ? "Your order has been successfully delivered to the specified address."
            : undefined,
      },
    ]

    if (statusLower === "cancelled" || statusLower === "canceled") {
      return [
        {
          label: "Order Placed",
          status: "completed",
          icon: <CheckCircle2 className="h-4 w-4" />,
          date: order?.created_at,
          description: "Your order was successfully placed.",
        },
        {
          label: "Cancelled",
          status: "cancelled",
          icon: <XCircle className="h-4 w-4" />,
          date: order?.updated_at,
          description: "This order has been cancelled and will not be processed further.",
        },
      ]
    }

    if (statusLower === "returned") {
      return [
        ...timeline,
        {
          label: "Returned",
          status: "returned",
          icon: <RotateCcw className="h-4 w-4" />,
          date: order?.updated_at,
          description: "The order has been returned and a refund is being processed.",
        },
      ]
    }

    return timeline
  }

  const timeline = getOrderTimeline()
  const isLast = (index: number) => index === timeline.length - 1

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
      <h3 className="text-xs font-semibold text-gray-900 mb-5 uppercase tracking-wider">Order Tracking</h3>
      <div className="relative max-w-2xl">
        {timeline.map((step, index) => {
          const isCompleted = step.status === "completed"
          const isCurrent = step.status === "current"
          const isCancelled = step.status === "cancelled"
          const isReturned = step.status === "returned"

          return (
            <div key={index} className="relative flex gap-4 pb-8 last:pb-0">
              {!isLast(index) && (
                <div
                  className={`absolute left-[15px] top-8 w-0.5 h-full transition-colors ${
                    isCompleted ? "bg-green-400" : isCancelled || isReturned ? "bg-red-400" : "bg-gray-200"
                  }`}
                />
              )}

              <div
                className={`relative z-10 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm transition-all ${
                  isCompleted
                    ? "bg-green-500 text-white ring-2 ring-green-100"
                    : isCurrent
                      ? "bg-blue-500 text-white ring-2 ring-blue-100"
                      : isCancelled || isReturned
                        ? "bg-red-500 text-white ring-2 ring-red-100"
                        : "bg-white border border-gray-300 text-gray-400"
                }`}
              >
                <div className="scale-75">{step.icon}</div>
              </div>

              <div className="flex-1 pt-0.5">
                <p
                  className={`font-semibold text-sm mb-0.5 ${
                    isCompleted || isCurrent
                      ? "text-gray-900"
                      : isCancelled || isReturned
                        ? "text-red-600"
                        : "text-gray-400"
                  }`}
                >
                  {step.label}
                </p>
                {step.date && <p className="text-xs text-gray-500 mb-1.5">{formatDate(step.date)}</p>}
                {step.description && (
                  <p
                    className={`text-xs leading-relaxed ${
                      isCompleted || isCurrent
                        ? "text-gray-600"
                        : isCancelled || isReturned
                          ? "text-red-600"
                          : "text-gray-400"
                    }`}
                  >
                    {step.description}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
