"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { MessageCircle, Loader2 } from "lucide-react"
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

interface ContactSupportProps {
  orderId: string
  orderNumber: string
  isLoading?: boolean
}

export function ContactSupport({ orderId, orderNumber, isLoading = false }: ContactSupportProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const handleSubmit = async () => {
    if (!message.trim()) {
      setError("Please enter your message")
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      const supportMsg = {
        orderId,
        orderNumber,
        message,
        timestamp: new Date().toISOString(),
        status: "pending",
      }

      // In production, send to backend
      console.log("Support message:", supportMsg)

      // Show success toast
      toast({
        title: "Message Sent",
        description: "We've received your message and will respond shortly.",
      })

      setMessage("")
      setIsOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message")
      console.error("Support contact error:", err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          disabled={isLoading}
          className="flex items-center gap-1.5 justify-center h-9 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium shadow-sm"
        >
          <MessageCircle className="h-3.5 w-3.5" />
          Support
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Contact Support</DialogTitle>
          <DialogDescription>Get help with order {orderNumber}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Message</label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your issue or ask your question..."
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
                Sending...
              </>
            ) : (
              "Send Message"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
