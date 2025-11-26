import {
  Zap,
  Crown,
  Heart,
  Package,
  HeadphonesIcon,
  Search,
  Phone,
  MessageCircle,
  Shield,
  Star,
  Truck,
  Gift,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

export interface CarouselItem {
  image: string
  title: string
  description: string
  buttonText: string
  href: string
  badge: string
  discount: string
}

export interface FeatureCard {
  icon: LucideIcon
  title: string
  description: string
  href: string
  iconBg: string
  iconColor: string
  hoverBg: string
}

export interface PromoSlide {
  icon: LucideIcon
  title: string
  subtitle: string
  description: string
  bgGradient: string
  glowColor: string
  shadowColor: string
  iconBg: string
  particles: string
}

export const carouselItems: CarouselItem[] = [
  {
    image: "https://s3-alpha.figma.com/hub/file/4753611835/c6dabc57-f302-4c80-81de-d8293345ecdc-cover.png",
    title: "Discover Our Latest Collection",
    description: "Explore the newest trends and exclusive designs for a limited time.",
    buttonText: "SHOP NEW ARRIVALS",
    href: "/products",
    badge: "NEW ARRIVALS",
    discount: "30% OFF",
  },
  {
    image:
      "https://images.vexels.com/media/users/3/194698/raw/34d9aa618f832510ce7290b4f183484a-shop-online-slider-template.jpg",
    title: "Unleash Your Style",
    description: "Find unique pieces that reflect your personality and elevate your wardrobe.",
    buttonText: "EXPLORE FASHION",
    href: "/products",
    badge: "TRENDING",
    discount: "40% OFF",
  },
  {
    image: "https://i.pinimg.com/736x/b0/b7/8b/b0b78b6c2975d535b663bfb942b56df3.jpg",
    title: "Timeless Elegance in Every Detail",
    description: "Experience craftsmanship and quality that lasts a lifetime.",
    buttonText: "VIEW COLLECTION",
    href: "/products",
    badge: "EXCLUSIVE",
    discount: "25% OFF",
  },
  {
    image:
      "https://img.pikbest.com/templates/20240719/sale-facebook-cover--7c-website-banner-web-slider_10676152.jpg!w700wp",
    title: "Step Up Your Game",
    description: "Discover our range of high-performance athletic wear and footwear.",
    buttonText: "SHOP SPORTSWEAR",
    href: "/products",
    badge: "ATHLETIC",
    discount: "35% OFF",
  },
  {
    image: "https://landingi.com/wp-content/uploads/2020/07/cover_ecommerce1-optimized.webp",
    title: "Indulge in Pure Luxury",
    description: "Premium skincare and beauty products for a radiant you.",
    buttonText: "BEAUTY ESSENTIALS",
    href: "/products",
    badge: "LUXURY",
    discount: "20% OFF",
  },
  {
    image: "https://templates.simplified.co/thumb/37051bbc-f4c0-475b-bd42-980a32eb743b.jpg",
    title: "Sophistication Redefined",
    description: "Curated menswear collection for the modern gentleman.",
    buttonText: "MEN'S COLLECTION",
    href: "/products",
    badge: "GENTLEMAN",
    discount: "30% OFF",
  },
  {
    image: "https://t3.ftcdn.net/jpg/14/83/33/38/360_F_1483333839_YSSbd6cW6gHXrl9P0oYidDKNNlHcizcX.jpg",
    title: "Empower Your Wardrobe",
    description: "Chic and elegant designs for every woman.",
    buttonText: "WOMEN'S FASHION",
    href: "/products",
    badge: "ELEGANCE",
    discount: "45% OFF",
  },
  {
    image:
      "https://img.freepik.com/premium-photo/collection-colorful-shopping-bags-are-stacked-top-each-other_1274269-24782.jpg",
    title: "Walk in Style",
    description: "Premium footwear for comfort and fashion.",
    buttonText: "SHOP FOOTWEAR",
    href: "/products",
    badge: "FOOTWEAR",
    discount: "20% OFF",
  },
  {
    image:
      "https://mir-s3-cdn-cf.behance.net/projects/404/e15396231970697.Y3JvcCw4MDgsNjMyLDAsMA.png",
    title: "Timeless Pieces, Modern Twist",
    description: "Discover our curated collection of vintage-inspired fashion.",
    buttonText: "VINTAGE FINDS",
    href: "/products",
    badge: "RETRO",
    discount: "50% OFF",
  },
  {
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRHN4cN5Xx1n5xCXrMAybL_o8Wq5fE6D-JNwA&s",
    title: "Gear Up for Adventure",
    description: "Durable and reliable outdoor equipment for your next journey.",
    buttonText: "ADVENTURE GEAR",
    href: "/products",
    badge: "OUTDOOR",
    discount: "10% OFF",
  },
  {
    image:
      "https://leadgenera.com/wp-content/uploads/2020/03/The-Guide-to-Ecommerce-Marketing-Lead-Genera.jpg",
    title: "Handcrafted with Passion",
    description: "Unique artisan gifts and crafts for every special occasion.",
    buttonText: "DISCOVER GIFTS",
    href: "/products",
    badge: "ARTISAN",
    discount: "15% OFF",
  },
]

export const featureCards: FeatureCard[] = [
  {
    icon: Zap,
    title: "FLASH SALES",
    description: "Limited Time Offers",
    href: "/flash-sales",
    iconBg: "bg-gradient-to-br from-yellow-50 to-orange-50",
    iconColor: "text-orange-600",
    hoverBg: "hover:bg-orange-50/80",
  },
  {
    icon: Crown,
    title: "LUXURY DEALS",
    description: "Premium Collections",
    href: "/luxury",
    iconBg: "bg-gradient-to-br from-purple-50 to-indigo-50",
    iconColor: "text-purple-600",
    hoverBg: "hover:bg-purple-50/80",
  },
  {
    icon: Heart,
    title: "WISHLIST",
    description: "Save Your Favorites",
    href: "/wishlist",
    iconBg: "bg-gradient-to-br from-pink-50 to-rose-50",
    iconColor: "text-pink-600",
    hoverBg: "hover:bg-pink-50/80",
  },
  {
    icon: Package,
    title: "ORDERS",
    description: "Track Your Purchases",
    href: "/orders",
    iconBg: "bg-gradient-to-br from-blue-50 to-cyan-50",
    iconColor: "text-blue-600",
    hoverBg: "hover:bg-blue-50/80",
  },
  {
    icon: HeadphonesIcon,
    title: "SUPPORT",
    description: "24/7 Assistance",
    href: "/help",
    iconBg: "bg-gradient-to-br from-green-50 to-emerald-50",
    iconColor: "text-green-600",
    hoverBg: "hover:bg-green-50/80",
  },
  {
    icon: Search,
    title: "PRODUCTS",
    description: "Browse All Items",
    href: "/products",
    iconBg: "bg-gradient-to-br from-gray-50 to-slate-50",
    iconColor: "text-gray-600",
    hoverBg: "hover:bg-gray-50/80",
  },
]

export const promoSlides: PromoSlide[] = [
  {
    icon: Phone,
    title: "CONTACT US",
    subtitle: "0700 123 456",
    description: "24/7 Customer Support",
    bgGradient: "from-blue-600 via-blue-700 to-indigo-800",
    glowColor: "bg-blue-400/30",
    shadowColor: "shadow-blue-500/25",
    iconBg: "bg-white/20",
    particles: "bg-blue-200",
  },
  {
    icon: MessageCircle,
    title: "LIVE CHAT",
    subtitle: "Chat Now",
    description: "Instant Help Available",
    bgGradient: "from-green-600 via-emerald-700 to-teal-800",
    glowColor: "bg-green-400/30",
    shadowColor: "shadow-green-500/25",
    iconBg: "bg-white/20",
    particles: "bg-green-200",
  },
  {
    icon: Shield,
    title: "SECURE SHOPPING",
    subtitle: "100% Safe",
    description: "Protected Transactions",
    bgGradient: "from-purple-600 via-violet-700 to-indigo-800",
    glowColor: "bg-purple-400/30",
    shadowColor: "shadow-purple-500/25",
    iconBg: "bg-white/20",
    particles: "bg-purple-200",
  },
  {
    icon: Star,
    title: "PREMIUM QUALITY",
    subtitle: "5-Star Rated",
    description: "Verified Products Only",
    bgGradient: "from-yellow-500 via-orange-600 to-red-700",
    glowColor: "bg-yellow-400/30",
    shadowColor: "shadow-yellow-500/25",
    iconBg: "bg-white/20",
    particles: "bg-yellow-200",
  },
  {
    icon: Truck,
    title: "FREE DELIVERY",
    subtitle: "Same Day",
    description: "Orders Over KSh 2,000",
    bgGradient: "from-cyan-600 via-blue-700 to-indigo-800",
    glowColor: "bg-cyan-400/30",
    shadowColor: "shadow-cyan-500/25",
    iconBg: "bg-white/20",
    particles: "bg-cyan-200",
  },
  {
    icon: Gift,
    title: "SPECIAL OFFERS",
    subtitle: "Up to 70% Off",
    description: "Limited Time Deals",
    bgGradient: "from-pink-600 via-rose-700 to-red-800",
    glowColor: "bg-pink-400/30",
    shadowColor: "shadow-pink-500/25",
    iconBg: "bg-white/20",
    particles: "bg-pink-200",
  },
]

// Breakpoint constants for responsive layout
export const BREAKPOINTS = {
  mobile: 480,
  tablet: 768,
  desktop: 1024,
  minSpaceForCards: 600,
  minSpaceForSidePanels: 1280, // Changed from 1536 to 1280 (xl breakpoint) for better laptop support
}

// Timing constants
export const TIMING = {
  slideInterval: 5000,
  autoSlideInterval: 5000,
  componentRotationInterval: 3000,
  animationDuration: 800,
  progressUpdateInterval: 50,
  transitionDelay: 800,
}

// Animation configurations
export const ANIMATION_CONFIGS = {
  slideTransition: {
    type: "spring" as const,
    stiffness: 300,
    damping: 30,
  },
  cardHover: {
    duration: 0.3,
    ease: "easeOut" as const,
  },
  iconPulse: {
    duration: 2,
    repeat: Number.POSITIVE_INFINITY,
    ease: "easeInOut" as const,
  },
  particleFloat: {
    duration: 3,
    repeat: Number.POSITIVE_INFINITY,
    ease: "easeInOut" as const,
  },
}
