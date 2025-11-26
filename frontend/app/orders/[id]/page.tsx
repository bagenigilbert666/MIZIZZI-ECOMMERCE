"use client"

import { useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Loader } from "@/components/ui/loader"

export default function OrderDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const orderId = params?.id as string | undefined

  useEffect(() => {
    if (orderId) {
      router.replace(`/account?tab=order-details&id=${orderId}`)
    }
  }, [orderId, router])

  return (
     <div className="flex flex-col items-center justify-center py-12">
            <Loader />
          </div>
  )
}
