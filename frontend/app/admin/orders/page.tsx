import OrdersPageContent from "./orders-page-content"

/**
 * Orders management page - Instant rendering without loaders
 */
export const metadata = {
  title: "Order Management | Mizizzi Admin",
  description: "Manage and track all customer orders",
}

export default function OrdersPage() {
  return <OrdersPageContent />
}

