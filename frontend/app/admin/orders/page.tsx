import { redirect } from "next/navigation"
import OrdersPageContent from "./orders-page-content"

/**
 * Orders management page
 * Renders the client component which handles authentication and data fetching
 */
export const metadata = {
  title: "Order Management | Mizizzi Admin",
  description: "Manage and track all customer orders",
}

export default function OrdersPage() {
  // This page is client-rendered because admin auth is stored in localStorage
  // The OrdersPageContent component handles fetching data with proper authentication
  return <OrdersPageContent />
}

