"use client"

import { useEffect } from "react"
import { useSocket } from "@/contexts/socket-context"
import { useNotifications } from "@/contexts/notification/notification-context"

export function SocketNotificationHandler() {
  const { isConnected, subscribe } = useSocket()
  const { addNotification } = useNotifications()

  useEffect(() => {
    if (!isConnected) return

    // Clean up function to store unsubscribe functions
    const unsubscribeFunctions: (() => void)[] = []

    // Handle product updates
    const handleProductUpdate = (data: any) => {
      addNotification({
        title: "Product Updated",
        description: `Product #${data.product_id} has been updated.`,
        type: "product_update",
        priority: "low",
      })
    }

    // Handle order updates
    const handleOrderUpdate = (data: any) => {
      addNotification({
        title: "Order Status Updated",
        description: `Order #${data.order_id} status changed to ${data.status}.`,
        type: "order",
        link: `/orders/${data.order_id}`,
        priority: "low",
      })
    }

    // Handle inventory updates
    const handleInventoryUpdate = (data: any) => {
      // Only show notification if stock is low
      if (data.stock_level <= 5) {
        addNotification({
          title: "Low Stock Alert",
          description: `Product #${data.product_id} has only ${data.stock_level} items left.`,
          type: "stock_alert",
          priority: "high",
          badge: "Urgent",
        })
      }
    }

    // Handle flash sale notifications
    const handleFlashSale = (data: any) => {
      addNotification({
        title: "Flash Sale Started!",
        description: data.sale_data?.description || "Check out our limited-time offers!",
        type: "promotion",
        priority: "low",
        badge: "Limited Time",
      })
    }

    // Handle general notifications
    const handleNotification = (data: any) => {
      addNotification({
        title: data.type || "Notification",
        description: data.message,
        type: data.type === "error" ? "system" : "system",
        priority: data.type === "error" ? "high" : "low",
      })
    }

    // Register event listeners
    unsubscribeFunctions.push(subscribe("product_updated", handleProductUpdate))
    unsubscribeFunctions.push(subscribe("order_updated", handleOrderUpdate))
    unsubscribeFunctions.push(subscribe("inventory_updated", handleInventoryUpdate))
    unsubscribeFunctions.push(subscribe("flash_sale_started", handleFlashSale))
    unsubscribeFunctions.push(subscribe("notification", handleNotification))

    // Clean up on unmount
    return () => {
      unsubscribeFunctions.forEach((unsubscribe) => unsubscribe())
    }
  }, [isConnected, subscribe, addNotification])

  return null
}
