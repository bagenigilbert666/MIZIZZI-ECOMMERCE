"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { AlertCircle } from "lucide-react"

interface CancelOrderDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void | Promise<void>
  orderId: string
  isLoading?: boolean
}

export function CancelOrderDialog({
  isOpen,
  onOpenChange,
  onConfirm,
  orderId,
  isLoading = false,
}: CancelOrderDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false)

  const handleConfirm = async () => {
    setIsProcessing(true)
    try {
      await onConfirm()
      onOpenChange(false)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-sm border-gray-200">
        <AlertDialogHeader className="gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
            <div className="flex-1">
              <AlertDialogTitle className="text-base font-semibold text-gray-900">Cancel This Order?</AlertDialogTitle>
              <AlertDialogDescription className="mt-1 text-sm text-gray-600">Order #{orderId}</AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <div className="space-y-3 py-4">
          <p className="text-sm text-gray-700">
            Are you sure you want to cancel this order? This action cannot be undone.
          </p>
          <div className="rounded-lg bg-amber-50 p-3 border border-amber-200">
            <p className="text-xs font-medium text-amber-900">
              ⚠️ Once cancelled, you'll need to place a new order if you change your mind.
            </p>
          </div>
        </div>

        <AlertDialogFooter className="gap-2 sm:gap-3">
          <AlertDialogCancel
            disabled={isProcessing || isLoading}
            className="bg-white hover:bg-gray-50 text-gray-900 border-gray-200"
          >
            Keep Order
          </AlertDialogCancel>
          <Button
            onClick={handleConfirm}
            disabled={isProcessing || isLoading}
            className="bg-red-600 hover:bg-red-700 text-white shadow-sm"
            variant="default"
          >
            {isProcessing || isLoading ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Cancelling...
              </>
            ) : (
              <>
                <AlertCircle className="mr-2 h-4 w-4" />
                Cancel Order
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
