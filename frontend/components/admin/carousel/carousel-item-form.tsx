"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { Loader } from "@/components/ui/loader"

interface CarouselItem {
  id: number
  name: string
  title: string
  description: string
  badge_text: string
  discount: string
  button_text: string
  link_url: string
  image_url: string
  position: string
  is_active: boolean
  sort_order: number
}

interface CarouselItemFormProps {
  item: CarouselItem | null
  position: string
  onSuccess: () => void
}

export function CarouselItemForm({ item, position, onSuccess }: CarouselItemFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: item?.name || "",
    title: item?.title || "",
    description: item?.description || "",
    badge_text: item?.badge_text || "",
    discount: item?.discount || "",
    button_text: item?.button_text || "SHOP NOW",
    link_url: item?.link_url || "/products",
    image_url: item?.image_url || "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const token = localStorage.getItem("admin_token")
      const method = item ? "PUT" : "POST"
      const url = item ? `/api/carousel/admin/${item.id}` : "/api/carousel/admin"

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          position: item?.position || position,
        }),
      })

      if (!response.ok) throw new Error("Failed to save carousel item")

      toast({
        title: "Success",
        description: item ? "Carousel item updated successfully" : "Carousel item created successfully",
      })

      onSuccess()
    } catch (error) {
      console.error("[v0] Error saving carousel item:", error)
      toast({
        title: "Error",
        description: "Failed to save carousel item",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Item Name *</Label>
          <Input
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g., Summer Collection"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="title">Display Title *</Label>
          <Input
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="e.g., Discover Our Latest Collection"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Add a description for the carousel item"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="badge_text">Badge Text</Label>
          <Input
            id="badge_text"
            name="badge_text"
            value={formData.badge_text}
            onChange={handleChange}
            placeholder="e.g., NEW ARRIVALS"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="discount">Discount</Label>
          <Input
            id="discount"
            name="discount"
            value={formData.discount}
            onChange={handleChange}
            placeholder="e.g., 30% OFF"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="image_url">Image URL *</Label>
        <Input
          id="image_url"
          name="image_url"
          type="url"
          value={formData.image_url}
          onChange={handleChange}
          placeholder="https://example.com/image.jpg"
          required
        />
        {formData.image_url && (
          <img
            src={formData.image_url || "/placeholder.svg"}
            alt="Preview"
            className="mt-2 max-h-48 rounded-lg object-cover w-full"
          />
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="button_text">Button Text *</Label>
          <Input
            id="button_text"
            name="button_text"
            value={formData.button_text}
            onChange={handleChange}
            placeholder="e.g., SHOP NOW"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="link_url">Button Link</Label>
          <Input
            id="link_url"
            name="link_url"
            value={formData.link_url}
            onChange={handleChange}
            placeholder="/products"
          />
        </div>
      </div>

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? <Loader /> : item ? "Update Item" : "Create Item"}
      </Button>
    </form>
  )
}
