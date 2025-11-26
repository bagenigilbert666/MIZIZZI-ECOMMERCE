"use client"
import { Separator } from "@/components/ui/separator"
import type { Order } from "@/types"
import { MapPin, Truck } from "lucide-react"

interface OrderDeliveryInfoProps {
  order: Order
  statusLabel: string
}

export function OrderDeliveryInfo({ order, statusLabel }: OrderDeliveryInfoProps) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Truck className="h-3.5 w-3.5 text-gray-500" />
        <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider">Delivery Information</h3>
      </div>
      <div className="space-y-3">
        <div>
          <p className="text-[10px] text-gray-500 mb-1.5 uppercase tracking-wide">Delivery Method</p>
          <p className="text-sm text-gray-900 font-medium">Door Delivery</p>
        </div>
        <Separator className="my-3" />
        {order.shipping_address && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <MapPin className="h-3 w-3 text-gray-500" />
              <p className="text-[10px] text-gray-500 uppercase tracking-wide">Shipping Address</p>
            </div>
            <div className="text-sm text-gray-900 space-y-0.5">
              <p className="font-semibold text-xs">
                {order.shipping_address.first_name || order.shipping_address.name}{" "}
                {order.shipping_address.last_name || ""}
              </p>
              <p className="text-gray-700 text-xs">
                {order.shipping_address.address_line1 || order.shipping_address.street}
              </p>
              {order.shipping_address.address_line2 && (
                <p className="text-gray-700 text-xs">{order.shipping_address.address_line2}</p>
              )}
              <p className="text-gray-700 text-xs">
                {order.shipping_address.city}, {order.shipping_address.state}
              </p>
            </div>
          </div>
        )}
        <Separator className="my-3" />
        <div>
          <p className="text-[10px] text-gray-500 mb-1.5 uppercase tracking-wide">Shipping Details</p>
          <p className="text-sm text-gray-900 font-medium">
            {statusLabel === "Delivered" ? "Delivered successfully" : "Delivery in progress"}
          </p>
        </div>
      </div>
    </div>
  )
}
