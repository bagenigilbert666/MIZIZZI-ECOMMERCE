"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { FileText, Loader2 } from "lucide-react"

interface DownloadInvoiceProps {
  orderId: string
  orderNumber: string
  isLoading?: boolean
}

export function DownloadInvoice({ orderId, orderNumber, isLoading = false }: DownloadInvoiceProps) {
  const [isDownloading, setIsDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDownload = async () => {
    setIsDownloading(true)
    setError(null)
    try {
      const invoiceContent = `
        Order Invoice
        Order #: ${orderNumber}
        Order ID: ${orderId}
        Date: ${new Date().toLocaleDateString()}
        
        Please visit your account to view full invoice details.
      `

      const blob = new Blob([invoiceContent], { type: "text/plain" })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `invoice-${orderNumber}.txt`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to download invoice")
      console.error("Invoice download error:", err)
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className="flex-shrink-0">
      <Button
        variant="outline"
        size="sm"
        onClick={handleDownload}
        disabled={isLoading || isDownloading}
        className="flex items-center gap-1.5 justify-center h-9 px-3 whitespace-nowrap bg-white hover:bg-gray-50 border-gray-200 hover:border-gray-300 rounded-lg text-xs font-medium"
      >
        {isDownloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
        {isDownloading ? "Downloading..." : "Invoice"}
      </Button>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}
