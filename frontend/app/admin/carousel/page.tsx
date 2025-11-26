"use client"

import { useState, useEffect } from "react"
import { AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, AlertCircle, Loader2, Filter } from "lucide-react"
import { CarouselBannerForm } from "@/components/admin/carousel/carousel-banner-form"
import { CarouselBannerList } from "@/components/admin/carousel/carousel-banner-list"
import { CarouselPreview } from "@/components/admin/carousel/carousel-preview"
import type { CarouselBanner } from "@/types/carousel-admin"
import { useToast } from "@/hooks/use-toast"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

export default function CarouselManagementPage() {
  const [banners, setBanners] = useState<CarouselBanner[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingBanner, setEditingBanner] = useState<CarouselBanner | null>(null)
  const [selectedPosition, setSelectedPosition] = useState("homepage")
  const [previewBanner, setPreviewBanner] = useState<CarouselBanner | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [carouselStats, setCarouselStats] = useState({
    total: 0,
    active: 0,
    homepage: 0,
    category_page: 0,
    flash_sales: 0,
    luxury_deals: 0,
  })
  const { toast } = useToast()

  const getAuthToken = () => {
    return localStorage.getItem("admin_token") || localStorage.getItem("token")
  }

  const fetchCarousels = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const token = getAuthToken()

      if (!token) {
        setError("No authentication token found. Please login again.")
        setBanners([])
        setIsLoading(false)
        return
      }

      const response = await fetch(`${API_BASE_URL}/api/carousel/admin/all?position=${selectedPosition}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Unauthorized. Please login again.")
        }
        if (response.status === 404) {
          throw new Error(
            "Carousel API endpoint not found. Please ensure the backend server is running and the database is initialized. Run: python scripts/init_carousel_database.py",
          )
        }
        throw new Error(`Failed to fetch carousels: ${response.statusText}`)
      }

      const data = await response.json()
      setBanners(data.banners || [])

      if (data.banners && data.banners.length === 0) {
        console.log("[v0] No carousel banners found for position:", selectedPosition)
      }
    } catch (error) {
      console.error("[v0] Error fetching carousels:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to load carousel banners"
      setError(errorMessage)

      // Set empty banners array to show UI
      setBanners([])

      toast({
        title: "Connection Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const fetchCarouselStats = async () => {
    try {
      const token = getAuthToken()
      const positions = ["homepage", "category_page", "flash_sales", "luxury_deals"]
      const stats = {
        total: 0,
        active: 0,
        homepage: 0,
        category_page: 0,
        flash_sales: 0,
        luxury_deals: 0,
      }

      for (const position of positions) {
        try {
          const response = await fetch(`${API_BASE_URL}/api/carousel/admin/all?position=${position}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          })

          if (response.ok) {
            const data = await response.json()
            const count = data.banners?.length || 0
            stats[position as keyof typeof stats] = count
            stats.total += count
            stats.active += data.banners?.filter((b: CarouselBanner) => b.is_active).length || 0
          }
        } catch (err) {
          console.error(`[v0] Error fetching stats for ${position}:`, err)
        }
      }

      setCarouselStats(stats)
    } catch (error) {
      console.error("[v0] Error fetching carousel stats:", error)
    }
  }

  useEffect(() => {
    fetchCarousels()
    fetchCarouselStats()
  }, [selectedPosition])

  const handleCreateBanner = async (formData: Partial<CarouselBanner>) => {
    try {
      const token = getAuthToken()
      const response = await fetch(`${API_BASE_URL}/api/carousel/admin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          position: selectedPosition,
        }),
      })

      if (!response.ok) throw new Error("Failed to create banner")

      const data = await response.json()
      setBanners([...banners, data.banner])
      setIsFormOpen(false)

      toast({
        title: "Success",
        description: "Carousel banner created successfully",
      })
    } catch (error) {
      console.error("[v0] Error creating banner:", error)
      toast({
        title: "Error",
        description: "Failed to create carousel banner",
        variant: "destructive",
      })
    }
  }

  const handleUpdateBanner = async (bannerId: number, formData: Partial<CarouselBanner>) => {
    try {
      const token = getAuthToken()
      const response = await fetch(`${API_BASE_URL}/api/carousel/admin/${bannerId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) throw new Error("Failed to update banner")

      const data = await response.json()
      setBanners(banners.map((b) => (b.id === bannerId ? data.banner : b)))
      setEditingBanner(null)

      toast({
        title: "Success",
        description: "Carousel banner updated successfully",
      })
    } catch (error) {
      console.error("[v0] Error updating banner:", error)
      toast({
        title: "Error",
        description: "Failed to update carousel banner",
        variant: "destructive",
      })
    }
  }

  const handleDeleteBanner = async (bannerId: number) => {
    if (!confirm("Are you sure you want to delete this carousel banner?")) return

    try {
      const token = getAuthToken()
      const response = await fetch(`${API_BASE_URL}/api/carousel/admin/${bannerId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) throw new Error("Failed to delete banner")

      setBanners(banners.filter((b) => b.id !== bannerId))

      toast({
        title: "Success",
        description: "Carousel banner deleted successfully",
      })
    } catch (error) {
      console.error("[v0] Error deleting banner:", error)
      toast({
        title: "Error",
        description: "Failed to delete carousel banner",
        variant: "destructive",
      })
    }
  }

  const handleToggleActive = async (banner: CarouselBanner) => {
    await handleUpdateBanner(banner.id, {
      is_active: !banner.is_active,
    })
  }

  const handleDuplicateBanner = async (banner: CarouselBanner) => {
    try {
      const duplicateData = {
        ...banner,
        name: `${banner.name} (Copy)`,
        is_active: false,
      }
      delete (duplicateData as any).id
      delete (duplicateData as any).created_at
      delete (duplicateData as any).updated_at

      await handleCreateBanner(duplicateData)

      toast({
        title: "Success",
        description: "Banner duplicated successfully",
      })
    } catch (error) {
      console.error("[v0] Error duplicating banner:", error)
      toast({
        title: "Error",
        description: "Failed to duplicate banner",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Carousel Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage all carousels across your store • {carouselStats.total} total banners • Database-driven content
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)} className="gap-2 shadow-lg">
          <Plus className="h-4 w-4" />
          Add Banner
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-cherry-600">{carouselStats.total}</p>
              <p className="text-sm text-muted-foreground mt-1">Total Banners</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">{carouselStats.active}</p>
              <p className="text-sm text-muted-foreground mt-1">Active</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">{carouselStats.homepage}</p>
              <p className="text-sm text-muted-foreground mt-1">Homepage</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-purple-600">{carouselStats.flash_sales}</p>
              <p className="text-sm text-muted-foreground mt-1">Flash Sales</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-orange-600">{carouselStats.luxury_deals}</p>
              <p className="text-sm text-muted-foreground mt-1">Luxury Deals</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900">
          <CardContent className="pt-6 flex gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-red-900 dark:text-red-200">Connection Error</p>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
              {error.includes("404") || error.includes("not found") ? (
                <div className="mt-3 p-3 bg-red-100 dark:bg-red-900/30 rounded-md">
                  <p className="text-sm font-medium text-red-900 dark:text-red-200 mb-2">Database Setup Required</p>
                  <p className="text-xs text-red-800 dark:text-red-300 mb-2">
                    The carousel database tables need to be initialized. Run this command in your terminal:
                  </p>
                  <code className="block p-2 bg-red-200 dark:bg-red-900/50 rounded text-xs text-red-900 dark:text-red-100 font-mono">
                    python scripts/init_carousel_database.py
                  </code>
                </div>
              ) : null}
              <Button
                variant="outline"
                size="sm"
                onClick={fetchCarousels}
                className="mt-3 bg-white dark:bg-red-950 hover:bg-red-50"
              >
                Retry Connection
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter by Position
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            {["homepage", "category_page", "flash_sales", "luxury_deals"].map((pos) => (
              <Button
                key={pos}
                variant={selectedPosition === pos ? "default" : "outline"}
                onClick={() => setSelectedPosition(pos)}
                className="capitalize"
              >
                {pos.replace(/_/g, " ")}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Banners List */}
        <div className="lg:col-span-2">
          {isLoading ? (
            <Card>
              <CardContent className="pt-6 flex items-center justify-center h-64">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <p className="text-muted-foreground">Loading carousel banners...</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <CarouselBannerList
              banners={banners}
              isLoading={isLoading}
              onEdit={(banner) => {
                setEditingBanner(banner)
                setIsFormOpen(true)
              }}
              onDelete={handleDeleteBanner}
              onToggleActive={handleToggleActive}
              onPreview={setPreviewBanner}
              onDuplicate={handleDuplicateBanner}
            />
          )}
        </div>

        {/* Preview */}
        <div>
          <CarouselPreview banner={previewBanner || banners[0]} />
        </div>
      </div>

      {/* Form Modal */}
      <AnimatePresence>
        {isFormOpen && (
          <CarouselBannerForm
            banner={editingBanner}
            onClose={() => {
              setIsFormOpen(false)
              setEditingBanner(null)
            }}
            onSubmit={async (formData) => {
              if (editingBanner) {
                await handleUpdateBanner(editingBanner.id, formData)
              } else {
                await handleCreateBanner(formData)
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
