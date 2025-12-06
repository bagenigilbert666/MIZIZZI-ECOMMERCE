"use client"
import { Form } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Trash2, Plus, Save, Check, Info } from "lucide-react"
import type { UseFormReturn } from "react-hook-form"
import type { ProductFormValues } from "@/hooks/use-product-form"
import { useState, useEffect } from "react"
import { toast } from "@/components/ui/use-toast"
import { motion } from "framer-motion"

interface ProductSpecificationsHighlightsTabProps {
  form: UseFormReturn<ProductFormValues>
  saveSectionChanges: (section: string) => Promise<boolean>
}

interface SpecificationItem {
  label: string
  value: string
}

interface SpecificationCategory {
  category: string
  items: SpecificationItem[]
}

export function ProductSpecificationsHighlightsTab({
  form,
  saveSectionChanges,
}: ProductSpecificationsHighlightsTabProps) {
  const { watch, setValue } = form
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const formSpecifications = watch("specifications") || {}

  const [specifications, setSpecifications] = useState<SpecificationCategory[]>([
    {
      category: "Product Identification",
      items: [
        { label: "Brand", value: "" },
        { label: "Model", value: "" },
        { label: "SKU", value: "" },
        { label: "Condition", value: "New" },
        { label: "Authenticity", value: "Verified Original" },
      ],
    },
    {
      category: "Specifications",
      items: [
        { label: "Weight", value: "" },
        { label: "Dimensions", value: "" },
        { label: "Material", value: "" },
        { label: "Color", value: "" },
        { label: "Features", value: "" },
      ],
    },
    {
      category: "What's in the Box",
      items: [
        { label: "Main Product", value: "" },
        { label: "User Manual", value: "1 x User Guide" },
        { label: "Accessories", value: "As specified in product description" },
      ],
    },
  ])

  useEffect(() => {
    if (!formSpecifications || typeof formSpecifications !== "object" || Object.keys(formSpecifications).length === 0) {
      return
    }

    console.log("[v0] Loading specifications from form data:", formSpecifications)

    if (
      formSpecifications.product_identification ||
      formSpecifications.specifications ||
      formSpecifications["what's_in_the_box"]
    ) {
      // Load categorized specs
      const updatedSpecs = specifications.map((cat) => {
        const categoryKey = cat.category.toLowerCase().replace(/\s+/g, "_")
        const categoryData = formSpecifications[categoryKey]

        if (categoryData && typeof categoryData === "object") {
          const updatedItems = cat.items.map((item) => {
            const key = item.label.toLowerCase().replace(/\s+/g, "_")
            const raw = categoryData[key]
            const value = typeof raw === "string" ? raw : item.value
            return {
              ...item,
              value,
            }
          })
          return { ...cat, items: updatedItems }
        }
        return cat
      })
      console.log("[v0] Successfully loaded categorized specs from DB:", updatedSpecs)
      setSpecifications(updatedSpecs)
    } else if (Object.keys(formSpecifications).length > 0) {
      // Legacy flat format - auto-categorize
      const updatedSpecs = specifications.map((cat) => {
        const updatedItems = cat.items.map((item) => {
          const key = item.label.toLowerCase().replace(/\s+/g, "_")
          const raw = formSpecifications[key]
          const value = typeof raw === "string" ? raw : item.value
          return {
            ...item,
            value,
          }
        })
        return { ...cat, items: updatedItems }
      })
      console.log("[v0] Successfully loaded flat format specs from DB:", updatedSpecs)
      setSpecifications(updatedSpecs)
    }
  }, [formSpecifications])

  useEffect(() => {
    if (!hasChanges) return

    const timeoutId = setTimeout(() => {
      const categorizedSpecs: Record<string, Record<string, string>> = {}

      specifications.forEach((cat) => {
        const categoryKey = cat.category.toLowerCase().replace(/\s+/g, "_")
        if (!categorizedSpecs[categoryKey]) {
          categorizedSpecs[categoryKey] = {}
        }

        cat.items.forEach((item) => {
          const key = item.label.toLowerCase().replace(/\s+/g, "_")
          if (typeof item.value === "string" && item.value.trim()) {
            categorizedSpecs[categoryKey][key] = item.value
          }
        })
      })

      // cast to any to satisfy the form value type (specifications may be nested)
      setValue("specifications" as any, categorizedSpecs as any, { shouldDirty: true })
    }, 100)

    return () => clearTimeout(timeoutId)
  }, [specifications, hasChanges, setValue])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const success = await saveSectionChanges("Specifications & Highlights")
      if (success) {
        setHasChanges(false)
        toast({
          title: "Success",
          description: "Specifications and highlights saved successfully",
        })
      }
    } catch (error) {
      console.error("Error saving:", error)
      toast({
        title: "Error",
        description: "Failed to save changes",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const addFeature = () => {
    const current = (watch("features") || []) as string[]
    const newFeatures = [...current, ""]
    setValue("features", newFeatures)
    setHasChanges(true)
  }

  const updateFeature = (index: number, value: string) => {
    const current = (watch("features") || []) as string[]
    const newFeatures = [...current]
    newFeatures[index] = value
    setValue("features", newFeatures)
    setHasChanges(true)
  }

  const removeFeature = (index: number) => {
    const current = (watch("features") || []) as string[]
    const newFeatures = current.filter((_: any, i: number) => i !== index)
    setValue("features", newFeatures)
    setHasChanges(true)
  }

  const handleUpdateSpecItem = (categoryIndex: number, itemIndex: number, newValue: string) => {
    const updated = [...specifications]
    updated[categoryIndex].items[itemIndex].value = newValue
    setSpecifications(updated)
    setHasChanges(true)
  }

  const handleAddSpecItem = (categoryIndex: number) => {
    const updated = [...specifications]
    updated[categoryIndex].items.push({ label: "New Field", value: "" })
    setSpecifications(updated)
    setHasChanges(true)
  }

  const handleRemoveSpecItem = (categoryIndex: number, itemIndex: number) => {
    const updated = [...specifications]
    updated[categoryIndex].items = updated[categoryIndex].items.filter((_, i) => i !== itemIndex)
    setSpecifications(updated)
    setHasChanges(true)
  }

  const handleUpdateSpecLabel = (categoryIndex: number, itemIndex: number, newLabel: string) => {
    const updated = [...specifications]
    updated[categoryIndex].items[itemIndex].label = newLabel
    setSpecifications(updated)
    setHasChanges(true)
  }

  return (
    <div className="w-full bg-gray-50 rounded-lg">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 p-6">
        {/* LEFT: Editor Section */}
        <div className="space-y-6">
          <Form {...form}>
            <div className="space-y-6">
              {/* Key Highlights Editor */}
              <Card className="border shadow-sm bg-white">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 bg-blue-600 rounded-full"></div>
                      <h3 className="text-lg font-semibold text-gray-900">Key Highlights</h3>
                    </div>
                    <Button
                      type="button"
                      onClick={addFeature}
                      size="sm"
                      className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {((watch("features") || []) as string[]).length === 0 ? (
                      <p className="text-sm text-gray-500 py-4 italic text-center">No highlights added yet</p>
                    ) : (
                      ((watch("features") || []) as string[]).map((feature: string, index: number) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex gap-2 items-center bg-blue-50/50 p-3 rounded-lg border border-blue-100 hover:border-blue-200 transition group"
                        >
                          <Check className="h-5 w-5 text-blue-600 flex-shrink-0" />
                          <div className="flex-1">
                            <Input
                              placeholder="Enter highlight text..."
                              value={feature}
                              onChange={(e) => updateFeature(index, e.target.value)}
                              className="h-9 text-sm border-blue-200 focus:border-blue-400 focus:ring-blue-100"
                            />
                          </div>
                          <Button
                            type="button"
                            onClick={() => removeFeature(index)}
                            size="sm"
                            variant="outline"
                            className="border-red-200 text-red-600 hover:bg-red-50 h-9 opacity-0 group-hover:opacity-100 transition"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </motion.div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border shadow-sm bg-white">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 bg-purple-600 rounded-full"></div>
                      <h3 className="text-lg font-semibold text-gray-900">Technical Specifications</h3>
                    </div>
                    <span className="text-xs text-gray-500 bg-purple-50 px-3 py-1 rounded-full border border-purple-200">
                      {specifications.reduce((acc, cat) => acc + cat.items.length, 0)} fields
                    </span>
                  </div>

                  <div className="space-y-4 max-h-[600px] overflow-y-auto">
                    {specifications.map((category, catIndex) => (
                      <div key={catIndex} className="border border-gray-200 rounded-xl overflow-hidden">
                        <div className="bg-gradient-to-r from-blue-50 to-blue-100/50 px-4 py-3 border-b border-gray-200">
                          <h4 className="font-semibold text-gray-900 text-sm">{category.category}</h4>
                        </div>

                        <div className="p-4 space-y-2">
                          {category.items.map((item, itemIndex) => (
                            <motion.div
                              key={itemIndex}
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="grid grid-cols-12 gap-2 group"
                            >
                              <div className="col-span-5">
                                <Input
                                  value={item.label}
                                  onChange={(e) => handleUpdateSpecLabel(catIndex, itemIndex, e.target.value)}
                                  className="h-9 text-sm font-medium border-blue-200 focus:border-blue-400 focus:ring-blue-100"
                                  placeholder="Label"
                                />
                              </div>
                              <div className="col-span-6">
                                <Input
                                  value={item.value}
                                  onChange={(e) => handleUpdateSpecItem(catIndex, itemIndex, e.target.value)}
                                  className="h-9 text-sm border-blue-200 focus:border-blue-400 focus:ring-blue-100"
                                  placeholder="Value"
                                />
                              </div>
                              <div className="col-span-1 flex items-center justify-center">
                                <Button
                                  type="button"
                                  onClick={() => handleRemoveSpecItem(catIndex, itemIndex)}
                                  size="sm"
                                  variant="outline"
                                  className="h-9 w-9 p-0 border-red-200 text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </motion.div>
                          ))}

                          <Button
                            type="button"
                            onClick={() => handleAddSpecItem(catIndex)}
                            size="sm"
                            variant="outline"
                            className="w-full border-2 border-dashed border-blue-300 hover:border-blue-400 hover:bg-blue-50 text-blue-600 mt-2"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Field
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </Form>
        </div>

        {/* RIGHT: Live Preview Section */}
        <div className="space-y-6 sticky top-6">
          <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
              <h3 className="text-lg font-semibold text-gray-900">Live Preview</h3>
              <Info className="h-4 w-4 text-gray-400" />
            </div>

            {/* Key Highlights Preview */}
            {(watch("features") || []).filter((f: string) => f.trim()).length > 0 && (
              <div className="mb-6 bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
                <h4 className="text-base font-semibold text-gray-900 mb-4">Key Highlights</h4>
                <div className="space-y-3">
                  {(watch("features") || [])
                    .filter((f) => f.trim())
                    .map((feature: string, index: number) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-start gap-3 p-2 rounded-lg hover:bg-blue-50/50 transition"
                      >
                        <Check className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm font-medium text-gray-700">{feature}</span>
                      </motion.div>
                    ))}
                </div>
              </div>
            )}

            <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-100">
                <h4 className="text-base font-semibold text-gray-900">Technical Specifications</h4>
              </div>

              <div className="p-6 space-y-6">
                {specifications.map((category, catIndex) => (
                  <motion.div
                    key={catIndex}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: catIndex * 0.1 }}
                    className="border border-gray-200 rounded-lg overflow-hidden"
                  >
                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-3 border-b border-gray-200">
                      <h5 className="text-sm font-semibold text-gray-900">{category.category}</h5>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {category.items.map((item, itemIndex) => (
                        <div
                          key={itemIndex}
                          className="px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition"
                        >
                          <span className="text-sm font-medium text-gray-700">{item.label}</span>
                          <span className="text-sm text-gray-600 font-medium text-right">
                            {item.value || <span className="text-gray-400 italic">Not set</span>}
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 flex items-center justify-between">
        <div className="text-sm font-medium text-gray-700">
          {hasChanges ? (
            <span className="flex items-center gap-2 text-amber-600">
              <div className="h-2 w-2 bg-amber-600 rounded-full animate-pulse" />
              Unsaved changes
            </span>
          ) : (
            <span className="text-gray-500">All changes saved</span>
          )}
        </div>
        <Button
          onClick={handleSave}
          disabled={isSaving || !hasChanges}
          className={`bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-700 hover:via-emerald-600 hover:to-teal-600 text-white font-bold transition-all shadow-lg hover:shadow-xl ${
            !hasChanges ? "opacity-60 cursor-not-allowed" : "hover:scale-105 active:scale-95"
          }`}
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
