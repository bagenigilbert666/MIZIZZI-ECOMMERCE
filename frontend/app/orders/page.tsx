"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader } from "@/components/ui/loader"

export default function OrdersPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/account?tab=orders")
  }, [router])

  return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader />
      </div>
    
  )
}
