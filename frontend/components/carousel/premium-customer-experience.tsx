"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Gem, Shirt, Watch, Crown, Award, Timer, TrendingUp, Users, type LucideIcon } from "lucide-react"
import type { PremiumExperience } from "@/lib/server/get-carousel-data"

const iconMap: Record<string, LucideIcon> = {
  Gem,
  Shirt,
  Watch,
  Crown,
  Award,
  Timer,
  TrendingUp,
  Users,
}

const DEFAULT_EXPERIENCES: PremiumExperience[] = [
  {
    id: 1,
    title: "PREMIUM MEMBERSHIP",
    metric: "98.7%",
    description: "Satisfaction",
    icon_name: "Crown",
    image: "/images/premium-bg.jpg",
    gradient: "from-amber-500 to-orange-600",
    features: ["Priority support", "Exclusive deals", "Free shipping", "Early access"],
    is_active: true,
  },
]

interface PremiumCustomerExperienceProps {
  experiences?: PremiumExperience[]
}

export const PremiumCustomerExperience = React.memo(
  ({ experiences: serverExperiences }: PremiumCustomerExperienceProps) => {
    const experiences = serverExperiences && serverExperiences.length > 0 ? serverExperiences : DEFAULT_EXPERIENCES
    const [currentExperience, setCurrentExperience] = useState(0)

    useEffect(() => {
      if (experiences.length === 0) return
      const interval = setInterval(() => {
        setCurrentExperience((prev) => (prev + 1) % experiences.length)
      }, 10000)
      return () => clearInterval(interval)
    }, [experiences.length])

    const experience = experiences[currentExperience]
    const IconComponent = iconMap[experience?.icon_name] || iconMap.Award

    const displayFeatures = experience?.features?.slice(0, 4) || []

    if (!experience) return null

    return (
      <section
        className="h-full w-full max-w-md md:max-w-lg mx-auto rounded-2xl overflow-hidden shadow-lg bg-white/80 backdrop-blur-md border border-gray-100 relative"
        aria-label="Premium customer experience"
      >
        <div className="absolute inset-0 rounded-2xl overflow-hidden">
          {experiences.map((exp, index) => (
            <motion.div
              key={exp.id}
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{
                opacity: index === currentExperience ? 1 : 0,
                scale: index === currentExperience ? 1 : 1.05,
              }}
              transition={{ duration: 4, ease: [0.16, 1, 0.3, 1] }}
            >
              <img
                src={exp.image || "/placeholder.svg"}
                alt={exp.title}
                className="w-full h-full object-cover object-center"
                style={{ filter: "brightness(1.1) contrast(1.15) saturate(1.1)" }}
              />
              <div className="absolute inset-0 bg-gradient-to-br from-black/30 via-black/40 to-black/50" />
            </motion.div>
          ))}
        </div>

        <div className="relative z-10 h-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentExperience}
              initial={{ opacity: 0, y: 30, filter: "blur(10px)", scale: 0.95 }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)", scale: 1 }}
              exit={{ opacity: 0, y: -30, filter: "blur(10px)", scale: 1.05 }}
              transition={{ duration: 2.5, ease: [0.16, 1, 0.3, 1] }}
              className="h-full p-5 md:p-7 flex flex-col justify-between"
            >
              <div className="absolute inset-0 pointer-events-none">
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={i}
                    className={`absolute w-1 h-1 rounded-full bg-gradient-to-r ${experience.gradient} opacity-30`}
                    style={{ left: `${20 + i * 15}%`, top: `${10 + i * 12}%` }}
                    animate={{
                      y: [-10, 10, -10],
                      x: [-5, 5, -5],
                      opacity: [0.2, 0.6, 0.2],
                      scale: [0.8, 1.2, 0.8],
                    }}
                    transition={{
                      duration: 4 + i * 0.5,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: "easeInOut",
                      delay: i * 0.3,
                    }}
                  />
                ))}
              </div>

              <motion.div
                className="flex items-center gap-3 mb-4"
                initial={{ opacity: 0, x: -40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3, duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
              >
                <motion.div
                  className={`p-3 rounded-xl bg-gradient-to-br ${experience.gradient} shadow-xl backdrop-blur-sm`}
                  animate={{
                    scale: [1, 1.05, 1],
                    rotate: [0, 2, -2, 0],
                  }}
                  transition={{ duration: 6, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                >
                  <IconComponent className="h-6 w-6 text-white drop-shadow-lg" />
                </motion.div>
                <h3 className="text-sm md:text-base font-extrabold font-serif text-white uppercase tracking-wider drop-shadow-lg">
                  {experience.title}
                </h3>
              </motion.div>

              <motion.div
                className="mb-3"
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="text-2xl md:text-3xl font-black font-serif text-white mb-1 drop-shadow-xl">
                  {experience.metric}
                </div>
                <p className="text-xs md:text-sm text-white opacity-95 font-medium font-serif drop-shadow-md">
                  {experience.description}
                </p>
              </motion.div>

              <motion.div
                className="relative"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9, duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="space-y-2 mt-2">
                  {displayFeatures.map((feature, index) => (
                    <motion.div
                      key={feature}
                      className="flex items-center gap-3"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1.2 + index * 0.15, duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <motion.div
                        className={`w-2 h-2 rounded-full bg-gradient-to-r ${experience.gradient} shadow-lg`}
                        animate={{ scale: [1, 1.4, 1], opacity: [0.8, 1, 0.8] }}
                        transition={{
                          duration: 3,
                          repeat: Number.POSITIVE_INFINITY,
                          ease: "easeInOut",
                          delay: index * 0.4,
                        }}
                      />
                      <span className="text-xs md:text-sm text-white opacity-95 font-semibold font-serif drop-shadow-md">
                        {feature}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              <motion.div
                className={`absolute top-4 right-4 w-4 h-4 rounded-full bg-gradient-to-r ${experience.gradient} opacity-60`}
                animate={{
                  scale: [1, 1.8, 1],
                  opacity: [0.4, 0.8, 0.4],
                  rotate: [0, 180, 360],
                }}
                transition={{ duration: 8, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
              />
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex gap-1.5 z-20">
          {experiences.map((_, index) => (
            <motion.div
              key={index}
              className={`h-0.5 rounded-full transition-all duration-1000 ${
                index === currentExperience ? `w-8 bg-gradient-to-r ${experience.gradient}` : "w-2 bg-white/30"
              }`}
              animate={{ opacity: index === currentExperience ? 1 : 0.5 }}
              transition={{ duration: 1 }}
            />
          ))}
        </div>
      </section>
    )
  },
)

PremiumCustomerExperience.displayName = "PremiumCustomerExperience"
