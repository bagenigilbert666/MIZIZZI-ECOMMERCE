"use client"

import { formatDate } from "@/lib/utils"
import type { Order } from "@/types"
import { Package, Truck, CheckCircle2, Calendar, DollarSign } from "lucide-react"
import type React from "react"

interface ProcessingStep {
  label: string
  status: "completed" | "current" | "pending"
  icon: React.ReactNode
  timestamp?: string
  description?: string
}

interface AdminOrderProcessingTimelineProps {
  order: Order
}

export function AdminOrderProcessingTimeline({ order }: AdminOrderProcessingTimelineProps) {
  const getProcessingSteps = (): ProcessingStep[] => {
    const status = order.status?.toLowerCase() || "pending"

    const steps: ProcessingStep[] = [
      {
        label: "Order Received",
        status: "completed",
        icon: <Calendar className="h-4 w-4" />,
        timestamp: formatDate(order.created_at),
        description: "Order placed and confirmed",
      },
      {
        label: "Verify Payment",
        status: ["confirmed", "processing", "shipped", "delivered"].includes(status)
          ? "completed"
          : status === "pending"
            ? "current"
            : "pending",
        icon: <DollarSign className="h-4 w-4" />,
        description: "Payment verification in progress",
      },
      {
        label: "Confirm Order",
        status: ["processing", "shipped", "delivered"].includes(status)
          ? "completed"
          : status === "confirmed"
            ? "current"
            : "pending",
        icon: <CheckCircle2 className="h-4 w-4" />,
        description: "Order confirmed with customer",
      },
      {
        label: "Pick & Pack",
        status: ["processing", "shipped", "delivered"].includes(status)
          ? "completed"
          : status === "confirmed"
            ? "current"
            : "pending",
        icon: <Package className="h-4 w-4" />,
        description: "Items being prepared for shipment",
      },
      {
        label: "Ready to Ship",
        status: ["shipped", "delivered"].includes(status)
          ? "completed"
          : status === "processing"
            ? "current"
            : "pending",
        icon: <Truck className="h-4 w-4" />,
        description: "Package ready for carrier pickup",
      },
      {
        label: "In Transit",
        status: status === "shipped" ? "current" : status === "delivered" ? "completed" : "pending",
        icon: <Truck className="h-4 w-4" />,
        description: "Package on the way to customer",
      },
      {
        label: "Delivered",
        status: status === "delivered" ? "completed" : "pending",
        icon: <CheckCircle2 className="h-4 w-4" />,
        timestamp: order.updated_at && status === "delivered" ? formatDate(order.updated_at) : undefined,
        description: "Order successfully delivered",
      },
    ]

    return steps
  }

  const steps = getProcessingSteps()

  return (
    <div className="bg-white border border-gray-100 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Processing Timeline</h3>
      <div className="relative space-y-4">
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1
          const isCompleted = step.status === "completed"
          const isCurrent = step.status === "current"

          return (
            <div key={index} className="relative flex gap-3">
              {!isLast && (
                <div
                  className={`absolute left-[15px] top-8 w-0.5 h-full ${
                    isCompleted ? "bg-green-300" : isCurrent ? "bg-blue-300" : "bg-gray-200"
                  }`}
                />
              )}

              <div
                className={`relative z-10 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                  isCompleted
                    ? "bg-green-500 text-white"
                    : isCurrent
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200 text-gray-400"
                }`}
              >
                <div className="scale-75">{step.icon}</div>
              </div>

              <div className="flex-1 pt-0.5">
                <p
                  className={`text-sm font-medium transition-colors ${
                    isCompleted || isCurrent ? "text-gray-900" : "text-gray-400"
                  }`}
                >
                  {step.label}
                </p>
                {step.description && (
                  <p className={`text-xs mt-0.5 ${isCompleted || isCurrent ? "text-gray-600" : "text-gray-400"}`}>
                    {step.description}
                  </p>
                )}
                {step.timestamp && <p className="text-xs text-gray-500 mt-0.5">{step.timestamp}</p>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
