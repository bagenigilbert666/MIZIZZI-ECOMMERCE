'use client'

import type React from 'react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Sparkles, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { adminService } from '@/services/admin'
import { generateSlug } from '@/lib/utils'
import { useAdminAuth } from '@/contexts/admin/auth-context'

export default function NewProductPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAdminAuth()
  const { toast } = useToast()

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/admin/login')
    }
  }, [isAuthenticated, authLoading, router])

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setName(value)
    if (!slug || slug === generateSlug(name)) {
      setSlug(generateSlug(value))
    }
  }

  const handleCopySlug = () => {
    navigator.clipboard.writeText(slug)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim() || !slug.trim()) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      })
      return
    }

    try {
      setIsSubmitting(true)
      const response = await adminService.createProduct({
        name: name.trim(),
        url_slug: slug.trim(),
      })

      if (response.success || response.id) {
        toast({
          title: 'Success',
          description: 'Product created successfully',
        })
        setTimeout(() => {
          router.push(`/admin/products/${response.id}/edit`)
        }, 500)
      } else {
        throw new Error('Failed to create product')
      }
    } catch (error) {
      console.error('[v0] Error creating product:', error)
      toast({
        title: 'Error',
        description: 'Failed to create product',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (authLoading || !isAuthenticated) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-muted-foreground border-t-foreground animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 border-b border-border/40 bg-background/95 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3">
          <button
            onClick={() => router.push('/admin/products')}
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
            Back
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12 sm:py-20">
        <div className="max-w-2xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12 animate-in fade-in slide-in-from-top-6 duration-500">
            <div className="flex justify-center mb-6">
              <div className="p-3.5 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                <Sparkles className="h-8 w-8 text-primary/80" strokeWidth={1.5} />
              </div>
            </div>
            <h1 className="text-5xl sm:text-6xl font-light text-foreground tracking-tight mb-3">
              New Product
            </h1>
            <p className="text-lg text-muted-foreground font-light">
              Create a new product by entering its name and URL slug. You can add more details after.
            </p>
          </div>

          {/* Form Card */}
          <form onSubmit={handleSubmit} className="space-y-0 animate-in fade-in slide-in-from-bottom-6 duration-500 delay-100">
            {/* Product Name Field */}
            <div className="p-6 sm:p-8 border-b border-border/50 bg-card/50 backdrop-blur-sm">
              <label htmlFor="name" className="block text-sm font-semibold text-foreground mb-2">
                Product Name
              </label>
              <p className="text-xs text-muted-foreground mb-4">
                Give your product a clear, descriptive name
              </p>
              <input
                id="name"
                type="text"
                placeholder="Enter product name..."
                value={name}
                onChange={handleNameChange}
                className="w-full h-11 px-4 text-base bg-background border border-border/50 rounded-lg hover:border-border focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all duration-200 placeholder:text-muted-foreground/50"
                disabled={isSubmitting}
                autoFocus
              />
            </div>

            {/* URL Slug Field */}
            <div className="p-6 sm:p-8 border-b border-border/50 bg-card/50 backdrop-blur-sm">
              <label htmlFor="slug" className="block text-sm font-semibold text-foreground mb-2">
                URL Slug
              </label>
              <p className="text-xs text-muted-foreground mb-4">
                Auto-generated from product name. Used in the product URL for SEO.
              </p>
              <div className="flex gap-2">
                <input
                  id="slug"
                  type="text"
                  placeholder="product-url-slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="flex-1 h-11 px-4 text-sm font-mono bg-background border border-border/50 rounded-lg hover:border-border focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all duration-200 placeholder:text-muted-foreground/50"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={handleCopySlug}
                  disabled={!slug || isSubmitting}
                  className="h-11 w-11 flex items-center justify-center rounded-lg border border-border/50 hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Copy slug"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              </div>
            </div>

            {/* Info Section */}
            <div className="p-6 sm:p-8 bg-muted/30 border-b border-border/50">
              <p className="text-sm font-medium text-foreground mb-2">After Creation</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li className="flex gap-2">
                  <span className="text-primary/60">→</span>
                  <span>Add product images and gallery</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary/60">→</span>
                  <span>Set pricing and inventory</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary/60">→</span>
                  <span>Write description and details</span>
                </li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="p-6 sm:p-8 flex gap-3 bg-card/50 backdrop-blur-sm rounded-b-lg">
              <button
                type="button"
                onClick={() => router.push('/admin/products')}
                disabled={isSubmitting}
                className="flex-1 h-11 px-4 rounded-lg border border-border/50 hover:bg-muted transition-colors font-medium text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !name.trim() || !slug.trim()}
                className="flex-1 h-11 px-4 rounded-lg bg-primary hover:bg-primary/90 active:scale-95 transition-all font-medium text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="h-4 w-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" strokeWidth={1.5} />
                    Create
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
