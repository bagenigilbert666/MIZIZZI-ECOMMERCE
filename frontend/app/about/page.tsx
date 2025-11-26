import Image from "next/image"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowRight, CheckCircle2, Users, Globe, ShieldCheck } from 'lucide-react'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative bg-[#111111] py-20 text-white">
        <div className="container mx-auto px-4 text-center">
          <h1 className="mb-6 text-4xl font-bold md:text-6xl">We Are Mizizzi</h1>
          <p className="mx-auto max-w-2xl text-lg text-gray-300">
            Your premier local marketplace connecting authentic sellers with discerning buyers across Kenya and beyond.
          </p>
        </div>
      </div>

      {/* Mission Section */}
      <div className="container mx-auto py-16 px-4">
        <div className="grid gap-12 md:grid-cols-2 items-center">
          <div>
            <h2 className="mb-6 text-3xl font-bold text-gray-900">Our Mission</h2>
            <p className="mb-6 text-lg text-gray-600 leading-relaxed">
              At Mizizzi, we believe in the power of local commerce. Our mission is to empower local businesses by
              providing them with a world-class platform to showcase their products, while giving customers access to
              quality, authentic items they can trust.
            </p>
            <p className="text-lg text-gray-600 leading-relaxed">
              Founded in Nairobi, we understand the unique pulse of the African market. We are bridging the gap between
              traditional marketplaces and modern e-commerce, ensuring seamless transactions, secure payments, and
              reliable delivery.
            </p>
          </div>
          <div className="relative h-[400px] rounded-2xl overflow-hidden bg-gray-100">
            <Image
              src="/african-marketplace-digital-commerce.jpg"
              alt="Mizizzi Mission"
              fill
             className="object-cover"
            />
          </div>
        </div>
      </div>

      {/* Values Section */}
      <div className="bg-gray-50 py-16">
        <div className="container mx-auto px-4">
          <h2 className="mb-12 text-center text-3xl font-bold text-gray-900">Why Choose Mizizzi?</h2>
          <div className="grid gap-8 md:grid-cols-3">
            <div className="rounded-xl bg-white p-8 shadow-sm transition-shadow hover:shadow-md">
              <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="mb-4 text-xl font-bold">Trust & Security</h3>
              <p className="text-gray-600">
                Every transaction on Mizizzi is protected. We verify our sellers and secure your payments until you receive
                your order.
              </p>
            </div>
            <div className="rounded-xl bg-white p-8 shadow-sm transition-shadow hover:shadow-md">
              <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="mb-4 text-xl font-bold">Community First</h3>
              <p className="text-gray-600">
                We are more than a marketplace; we are a community. We support local entrepreneurs and help them grow their
                businesses.
              </p>
            </div>
            <div className="rounded-xl bg-white p-8 shadow-sm transition-shadow hover:shadow-md">
              <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Globe className="h-6 w-6" />
              </div>
              <h3 className="mb-4 text-xl font-bold">Nationwide Reach</h3>
              <p className="text-gray-600">
                From Nairobi to Mombasa, Kisumu to Eldoret, we deliver quality products to every corner of the country.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto py-20 px-4 text-center">
        <h2 className="mb-6 text-3xl font-bold text-gray-900">Ready to start shopping?</h2>
        <p className="mb-8 text-gray-600">Explore our curated collection of premium products today.</p>
        <Button asChild size="lg" className="rounded-full px-8">
          <Link href="/products">
            Browse Products <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  )
}
