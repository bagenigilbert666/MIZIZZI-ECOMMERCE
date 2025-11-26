"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { AlertCircle, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"

interface ReportIssueProps {
  orderId: string
  orderNumber: string
  isLoading?: boolean
}

export function ReportIssue({ orderId, orderNumber, isLoading = false }: ReportIssueProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState("")
  const [issueType, setIssueType] = useState("damaged")
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const handleSubmit = async () => {
    if (!message.trim()) {
      setError("Please describe the issue")
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      const report = {
        orderId,
        orderNumber,
        issueType,
        message,
        timestamp: new Date().toISOString(),
        status: "pending",
      }

      // In production, send to backend
      console.log("Issue report:", report)

      // Show success toast
      toast({
        title: "Issue Reported",
        description: "We've received your report and will investigate shortly.",
      })

      setMessage("")
      setIssueType("damaged")
      setIsOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to report issue")
      console.error("Report issue error:", err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={isLoading}
          className="flex items-center gap-1.5 justify-center h-9 bg-white hover:bg-gray-50 border-gray-200 hover:border-gray-300 rounded-lg text-xs font-medium"
        >
          <AlertCircle className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Report</span>
          <span className="sm:hidden">Issue</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report an Issue</DialogTitle>
          <DialogDescription>Let us know what went wrong with order {orderNumber}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Issue Type</label>
            <select
              value={issueType}
              onChange={(e) => setIssueType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="damaged">Damaged Item</option>
              <option value="missing">Missing Item</option>
              <option value="wrong_item">Wrong Item</option>
              <option value="quality">Quality Issue</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Description</label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe the issue in detail..."
              className="min-h-24 text-sm"
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Report"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
