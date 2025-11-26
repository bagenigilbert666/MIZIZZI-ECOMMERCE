import { Button } from "@/components/ui/button"
import Link from "next/link"
import { AlertCircle, CheckCircle2, XCircle, Truck, RefreshCw, CreditCard } from 'lucide-react'

export default function ReturnsPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="bg-gray-50 py-12 border-b">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Returns & Refunds Policy</h1>
          <p className="text-gray-600 max-w-3xl">
            We want you to be completely satisfied with your purchase. If you're not happy with your order, we're here to
            help. Please read our return policy below to understand your options.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-12 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-12">
            {/* Eligibility */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <CheckCircle2 className="text-primary h-6 w-6" />
                Eligibility for Returns
              </h2>
              <div className="prose max-w-none text-gray-600">
                <p className="mb-4">
                  To be eligible for a return, your item must be in the same condition that you received it:
                </p>
                <ul className="list-disc pl-5 space-y-2 mb-4">
                  <li>Unworn, unused, and unwashed</li>
                  <li>In its original packaging with all tags attached</li>
                  <li>Accompanied by the receipt or proof of purchase</li>
                  <li>Initiated within 30 days of delivery</li>
                </ul>
                <p>
                  <strong>Note:</strong> Some items are non-returnable for hygiene and safety reasons, including:
                </p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Perishable goods (food, flowers)</li>
                  <li>Personal care items (beauty products, earrings)</li>
                  <li>Intimate apparel (underwear, swimwear)</li>
                  <li>Gift cards</li>
                </ul>
              </div>
            </section>

            {/* Process */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <RefreshCw className="text-primary h-6 w-6" />
                The Return Process
              </h2>
              <div className="grid gap-6 md:grid-cols-3">
                <div className="bg-gray-50 p-6 rounded-lg">
                  <div className="font-bold text-lg mb-2">1. Initiate Return</div>
                  <p className="text-sm text-gray-600">
                    Log in to your account, go to "My Orders," and select the item you wish to return. Or contact support.
                  </p>
                </div>
                <div className="bg-gray-50 p-6 rounded-lg">
                  <div className="font-bold text-lg mb-2">2. Ship Item</div>
                  <p className="text-sm text-gray-600">
                    Pack the item securely. We'll provide a return shipping label or arrange a pickup for local orders.
                  </p>
                </div>
                <div className="bg-gray-50 p-6 rounded-lg">
                  <div className="font-bold text-lg mb-2">3. Get Refund</div>
                  <p className="text-sm text-gray-600">
                    Once we receive and inspect the item, we'll process your refund to your original payment method.
                  </p>
                </div>
              </div>
            </section>

            {/* Refunds */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <CreditCard className="text-primary h-6 w-6" />
                Refunds
              </h2>
              <div className="prose max-w-none text-gray-600">
                <p>
                  Once your return is received and inspected, we will send you an email to notify you that we have received
                  your returned item. We will also notify you of the approval or rejection of your refund.
                </p>
                <p className="mt-4">
                  If you are approved, then your refund will be processed, and a credit will automatically be applied to
                  your credit card or original method of payment (e.g., M-Pesa reversal) within 5-7 business days.
                </p>
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-gray-50 rounded-xl p-6 sticky top-24">
              <h3 className="font-bold text-lg mb-4">Need help with a return?</h3>
              <p className="text-gray-600 mb-6 text-sm">
                Our support team is here to guide you through the process if you have any questions.
              </p>
              <div className="space-y-4">
                <Button asChild className="w-full">
                  <Link href="/contact">Contact Support</Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/track-order">Track Return Status</Link>
                </Button>
              </div>
              <div className="mt-8 pt-8 border-t border-gray-200">
                <h4 className="font-semibold mb-2">Return Address:</h4>
                <p className="text-sm text-gray-600">
                  Mizizzi Returns Center
                  <br />
                  Warehouse B, Industrial Area
                  <br />
                  Nairobi, Kenya
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
