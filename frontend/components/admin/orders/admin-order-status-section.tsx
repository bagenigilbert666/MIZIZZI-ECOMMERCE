"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Order } from "@/types"
import { Clock, Package, Truck, CheckCircle2, XCircle, AlertCircle } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState } from "react"
import { adminService } from "@/services/admin"
import { toast } from "@/components/ui/use-toast"

interface AdminOrderStatusSectionProps {
  order: Order
  onUpdate?: () => void
}

export function AdminOrderStatusSection({ order, onUpdate }: AdminOrderStatusSectionProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [newStatus, setNewStatus] = useState(order.status?.toLowerCase() || "pending")

  const statusOptions = [
    { value: "pending", label: "Pending", icon: Clock },
    { value: "confirmed", label: "Confirmed", icon: CheckCircle2 },
    { value: "processing", label: "Processing", icon: Package },
    { value: "shipped", label: "Shipped", icon: Truck },
    { value: "delivered", label: "Delivered", icon: CheckCircle2 },
    { value: "cancelled", label: "Cancelled", icon: XCircle },
  ]

  const currentStatusOption = statusOptions.find((s) => s.value === newStatus)
  const CurrentIcon = currentStatusOption?.icon || Clock

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return "bg-amber-50 text-amber-700 border-amber-200"
      case "confirmed":
        return "bg-blue-50 text-blue-700 border-blue-200"
      case "processing":
        return "bg-indigo-50 text-indigo-700 border-indigo-200"
      case "shipped":
        return "bg-purple-50 text-purple-700 border-purple-200"
      case "delivered":
        return "bg-green-50 text-green-700 border-green-200"
      case "cancelled":
        return "bg-red-50 text-red-700 border-red-200"
      default:
        return "bg-gray-50 text-gray-700 border-gray-200"
    }
  }

  const handleStatusUpdate = async () => {
    if (newStatus === order.status?.toLowerCase()) {
      toast({
        title: "No changes",
        description: "Please select a different status",
        variant: "destructive",
      })
      return
    }

    setIsUpdating(true)
    try {
      await adminService.updateOrderStatus(Number.parseInt(order.id), {
        status: newStatus,
      })

      toast({
        title: "Success",
        description: `Order status updated to ${newStatus}`,
      })

      // Call the onUpdate callback to refresh the timeline
      onUpdate?.()
    } catch (error) {
      console.error("Failed to update order status:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update order status",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="bg-white border border-gray-100 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-4">
        <AlertCircle className="h-4 w-4 text-gray-500" />
        <h3 className="text-sm font-semibold text-gray-900">Order Status Management</h3>
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-xs text-gray-500 mb-2 font-medium uppercase">Current Status</p>
          <Badge className={`${getStatusColor(order.status || "")} border text-xs font-medium`}>
            <CurrentIcon className="h-3 w-3 mr-1" />
            {currentStatusOption?.label}
          </Badge>
        </div>

        <div>
          <p className="text-xs text-gray-500 mb-2 font-medium uppercase">Update Status</p>
          <div className="flex gap-2">
            <Select value={newStatus} onValueChange={setNewStatus} disabled={isUpdating}>
              <SelectTrigger className="h-9 text-sm border-gray-200">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleStatusUpdate}
              disabled={newStatus === order.status?.toLowerCase() || isUpdating}
              size="sm"
              className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isUpdating ? "Updating..." : "Update"}
            </Button>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded p-3">
          <p className="text-xs text-blue-900">
            <strong>Tip:</strong> Update the order status as it progresses through fulfillment. Changes will be
            reflected in the timeline and customers will be notified.
          </p>
        </div>
      </div>
    </div>
  )
}
