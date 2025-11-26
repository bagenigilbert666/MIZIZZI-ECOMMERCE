import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Clock, Briefcase } from 'lucide-react'

export default function CareersPage() {
  

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <div className="bg-[#111111] py-20 text-white">
        <div className="container mx-auto px-4 text-center">
          <h1 className="mb-6 text-4xl font-bold md:text-6xl">Join the Mizizzi Team</h1>
          <p className="mx-auto max-w-2xl text-lg text-gray-300">
            Help us build the future of commerce in Africa. We're looking for passionate individuals to join our mission.
          </p>
        </div>
      </div>

      {/* Culture Section */}
      <div className="container mx-auto py-16 px-4">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold text-gray-900">Life at Mizizzi</h2>
          <p className="mx-auto max-w-2xl text-gray-600">
            We foster a culture of innovation, collaboration, and growth. When you join Mizizzi, you're not just taking a
            job; you're joining a movement to transform how people buy and sell.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3 mb-16">
          <Card className="border-none shadow-sm bg-gray-50">
            <CardHeader>
              <CardTitle>Growth & Learning</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Continuous learning is part of our DNA. We provide resources and opportunities for professional
                development.
              </p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-gray-50">
            <CardHeader>
              <CardTitle>Flexible Work</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                We believe in work-life balance. Enjoy flexible working hours and hybrid work options.
              </p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-gray-50">
            <CardHeader>
              <CardTitle>Competitive Benefits</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                We offer competitive salaries, health insurance, and other perks to keep you happy and healthy.
              </p>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  )
}
