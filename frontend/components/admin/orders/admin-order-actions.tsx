"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Printer, Mail, MoreVertical, Download, Eye } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Order } from "@/types"

interface AdminOrderActionsProps {
  order: Order
  onPrint?: () => void
  onEmail?: () => void
  onExport?: () => void
  onViewActivity?: () => void
}

const btnMotion = {
  rest: { scale: 1, opacity: 1 },
  hover: { scale: 1.02, y: -2 },
  tap: { scale: 0.98, y: 0 },
}

export function AdminOrderActions({ order, onPrint, onEmail, onExport, onViewActivity }: AdminOrderActionsProps) {
  const [loading, setLoading] = useState({ print: false, email: false, export: false })
  const [menuOpen, setMenuOpen] = useState(false)

  async function handlePrint() {
    try {
      setLoading((s) => ({ ...s, print: true }))
      await (onPrint ? onPrint() : Promise.resolve())
    } finally {
      setLoading((s) => ({ ...s, print: false }))
    }
  }

  async function handleEmail() {
    try {
      setLoading((s) => ({ ...s, email: true }))
      await (onEmail ? onEmail() : Promise.resolve())
    } finally {
      setLoading((s) => ({ ...s, email: false }))
    }
  }

  async function handleExport() {
    try {
      setLoading((s) => ({ ...s, export: true }))
      await (onExport ? onExport() : Promise.resolve())
    } finally {
      setLoading((s) => ({ ...s, export: false }))
    }
  }

  return (
    <div className="flex items-center gap-2">
      {/* Print */}
      <motion.div variants={btnMotion} initial="rest" whileHover="hover" whileTap="tap">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrint}
          aria-label={`Print order ${order?.id ?? ""}`}
          className="flex items-center h-9 px-3 text-gray-600 hover:text-gray-900 hover:bg-gray-50 border-gray-200 bg-transparent transition-colors"
          disabled={loading.print}
        >
          <Printer className="h-4 w-4 mr-1.5" />
          <span className="hidden sm:inline">Print</span>
        </Button>
      </motion.div>

      {/* Email */}
      <motion.div variants={btnMotion} initial="rest" whileHover="hover" whileTap="tap">
        <Button
          variant="outline"
          size="sm"
          onClick={handleEmail}
          aria-label={`Email invoice for order ${order?.id ?? ""}`}
          className="flex items-center h-9 px-3 text-gray-600 hover:text-gray-900 hover:bg-gray-50 border-gray-200 bg-transparent transition-colors"
          disabled={loading.email}
        >
          <Mail className="h-4 w-4 mr-1.5" />
          <span className="hidden sm:inline">Email</span>
        </Button>
      </motion.div>

      {/* More */}
      <DropdownMenu onOpenChange={(open) => setMenuOpen(open)}>
        <DropdownMenuTrigger asChild>
          <motion.div animate={{ rotate: menuOpen ? 90 : 0 }} transition={{ type: "spring", stiffness: 300 }}>
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-2 border-gray-200 bg-transparent"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              title="More actions"
            >
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">More actions</span>
            </Button>
          </motion.div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onClick={onViewActivity} className="cursor-pointer flex items-center">
            <Eye className="h-4 w-4 mr-2 text-gray-600" />
            <span>View Activity</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={async () => {
              await handleExport()
            }}
            className="cursor-pointer flex items-center"
          >
            <Download className="h-4 w-4 mr-2 text-gray-600" />
            <span>Export Order</span>
            {loading.export && <span className="ml-2 text-xs text-gray-400">Exporting…</span>}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
