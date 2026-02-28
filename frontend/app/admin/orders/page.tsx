import OrdersPageContent from "./orders-page-content"

// Since admin auth is client-side managed (localStorage),
// we render the client component which will fetch data with proper auth
export default function OrdersPage() {
  return <OrdersPageContent />
}

