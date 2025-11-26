"use client"

import type React from "react"
import { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Search,
  Filter,
  Download,
  RefreshCw,
  Eye,
  FileText,
  Truck,
  MoreHorizontal,
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Calendar,
  DollarSign,
  TrendingUp,
  ShoppingBag,
  Check,
  Info,
  Loader2,
  AlertCircleIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Loader } from "@/components/ui/loader"
import { adminService } from "@/services/admin"
import { toast } from "@/components/ui/use-toast"
import { useAdminAuth } from "@/contexts/admin/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDate, formatCurrency } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog" // Added DialogFooter
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

// Define Order type for better type safety
interface Order {
  id: number | string
  order_number: string
  user_id: string
  customer_name: string
  customer_email: string
  created_at: string
  updated_at: string
  status: string
  payment_status: string
  payment_method: string
  tracking_number?: string | null
  tracking_url?: string | null
  notes?: string | null
  return_reason?: string | null
  total_amount: number
  subtotal_amount?: number
  shipping_amount?: number
  tax_amount?: number
  subtotal?: number
  shipping?: number
  tax?: number
  total?: number
  user?: {
    name: string
    email: string
    phone?: string
  }
  items: OrderItem[]
  shipping_address?: ShippingAddress
  processing_at?: string
  shipped_at?: string
  delivered_at?: string
}

interface OrderItem {
  id: number | string
  product_name: string
  name: string
  quantity: number
  price: number
  image_url?: string
  thumbnail_url?: string
  variation?: Record<string, string>
}

interface ShippingAddress {
  name?: string
  street?: string
  address_line1?: string
  address_line2?: string
  city?: string
  state?: string
  zipCode?: string
  postal_code?: string
  country?: string
  phone?: string
}

// FIX: API_BASE_URL to use the correct environment variable
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"

