"use client"

import { useState, useEffect } from "react"
import { Plus, Edit, Trash2, GripVertical, Eye, EyeOff, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { useAdminAuth } from "@/contexts/admin/auth-context"
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "https://mizizzi-ecommerce-1.onrender.com"

interface TopBarSlide {
  id: number
  campaign: string
  subtext: string
  bgColor: string
  productImageUrl: string
  productAlt: string
  centerContentType: "phone" | "brands" | "text"
  centerContentData: any
  buttonText: string
  buttonLink: string
  isActive: boolean
  sortOrder: number
}

export default function TopBarAdminPage() {
  const [slides, setSlides] = useState<TopBarSlide[]>([])
  const [loading, setLoading] = useState(true)
  const [editingSlide, setEditingSlide] = useState<TopBarSlide | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const { getToken, isAuthenticated, isLoading: isAuthLoading } = useAdminAuth()

  type CenterContentData = {
    phoneNumber?: string
    brands?: string[]
    text?: string
  }

  type FormData = {
    campaign: string
    subtext: string
    bgColor: string
    productImageUrl: string
    productAlt: string
    centerContentType: "phone" | "brands" | "text"
    centerContentData: CenterContentData
    buttonText: string
    buttonLink: string
    isActive: boolean
  }

  const [formData, setFormData] = useState<FormData>({
    campaign: "",
    subtext: "",
    bgColor: "#000000",
    productImageUrl: "",
    productAlt: "Product",
    centerContentType: "text",
    centerContentData: {},
    buttonText: "Shop Now",
    buttonLink: "/products",
    isActive: true,
  })

  useEffect(() => {
    fetchSlides()
  }, [])

  const fetchSlides = async () => {
    try {
      const token = getToken() || localStorage.getItem("admin_token")
      if (!token) {
        // Only redirect if we're not currently loading auth state
        if (!isAuthLoading) {
          toast({
            title: "Authentication Error",
            description: "Please login to access this page",
            variant: "destructive",
          })
          router.push("/admin/login")
        }
        return
      }

      const response = await fetch(`${API_BASE_URL}/api/topbar/admin/all`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.status === 401) {
        toast({
          title: "Session Expired",
          description: "Your session has expired. Please login again.",
          variant: "destructive",
        })
        localStorage.removeItem("admin_token")
        router.push("/admin/login")
        return
      }

      const data = await response.json()

      if (data.success) {
        setSlides(data.slides)
      }
      setLoading(false)
    } catch (error) {
      console.error("[v0] Error fetching slides:", error)
      toast({
        title: "Error",
        description: "Failed to fetch topbar slides",
        variant: "destructive",
      })
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    try {
      const token = getToken() || localStorage.getItem("admin_token")
      if (!token) {
        router.push("/admin/login")
        return
      }

      const response = await fetch(`${API_BASE_URL}/api/topbar/admin`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (response.status === 401) {
        router.push("/admin/login")
        return
      }

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Success",
          description: "TopBar slide created successfully",
        })
        fetchSlides()
        setIsCreating(false)
        resetForm()
      } else {
        throw new Error(data.error)
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create slide",
        variant: "destructive",
      })
    }
  }

  const handleUpdate = async () => {
    if (!editingSlide) return

    try {
      const token = getToken() || localStorage.getItem("admin_token")
      if (!token) {
        router.push("/admin/login")
        return
      }

      const response = await fetch(`${API_BASE_URL}/api/topbar/admin/${editingSlide.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (response.status === 401) {
        router.push("/admin/login")
        return
      }

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Success",
          description: "TopBar slide updated successfully",
        })
        fetchSlides()
        setEditingSlide(null)
        resetForm()
      } else {
        throw new Error(data.error)
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update slide",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this slide?")) return

    try {
      const token = getToken() || localStorage.getItem("admin_token")
      if (!token) {
        router.push("/admin/login")
        return
      }

      const response = await fetch(`${API_BASE_URL}/api/topbar/admin/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.status === 401) {
        router.push("/admin/login")
        return
      }

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Success",
          description: "TopBar slide deleted successfully",
        })
        fetchSlides()
      } else {
        throw new Error(data.error)
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete slide",
        variant: "destructive",
      })
    }
  }

  const toggleActive = async (slide: TopBarSlide) => {
    try {
      const token = getToken() || localStorage.getItem("admin_token")
      if (!token) {
        router.push("/admin/login")
        return
      }

      const response = await fetch(`${API_BASE_URL}/api/topbar/admin/${slide.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isActive: !slide.isActive }),
      })

      if (response.status === 401) {
        router.push("/admin/login")
        return
      }

      const data = await response.json()

      if (data.success) {
        fetchSlides()
        toast({
          title: "Success",
          description: `Slide ${!slide.isActive ? "activated" : "deactivated"}`,
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to toggle slide",
        variant: "destructive",
      })
    }
  }

  const startEdit = (slide: TopBarSlide) => {
    setEditingSlide(slide)
    setFormData({
      campaign: slide.campaign,
      subtext: slide.subtext,
      bgColor: slide.bgColor,
      productImageUrl: slide.productImageUrl,
      productAlt: slide.productAlt,
      centerContentType: slide.centerContentType,
      centerContentData: slide.centerContentData,
      buttonText: slide.buttonText,
      buttonLink: slide.buttonLink,
      isActive: slide.isActive,
    })
  }

  const resetForm = () => {
    setFormData({
      campaign: "",
      subtext: "",
      bgColor: "#000000",
      productImageUrl: "",
      productAlt: "Product",
      centerContentType: "text",
      centerContentData: {},
      buttonText: "Shop Now",
      buttonLink: "/products",
      isActive: true,
    })
  }

  const renderCenterContentForm = () => {
    switch (formData.centerContentType) {
      case "phone":
        return (
          <div className="space-y-2">
            <Label>Phone Number</Label>
            <Input
              placeholder="0711 011 011"
              value={formData.centerContentData?.phoneNumber || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  centerContentData: { phoneNumber: e.target.value },
                })
              }
            />
          </div>
        )
      case "brands":
        return (
          <div className="space-y-2">
            <Label>Brand Names (comma-separated)</Label>
            <Input
              placeholder="SAMSUNG, APPLE, TECNO, INFINIX"
              value={formData.centerContentData?.brands?.join(", ") || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  centerContentData: {
                    brands: e.target.value.split(",").map((b) => b.trim()),
                  },
                })
              }
            />
          </div>
        )
      case "text":
      default:
        return (
          <div className="space-y-2">
            <Label>Text Content</Label>
            <Input
              placeholder="Hii nayo, ni yako"
              value={formData.centerContentData?.text || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  centerContentData: { text: e.target.value },
                })
              }
            />
          </div>
        )
    }
  }

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">TopBar Management</h1>
          <p className="text-muted-foreground">Manage the rotating banner at the top of your site</p>
        </div>
        <Button onClick={() => setIsCreating(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Slide
        </Button>
      </div>

      {(isCreating || editingSlide) && (
        <Card>
          <CardHeader>
            <CardTitle>{editingSlide ? "Edit Slide" : "Create New Slide"}</CardTitle>
            <CardDescription>Configure the topbar slide content and appearance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Campaign Title*</Label>
                <Input
                  placeholder="BLACK FRIDAY"
                  value={formData.campaign}
                  onChange={(e) => setFormData({ ...formData, campaign: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Subtext</Label>
                <Input
                  placeholder="UP TO 80% OFF"
                  value={formData.subtext}
                  onChange={(e) => setFormData({ ...formData, subtext: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Background Color</Label>
                <Input
                  type="color"
                  value={formData.bgColor}
                  onChange={(e) => setFormData({ ...formData, bgColor: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Product Image URL*</Label>
                <Input
                  placeholder="https://images.unsplash.com/..."
                  value={formData.productImageUrl}
                  onChange={(e) => setFormData({ ...formData, productImageUrl: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Center Content Type</Label>
              <Tabs
                value={formData.centerContentType}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    centerContentType: value as any,
                    centerContentData: {},
                  })
                }
              >
                <TabsList>
                  <TabsTrigger value="text">Text</TabsTrigger>
                  <TabsTrigger value="phone">Phone</TabsTrigger>
                  <TabsTrigger value="brands">Brands</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {renderCenterContentForm()}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Button Text</Label>
                <Input
                  placeholder="Shop Now"
                  value={formData.buttonText}
                  onChange={(e) => setFormData({ ...formData, buttonText: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Button Link</Label>
                <Input
                  placeholder="/products"
                  value={formData.buttonLink}
                  onChange={(e) => setFormData({ ...formData, buttonLink: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label>Active</Label>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={editingSlide ? handleUpdate : handleCreate}
                disabled={!formData.campaign || !formData.productImageUrl}
              >
                <Save className="w-4 h-4 mr-2" />
                {editingSlide ? "Update" : "Create"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreating(false)
                  setEditingSlide(null)
                  resetForm()
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Slides ({slides.length})</CardTitle>
          <CardDescription>Manage and reorder your topbar slides</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {slides.map((slide) => (
              <div
                key={slide.id}
                className="flex items-center justify-between p-4 border rounded-lg"
                style={{ borderLeftColor: slide.bgColor, borderLeftWidth: "4px" }}
              >
                <div className="flex items-center gap-4 flex-1">
                  <GripVertical className="w-5 h-5 text-muted-foreground cursor-move" />

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{slide.campaign}</h3>
                      {slide.isActive ? (
                        <Badge variant="default">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{slide.subtext}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => toggleActive(slide)}>
                    {slide.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>

                  <Button variant="ghost" size="icon" onClick={() => startEdit(slide)}>
                    <Edit className="w-4 h-4" />
                  </Button>

                  <Button variant="ghost" size="icon" onClick={() => handleDelete(slide.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}

            {slides.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                No slides yet. Create your first slide to get started!
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
