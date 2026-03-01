"use client"

import type React from "react"
import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { Loader, ImageIcon, Upload, Save } from "lucide-react"
import Image from "next/image"
import { websocketService } from "@/services/websocket"
import { useSWRConfig } from "swr"
import { categoryService } from "@/services/category"

const getValidImageUrl = (url: string | null | undefined): string => {
  if (!url) return "/placeholder.svg"

  if (url.startsWith("data:")) {
    return url
  }

  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url
  }

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
        description: "Please fill in all required fields",
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

      categoryService.clearCache()
      mutate((key: any) => typeof key === "string" && key.includes("categories"), undefined, { revalidate: true })
      onSaveSuccess()
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[80vh] p-0 gap-0">
        {/* Fixed Header */}
        <DialogHeader className="border-b border-border/40 px-6 sm:px-8 py-5 bg-background">
          <DialogTitle className="text-2xl sm:text-3xl font-bold">
            {editingCategory ? "Edit Category" : "Create Category"}
          </DialogTitle>
          <DialogDescription className="mt-2 text-sm sm:text-base">
            {editingCategory
              ? "Update your category details and visibility settings"
              : "Set up a new category for your store with all necessary details"}
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable Content - Clean organized layout */}
        <div className="overflow-y-auto flex-1 min-h-0 px-6 sm:px-8 py-6">
          <div className="space-y-5 max-w-2xl">
            {/* Section 1: Image Uploads */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                <h3 className="text-xs font-bold text-foreground uppercase tracking-widest">Images</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Main Category Image */}
                <div className="space-y-2">
                  <Label htmlFor="category-image" className="text-sm font-semibold">
                    Category Image *
                  </Label>
                  <div className="relative rounded-lg overflow-hidden bg-gradient-to-br from-muted to-muted/50 border-2 border-border/40 h-28 group hover:border-border/60 transition-colors">
                    <Image
                      src={getValidImageUrl(formData.image_url)}
                      alt="Category preview"
                      fill
                      className="object-cover group-hover:opacity-90 transition-opacity"
                    />
                    {!formData.image_url && (
                      <div className="absolute inset-0 flex items-center justify-center bg-muted/30">
                        <ImageIcon className="h-7 w-7 text-muted-foreground/40" />
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
                    size="sm"
                    className="w-full h-8 rounded-lg font-medium text-xs"
                  >
                    {uploadingImage ? (
                      <>
                        <Loader className="h-3 w-3 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-3 w-3 mr-2" />
                        {formData.image_url ? "Change" : "Upload"} Image
                      </>
                    )}
                  </Button>
                </div>

                {/* Banner Image */}
                <div className="space-y-2">
                  <Label htmlFor="banner-image" className="text-sm font-semibold">
                    Banner (Optional)
                  </Label>
                  <div className="relative rounded-lg overflow-hidden bg-muted border border-border/40 h-28 group hover:border-border/60 transition-colors">
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
                    size="sm"
                    className="w-full h-8 rounded-lg font-medium text-xs"
                  >
                    {uploadingImage ? "Uploading..." : formData.banner_url ? "Change" : "Upload"} Banner
                  </Button>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-border/40" />

            {/* Section 2: Basic Information */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                <h3 className="text-xs font-bold text-foreground uppercase tracking-widest">Information</h3>
              </div>

              <div className="space-y-2">
                <div className="space-y-1">
                  <Label htmlFor="name" className="text-sm font-medium">
                    Category Name *
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g., Electronics"
                    className="h-9 rounded-lg text-sm border-border/40"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="slug" className="text-sm font-medium">
                    URL Slug
                  </Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                    placeholder="e.g., electronics"
                    className="h-9 rounded-lg text-sm font-mono text-xs border-border/40"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="description" className="text-sm font-medium">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe this category..."
                    rows={2}
                    className="rounded-lg text-sm border-border/40 resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-border/40" />

            {/* Section 3: Display Settings */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                <h3 className="text-xs font-bold text-foreground uppercase tracking-widest">Settings</h3>
              </div>

              {/* Featured Toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/40 hover:bg-muted/50 transition-colors">
                <div className="space-y-0.5">
                  <Label className="text-sm font-semibold cursor-pointer">Featured Category</Label>
                  <p className="text-xs text-muted-foreground">Show on homepage</p>
                </div>
                <Switch
                  checked={formData.is_featured}
                  onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_featured: checked }))}
                />
              </div>

              {/* Sort Order */}
              <div className="space-y-1">
                <Label htmlFor="sort_order" className="text-sm font-medium">
                  Display Order
                </Label>
                <Input
                  id="sort_order"
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, sort_order: Number.parseInt(e.target.value) || 0 }))
                  }
                  min={0}
                  className="h-9 rounded-lg text-sm border-border/40"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Footer */}
        <DialogFooter className="px-6 sm:px-8 py-4 border-t border-border/40">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            size="sm"
            className="h-9 px-6 rounded-lg font-medium text-sm"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !formData.name || !formData.image_url}
            size="sm"
            className="h-9 px-6 rounded-lg font-medium text-sm gap-2"
          >
            {saving ? (
              <>
                <Loader className="h-3 w-3 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-3 w-3" />
                {editingCategory ? "Update" : "Create"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
