"use client"

import { useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { AlertTriangle } from "lucide-react"

interface CacheInvalidationDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  affectedCaches?: string[]
  isDangerous?: boolean
  requiresDoubleConfirm?: boolean
  onConfirm: () => void | Promise<void>
  isLoading?: boolean
}

export function CacheInvalidationDialog({
  isOpen,
  onOpenChange,
  title,
  description,
  affectedCaches,
  isDangerous = false,
  requiresDoubleConfirm = false,
  onConfirm,
  isLoading,
}: CacheInvalidationDialogProps) {
  const [doubleConfirmed, setDoubleConfirmed] = useState(false)

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setDoubleConfirmed(false)
    }
    onOpenChange(open)
  }

  const handleConfirm = async () => {
    if (requiresDoubleConfirm && !doubleConfirmed) {
      setDoubleConfirmed(true)
      return
    }

    try {
      await onConfirm()
      handleOpenChange(false)
    } catch (error) {
      console.error("Confirmation failed:", error)
    }
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            {isDangerous && <AlertTriangle className="h-5 w-5 text-red-600" />}
            <AlertDialogTitle>{title}</AlertDialogTitle>
          </div>
        </AlertDialogHeader>

        <div className="space-y-3">
          <AlertDialogDescription>{description}</AlertDialogDescription>

          {affectedCaches && affectedCaches.length > 0 && (
            <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Affected caches:</p>
              <ul className="space-y-1">
                {affectedCaches.map((cache) => (
                  <li key={cache} className="text-sm text-slate-700 dark:text-slate-300">
                    • {cache}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {requiresDoubleConfirm && !doubleConfirmed && (
            <div className="rounded-lg bg-orange-50 p-3 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-900">
              <p className="text-xs text-orange-800 dark:text-orange-300 font-medium">
                Click "Confirm" again to proceed
              </p>
            </div>
          )}

          {requiresDoubleConfirm && doubleConfirmed && (
            <div className="rounded-lg bg-red-50 p-3 dark:bg-red-900/20 border border-red-200 dark:border-red-900">
              <p className="text-xs text-red-800 dark:text-red-300 font-medium">
                This action cannot be undone. All data will be cleared.
              </p>
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={isLoading} className={isDangerous ? "bg-red-600 hover:bg-red-700" : ""}>
            {isLoading ? "Processing..." : "Confirm"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
