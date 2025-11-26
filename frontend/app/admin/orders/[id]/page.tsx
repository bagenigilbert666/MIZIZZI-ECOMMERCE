"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Loader } from "@/components/ui/loader"
import { toast } from "@/components/ui/use-toast"
import { adminService } from "@/services/admin"
import { useAdminAuth } from "@/contexts/admin/auth-context"
import { Card, CardContent } from "@/components/ui/card"
import { formatDate } from "@/lib/utils"
import { AdminOrderItemsSection } from "@/components/admin/orders/admin-order-items-section"
import { AdminOrderCustomerSection } from "@/components/admin/orders/admin-order-customer-section"
import { AdminOrderPaymentSection } from "@/components/admin/orders/admin-order-payment-section"
import { AdminOrderStatusSection } from "@/components/admin/orders/admin-order-status-section"
import { AdminOrderProcessingTimeline } from "@/components/admin/orders/admin-order-processing-timeline"
import { AdminOrderActions } from "@/components/admin/orders/admin-order-actions"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function OrderDetailPage() {
  const { isAuthenticated, isLoading: authLoading } = useAdminAuth()
  const router = useRouter()
  const params = useParams() as { id: string }
  const orderId = params.id

  const [order, setOrder] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/admin/login")
    }
  }, [isAuthenticated, authLoading, router])

  // Fetch order details
  useEffect(() => {
    if (!orderId || !isAuthenticated) return

    const fetchOrderDetails = async () => {
      try {
        setIsLoading(true)
        const response = await adminService.getOrderDetails(orderId)
        setOrder(response)
      } catch (error) {
        console.error("Failed to fetch order details:", error)
        toast({
          title: "Error",
          description: "Failed to load order details. Please try again.",
          variant: "destructive",
        })
        router.push("/admin/orders")
      } finally {
        setIsLoading(false)
      }
    }

    fetchOrderDetails()
  }, [orderId, isAuthenticated, router])

  if (authLoading || !isAuthenticated) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="flex flex-col gap-4 md:gap-6 px-3 md:px-6 py-4 min-h-screen">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl md:text-2xl font-bold">Order Not Found</h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Order Not Found</AlertTitle>
              <AlertDescription>
                The order you're looking for doesn't exist or you don't have permission to view it.
              </AlertDescription>
            </Alert>
            <Button className="mt-4" onClick={() => router.push("/admin/orders")}>
              Back to Orders
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 md:gap-6 px-3 md:px-6 py-3 md:py-4 bg-gradient-to-br from-gray-50 via-white to-gray-50 min-h-screen">
      {/* Header with Back Button */}
      <div className="flex items-center gap-2 md:gap-3">
        <Button variant="outline" size="icon" onClick={() => router.back()} className="h-9 w-9 md:h-10 md:w-10">
          <ArrowLeft className="h-4 w-4 md:h-5 md:w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl md:text-3xl font-bold tracking-tight truncate">Order {order.order_number}</h1>
          <p className="text-xs md:text-sm text-gray-600 mt-0.5 md:mt-1">Placed on {formatDate(order.created_at)}</p>
        </div>
        <div className="hidden md:block">
          <AdminOrderActions order={order} />
        </div>
      </div>

      {/* Mobile Actions */}
      <div className="md:hidden">
        <AdminOrderActions order={order} />
      </div>

      {/* Main Grid Layout - Now fully responsive */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-6">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-3 md:space-y-6">
          {/* Order Items */}
          <AdminOrderItemsSection items={order.items || order.order_items || []} order={order} productImages={{}} />

          {/* Customer Information */}
          <AdminOrderCustomerSection order={order} />

          {/* Payment Information */}
          <AdminOrderPaymentSection order={order} />
        </div>

        {/* Right Column - Status & Timeline */}
        <div className="space-y-3 md:space-y-6">
          {/* Status Update Section */}
          <AdminOrderStatusSection
            order={order}
            onUpdate={() => {
              const fetchUpdatedOrder = async () => {
                try {
                  const response = await adminService.getOrderDetails(orderId)
                  setOrder(response)
                } catch (error) {
                  console.error("Failed to refresh order:", error)
                }
              }
              fetchUpdatedOrder()
            }}
          />

          {/* Processing Timeline */}
          <AdminOrderProcessingTimeline order={order} />
        </div>
      </div>
    </div>
  )
}
