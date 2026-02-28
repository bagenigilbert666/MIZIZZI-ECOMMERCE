import { Suspense } from "react"
import OrdersPageContent from "./orders-page-content"
import { fetchOrdersSSR } from "./actions"

/**
 * Orders management page - Server-Side Rendered
 * Fetches data server-side using cookies for authentication
 */
export const metadata = {
  title: "Order Management | Mizizzi Admin",
  description: "Manage and track all customer orders",
}

async function OrdersContent() {
  // Fetch orders server-side
  const initialData = await fetchOrdersSSR({
    page: 1,
    per_page: 20,
  })

  return <OrdersPageContent initialData={initialData} />
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading orders...</div>}>
      <OrdersContent />
    </Suspense>
  )
}

