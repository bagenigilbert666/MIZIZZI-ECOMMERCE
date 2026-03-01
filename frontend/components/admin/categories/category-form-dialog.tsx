"use client"

import type React from "react"
import { useRef, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { Loader, ImageIcon, Upload, Save, X, ChevronLeft } from "lucide-react"
import Image from "next/image"
import { websocketService } from "@/services/websocket"
import { useSWRConfig } from "swr"
import { categoryService } from "@/services/category"

const getValidImageUrl = (url: string | null | undefined): string => {
  if (!url) return "/placeholder.svg"
  if (url.startsWith("data:")) return url
  if (url.startsWith("http://") || url.startsWith("https://")) return url
  if (url.startsWith("/")) {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
    return `${baseUrl}${url}`
  }
  return "/placeholder.svg"
}

interface Category {
  id: number
  name: string
  slug: string
  description?: string
  image_url?: string
  banner_url?: string
  is_featured: boolean
  sort_order: number
  is_active?: boolean
}

interface CategoryFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingCategory: Category | null
  onSaveSuccess: () => void
}

export function CategoryFormDialog({
  open,
  onOpenChange,
  editingCategory,
  onSaveSuccess,
}: CategoryFormDialogProps) {
  const { toast } = useToast()
  const { mutate } = useSWRConfig()
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [activeTab, setActiveTab] = useState<"basic" | "media" | "settings">("media")

  const imageInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    name: editingCategory?.name || "",
    slug: editingCategory?.slug || "",
    description: editingCategory?.description || "",
    image_url: editingCategory?.image_url || "",
    banner_url: editingCategory?.banner_url || "",
    is_featured: editingCategory?.is_featured || false,
    sort_order: editingCategory?.sort_order || 0,
  })

  useEffect(() => {
    if (open && editingCategory) {
      setFormData({
        name: editingCategory.name,
        slug: editingCategory.slug,
        description: editingCategory.description || "",
        image_url: editingCategory.image_url || "",
        banner_url: editingCategory.banner_url || "",
        is_featured: editingCategory.is_featured,
        sort_order: editingCategory.sort_order,
      })
      setActiveTab("media")
    } else if (open) {
      setFormData({
        name: "",
        slug: "",
        description: "",
        image_url: "",
        banner_url: "",
        is_featured: false,
        sort_order: 0,
      })
      setActiveTab("media")
    }
  }, [open, editingCategory])

  const handleNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
      slug: name.toLowerCase().replace(/\s+/g, "-"),
    }))
  }

  const handleImageUpload = async (file: File, fieldName: "image_url" | "banner_url") => {
    if (!file) return

    try {
      setUploadingImage(true)
      const formDataObj = new FormData()
      formDataObj.append("file", file)

      const token = localStorage.getItem("admin_token") || localStorage.getItem("mizizzi_token")
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

      const response = await fetch(`${baseUrl}/api/admin/shop-categories/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formDataObj,
      })

      if (!response.ok) throw new Error("Upload failed")

      const data = await response.json()
      setFormData((prev) => ({
        ...prev,
        [fieldName]: data.url,
      }))

      toast({
        title: "Success",
        description: "Image uploaded successfully",
      })
    } catch (error) {
      console.error("Error uploading image:", error)
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive",
      })
    } finally {
      setUploadingImage(false)
    }
  }

  const handleSave = async () => {
    if (!formData.name || !formData.image_url) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields (name and image)",
        variant: "destructive",
      })
      return
    }

    try {
      setSaving(true)
      const token = localStorage.getItem("admin_token") || localStorage.getItem("mizizzi_token")
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

      const payload = {
        name: formData.name,
        slug: formData.slug || formData.name.toLowerCase().replace(/\s+/g, "-"),
        description: formData.description,
        image_url: formData.image_url,
        banner_url: formData.banner_url,
        is_featured: formData.is_featured,
        sort_order: formData.sort_order,
      }

      const url = editingCategory
        ? `${baseUrl}/api/admin/shop-categories/categories/${editingCategory.id}`
        : `${baseUrl}/api/admin/shop-categories/categories`

      const response = await fetch(url, {
        method: editingCategory ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to save category")
      }

      toast({
        title: "Success",
        description: editingCategory ? "Category updated successfully" : "Category created successfully",
      })

      onOpenChange(false)
      await websocketService.emit("category_updated", {
        type: editingCategory ? "updated" : "created",
        category: payload,
      })

      onSaveSuccess()
      categoryService.clearCache()
      mutate((key: any) => typeof key === "string" && key.includes("categories"), undefined, { revalidate: true })
    } catch (error) {
      console.error("Error saving category:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save category",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const tabs = [
    { id: "media", label: "Media" },
    { id: "basic", label: "Details" },
    { id: "settings", label: "Settings" },
  ] as const

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b bg-background px-4 sm:px-6 py-4">
          <div className="flex-1">
            <DialogTitle className="text-xl sm:text-2xl font-bold">
              {editingCategory ? "Edit Category" : "Create Category"}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm mt-1">
              {editingCategory ? "Update category details" : "Add a new product category"}
            </DialogDescription>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="ml-2 p-1 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b bg-muted/30 px-4 sm:px-6 gap-0 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 px-4 sm:px-6 py-6">
          {/* MEDIA TAB */}
          {activeTab === "media" && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <div className="h-1 w-1 rounded-full bg-primary" />
                  Category Image <span className="text-destructive">*</span>
                </h3>
                <div className="space-y-3">
                  <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-muted via-muted to-muted/60 border-2 border-border/50 hover:border-border transition-colors group h-48 sm:h-64">
                    <Image
                      src={getValidImageUrl(formData.image_url)}
                      alt="Category preview"
                      fill
                      className="object-cover group-hover:opacity-80 transition-opacity"
                    />
                    {!formData.image_url && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/5">
                        <ImageIcon className="h-12 w-12 text-muted-foreground/40 mb-2" />
                        <p className="text-xs text-muted-foreground">No image selected</p>
                      </div>
                    )}
                  </div>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleImageUpload(file, "image_url")
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => imageInputRef.current?.click()}
                    disabled={uploadingImage}
                    className="w-full h-10 rounded-lg font-medium text-sm gap-2"
                  >
                    {uploadingImage ? (
                      <>
                        <Loader className="h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        {formData.image_url ? "Change Image" : "Upload Image"}
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="pt-4 border-t">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <div className="h-1 w-1 rounded-full bg-primary" />
                  Banner Image <span className="text-muted-foreground">(Optional)</span>
                </h3>
                <div className="space-y-3">
                  <div className="relative rounded-xl overflow-hidden bg-muted border-2 border-border/40 hover:border-border/60 transition-colors h-32 sm:h-40">
                    <Image
                      src={getValidImageUrl(formData.banner_url)}
                      alt="Banner preview"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <input
                    ref={bannerInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleImageUpload(file, "banner_url")
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => bannerInputRef.current?.click()}
                    disabled={uploadingImage}
                    className="w-full h-10 rounded-lg font-medium text-sm gap-2"
                  >
                    {uploadingImage ? "Uploading..." : (formData.banner_url ? "Change Banner" : "Add Banner")}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* DETAILS TAB */}
          {activeTab === "basic" && (
            <div className="space-y-5 max-w-2xl">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-semibold">
                  Category Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g., Electronics"
                  className="h-10 rounded-lg text-sm border-border/50 focus:border-primary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug" className="text-sm font-semibold">
                  URL Slug
                </Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                  placeholder="e.g., electronics"
                  className="h-10 rounded-lg text-sm font-mono text-xs border-border/50 focus:border-primary"
                />
                <p className="text-xs text-muted-foreground">Auto-generated from category name</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-semibold">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe this category..."
                  rows={4}
                  className="rounded-lg text-sm border-border/50 focus:border-primary resize-none"
                />
              </div>
            </div>
          )}

          {/* SETTINGS TAB */}
          {activeTab === "settings" && (
            <div className="space-y-4 max-w-2xl">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 rounded-xl border border-border/40 hover:border-border/60 transition-colors bg-muted/30">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">Featured Category</p>
                    <p className="text-xs text-muted-foreground">Show on homepage</p>
                  </div>
                  <Switch
                    checked={formData.is_featured}
                    onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_featured: checked }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sort_order" className="text-sm font-semibold">
                    Display Order
                  </Label>
                  <Input
                    id="sort_order"
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData((prev) => ({ ...prev, sort_order: Number.parseInt(e.target.value) || 0 }))}
                    min={0}
                    className="h-10 rounded-lg text-sm border-border/50 focus:border-primary"
                  />
                  <p className="text-xs text-muted-foreground">Lower numbers appear first</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t bg-muted/20 px-4 sm:px-6 py-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-10 px-6 rounded-lg font-medium text-sm"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !formData.name || !formData.image_url}
            className="h-10 px-6 rounded-lg font-medium text-sm gap-2 bg-primary hover:bg-primary/90"
          >
            {saving ? (
              <>
                <Loader className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {editingCategory ? "Update Category" : "Create Category"}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
