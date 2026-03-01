"use client"

import type React from "react"
import { useRef, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogBody } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { Loader, ImageIcon, Upload, Save, X } from "lucide-react"
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
  const imageInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    image_url: "",
    banner_url: "",
    is_featured: false,
    sort_order: 0,
  })

  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      if (editingCategory) {
        setFormData({
          name: editingCategory.name,
          slug: editingCategory.slug,
          description: editingCategory.description || "",
          image_url: editingCategory.image_url || "",
          banner_url: editingCategory.banner_url || "",
          is_featured: editingCategory.is_featured,
          sort_order: editingCategory.sort_order,
        })
      } else {
        setFormData({
          name: "",
          slug: "",
          description: "",
          image_url: "",
          banner_url: "",
          is_featured: false,
          sort_order: 0,
        })
      }
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {/* Header */}
        <DialogHeader>
          <DialogTitle>{editingCategory ? "Edit Category" : "Create New Category"}</DialogTitle>
          <DialogDescription>
            {editingCategory
              ? "Update your category details and visibility settings"
              : "Set up a new category for your store with all necessary details"}
          </DialogDescription>
        </DialogHeader>

        {/* Body - Scrollable content */}
        <DialogBody>
          <div className="space-y-6 sm:space-y-7">
            {/* Image Upload Section */}
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-600" />
                <h3 className="text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-widest">
                  Product Images
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                {/* Main Category Image */}
                <div className="space-y-2 sm:space-y-3">
                  <Label className="text-sm font-semibold text-gray-900">
                    Category Image <span className="text-red-500">*</span>
                  </Label>

                  <div className="relative rounded-xl overflow-hidden bg-gray-50 border-2 border-dashed border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 h-32 sm:h-40 group cursor-pointer">
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

                    {formData.image_url ? (
                      <>
                        <Image
                          src={getValidImageUrl(formData.image_url)}
                          alt="Category preview"
                          fill
                          className="object-cover group-hover:opacity-80 transition-opacity"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <button
                            onClick={() => imageInputRef.current?.click()}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <div className="bg-white rounded-full p-2 shadow-lg">
                              <Upload className="h-5 w-5 text-blue-600" />
                            </div>
                          </button>
                        </div>
                      </>
                    ) : (
                      <button
                        onClick={() => imageInputRef.current?.click()}
                        className="w-full h-full flex flex-col items-center justify-center gap-2 group"
                      >
                        <ImageIcon className="h-8 w-8 sm:h-10 sm:w-10 text-gray-400 group-hover:text-blue-500 transition-colors" />
                        <span className="text-xs sm:text-sm font-medium text-gray-600 group-hover:text-blue-600">
                          {uploadingImage ? "Uploading..." : "Click to upload"}
                        </span>
                      </button>
                    )}
                  </div>

                  <p className="text-xs text-gray-500">JPG, PNG or GIF (max 5MB)</p>
                </div>

                {/* Banner Image */}
                <div className="space-y-2 sm:space-y-3">
                  <Label className="text-sm font-semibold text-gray-900">
                    Banner <span className="text-gray-400 text-xs font-normal">(Optional)</span>
                  </Label>

                  <div className="relative rounded-xl overflow-hidden bg-gray-50 border-2 border-dashed border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 h-32 sm:h-40 group cursor-pointer">
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

                    {formData.banner_url ? (
                      <>
                        <Image
                          src={getValidImageUrl(formData.banner_url)}
                          alt="Banner preview"
                          fill
                          className="object-cover group-hover:opacity-80 transition-opacity"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <button
                            onClick={() => bannerInputRef.current?.click()}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <div className="bg-white rounded-full p-2 shadow-lg">
                              <Upload className="h-5 w-5 text-blue-600" />
                            </div>
                          </button>
                        </div>
                      </>
                    ) : (
                      <button
                        onClick={() => bannerInputRef.current?.click()}
                        className="w-full h-full flex flex-col items-center justify-center gap-2 group"
                      >
                        <ImageIcon className="h-8 w-8 sm:h-10 sm:w-10 text-gray-400 group-hover:text-blue-500 transition-colors" />
                        <span className="text-xs sm:text-sm font-medium text-gray-600 group-hover:text-blue-600">
                          Click to upload
                        </span>
                      </button>
                    )}
                  </div>

                  <p className="text-xs text-gray-500">JPG, PNG or GIF (max 5MB)</p>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-gray-100" />

            {/* Basic Information Section */}
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-600" />
                <h3 className="text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-widest">
                  Basic Information
                </h3>
              </div>

              <div className="space-y-3 sm:space-y-4">
                {/* Category Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-sm font-semibold text-gray-900">
                    Category Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g., Electronics"
                    className="h-10 sm:h-11 rounded-lg text-sm border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                {/* URL Slug */}
                <div className="space-y-1.5">
                  <Label htmlFor="slug" className="text-sm font-semibold text-gray-900">
                    URL Slug
                  </Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                    placeholder="e.g., electronics"
                    className="h-10 sm:h-11 rounded-lg text-sm font-mono text-xs border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <Label htmlFor="description" className="text-sm font-semibold text-gray-900">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe this category..."
                    rows={3}
                    className="rounded-lg text-sm border-gray-200 focus:border-blue-500 focus:ring-blue-500 resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-gray-100" />

            {/* Display Settings Section */}
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-600" />
                <h3 className="text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-widest">
                  Display Settings
                </h3>
              </div>

              <div className="space-y-3 sm:space-y-4">
                {/* Featured Toggle */}
                <div className="flex items-center justify-between p-3 sm:p-4 rounded-lg bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-colors">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-semibold text-gray-900 cursor-pointer">
                      Featured Category
                    </Label>
                    <p className="text-xs text-gray-500">Display on homepage</p>
                  </div>
                  <Switch
                    checked={formData.is_featured}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, is_featured: checked }))
                    }
                  />
                </div>

                {/* Sort Order */}
                <div className="space-y-1.5">
                  <Label htmlFor="sort_order" className="text-sm font-semibold text-gray-900">
                    Display Order
                  </Label>
                  <Input
                    id="sort_order"
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        sort_order: Number.parseInt(e.target.value) || 0,
                      }))
                    }
                    min={0}
                    className="h-10 sm:h-11 rounded-lg text-sm border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </DialogBody>

        {/* Footer */}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="h-10 sm:h-11 px-4 sm:px-6 rounded-lg font-medium text-sm border-gray-200 hover:bg-gray-50"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !formData.name || !formData.image_url}
            className="h-10 sm:h-11 px-4 sm:px-6 rounded-lg font-medium text-sm bg-blue-600 hover:bg-blue-700 text-white gap-2"
          >
            {saving ? (
              <>
                <Loader className="h-4 w-4 animate-spin" />
                <span className="hidden sm:inline">Saving...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>{editingCategory ? "Update" : "Create"}</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
