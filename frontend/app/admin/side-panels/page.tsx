"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, AlertCircle, Loader2, Filter, Edit2, Trash2, Eye } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"
import { SidePanelForm } from "@/components/admin/side-panels/side-panel-form"
import { SidePanelList } from "@/components/admin/side-panels/side-panel-list"
import { SidePanelPreview } from "@/components/admin/side-panels/side-panel-preview"

interface SidePanelItem {
  id: number
  panel_type: string
  position: string
  title: string
  metric: string
  description: string
  icon_name: string
  image_url: string
  gradient: string
  features: string[]
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

export default function SidePanelsManagementPage() {
  const [items, setItems] = useState<SidePanelItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<SidePanelItem | null>(null)
  const [selectedPanelType, setSelectedPanelType] = useState("product_showcase")
  const [previewItem, setPreviewItem] = useState<SidePanelItem | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    product_showcase: 0,
    premium_experience: 0,
  })
  const { toast } = useToast()

  const getAuthToken = () => {
    return localStorage.getItem("admin_token") || localStorage.getItem("token")
  }

  const fetchPanelItems = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const token = getAuthToken()
      if (!token) {
        setError("No authentication token found. Please login again.")
        setIsLoading(false)
        return
      }

      const response = await fetch(
        `${API_BASE_URL}/api/panels/admin/all?panel_type=${selectedPanelType}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      )

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Unauthorized. Please login again.")
        }
        throw new Error(`Failed to fetch side panels: ${response.statusText}`)
      }

      const data = await response.json()
      setItems(data.items || [])
      setError(null)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to load side panels"
      setError(errorMessage)
      setItems([])
      
      console.error("[v0] Error fetching side panels:", errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const token = getAuthToken()
      if (!token) return

      const response = await fetch(`${API_BASE_URL}/api/panels/admin/stats`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const data = await response.json()
        setStats({
          total: data.stats?.total_items || 0,
          active: data.stats?.active_items || 0,
          product_showcase: data.stats?.by_type?.product_showcase || 0,
          premium_experience: data.stats?.by_type?.premium_experience || 0,
        })
      }
    } catch (error) {
      console.error("[v0] Error fetching stats:", error)
    }
  }

  useEffect(() => {
    fetchPanelItems()
    fetchStats()
  }, [selectedPanelType])

  const handleCreateItem = async (formData: Partial<SidePanelItem>) => {
    try {
      const token = getAuthToken()
      const response = await fetch(`${API_BASE_URL}/api/panels/admin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          panel_type: selectedPanelType,
        }),
      })

      if (!response.ok) throw new Error("Failed to create panel item")

      const data = await response.json()
      setItems([...items, data.item])
      setIsFormOpen(false)
      await fetchStats()

      toast({
        title: "Success",
        description: "Side panel item created successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create side panel item",
        variant: "destructive",
      })
    }
  }

  const handleUpdateItem = async (itemId: number, formData: Partial<SidePanelItem>) => {
    try {
      const token = getAuthToken()
      const response = await fetch(`${API_BASE_URL}/api/panels/admin/${itemId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) throw new Error("Failed to update panel item")

      const data = await response.json()
      setItems(items.map((i) => (i.id === itemId ? data.item : i)))
      setEditingItem(null)
      setIsFormOpen(false)

      toast({
        title: "Success",
        description: "Side panel item updated successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update side panel item",
        variant: "destructive",
      })
    }
  }

  const handleDeleteItem = async (itemId: number) => {
    if (!confirm("Are you sure you want to delete this side panel item?")) return

    try {
      const token = getAuthToken()
      const response = await fetch(`${API_BASE_URL}/api/panels/admin/${itemId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) throw new Error("Failed to delete panel item")

      setItems(items.filter((i) => i.id !== itemId))
      await fetchStats()

      toast({
        title: "Success",
        description: "Side panel item deleted successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete side panel item",
        variant: "destructive",
      })
    }
  }

  const handleToggleActive = async (item: SidePanelItem) => {
    await handleUpdateItem(item.id, {
      is_active: !item.is_active,
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Side Panels Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage left and right carousel side panels • {stats.total} total items
          </p>
        </div>
        <Button onClick={() => {
          setEditingItem(null)
          setIsFormOpen(true)
        }} className="gap-2 shadow-lg">
          <Plus className="h-4 w-4" />
          Add Panel
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-cherry-600">{stats.total}</p>
              <p className="text-sm text-muted-foreground mt-1">Total Items</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">{stats.active}</p>
              <p className="text-sm text-muted-foreground mt-1">Active</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">{stats.product_showcase}</p>
              <p className="text-sm text-muted-foreground mt-1">Product Showcase</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-purple-600">{stats.premium_experience}</p>
              <p className="text-sm text-muted-foreground mt-1">Premium Experience</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6 flex gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-red-900">Error Loading Data</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchPanelItems()}
                className="mt-3"
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter by Panel Type
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {["product_showcase", "premium_experience"].map((type) => (
              <Button
                key={type}
                variant={selectedPanelType === type ? "default" : "outline"}
                onClick={() => setSelectedPanelType(type)}
                className="capitalize"
              >
                {type.replace(/_/g, " ")}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Items List */}
        <div className="lg:col-span-2">
          {isLoading ? (
            <Card>
              <CardContent className="pt-6 flex items-center justify-center h-64">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <p className="text-muted-foreground">Loading side panel items...</p>
                </div>
              </CardContent>
            </Card>
          ) : items.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center py-12">
                <p className="text-muted-foreground">No side panel items found</p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingItem(null)
                    setIsFormOpen(true)
                  }}
                  className="mt-4"
                >
                  Create First Panel
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <Card key={item.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{item.title}</h3>
                        <p className="text-sm text-muted-foreground">{item.metric}</p>
                        <p className="text-xs text-muted-foreground mt-2">{item.description}</p>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPreviewItem(item)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingItem(item)
                            setIsFormOpen(true)
                          }}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteItem(item.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Preview */}
        <div>
          <SidePanelPreview item={previewItem || items[0]} panelType={selectedPanelType} />
        </div>
      </div>

      {/* Form Modal */}
      {isFormOpen && (
        <SidePanelForm
          item={editingItem}
          panelType={selectedPanelType}
          onClose={() => {
            setIsFormOpen(false)
            setEditingItem(null)
          }}
          onSubmit={async (formData) => {
            if (editingItem) {
              await handleUpdateItem(editingItem.id, formData)
            } else {
              await handleCreateItem(formData)
            }
          }}
        />
      )}
    </div>
  )
}
