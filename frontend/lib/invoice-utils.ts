"use client"

import type { Order } from "@/types"

export const invoiceUtils = {
  formatCurrency: (amount: number, currency = "KES") => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount)
  },

  formatDate: (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  },

  calculateTotals: (order: Order) => {
    const subtotal = order.subtotal || 0
    const shipping = order.shipping || 0
    const tax = order.tax || 0
    const total = order.total || subtotal + shipping + tax

    return {
      subtotal,
      shipping,
      tax,
      total,
      itemCount: order.items?.length || 0,
    }
  },

  generateInvoiceNumber: (orderId: string) => {
    return `INV-${orderId}-${new Date().getFullYear()}`
  },

  getInvoiceStatus: (order: Order) => {
    if (order.status === "cancelled") return "CANCELLED"
    if (order.payment_method === "cash_on_delivery" && order.status === "pending") return "UNPAID"
    return "PAID"
  },
}
