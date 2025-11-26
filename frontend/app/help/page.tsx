import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Package, RefreshCw, CreditCard, User, ShieldQuestion } from 'lucide-react'
import Link from "next/link"

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Search Hero */}
      <div className="bg-[#111111] py-16 text-white">
        <div className="container mx-auto px-4 text-center">
          <h1 className="mb-6 text-3xl font-bold md:text-4xl">How can we help you?</h1>
          <div className="mx-auto max-w-xl relative">
            <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
            <Input
              placeholder="Search for help articles..."
              className="h-12 w-full rounded-full border-none bg-white/10 pl-12 text-white placeholder:text-gray-400 focus-visible:ring-1 focus-visible:ring-white"
            />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {/* Quick Links */}
        <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-5 mb-16">
          <Link
            href="/track-order"
            className="flex flex-col items-center rounded-xl bg-white p-6 text-center shadow-sm transition-all hover:shadow-md hover:text-primary"
          >
            <Package className="mb-4 h-8 w-8 text-primary" />
            <span className="font-medium">Track Order</span>
          </Link>
          <Link
            href="/returns"
            className="flex flex-col items-center rounded-xl bg-white p-6 text-center shadow-sm transition-all hover:shadow-md hover:text-primary"
          >
            <RefreshCw className="mb-4 h-8 w-8 text-primary" />
            <span className="font-medium">Returns</span>
          </Link>
          <Link
            href="/payment-methods"
            className="flex flex-col items-center rounded-xl bg-white p-6 text-center shadow-sm transition-all hover:shadow-md hover:text-primary"
          >
            <CreditCard className="mb-4 h-8 w-8 text-primary" />
            <span className="font-medium">Payments</span>
          </Link>
          <Link
            href="/account"
            className="flex flex-col items-center rounded-xl bg-white p-6 text-center shadow-sm transition-all hover:shadow-md hover:text-primary"
          >
            <User className="mb-4 h-8 w-8 text-primary" />
            <span className="font-medium">My Account</span>
          </Link>
          <Link
            href="/contact"
            className="flex flex-col items-center rounded-xl bg-white p-6 text-center shadow-sm transition-all hover:shadow-md hover:text-primary"
          >
            <ShieldQuestion className="mb-4 h-8 w-8 text-primary" />
            <span className="font-medium">Contact Us</span>
          </Link>
        </div>

        {/* FAQs */}
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-8 text-2xl font-bold text-gray-900">Frequently Asked Questions</h2>
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>How do I track my order?</AccordionTrigger>
                <AccordionContent>
                  You can track your order by visiting the "Track Order" page and entering your order number and email
                  address. Alternatively, you can log in to your account and view your order history.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger>What payment methods do you accept?</AccordionTrigger>
                <AccordionContent>
                  We accept M-Pesa, Visa, Mastercard, Airtel Money, and Pesapal. All payments are secure and encrypted.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3">
                <AccordionTrigger>How long does delivery take?</AccordionTrigger>
                <AccordionContent>
                  Delivery times vary by location. Within Nairobi, orders are typically delivered within 24 hours. For
                  other regions in Kenya, delivery usually takes 2-3 business days.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-4">
                <AccordionTrigger>Can I change my delivery address after placing an order?</AccordionTrigger>
                <AccordionContent>
                  If your order hasn't been shipped yet, you can contact our customer support team to update your address.
                  Once shipped, we cannot guarantee address changes.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-5">
                <AccordionTrigger>What is your return policy?</AccordionTrigger>
                <AccordionContent>
                  We offer a 30-day return policy for most items. Products must be unused, in original packaging, and with
                  all tags attached. See our Returns page for more details.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>

        {/* Still need help? */}
        <div className="mt-16 text-center">
          <h3 className="mb-4 text-xl font-bold text-gray-900">Still need help?</h3>
          <p className="mb-8 text-gray-600">Our support team is available to assist you.</p>
          <Button asChild size="lg">
            <Link href="/contact">Contact Support</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
