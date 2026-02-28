"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  BarChart3,
  Users,
  ShoppingCart,
  Package,
  TrendingUp,
  RefreshCw,
  Download,
  AlertTriangle,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Truck,
  MessageSquare,
  ArrowRight,
  Clock,
  AlertCircle,
} from "lucide-react"
import { useAdminAuth } from "@/contexts/admin/auth-context"
import { Loader } from "@/components/ui/loader"
import { adminService } from "@/services/admin"
import { toast } from "@/components/ui/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"

interface AdminDashboardResponse {
  counts: {
    users: number
    products: number
    orders: number
    categories: number
    brands: number
    reviews: number
    pending_reviews: number
    newsletter_subscribers: number
    new_signups_today: number
    new_signups_week: number
    orders_in_transit: number
    pending_payments: number
    low_stock_count: number
    total_active_sessions?: number
    total_sales_channels?: number
  }
  sales: {
    today: number
    yesterday: number
    weekly: number
    monthly: number
    yearly: number
    total_revenue: number
    pending_amount: number
    average_order_value?: number
    net_profit?: number
  }
  order_status: Record<string, number>
  recent_orders: any[]
  recent_users: any[]
  recent_activities: any[]
  low_stock_products: any[]
  sales_by_category: any[]
  best_selling_products: any[]
  traffic_sources: any[]
  notifications: any[]
  upcoming_events: any[]
  users_by_region: any[]
  revenue_vs_refunds: any[]
  active_users: any[]
  sales_data: any[]
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const { user, isLoading, isAuthenticated } = useAdminAuth()
  const [dashboardData, setDashboardData] = useState<AdminDashboardResponse | null>(null)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setIsRefreshing(true)
      setError(null)
      const data = await adminService.getDashboardData()
      setDashboardData(data)
    } catch (err: any) {
      const errorMsg = err.message || "Failed to load dashboard data"
      setError(errorMsg)
      console.error("[v0] Dashboard error:", errorMsg)
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
      })
    } finally {
      setIsLoadingData(false)
      setIsRefreshing(false)
    }
  }

  // Load data when authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      fetchDashboardData()
    }
  }, [isAuthenticated, isLoading])

  // Redirect if not authenticated
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="text-center">
          <Loader />
          <p className="mt-2 text-sm text-gray-600">Loading admin panel...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto" />
          <p className="mt-2 text-sm text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  const data = dashboardData || adminService.getDefaultDashboardData()

  // Calculate growth
  const salesGrowth = data.sales.yesterday > 0 
    ? Math.round(((data.sales.today - data.sales.yesterday) / data.sales.yesterday) * 100)
    : 0

  // Get order status counts
  const orderStatusEntries = Object.entries(data.order_status || {}).map(([status, count]) => ({
    status,
    count: count as number,
  }))

  return (
    <div className="min-h-screen bg-white w-full">
      <div className="w-full p-3 sm:p-4 md:p-6 lg:p-8 space-y-6 md:space-y-8">
        {/* Header Section */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex-1">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
            <p className="text-sm md:text-base text-gray-600 mt-2 font-medium">
              Welcome back, {user?.name || "Admin"}. Here's your store overview.
            </p>
            <div className="flex flex-wrap items-center gap-3 md:gap-4 text-xs md:text-sm text-gray-500 mt-3">
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${error ? "bg-red-500" : "bg-green-500"}`}></div>
                <span className="font-medium">System {error ? "error" : "healthy"}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                <span>{new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchDashboardData}
              disabled={isRefreshing}
              className="rounded-lg text-xs h-8 sm:h-9 md:h-10 border-gray-300 hover:bg-gray-50 font-medium"
            >
              <RefreshCw className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              <span className="ml-1 hidden sm:inline">Refresh</span>
            </Button>
            <Button
              size="sm"
              onClick={() => router.push("/admin/reports")}
              className="rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-xs h-8 sm:h-9 md:h-10 font-medium"
            >
              <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="ml-1 hidden sm:inline">Export</span>
            </Button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert className="border-red-200 bg-red-50 rounded-lg">
            <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
            <AlertDescription className="text-red-800 text-sm ml-3">
              <strong>Error:</strong> {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {isLoadingData ? (
          <div className="flex h-96 items-center justify-center">
            <div className="text-center">
              <Loader />
              <p className="mt-3 text-sm text-gray-600 font-medium">Loading dashboard data...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6 md:space-y-8">
            {/* Primary KPI Cards - Responsive Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {/* Total Revenue Card */}
              <Card className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200">
                <CardHeader className="p-4 md:p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardDescription className="text-gray-600 text-xs md:text-sm font-bold uppercase tracking-wider">
                        Total Revenue
                      </CardDescription>
                      <CardTitle className="text-2xl md:text-3xl font-bold text-gray-900 mt-2">
                        ${(data.sales.total_revenue / 1000000).toFixed(1)}M
                      </CardTitle>
                    </div>
                    <div className="bg-blue-50 p-2.5 md:p-3 rounded-lg flex-shrink-0 ml-3">
                      <DollarSign className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
                    </div>
                  </div>
                  {data.sales.pending_amount > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-600">Pending: ${(data.sales.pending_amount / 1000).toFixed(1)}K</p>
                    </div>
                  )}
                </CardHeader>
              </Card>

              {/* Today's Sales Card */}
              <Card className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200">
                <CardHeader className="p-4 md:p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardDescription className="text-gray-600 text-xs md:text-sm font-bold uppercase tracking-wider">
                        Today's Sales
                      </CardDescription>
                      <CardTitle className="text-2xl md:text-3xl font-bold text-gray-900 mt-2">
                        ${(data.sales.today / 1000).toFixed(1)}K
                      </CardTitle>
                    </div>
                    <div className="bg-green-50 p-2.5 md:p-3 rounded-lg flex-shrink-0 ml-3">
                      <TrendingUp className="h-5 w-5 md:h-6 md:w-6 text-green-600" />
                    </div>
                  </div>
                  {salesGrowth !== 0 && (
                    <div className={`flex items-center gap-1.5 mt-3 pt-3 border-t border-gray-200 text-xs font-semibold ${salesGrowth >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {salesGrowth >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                      <span>{Math.abs(salesGrowth)}% vs yesterday</span>
                    </div>
                  )}
                </CardHeader>
              </Card>

              {/* Total Orders Card */}
              <Card className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200">
                <CardHeader className="p-4 md:p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardDescription className="text-gray-600 text-xs md:text-sm font-bold uppercase tracking-wider">
                        Total Orders
                      </CardDescription>
                      <CardTitle className="text-2xl md:text-3xl font-bold text-gray-900 mt-2">
                        {data.counts.orders.toLocaleString()}
                      </CardTitle>
                    </div>
                    <div className="bg-orange-50 p-2.5 md:p-3 rounded-lg flex-shrink-0 ml-3">
                      <ShoppingCart className="h-5 w-5 md:h-6 md:w-6 text-orange-600" />
                    </div>
                  </div>
                  {data.counts.orders_in_transit > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs text-orange-600 font-medium">{data.counts.orders_in_transit} in transit</p>
                    </div>
                  )}
                </CardHeader>
              </Card>

              {/* Total Customers Card */}
              <Card className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200">
                <CardHeader className="p-4 md:p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardDescription className="text-gray-600 text-xs md:text-sm font-bold uppercase tracking-wider">
                        Total Customers
                      </CardDescription>
                      <CardTitle className="text-2xl md:text-3xl font-bold text-gray-900 mt-2">
                        {data.counts.users.toLocaleString()}
                      </CardTitle>
                    </div>
                    <div className="bg-purple-50 p-2.5 md:p-3 rounded-lg flex-shrink-0 ml-3">
                      <Users className="h-5 w-5 md:h-6 md:w-6 text-purple-600" />
                    </div>
                  </div>
                  {data.counts.new_signups_today > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs text-purple-600 font-medium">+{data.counts.new_signups_today} new today</p>
                    </div>
                  )}
                </CardHeader>
              </Card>
            </div>

            {/* Secondary Metrics - 4 Column Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {/* Products */}
              <Card className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
                <CardHeader className="p-4 md:p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardDescription className="text-gray-600 text-xs md:text-sm font-bold uppercase tracking-wider">
                        Products
                      </CardDescription>
                      <CardTitle className="text-2xl md:text-3xl font-bold text-gray-900 mt-2">
                        {data.counts.products.toLocaleString()}
                      </CardTitle>
                    </div>
                    <div className="bg-cyan-50 p-2.5 md:p-3 rounded-lg flex-shrink-0 ml-3">
                      <Package className="h-5 w-5 md:h-6 md:w-6 text-cyan-600" />
                    </div>
                  </div>
                  {data.counts.low_stock_count > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <Badge className="text-xs font-medium bg-red-100 text-red-700 border-0">{data.counts.low_stock_count} low stock</Badge>
                    </div>
                  )}
                </CardHeader>
              </Card>

              {/* Categories */}
              <Card className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
                <CardHeader className="p-4 md:p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardDescription className="text-gray-600 text-xs md:text-sm font-bold uppercase tracking-wider">
                        Categories
                      </CardDescription>
                      <CardTitle className="text-2xl md:text-3xl font-bold text-gray-900 mt-2">
                        {data.counts.categories}
                      </CardTitle>
                    </div>
                    <div className="bg-emerald-50 p-2.5 md:p-3 rounded-lg flex-shrink-0 ml-3">
                      <BarChart3 className="h-5 w-5 md:h-6 md:w-6 text-emerald-600" />
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-600 font-medium">{data.counts.brands} brands</p>
                  </div>
                </CardHeader>
              </Card>

              {/* Pending Orders */}
              <Card className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
                <CardHeader className="p-4 md:p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardDescription className="text-gray-600 text-xs md:text-sm font-bold uppercase tracking-wider">
                        Pending
                      </CardDescription>
                      <CardTitle className="text-2xl md:text-3xl font-bold text-gray-900 mt-2">
                        {data.counts.pending_payments}
                      </CardTitle>
                    </div>
                    <div className="bg-red-50 p-2.5 md:p-3 rounded-lg flex-shrink-0 ml-3">
                      <AlertTriangle className="h-5 w-5 md:h-6 md:w-6 text-red-600" />
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs text-red-600 font-medium">Needs attention</p>
                  </div>
                </CardHeader>
              </Card>

              {/* Newsletter Subscribers */}
              <Card className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
                <CardHeader className="p-4 md:p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardDescription className="text-gray-600 text-xs md:text-sm font-bold uppercase tracking-wider">
                        Subscribers
                      </CardDescription>
                      <CardTitle className="text-2xl md:text-3xl font-bold text-gray-900 mt-2">
                        {(data.counts.newsletter_subscribers / 1000).toFixed(1)}K
                      </CardTitle>
                    </div>
                    <div className="bg-yellow-50 p-2.5 md:p-3 rounded-lg flex-shrink-0 ml-3">
                      <MessageSquare className="h-5 w-5 md:h-6 md:w-6 text-yellow-600" />
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-600">+{data.counts.new_signups_week} this week</p>
                  </div>
                </CardHeader>
              </Card>
            </div>

            {/* Recent Orders Section */}
            {data.recent_orders && data.recent_orders.length > 0 && (
              <Card className="bg-white border border-gray-200 rounded-xl shadow-sm">
                <CardHeader className="p-4 md:p-5 border-b border-gray-200">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg md:text-xl font-bold text-gray-900">Recent Orders</CardTitle>
                      <CardDescription className="text-xs md:text-sm text-gray-600 mt-1">Latest customer transactions</CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push("/admin/orders")}
                      className="text-xs h-8 md:h-9 text-gray-700 hover:bg-gray-100 font-medium w-full sm:w-auto"
                    >
                      View All
                      <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-4 md:p-5">
                  <div className="space-y-2">
                    {data.recent_orders.slice(0, 5).map((order) => (
                      <div key={order.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 md:p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm md:text-base text-gray-900 truncate">{order.order_number || order.id}</p>
                          <p className="text-xs text-gray-600 truncate mt-1">{order.user_email || "Customer"}</p>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="font-bold text-sm md:text-base text-gray-900">${parseFloat(order.total_amount || 0).toFixed(2)}</span>
                          <Badge variant="outline" className="text-xs capitalize bg-white">{order.status || "pending"}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Customers Section */}
            {data.recent_users && data.recent_users.length > 0 && (
              <Card className="bg-white border border-gray-200 rounded-xl shadow-sm">
                <CardHeader className="p-4 md:p-5 border-b border-gray-200">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg md:text-xl font-bold text-gray-900">Recent Customers</CardTitle>
                      <CardDescription className="text-xs md:text-sm text-gray-600 mt-1">New registrations</CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push("/admin/customers")}
                      className="text-xs h-8 md:h-9 text-gray-700 hover:bg-gray-100 font-medium w-full sm:w-auto"
                    >
                      View All
                      <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-4 md:p-5">
                  <div className="space-y-2">
                    {data.recent_users.slice(0, 5).map((user) => (
                      <div key={user.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 md:p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm md:text-base text-gray-900 truncate">{user.name || user.username}</p>
                          <p className="text-xs text-gray-600 truncate mt-1">{user.email}</p>
                        </div>
                        <Badge variant="outline" className="text-xs bg-white flex-shrink-0">Customer</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Low Stock Products Alert */}
            {data.low_stock_products && data.low_stock_products.length > 0 && (
              <Card className="bg-white border border-orange-200 rounded-xl shadow-sm">
                <CardHeader className="p-4 md:p-5 border-b border-orange-200 bg-orange-50">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <CardTitle className="text-lg md:text-xl font-bold text-gray-900">Low Stock Alert</CardTitle>
                        <CardDescription className="text-xs md:text-sm text-gray-600 mt-1">{data.counts.low_stock_count} products need restocking</CardDescription>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push("/admin/inventory")}
                      className="text-xs h-8 md:h-9 text-orange-700 hover:bg-orange-100 font-medium"
                    >
                      Manage Inventory
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-4 md:p-5">
                  <div className="space-y-2">
                    {data.low_stock_products.slice(0, 5).map((product) => (
                      <div key={product.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 md:p-4 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors border border-orange-200 gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm md:text-base text-gray-900 truncate">{product.name}</p>
                          <p className="text-xs text-gray-600 mt-1">SKU: {product.sku}</p>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0 text-right">
                          <div>
                            <p className="font-bold text-sm md:text-base text-orange-600">{product.stock || 0}</p>
                            <p className="text-xs text-gray-600">in stock</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Activity */}
            {data.recent_activities && data.recent_activities.length > 0 && (
              <Card className="bg-white border border-gray-200 rounded-xl shadow-sm">
                <CardHeader className="p-4 md:p-5 border-b border-gray-200">
                  <div className="flex items-start gap-3">
                    <Activity className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <CardTitle className="text-lg md:text-xl font-bold text-gray-900">Recent Activity</CardTitle>
                      <CardDescription className="text-xs md:text-sm text-gray-600 mt-1">Live feed of store events</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 md:p-5">
                  <div className="space-y-3">
                    {data.recent_activities.slice(0, 8).map((activity, idx) => (
                      <div key={activity.id || idx} className={`flex items-start gap-3 pb-3 ${idx < data.recent_activities.length - 1 ? "border-b border-gray-200" : ""}`}>
                        <div className="bg-blue-100 p-2 rounded-lg flex-shrink-0 mt-0.5">
                          <Activity className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900">{activity.message || activity.description}</p>
                          <p className="text-xs text-gray-600 mt-1">
                            {activity.timestamp 
                              ? new Date(activity.timestamp).toLocaleString()
                              : activity.time || "Just now"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Order Status Distribution */}
            {orderStatusEntries.length > 0 && (
              <Card className="bg-white border border-gray-200 rounded-xl shadow-sm">
                <CardHeader className="p-4 md:p-5 border-b border-gray-200">
                  <CardTitle className="text-lg md:text-xl font-bold text-gray-900">Order Status Distribution</CardTitle>
                  <CardDescription className="text-xs md:text-sm text-gray-600 mt-1">Current order breakdown by status</CardDescription>
                </CardHeader>
                <CardContent className="p-4 md:p-5">
                  <div className="space-y-4">
                    {orderStatusEntries.map(({ status, count }) => (
                      <div key={status}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-gray-700 capitalize">{status.replace(/_/g, " ")}</span>
                          <span className="text-sm font-bold text-gray-900">{count}</span>
                        </div>
                        <Progress value={Math.min((count / (data.counts.orders || 1)) * 100, 100)} className="h-2 bg-gray-200" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Best Selling Products */}
            {data.best_selling_products && data.best_selling_products.length > 0 && (
              <Card className="bg-white border border-gray-200 rounded-xl shadow-sm">
                <CardHeader className="p-4 md:p-5 border-b border-gray-200">
                  <CardTitle className="text-lg md:text-xl font-bold text-gray-900">Top Selling Products</CardTitle>
                  <CardDescription className="text-xs md:text-sm text-gray-600 mt-1">Your best performers this period</CardDescription>
                </CardHeader>
                <CardContent className="p-4 md:p-5">
                  <div className="space-y-2">
                    {data.best_selling_products.slice(0, 5).map((product, idx) => (
                      <div key={product.id || idx} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 md:p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm md:text-base text-gray-900 truncate">{product.name}</p>
                          <p className="text-xs text-gray-600 mt-1">{product.sales_count || 0} sales</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-bold text-sm md:text-base text-gray-900">${parseFloat(product.revenue || 0).toFixed(0)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* No Data Message */}
            {!dashboardData && (
              <Alert className="border-yellow-200 bg-yellow-50 rounded-lg">
                <AlertCircle className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                <AlertDescription className="text-yellow-800 text-sm ml-3">
                  <strong>Note:</strong> Using default data. Please refresh to load live API data.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
