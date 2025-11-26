"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Order, ProductImage } from "@/types"
import { AdminOrderItemsSection } from "./admin-order-items-section"
import { AdminOrderCustomerSection } from "./admin-order-customer-section"
import { AdminOrderPaymentSection } from "./admin-order-payment-section"
import { AdminOrderStatusSection } from "./admin-order-status-section"
import { AdminOrderProcessingTimeline } from "./admin-order-processing-timeline"
import { AdminOrderActions } from "./admin-order-actions"

interface AdminOrderDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: Order | null
  productImages: Record<string, ProductImage[]>
  onStatusChange?: (orderId: string, newStatus: string) => Promise<void>
  onPrint?: (order: Order) => void
  onEmail?: (order: Order) => void
  onExport?: (order: Order) => void
  onViewActivity?: (order: Order) => void
}

export function AdminOrderDetailModal({
  open,
  onOpenChange,
  order,
  productImages,
  onStatusChange,
  onPrint,
  onEmail,
  onExport,
  onViewActivity,
}: AdminOrderDetailModalProps) {
  if (!order) return null

  const handleStatusChange = async (newStatus: string) => {
    if (onStatusChange) {
      await onStatusChange(order.id || order.order_number, newStatus)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col bg-white border border-gray-200/60 shadow-xl">
        <DialogHeader className="border-b border-gray-100 pb-3 px-6 pt-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-xl font-semibold text-gray-900">Order #{order.order_number}</DialogTitle>
              <DialogDescription className="mt-1 text-sm text-gray-500">
                Complete order information and admin processing controls
              </DialogDescription>
            </div>
            <AdminOrderActions
              order={order}
              onPrint={() => onPrint?.(order)}
              onEmail={() => onEmail?.(order)}
              onExport={() => onExport?.(order)}
              onViewActivity={() => onViewActivity?.(order)}
            />
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 py-4">
          <div className="space-y-4 pr-4">
            {/* Status Management */}
            <AdminOrderStatusSection order={order} />

            {/* Processing Timeline */}
            <AdminOrderProcessingTimeline order={order} />

            {/* Order Items */}
            <AdminOrderItemsSection order={order} items={order.items || []} productImages={productImages} />

            {/* Customer & Payment Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AdminOrderCustomerSection order={order} />
              <AdminOrderPaymentSection order={order} />
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
