import { AlertCircleIcon, CheckCircle2, Truck, Package, Clock, MapPin } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface OrderProcessingGuideProps {
  status: string
  paymentStatus: string
}

export function OrderProcessingGuide({ status, paymentStatus }: OrderProcessingGuideProps) {
  const steps = [
    {
      id: "payment",
      icon: <CheckCircle2 className="h-5 w-5" />,
      title: "Verify Payment",
      description: "Ensure payment is confirmed before processing",
      action: "Check payment status is marked as 'paid'",
      completed: paymentStatus === "paid",
      color: paymentStatus === "paid" ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200",
    },
    {
      id: "processing",
      icon: <Package className="h-5 w-5" />,
      title: "Mark as Processing",
      description: "Update status when order preparation begins",
      action: "Click 'Update Status' → Select 'Processing' → Save",
      completed: ["processing", "shipped", "delivered"].includes(status),
      color: ["processing", "shipped", "delivered"].includes(status)
        ? "bg-green-50 border-green-200"
        : "bg-gray-50 border-gray-200",
    },
    {
      id: "pack",
      icon: <Package className="h-5 w-5" />,
      title: "Pack Items",
      description: "Pick all items from inventory and pack securely",
      action: "Verify all items listed, pack with care instructions",
      completed: ["processing", "shipped", "delivered"].includes(status),
      color: ["processing", "shipped", "delivered"].includes(status)
        ? "bg-green-50 border-green-200"
        : "bg-gray-50 border-gray-200",
    },
    {
      id: "shipping",
      icon: <Truck className="h-5 w-5" />,
      title: "Arrange Shipping",
      description: "Generate label and hand off to carrier",
      action: "Get tracking number and update status to 'Shipped'",
      completed: ["shipped", "delivered"].includes(status),
      color: ["shipped", "delivered"].includes(status) ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200",
    },
    {
      id: "deliver",
      icon: <MapPin className="h-5 w-5" />,
      title: "Delivery",
      description: "Monitor delivery and confirm receipt",
      action: "Update status to 'Delivered' once confirmed by carrier",
      completed: status === "delivered",
      color: status === "delivered" ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200",
    },
  ]

  return (
    <Card className="border border-gray-200/60 shadow-sm">
      <CardHeader className="pb-3 pt-4 px-4 bg-gray-50/30">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-gray-400" />
          <div>
            <CardTitle className="text-sm font-semibold text-gray-900">Order Processing Guide</CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Step-by-step instructions for fulfilling this order
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4 pb-4 px-4">
        <div className="space-y-3">
          {steps.map((step, index) => (
            <div key={step.id} className={`p-3.5 rounded-lg border transition-all ${step.color}`}>
              <div className="flex gap-3">
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    step.completed ? "text-green-600" : "text-gray-400"
                  }`}
                >
                  {step.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-sm text-gray-900">{step.title}</h4>
                    {step.completed && <Badge className="h-5 text-xs bg-green-100 text-green-700 border-0">Done</Badge>}
                  </div>
                  <p className="text-xs text-gray-600 mb-2">{step.description}</p>
                  <div className="bg-white/50 p-2 rounded border border-gray-200 text-xs text-gray-700">
                    <span className="font-medium">→ {step.action}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Important Notice */}
        {paymentStatus !== "paid" && (
          <div className="mt-4 p-3 bg-amber-50/50 border border-amber-200 rounded-lg flex gap-2">
            <AlertCircleIcon className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-amber-900">Payment Not Confirmed</p>
              <p className="text-xs text-amber-800 mt-1">
                Verify payment is marked as 'paid' before proceeding with fulfillment.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
