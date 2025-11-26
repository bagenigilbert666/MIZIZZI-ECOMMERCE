"use client"

import { Button } from "@/components/ui/button"
import { XCircle } from "lucide-react"
import { useState } from "react"
import { CancelOrderDialog } from "./cancel-order-dialog"
import { DownloadInvoice } from "./actions/download-invoice"
import { ReportIssue } from "./actions/report-issue"
import { ReorderItems } from "./actions/reorder-items"
import { ContactSupport } from "./actions/contact-support"
import type { OrderItem } from "@/types"

interface OrderSupportActionsProps {
  orderId: string
  orderNumber?: string
  items?: OrderItem[]
  paymentMethod?: string
  onCancelOrder?: () => void | Promise<void>
  canCancel?: boolean
}

export function OrderSupportActions({
  orderId,
  orderNumber = "",
  items = [],
  paymentMethod,
  onCancelOrder,
  canCancel,
}: OrderSupportActionsProps) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false)

  const isCashOnDelivery =
    paymentMethod?.toLowerCase().includes("cash") ||
    paymentMethod?.toLowerCase().includes("cod") ||
    paymentMethod?.toLowerCase().includes("delivery")
  const showCancelButton = canCancel && isCashOnDelivery

  return (
    <>
      <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-0.5">Order Actions</h3>
          <p className="text-[10px] text-gray-500">Manage your order and get help</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <DownloadInvoice orderId={orderId} orderNumber={orderNumber} isLoading={loadingAction === "invoice"} />
          <ReportIssue orderId={orderId} orderNumber={orderNumber} isLoading={loadingAction === "report"} />
          <ReorderItems
            orderId={orderId}
            orderNumber={orderNumber}
            items={items}
            isLoading={loadingAction === "reorder"}
          />
          <div className="flex-1 min-w-[140px]">
            <ContactSupport orderId={orderId} orderNumber={orderNumber} isLoading={loadingAction === "support"} />
          </div>
        </div>

        {showCancelButton && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <Button
              size="sm"
              onClick={() => setIsCancelDialogOpen(true)}
              className="w-full h-9 rounded-lg text-xs font-medium bg-red-600 hover:bg-red-700 text-white shadow-sm transition-colors"
            >
              <XCircle className="h-3.5 w-3.5 mr-1.5" />
              Cancel This Order
            </Button>
            <p className="text-[10px] text-gray-500 mt-1.5 text-center">
              {isCashOnDelivery ? "You can only cancel cash on delivery orders" : "Paid orders cannot be cancelled"}
            </p>
          </div>
        )}
      </div>

      <CancelOrderDialog
        isOpen={isCancelDialogOpen}
        onOpenChange={setIsCancelDialogOpen}
        onConfirm={onCancelOrder || (() => {})}
        orderId={orderId}
        isLoading={loadingAction === "cancel"}
      />
    </>
  )
}
