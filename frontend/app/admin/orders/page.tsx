import { getAllOrders } from "@/lib/server/get-all-orders"
import OrdersClient from "./orders-client"
import type { Order } from "@/types"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Order Management | Admin Dashboard",
  description: "Manage and track all customer orders",
}

export const revalidate = 60 // ISR: revalidate every 60 seconds

export default async function OrderManagementPage() {
  let initialOrders: Order[] = []
  let initialStats = {
    total: 0,
    pending: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
    revenue: 0,
  }
  let error: string | null = null

  try {
    // Fetch orders server-side for instant rendering
    const data = await getAllOrders(100, 1, true)
    initialOrders = data.orders || []
    initialStats = data.stats || initialStats
  } catch (err: any) {
    console.error("Error fetching orders:", err)
    error = err?.message || "Failed to load orders"
  }

  return <OrdersClient initialOrders={initialOrders} initialStats={initialStats} />
}
