import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { orderService } from "@/services/orders"
import { imageBatchService } from "@/services/image-batch-service"
import type { Order, ProductImage } from "@/types"
import { AlertCircle } from "lucide-react"
import { OrderHeader } from "./order/order-header"
import { OrderItems } from "./order/order-items"
import { OrderTimeline } from "./order/order-timeline"
import { OrderPaymentInfo } from "./order/order-payment-info"
import { OrderDeliveryInfo } from "./order/order-delivery-info"
import { OrderSupportActions } from "./order/order-support-actions"
import { OrderSkeleton } from "./order/order-skeleton"
import { Loader } from "@/components/ui/loader"

interface OrderDetailsSectionProps {
  orderId: string
}

export function OrderDetailsSection({ orderId }: OrderDetailsSectionProps) {
  const router = useRouter()
  const { toast } = useToast()

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [productImages, setProductImages] = useState<Record<string, ProductImage[]>>({})
  const [isCancelling, setIsCancelling] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails()
    }
  }, [orderId])

  const fetchOrderDetails = async () => {
    try {
      setLoading(true)
      setError(null)
      const orderData = await orderService.getOrderById(orderId)

      if (!orderData) {
        setError("Order not found")
        return
      }

      setOrder(orderData)

      if (orderData.items && orderData.items.length > 0) {
        const imagesMap: Record<string, ProductImage[]> = {}

        for (const item of orderData.items) {
          if (item.product_id) {
            try {
              const cachedImages = imageBatchService.getCachedImages(String(item.product_id))
              if (cachedImages && cachedImages.length > 0) {
                imagesMap[item.product_id] = cachedImages
              } else {
                const images = await imageBatchService.fetchProductImages(String(item.product_id))
                if (images && images.length > 0) {
                  imagesMap[item.product_id] = images
                }
              }
            } catch (imgError) {
              console.error("Error fetching images:", imgError)
            }
          }
        }

        setProductImages(imagesMap)
      }
    } catch (err: any) {
      console.error("Error fetching order details:", err)
      setError(err.message || "Failed to load order details")
    } finally {
      setLoading(false)
    }
  }

  const handleCancelOrder = async () => {
    if (!order) return

    setIsCancelling(true)
    setCancelError(null)

    try {
      console.log("[v0] Cancelling order:", orderId)
      const success = await orderService.cancelOrder(orderId, "Customer requested cancellation")

      if (success) {
        toast({
          title: "Order Cancelled",
          description: "Your order has been successfully cancelled.",
        })
        // Update local order state
        setOrder({ ...order, status: "cancelled" })
        // Refresh order details to get latest data
        await fetchOrderDetails()
      } else {
        throw new Error("Failed to cancel order")
      }
    } catch (err: any) {
      console.error("[v0] Error cancelling order:", err)
      const errorMessage = err.message || "Failed to cancel order. Please try again."
      setCancelError(errorMessage)
      toast({
        title: "Cancellation Failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsCancelling(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader />
      </div>
    )
  }

  if (error || !order) {
    return (
      <Alert variant="destructive" className="border-red-200 bg-red-50 rounded-2xl">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error || "Order not found"}</AlertDescription>
      </Alert>
    )
  }

  const orderItems = order.items || []
  const itemCount = orderItems.length
  const subtotal = order.subtotal || 0
  const shipping = order.shipping || order.shipping_cost || 0
  const tax = order.tax || 0
  const total = order.total || order.total_amount || 0

  const getStatusLabel = (status: string) => {
    const statusLower = status?.toLowerCase() || ""
    const statusMap: Record<string, string> = {
      pending: "Pending",
      confirmed: "Confirmed",
      processing: "Processing",
      shipped: "Shipped",
      delivered: "Delivered",
      cancelled: "Cancelled",
      returned: "Returned",
    }
    return statusMap[statusLower] || status || "Unknown"
  }

  const statusLabel = getStatusLabel(order.status)

  const isCashOnDelivery =
    order.payment_method?.toLowerCase().includes("cash") ||
    order.payment_method?.toLowerCase().includes("cod") ||
    order.payment_method?.toLowerCase().includes("delivery")
  const canCancelOrder =
    isCashOnDelivery && ["pending", "confirmed", "processing"].includes(order.status?.toLowerCase() || "")

  return (
    <div className="space-y-4 pb-8">
      {cancelError && (
        <Alert variant="destructive" className="border-red-200 bg-red-50 rounded-xl animate-in slide-in-from-top">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{cancelError}</AlertDescription>
        </Alert>
      )}


      {/* Order Header */}
      <OrderHeader
        order={order}
        itemCount={itemCount}
        total={total}
        onCancelOrder={isCancelling ? undefined : handleCancelOrder}
      />

      {/* Items in Order */}
      <OrderItems items={orderItems} productImages={productImages} />

      {/* Order Tracking Timeline */}
      <OrderTimeline order={order} status={order.status} />

      {/* Payment and Delivery Info - Two Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <OrderPaymentInfo
          paymentMethod={order.payment_method ?? ""}
          subtotal={subtotal}
          shipping={shipping}
          tax={tax}
          total={total}
        />
        <OrderDeliveryInfo order={order} statusLabel={statusLabel} />
      </div>

      {/* Support Actions */}
      <OrderSupportActions
        orderId={order.order_number || orderId}
        paymentMethod={order.payment_method}
        items={orderItems}
        onCancelOrder={handleCancelOrder}
        canCancel={canCancelOrder && !isCancelling}
      />
    </div>
  )
}
