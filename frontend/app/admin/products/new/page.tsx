'use client'

import type React from 'react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Loader2, ChevronLeft, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { adminService } from '@/services/admin'
import { useToast } from '@/hooks/use-toast'
import { generateSlug } from '@/lib/utils'
import { useAdminAuth } from '@/contexts/admin/auth-context'

const productSchema = z.object({
  name: z.string().min(3, { message: 'Name must be at least 3 characters' }),
  slug: z.string().min(3, { message: 'Slug must be at least 3 characters' }),
})

type ProductFormValues = z.infer<typeof productSchema>

export default function NewProductPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAdminAuth()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      slug: '',
    },
  })

  const { setValue } = form

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue('name', e.target.value)
    if (e.target.value) {
      setValue('slug', generateSlug(e.target.value))
    }
  }

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/admin/login')
    }
  }, [isAuthenticated, authLoading, router])

  const onSubmit = async (data: ProductFormValues) => {
    try {
      setIsSubmitting(true)

      const productData = {
        name: data.name,
        slug: data.slug,
        image_urls: [],
        thumbnail_url: undefined,
        variants: [],
        is_new: true,
        is_featured: false,
        is_sale: false,
        is_flash_sale: false,
        is_luxury_deal: false,
      }

      const response = await adminService.createProduct(productData)
      const productId = response?.id

      if (!productId) {
        throw new Error('Product created but no ID was returned')
      }

      toast({
        title: 'Success',
        description: 'Product created successfully',
      })

      setTimeout(() => {
        router.push(`/admin/products/${productId}/edit`)
      }, 500)
    } catch (error) {
      console.error('[v0] Error creating product:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to create product'
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (authLoading || !isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-foreground" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Bar */}
      <div className="sticky top-0 z-40 border-b border-border/40 bg-background/95 backdrop-blur-sm">
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/admin/products')}
            className="gap-2 text-muted-foreground hover:text-foreground hover:bg-muted/50"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back</span>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 py-16 md:py-24">
        <div className="mx-auto w-full max-w-md">
          {/* Hero Section */}
          <div className="mb-12 space-y-4 text-center">
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-primary/10">
              <Package className="h-6 w-6 text-primary" />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Create New Product
              </h1>
              <p className="text-base text-muted-foreground">
                Add a name and URL slug. Edit details later.
              </p>
            </div>
          </div>

          {/* Form Card */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Product Name Field */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm font-medium text-foreground">Product Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        onChange={(e) => {
                          field.onChange(e)
                          handleNameChange(e)
                        }}
                        placeholder="Wireless Headphones"
                        disabled={isSubmitting}
                        className="h-11 bg-muted/50 border-border hover:bg-muted focus:bg-background focus:border-primary transition-colors text-base rounded-lg"
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              {/* URL Slug Field */}
              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm font-medium text-foreground">URL Slug</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">/products/</span>
                        <Input
                          {...field}
                          placeholder="wireless-headphones"
                          disabled={isSubmitting}
                          className="flex-1 h-11 bg-muted/50 border-border hover:bg-muted focus:bg-background focus:border-primary transition-colors text-base rounded-lg font-mono text-sm"
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs" />
                    <p className="text-xs text-muted-foreground">Auto-generated from name. Used for SEO.</p>
                  </FormItem>
                )}
              />

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/admin/products')}
                  className="h-11 flex-1 border-border hover:bg-muted rounded-lg font-medium"
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !form.watch('name').trim()}
                  className="h-11 flex-1 bg-primary hover:bg-primary/90 rounded-lg font-medium gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Creating</span>
                    </>
                  ) : (
                    <>
                      <Package className="h-4 w-4" />
                      <span>Create</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>

          {/* Hint */}
          <p className="mt-12 text-center text-sm text-muted-foreground">
            You can edit all details after creation
          </p>
        </div>
      </main>
    </div>
  )
}

