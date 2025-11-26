"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import type { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { passwordSchema } from "@/lib/validations/auth"
import { Loader2, Eye, EyeOff, ArrowLeft } from "lucide-react"
import Link from "next/link"

interface PasswordStepProps {
  identifier: string
  onSubmit: (password: string) => void
  isLoading: boolean
  onBack?: () => void
}

export function PasswordStep({ identifier, onSubmit, isLoading, onBack }: PasswordStepProps) {
  const [showPassword, setShowPassword] = useState(false)

  const form = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      password: "",
    },
    mode: "onChange", // Add this to enable real-time validation
  })

  const handleSubmit = (data: z.infer<typeof passwordSchema>) => {
    onSubmit(data.password)
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h1 className="text-3xl font-bold text-gray-900">Enter password</h1>
        <p className="text-lg text-gray-600 font-medium">Welcome back! Please enter your password.</p>
      </div>

      <div className="bg-muted/50 p-4 rounded-lg flex items-center justify-between">
        <span className="text-base font-bold text-gray-800 truncate">{identifier}</span>
        {onBack && (
          <Button variant="ghost" size="sm" className="h-10 text-sm font-semibold" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Change
          </Button>
        )}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base text-cherry-700 font-bold">Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      placeholder="Enter your password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      {...field}
                      className="h-12 text-base font-medium pr-12"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-4 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <Eye className="h-5 w-5 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </FormControl>
                <FormMessage className="text-sm font-medium" />
                {!form.formState.errors.password && (
                  <p className="text-sm text-gray-600 font-medium">Enter your password to sign in</p>
                )}
              </FormItem>
            )}
          />

          <div className="text-sm text-right">
            <Link href="/auth/forgot-password" className="text-cherry-700 hover:underline font-bold text-base">
              Forgot password?
            </Link>
          </div>

          <Button type="submit" className="w-full h-14 text-base font-bold" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign in"
            )}
          </Button>
        </form>
      </Form>
    </div>
  )
}