export default function OrdersPage() {
  const { isAuthenticated, isLoading: authLoading } = useAdminAuth()
  const router = useRouter()

  // State management
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set())
  const [showFilters, setShowFilters] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showOrderDetails, setShowOrderDetails] = useState(false)
  const [activeTab, setActiveTab] = useState("all")

  // Statistics state
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
    returned: 0,
    revenue: 0,
  })

  // State for order management features
  const [showStatusUpdate, setShowStatusUpdate] = useState(false)
  const [showRefundDialog, setShowRefundDialog] = useState(false)
  const [showNotesDialog, setShowNotesDialog] = useState(false)
  const [selectedOrderForAction, setSelectedOrderForAction] = useState<Order | null>(null)
  const [newStatus, setNewStatus] = useState("")
  const [trackingNumber, setTrackingNumber] = useState("")
  const [trackingUrl, setTrackingUrl] = useState("")
  const [statusNotes, setStatusNotes] = useState("")
  const [refundAmount, setRefundAmount] = useState("")
  const [refundReason, setRefundReason] = useState("")
  const [orderNotes, setOrderNotes] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)

  const [activityLogs, setActivityLogs] = useState<any[]>([])
  const [showActivityLog, setShowActivityLog] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailDialogOpen, setEmailDialogOpen] = useState(false)
  const [emailSubject, setEmailSubject] = useState("")
  const [emailMessage, setEmailMessage] = useState("")
  const [emailBody, setEmailBody] = useState("") // Added emailBody state

  // Placeholder for product images, assuming they are fetched elsewhere or available globally
  const [productImages, setProductImages] = useState<{ [key: string]: string }>({})

  const sendEmailToCustomer = async (order: Order) => {
    const customerEmail = order.user?.email

    console.log("[v0] Sending email to customer")
    console.log("[v0] API_BASE_URL:", process.env.NEXT_PUBLIC_API_URL)
    console.log("[v0] Email to:", customerEmail)
    console.log("[v0] Subject:", emailSubject)
    console.log("[v0] Message:", emailMessage)
    console.log("[v0] Order user_id:", order.user_id)

    if (!customerEmail) {
      toast({
        title: "Error",
        description: "Customer email not found for this order",
        variant: "destructive",
      })
      return
    }

    if (!emailSubject || !emailMessage) {
      toast({
        title: "Error",
        description: "Please fill in both subject and message",
        variant: "destructive",
      })
      return
    }

    try {
      setSendingEmail(true)

      const token = localStorage.getItem("admin_token")
      if (!token) {
        throw new Error("No authentication token available")
      }

      const url = `${process.env.NEXT_PUBLIC_API_URL}/api/admin/send-email`
      console.log("[v0] Full API URL:", url)

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify({
          to: customerEmail,
          subject: emailSubject,
          message: emailMessage,
          user_id: order.user_id,
        }),
      })

      console.log("[v0] Response status:", response.status)
      console.log("[v0] Response ok:", response.ok)

      const responseData = await response.json()
      console.log("[v0] Response data:", responseData)

      if (!response.ok) {
        console.error("[v0] Error response:", responseData)
        throw new Error(responseData.error || "Failed to send email")
      }

      toast({
        title: "Success",
        description: "Email sent successfully to customer",
      })

      setEmailDialogOpen(false)
      setEmailSubject("")
      setEmailMessage("")
    } catch (error: any) {
      console.error("[v0] Error sending email:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to send email. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSendingEmail(false)
    }
  }

  const emailTemplates = {
    order_update: {
      subject: "Order Update - #{order_number}",
      body: `Dear {customer_name},\n\nYour order #{order_number} has been updated.\n\nCurrent Status: {status}\n\nThank you for shopping with us!\n\nBest regards,\nMIZIZZI Team`,
    },
    shipping_notification: {
      subject: "Your Order Has Shipped - #{order_number}",
      body: `Dear {customer_name},\n\nGreat news! Your order #{order_number} has been shipped.\n\nTracking Number: {tracking_number}\n\nYou can track your package using the link below.\n\nBest regards,\nMIZIZZI Team`,
    },
    delivery_confirmation: {
      subject: "Order Delivered - #{order_number}",
      body: `Dear {customer_name},\n\nYour order #{order_number} has been delivered successfully.\n\nWe hope you enjoy your purchase! Please let us know if you have any questions.\n\nBest regards,\nMIZIZZI Team`,
    },
  }

  const applyEmailTemplate = (template: string) => {
    if (!selectedOrderForAction) return

    const templateData = emailTemplates[template as keyof typeof emailTemplates]
    if (templateData) {
      const subject = templateData.subject
        .replace("{order_number}", selectedOrderForAction.order_number)
        .replace("{customer_name}", selectedOrderForAction.user?.name || "Customer")

      const body = templateData.body
        .replace("{order_number}", selectedOrderForAction.order_number)
        .replace("{customer_name}", selectedOrderForAction.user?.name || "Customer")
        .replace("{status}", selectedOrderForAction.status)
        .replace("{tracking_number}", selectedOrderForAction.tracking_number || "N/A")

      setEmailSubject(subject)
      setEmailBody(body) // Set the body to emailBody state
    }
  }

  const openEmailDialog = (order: Order) => {
    console.log("[v0] Opening email dialog for order:", order.order_number)
    console.log("[v0] Order user object:", order.user)
    console.log("[v0] Order user email:", order.user?.email)
    console.log("[v0] Full order object:", order)

    setSelectedOrderForAction(order)
    // Set default template and apply it
    const defaultTemplate = "order_update"
    applyEmailTemplate(defaultTemplate)
    setEmailDialogOpen(true)
  }

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/admin/login")
    }
  }, [isAuthenticated, authLoading, router])

  // Fetch orders
  const fetchOrders = async () => {
    try {
      setIsLoading(true)
      const response = await adminService.getOrders({
        page: currentPage,
        per_page: 20,
        status: statusFilter !== "all" ? statusFilter : undefined,
        search: searchQuery || undefined,
      })

      setOrders(response.items || [])
      setTotalPages(response.pagination?.total_pages || 1)
      setTotalItems(response.pagination?.total_items || 0)

      // Calculate statistics
      calculateStats(response.items || [])
    } catch (error) {
      console.error("Failed to fetch orders:", error)
      toast({
        title: "Error",
        description: "Failed to load orders. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Refetch orders when relevant filters change
  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders()
    }
  }, [isAuthenticated, currentPage, statusFilter, searchQuery]) // Added searchQuery to dependencies

  // Calculate statistics from orders
  const calculateStats = (ordersList: Order[]) => {
    const newStats = {
      total: ordersList.length,
      pending: ordersList.filter((o) => o.status === "pending").length,
      processing: ordersList.filter((o) => o.status === "processing").length,
      shipped: ordersList.filter((o) => o.status === "shipped").length,
      delivered: ordersList.filter((o) => o.status === "delivered").length,
      cancelled: ordersList.filter((o) => o.status === "cancelled" || o.status === "canceled").length,
      returned: ordersList.filter((o) => o.status === "returned").length,
      revenue: ordersList.reduce((sum, o) => sum + (o.total_amount || 0), 0),
    }
    setStats(newStats)
  }

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1) // Reset to first page on search
    fetchOrders()
  }

  // Handle refresh
  const handleRefresh = () => {
    fetchOrders()
    toast({
      title: "Refreshed",
      description: "Orders list has been updated.",
    })
  }

  // Handle export
  const handleExport = () => {
    // TODO: Implement CSV export
    toast({
      title: "Export Started",
      description: "Your orders export will download shortly.",
    })
  }

  // Handle bulk selection
  const toggleOrderSelection = (orderId: string | number) => {
    const newSelection = new Set(selectedOrders)
    if (newSelection.has(orderId.toString())) {
      newSelection.delete(orderId.toString())
    } else {
      newSelection.add(orderId.toString())
    }
    setSelectedOrders(newSelection)
  }

  const toggleSelectAll = () => {
    if (selectedOrders.size === orders.length) {
      setSelectedOrders(new Set())
    } else {
      setSelectedOrders(new Set(orders.map((o) => o.id.toString())))
    }
  }

  // Get status badge styling
  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase()
    const configs: Record<string, { icon: React.ElementType; className: string }> = {
      pending: {
        icon: Clock,
        className: "bg-gradient-to-r from-yellow-50 to-amber-50 text-yellow-700 border-yellow-200",
      },
      processing: {
        icon: Package,
        className: "bg-gradient-to-r from-blue-50 to-cyan-50 text-blue-700 border-blue-200",
      },
      shipped: {
        icon: Truck,
        className: "bg-gradient-to-r from-purple-50 to-indigo-50 text-purple-700 border-purple-200",
      },
      delivered: {
        icon: CheckCircle2,
        className: "bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border-green-200",
      },
      cancelled: {
        icon: XCircle,
        className: "bg-gradient-to-r from-red-50 to-rose-50 text-red-700 border-red-200",
      },
      canceled: {
        icon: XCircle,
        className: "bg-gradient-to-r from-red-50 to-rose-50 text-red-700 border-red-200",
      },
      returned: {
        icon: RotateCcw,
        className: "bg-gradient-to-r from-orange-50 to-amber-50 text-orange-700 border-orange-200",
      },
    }

    const config = configs[statusLower] || {
      icon: AlertCircleIcon,
      className: "bg-gray-50 text-gray-700 border-gray-200",
    }

    const Icon = config.icon

    return (
      <Badge className={`${config.className} border font-medium px-3 py-1 flex items-center gap-1.5 w-fit`}>
        <Icon className="h-3.5 w-3.5" />
        {status}
      </Badge>
    )
  }

  // View order details - CHANGE: Navigate to detail page instead of opening modal
  const viewOrderDetailsEnhanced = (order: Order) => {
    router.push(`/admin/orders/${order.id}`)
  }

  // Filter orders by tab
  const filteredOrders = useMemo(() => {
    if (activeTab === "all") return orders
    return orders.filter((order) => order.status.toLowerCase() === activeTab)
  }, [orders, activeTab])

  const getValidNextStatuses = (currentStatus: string): string[] => {
    const workflows: Record<string, string[]> = {
      pending: ["confirmed", "processing", "cancelled"],
      confirmed: ["processing", "cancelled"],
      processing: ["shipped", "cancelled"],
      shipped: ["delivered", "cancelled"],
      delivered: ["returned"],
      cancelled: [],
      returned: [],
    }
    return workflows[currentStatus] || []
  }

  const getWorkflowPath = (from: string, to: string): string[] => {
    const paths: Record<string, Record<string, string[]>> = {
      pending: {
        confirmed: ["pending", "confirmed"],
        processing: ["pending", "confirmed", "processing"],
        shipped: ["pending", "confirmed", "processing", "shipped"],
        delivered: ["pending", "confirmed", "processing", "shipped", "delivered"],
      },
      confirmed: {
        processing: ["confirmed", "processing"],
        shipped: ["confirmed", "processing", "shipped"],
        delivered: ["confirmed", "processing", "shipped", "delivered"],
      },
      processing: {
        shipped: ["processing", "shipped"],
        delivered: ["processing", "shipped", "delivered"],
      },
      shipped: {
        delivered: ["shipped", "delivered"],
      },
    }
    return paths[from]?.[to] || []
  }

  const handleStatusUpdate = async () => {
    if (!selectedOrderForAction || !newStatus) {
      toast({
        title: "Error",
        description: "Please select a status",
        variant: "destructive",
      })
      return
    }

    const currentStatus = selectedOrderForAction.status
    const validNextStatuses = getValidNextStatuses(currentStatus)

    // Check if trying to change a cancelled order
    if (currentStatus === "cancelled" && newStatus !== "cancelled") {
      toast({
        title: "Invalid Status Change",
        description: "Cannot change the status of a cancelled order. Cancelled orders are final.",
        variant: "destructive",
      })
      return
    }

    // Check if trying to change a delivered order (except to returned)
    if (currentStatus === "delivered" && newStatus !== "delivered" && newStatus !== "returned") {
      toast({
        title: "Invalid Status Change",
        description: "Delivered orders can only be changed to 'returned' status.",
        variant: "destructive",
      })
      return
    }

    // Check if the status transition is valid (not skipping steps)
    if (newStatus !== currentStatus && !validNextStatuses.includes(newStatus) && newStatus !== "cancelled") {
      const workflowPath = getWorkflowPath(currentStatus, newStatus)
      const pathString = workflowPath.length > 0 ? workflowPath.join(" → ") : `${currentStatus} → ... → ${newStatus}`

      toast({
        title: "Invalid Status Transition",
        description: `You cannot jump directly from "${currentStatus}" to "${newStatus}". Please follow the workflow: ${pathString}`,
        variant: "destructive",
        duration: 8000,
      })
      return
    }

    setIsUpdating(true)
    try {
      const orderId =
        typeof selectedOrderForAction.id === "string"
          ? Number.parseInt(selectedOrderForAction.id, 10)
          : selectedOrderForAction.id

      const updateData: any = {
        status: newStatus,
      }

      if (trackingNumber && trackingNumber.trim()) {
        updateData.tracking_number = trackingNumber.trim()
      }

      if (trackingUrl && trackingUrl.trim()) {
        updateData.tracking_url = trackingUrl.trim()
      }

      if (statusNotes && statusNotes.trim()) {
        updateData.notes = statusNotes.trim()
      }

      await adminService.updateOrderStatus(orderId, updateData)

      toast({
        title: "Success",
        description: "Order status updated successfully",
      })

      // Refresh orders
      fetchOrders()
      setShowStatusUpdate(false)
      resetStatusForm()
    } catch (error: any) {
      console.error("Error updating order status:", error)
      const errorMessage = error.message || "Failed to update order status"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
        duration: 6000,
      })
    } finally {
      setIsUpdating(false)
    }
  }

  // Function to reset status form
  const resetStatusForm = () => {
    setNewStatus("")
    setTrackingNumber("")
    setTrackingUrl("")
    setStatusNotes("")
    setSelectedOrderForAction(null)
  }

  // Function to open status update dialog
  const openStatusUpdate = (order: Order) => {
    setSelectedOrderForAction(order)
    setNewStatus(order.status)
    setTrackingNumber(order.tracking_number || "")
    setTrackingUrl(order.tracking_url || "")
    setStatusNotes(order.notes || "")
    setShowStatusUpdate(true)
  }

  // Function to handle refund
  const handleRefund = async () => {
    if (!selectedOrderForAction || !refundAmount) {
      toast({
        title: "Error",
        description: "Please enter refund amount",
        variant: "destructive",
      })
      return
    }

    setIsUpdating(true)
    try {
      // TODO: Implement refund API call
      await new Promise((resolve) => setTimeout(resolve, 1500)) // Simulate API call

      toast({
        title: "Success",
        description: `Refund of ${formatCurrency(Number.parseFloat(refundAmount))} processed successfully`,
      })

      setShowRefundDialog(false)
      setRefundAmount("")
      setRefundReason("")
      fetchOrders() // Refresh orders
    } catch (error) {
      console.error("Error processing refund:", error)
      toast({
        title: "Error",
        description: "Failed to process refund",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  // Function to print invoice
  const handlePrintInvoiceEnhanced = (order: Order) => {
    window.open(`/admin/orders/${order.id}/invoice`, "_blank")
    toast({
      title: "Opening Invoice",
      description: "Invoice will open in a new tab",
    })
  }

  // Function to send email notification
  const handleSendEmail = async () => {
    if (!selectedOrderForAction || !emailSubject || !emailMessage) {
      toast({
        title: "Error",
        description: "Please fill in all email fields",
        variant: "destructive",
      })
      return
    }

    setSendingEmail(true) // Changed from setIsSendingEmail to setSendingEmail
    try {
      // TODO: Implement actual email API call
      await new Promise((resolve) => setTimeout(resolve, 1500))

      toast({
        title: "Email Sent",
        description: `Email sent successfully to ${selectedOrderForAction.user?.email}`,
      })

      setEmailDialogOpen(false) // Changed from setShowEmailDialog to setEmailDialogOpen
      setEmailSubject("")
      setEmailMessage("")
    } catch (error) {
      console.error("Error sending email:", error)
      toast({
        title: "Error",
        description: "Failed to send email",
        variant: "destructive",
      })
    } finally {
      setSendingEmail(false) // Changed from setIsSendingEmail to setSendingEmail
    }
  }

  // The following function was causing a redeclaration error and has been removed.
  // The functionality is now handled by `sendEmailToCustomer` and `applyEmailTemplate`.
  // const setEmailTemplate = (template: string) => { ... }

  // Function to apply email template
  // This function was duplicated and has been consolidated.
  // const applyEmailTemplate = (template: string) => { ... }

  // Function to open email dialog
  // This function was duplicated and has been consolidated.
  // const openEmailDialog = (order: Order) => { ... }

  const renderOrderTimeline = (order: Order) => {
    const timeline = [
      {
        status: "pending",
        label: "Order Placed",
        date: order.created_at,
        completed: true, // Order is always placed if it exists
      },
      {
        status: "processing",
        label: "Processing",
        date: order.processing_at,
        completed: ["processing", "shipped", "delivered"].includes(order.status),
      },
      {
        status: "shipped",
        label: "Shipped",
        date: order.shipped_at,
        completed: ["shipped", "delivered"].includes(order.status),
      },
      {
        status: "delivered",
        label: "Delivered",
        date: order.delivered_at,
        completed: order.status === "delivered",
      },
    ]

    return (
      <div className="space-y-4">
        {timeline.map((step, index) => (
          <div key={step.status} className="flex items-start gap-4">
            <div className="flex flex-col items-center">
              <div
                className={`h-10 w-10 rounded-full flex items-center justify-center ${
                  step.completed
                    ? "bg-gradient-to-br from-green-500 to-emerald-600 text-white"
                    : "bg-gray-200 text-gray-400"
                }`}
              >
                {step.completed ? <Check className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
              </div>
              {index < timeline.length - 1 && (
                <div className={`w-0.5 h-12 ${step.completed ? "bg-green-500" : "bg-gray-200"}`} />
              )}
            </div>
            <div className="flex-1 pt-2">
              <p className={`font-medium ${step.completed ? "text-gray-900" : "text-gray-400"}`}>{step.label}</p>
              {step.date && <p className="text-sm text-gray-500 mt-1">{formatDate(step.date)}</p>}
            </div>
          </div>
        ))}
      </div>
    )
  }

  const fetchActivityLogs = async (orderId: number | string) => {
    try {
      // TODO: Implement API call to fetch activity logs
      const mockLogs = [
        {
          id: 1,
          action: "Order Created",
          description: "Order was placed by customer",
          user: "System",
          timestamp: new Date().toISOString(),
          type: "info",
        },
        {
          id: 2,
          action: "Payment Received",
          description: "Payment confirmed via Pesapal",
          user: "System",
          timestamp: new Date().toISOString(),
          type: "success",
        },
        {
          id: 3,
          action: "Status Updated",
          description: "Order status changed to Processing",
          user: "Admin User",
          timestamp: new Date().toISOString(),
          type: "info",
        },
      ]
      setActivityLogs(mockLogs)
    } catch (error) {
      console.error("Error fetching activity logs:", error)
    }
  }

  const copyOrderNumber = (orderNumber: string) => {
    navigator.clipboard.writeText(orderNumber)
    toast({
      title: "Copied",
      description: "Order number copied to clipboard",
    })
  }

  const handleOrderStatusChange = useCallback(
    async (orderId: string, newStatus: string) => {
      try {
        const response = await fetch("/api/admin/orders/update-status", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            orderId,
            status: newStatus,
          }),
        })

        if (response.ok) {
          toast({
            title: "Order Updated",
            description: `Order status changed to ${newStatus}`,
          })
          // Refresh the orders list
          await fetchOrders()
          setSelectedOrder(null) // Close modal after update
        } else {
          const errorData = await response.json()
          throw new Error(errorData.message || "Failed to update order status")
        }
      } catch (error: any) {
        console.error("Error updating order status:", error)
        toast({
          title: "Error",
          description: error.message || "Failed to update order status",
          variant: "destructive",
        })
      }
    },
    [toast], // Removed fetchOrders from dependency array
  )

  if (authLoading || !isAuthenticated) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 bg-gradient-to-br from-gray-50 via-white to-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
          Order Management
        </h1>
        <p className="text-gray-600 text-lg">Manage and track all customer orders</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-100 flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" />
              Total Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalItems}</div>
            <p className="text-xs text-blue-100 mt-1">All time orders</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500 to-green-600 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-100 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(stats.revenue)}</div>
            <p className="text-xs text-green-100 mt-1">From all orders</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-yellow-500 to-amber-600 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-100 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pending Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.pending}</div>
            <p className="text-xs text-yellow-100 mt-1">Awaiting processing</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-100 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Processing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.processing}</div>
            <p className="text-xs text-purple-100 mt-1">Currently processing</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Card */}
      <Card className="border-0 shadow-xl">
        <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-white">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <CardTitle className="text-2xl">Orders</CardTitle>
              <CardDescription className="mt-1">View and manage all customer orders</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handleRefresh} variant="outline" size="sm" className="gap-2 bg-transparent">
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
              <Button onClick={() => setShowFilters(!showFilters)} variant="outline" size="sm" className="gap-2">
                <Filter className="h-4 w-4" />
                Filters
              </Button>
              <Button onClick={handleExport} variant="outline" size="sm" className="gap-2 bg-transparent">
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {/* Search and Filters */}
          <div className="flex flex-col gap-4 mb-6">
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="search"
                  placeholder="Search by order number, customer name, or email..."
                  className="pl-10 h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button type="submit" className="h-11 px-6 bg-blue-600 hover:bg-blue-700">
                Search
              </Button>
            </form>

            {showFilters && (
              <div className="flex flex-wrap gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px] bg-white">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="shipped">Shipped</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="returned">Returned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList className="grid w-full grid-cols-7 lg:w-auto lg:inline-grid">
              <TabsTrigger value="all" className="gap-2">
                All
                <Badge variant="secondary" className="ml-1">
                  {orders.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="pending" className="gap-2">
                Pending
                <Badge variant="secondary" className="ml-1">
                  {stats.pending}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="processing" className="gap-2">
                Processing
                <Badge variant="secondary" className="ml-1">
                  {stats.processing}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="shipped" className="gap-2">
                Shipped
                <Badge variant="secondary" className="ml-1">
                  {stats.shipped}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="delivered" className="gap-2">
                Delivered
                <Badge variant="secondary" className="ml-1">
                  {stats.delivered}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="cancelled" className="gap-2">
                Cancelled
                <Badge variant="secondary" className="ml-1">
                  {stats.cancelled}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="returned" className="gap-2">
                Returned
                <Badge variant="secondary" className="ml-1">
                  {stats.returned}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Bulk Actions */}
          {selectedOrders.size > 0 && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
              <span className="text-sm font-medium text-blue-900">
                {selectedOrders.size} order{selectedOrders.size > 1 ? "s" : ""} selected
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  Update Status
                </Button>
                <Button variant="outline" size="sm">
                  Export Selected
                </Button>
                <Button variant="outline" size="sm" onClick={() => setSelectedOrders(new Set())}>
                  Clear Selection
                </Button>
              </div>
            </div>
          )}

          {/* Orders Table */}
          {isLoading ? (
            <div className="flex h-[400px] items-center justify-center">
              <Loader />
            </div>
          ) : (
            <>
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedOrders.size === orders.length && orders.length > 0}
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                      <TableHead className="font-semibold">Order</TableHead>
                      <TableHead className="font-semibold">Customer</TableHead>
                      <TableHead className="font-semibold">Date</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Payment</TableHead>
                      <TableHead className="font-semibold text-right">Total</TableHead>
                      <TableHead className="text-right font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12">
                          <div className="flex flex-col items-center gap-2 text-gray-500">
                            <ShoppingBag className="h-12 w-12 text-gray-300" />
                            <p className="font-medium">No orders found</p>
                            <p className="text-sm">Try adjusting your filters or search query</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredOrders.map((order) => (
                        <TableRow
                          key={order.id}
                          className="hover:bg-gray-50 transition-colors cursor-pointer"
                          onClick={() => viewOrderDetailsEnhanced(order)}
                        >
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedOrders.has(order.id.toString())}
                              onCheckedChange={() => toggleOrderSelection(order.id)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold text-gray-900">{order.order_number}</span>
                              <div className="flex items-center gap-2 mt-1">
                                <div className="flex items-center gap-1">
                                  {order.items && order.items.length > 0 ? (
                                    <>
                                      <div className="flex -space-x-1">
                                        {order.items.slice(0, 3).map((item: any, idx: number) => (
                                          <div
                                            key={idx}
                                            className="h-6 w-6 rounded border border-gray-200 bg-gray-50 overflow-hidden flex-shrink-0"
                                            title={item.product_name || item.name}
                                          >
                                            <img
                                              src={
                                                item.thumbnail_url ||
                                                item.image_url ||
                                                "/placeholder.svg?height=24&width=24&query=product" ||
                                                "/placeholder.svg" ||
                                                "/placeholder.svg"
                                              }
                                              alt={item.product_name || item.name}
                                              className="h-full w-full object-cover"
                                            />
                                          </div>
                                        ))}
                                        {order.items.length > 3 && (
                                          <div className="h-6 w-6 rounded border border-gray-200 bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600 flex-shrink-0">
                                            +{order.items.length - 3}
                                          </div>
                                        )}
                                      </div>
                                      <span className="text-xs text-gray-600 ml-2">
                                        {order.items?.reduce(
                                          (sum: number, item: any) => sum + (item.quantity || 0),
                                          0,
                                        ) || 0}{" "}
                                        item
                                        {order.items?.reduce(
                                          (sum: number, item: any) => sum + (item.quantity || 0),
                                          0,
                                        ) !== 1
                                          ? "s"
                                          : ""}
                                      </span>
                                    </>
                                  ) : (
                                    <span className="text-xs text-gray-500">No items</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-gray-900">{order.user?.name || "Guest"}</span>
                              <span className="text-xs text-gray-500">{order.user?.email || "No email"}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              {formatDate(order.created_at)}
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(order.status)}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                order.payment_status === "paid"
                                  ? "bg-green-50 text-green-700 border-green-200"
                                  : "bg-yellow-50 text-yellow-700 border-yellow-200"
                              }
                            >
                              {order.payment_status || "pending"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold text-gray-900">
                            {formatCurrency(order.total_amount)}
                          </TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => viewOrderDetailsEnhanced(order)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => router.push(`/admin/orders/${order.id}/invoice`)}>
                                  <FileText className="mr-2 h-4 w-4" />
                                  View Invoice
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => openStatusUpdate(order)}>
                                  <Truck className="mr-2 h-4 w-4" />
                                  Update Status
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedOrderForAction(order)
                                    setRefundAmount(order.total_amount?.toString() || order.total?.toString() || "")
                                    setShowRefundDialog(true)
                                  }}
                                >
                                  <RotateCcw className="mr-2 h-4 w-4" />
                                  Process Refund
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <p className="text-sm text-gray-600">
                    Showing {(currentPage - 1) * 20 + 1} to {Math.min(currentPage * 20, totalItems)} of {totalItems}{" "}
                    orders
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum =
                        currentPage <= 3
                          ? i + 1
                          : currentPage >= totalPages - 2
                            ? totalPages - 4 + i
                            : currentPage - 2 + i
                      if (pageNum <= 0 || pageNum > totalPages) return null
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className={currentPage === pageNum ? "bg-blue-600 hover:bg-blue-700" : ""}
                        >
                          {pageNum}
                        </Button>
                      )
                    })}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* CHANGE: Removed AdminOrderDetailModal, EmailDialog, and other dialogs that should now be in the detail page */}
      <Dialog open={showStatusUpdate} onOpenChange={setShowStatusUpdate}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Update Order Status</DialogTitle>
            <DialogDescription>Change the status and add tracking information</DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {selectedOrderForAction && (
              <Alert className="bg-blue-50 border-blue-200">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertTitle className="text-blue-900">Current Status: {selectedOrderForAction.status}</AlertTitle>
                <AlertDescription className="text-blue-700">
                  {selectedOrderForAction.status === "cancelled" ? (
                    "This order is cancelled and cannot be changed."
                  ) : selectedOrderForAction.status === "delivered" ? (
                    "This order is delivered. You can only change it to 'returned' if needed."
                  ) : (
                    <>
                      Valid next steps:{" "}
                      <span className="font-semibold">
                        {getValidNextStatuses(selectedOrderForAction.status).join(", ") || "None"}
                      </span>
                    </>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="status">Order Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger id="status" className="h-11">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="returned">Returned</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(newStatus === "shipped" || newStatus === "delivered") && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="tracking">Tracking Number</Label>
                  <Input
                    id="tracking"
                    placeholder="Enter tracking number"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="trackingUrl">Tracking URL (Optional)</Label>
                  <Input
                    id="trackingUrl"
                    placeholder="https://tracking.example.com/..."
                    value={trackingUrl}
                    onChange={(e) => setTrackingUrl(e.target.value)}
                    className="h-11"
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any notes about this status update..."
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleStatusUpdate}
                disabled={isUpdating || !newStatus}
                className="flex-1 h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Update Status
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowStatusUpdate(false)
                  resetStatusForm()
                }}
                disabled={isUpdating}
                className="flex-1 h-11"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showRefundDialog} onOpenChange={setShowRefundDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Process Refund</DialogTitle>
            <DialogDescription>Issue a full or partial refund for this order</DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <AlertCircleIcon className="h-4 w-4 inline mr-2" />
                This action cannot be undone. Please verify the refund amount before proceeding.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="refundAmount">Refund Amount</Label>
              <Input
                id="refundAmount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                className="h-11"
              />
              {selectedOrderForAction && (
                <p className="text-sm text-gray-500">
                  Order total: {formatCurrency(selectedOrderForAction.total_amount || selectedOrderForAction.total)}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="refundReason">Reason for Refund</Label>
              <Textarea
                id="refundReason"
                placeholder="Explain why this refund is being issued..."
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleRefund}
                disabled={isUpdating || !refundAmount}
                className="flex-1 h-11 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Process Refund
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowRefundDialog(false)
                  setRefundAmount("")
                  setRefundReason("")
                }}
                disabled={isUpdating}
                className="flex-1 h-11"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showNotesDialog} onOpenChange={setShowNotesDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Edit Order Notes</DialogTitle>
            <DialogDescription>Add or update notes for this order</DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="orderNotes">Order Notes</Label>
              <Textarea
                id="orderNotes"
                placeholder="Add notes about this order..."
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                rows={6}
                className="resize-none"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={() => {
                  // TODO: Implement save notes API call
                  toast({
                    title: "Success",
                    description: "Order notes updated successfully",
                  })
                  setShowNotesDialog(false)
                }}
                className="flex-1 h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                <Check className="mr-2 h-4 w-4" />
                Save Notes
              </Button>
              <Button variant="outline" onClick={() => setShowNotesDialog(false)} className="flex-1 h-11">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
