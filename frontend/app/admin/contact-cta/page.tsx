"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Plus, Trash2, Edit, Save, X } from "lucide-react"
import Image from "next/image"

interface ContactSlide {
  id: number
  subtitle: string
  image: string
  gradient: string
  accent_color: string
  is_active: boolean
  sort_order: number
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

export default function ContactCTAManagement() {
  const [slides, setSlides] = useState<ContactSlide[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState<number | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const { toast } = useToast()

  // Form state
  const [formData, setFormData] = useState<Partial<ContactSlide>>({
    subtitle: "",
    image: "",
    gradient: "from-slate-900 via-slate-800 to-black",
    accent_color: "text-white",
    is_active: true,
  })

  const fetchSlides = async () => {
    try {
      setIsLoading(true)
      const token = localStorage.getItem("admin_token")
      const response = await fetch(`${API_BASE_URL}/api/contact-cta/admin/all`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setSlides(data.slides)
      }
    } catch (error) {
      console.error("Error fetching slides:", error)
      toast({
        title: "Error",
        description: "Failed to load slides",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchSlides()
  }, [])

  const handleSave = async () => {
    try {
      const token = localStorage.getItem("admin_token")
      const url = isEditing
        ? `${API_BASE_URL}/api/contact-cta/admin/${isEditing}`
        : `${API_BASE_URL}/api/contact-cta/admin`

      const method = isEditing ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: `Slide ${isEditing ? "updated" : "created"} successfully`,
        })
        setIsEditing(null)
        setIsCreating(false)
        setFormData({
          subtitle: "",
          image: "",
          gradient: "from-slate-900 via-slate-800 to-black",
          accent_color: "text-white",
          is_active: true,
        })
        fetchSlides()
      } else {
        throw new Error("Failed to save")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save slide",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this slide?")) return

    try {
      const token = localStorage.getItem("admin_token")
      const response = await fetch(`${API_BASE_URL}/api/contact-cta/admin/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Slide deleted successfully",
        })
        fetchSlides()
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete slide",
        variant: "destructive",
      })
    }
  }

  const startEdit = (slide: ContactSlide) => {
    setFormData(slide)
    setIsEditing(slide.id)
    setIsCreating(false)
  }

  const startCreate = () => {
    setFormData({
      subtitle: "",
      image: "",
      gradient: "from-slate-900 via-slate-800 to-black",
      accent_color: "text-white",
      is_active: true,
    })
    setIsCreating(true)
    setIsEditing(null)
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Contact CTA Management</h1>
          <p className="text-muted-foreground">Manage the promotional slides on the homepage</p>
        </div>
        <Button onClick={startCreate} disabled={isCreating || isEditing !== null}>
          <Plus className="mr-2 h-4 w-4" /> Add Slide
        </Button>
      </div>

      {(isCreating || isEditing) && (
        <Card className="border-slate-200 bg-slate-50/50">
          <CardHeader>
            <CardTitle>{isCreating ? "Create New Slide" : "Edit Slide"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Subtitle</Label>
                <Input
                  value={formData.subtitle}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  placeholder="e.g., Hii ni yako"
                />
              </div>
              <div className="space-y-2">
                <Label>Image URL</Label>
                <div className="flex gap-2">
                  <Input
                    value={formData.image}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    placeholder="https://..."
                  />
                  {formData.image && (
                    <div className="relative w-10 h-10 rounded overflow-hidden border shrink-0">
                      <Image src={formData.image || "/placeholder.svg"} alt="Preview" fill className="object-cover" />
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Gradient Classes</Label>
                <Input
                  value={formData.gradient}
                  onChange={(e) => setFormData({ ...formData, gradient: e.target.value })}
                  placeholder="e.g., from-slate-900 via-slate-800 to-black"
                />
              </div>
              <div className="space-y-2">
                <Label>Accent Color Class</Label>
                <Input
                  value={formData.accent_color}
                  onChange={(e) => setFormData({ ...formData, accent_color: e.target.value })}
                  placeholder="e.g., text-white"
                />
              </div>
              <div className="flex items-center space-x-2 pt-8">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label>Active</Label>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreating(false)
                  setIsEditing(null)
                }}
              >
                <X className="mr-2 h-4 w-4" /> Cancel
              </Button>
              <Button onClick={handleSave}>
                <Save className="mr-2 h-4 w-4" /> Save
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
        </div>
      ) : (
        <div className="grid gap-4">
          {slides.map((slide) => (
            <Card key={slide.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="flex flex-col sm:flex-row h-full">
                  {/* Preview Section */}
                  <div className={`relative w-full sm:w-48 h-32 bg-gradient-to-br ${slide.gradient}`}>
                    <div className="absolute inset-0 bg-black/10" />
                    <div className="absolute right-0 top-0 bottom-0 w-[65%]">
                      <Image
                        src={slide.image || "/placeholder.svg"}
                        alt={slide.subtitle}
                        fill
                        className="object-cover object-center"
                      />
                      <div className="absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-black/80" />
                    </div>
                    <div className="absolute inset-0 flex items-center px-4">
                      <p className={`font-bold text-lg ${slide.accent_color} drop-shadow-lg leading-tight`}>
                        {slide.subtitle}
                      </p>
                    </div>
                  </div>

                  {/* Info & Actions */}
                  <div className="flex-1 p-4 flex items-center justify-between bg-white">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">ID: {slide.id}</span>
                        <div
                          className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            slide.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {slide.is_active ? "Active" : "Inactive"}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground truncate max-w-[200px]">{slide.image}</p>
                      <p className="text-xs text-muted-foreground font-mono">{slide.gradient}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => startEdit(slide)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-600"
                        onClick={() => handleDelete(slide.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
