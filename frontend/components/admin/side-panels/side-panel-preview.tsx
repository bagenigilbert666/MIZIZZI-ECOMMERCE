"use client"

import { motion } from "framer-motion"
import { Card } from "@/components/ui/card"

interface SidePanelItem {
  id?: number
  panel_type: string
  position: string
  title: string
  metric: string
  description: string
  icon_name: string
  image_url: string
  gradient: string
  features: string[]
  is_active?: boolean
}

interface SidePanelPreviewProps {
  item?: SidePanelItem
  panelType: string
}

export function SidePanelPreview({ item, panelType }: SidePanelPreviewProps) {
  if (!item) {
    return (
      <Card className="p-6 text-center text-muted-foreground">
        <p>Select an item to preview</p>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      <div className="h-full w-full max-w-md mx-auto rounded-lg overflow-hidden shadow-lg bg-white/80 backdrop-blur-md border border-gray-100 relative">
        {/* Background Image */}
        <div className="absolute inset-0 rounded-lg overflow-hidden">
          <motion.img
            src={item.image_url}
            alt={item.title}
            className="w-full h-full object-cover"
            style={{ filter: "brightness(1.1) contrast(1.15) saturate(1.1)" }}
          />
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-black/30 via-black/40 to-black/50"
            animate={{
              background: [
                "linear-gradient(135deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.5) 100%)",
                "linear-gradient(135deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.45) 50%, rgba(0,0,0,0.55) 100%)",
              ],
            }}
            transition={{ duration: 8, repeat: Number.POSITIVE_INFINITY }}
          />
        </div>

        {/* Content Overlay */}
        <div className="relative z-10 h-full p-5 md:p-7 flex flex-col justify-between min-h-[400px]">
          {/* Header */}
          <motion.div className="flex items-center gap-3 mb-4">
            <div
              className={`p-3 rounded-xl bg-gradient-to-br ${item.gradient} shadow-xl backdrop-blur-sm`}
            >
              <div className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-sm md:text-base font-extrabold font-serif text-white uppercase tracking-wider drop-shadow-lg">
              {item.title}
            </h3>
          </motion.div>

          {/* Metric */}
          <motion.div className="mb-3">
            <div className="text-2xl md:text-3xl font-black font-serif text-white mb-1 drop-shadow-xl">
              {item.metric}
            </div>
            <p className="text-xs md:text-sm text-white opacity-95 font-medium font-serif drop-shadow-md">
              {item.description}
            </p>
          </motion.div>

          {/* Features */}
          <motion.div className="relative">
            <div className="space-y-2 mt-2">
              {(item.features || []).slice(0, 3).map((feature, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${item.gradient} shadow-lg`} />
                  <span className="text-xs md:text-sm text-white opacity-95 font-semibold font-serif drop-shadow-md">
                    {feature}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </Card>
  )
}
