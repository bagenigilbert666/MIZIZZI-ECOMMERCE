"use client"

import { Header } from "@/components/layout/header"
import { FooterWithSettings as Footer } from "@/components/layout/footer-with-settings"
import { Providers as AppProviders } from "./providers"
import { Providers as StateProviders } from "@/components/providers"
import { ThemeProvider } from "@/contexts/theme-context"
import type React from "react"
import { TopBar } from "@/components/layout/top-bar"
import { usePathname } from "next/navigation"

export default function ClientRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ThemeProvider>
      <StateProviders>
        <AppProviders>
          <LayoutRenderer>{children}</LayoutRenderer>
        </AppProviders>
      </StateProviders>
    </ThemeProvider>
  )
}

// Client component for conditional rendering
function LayoutRenderer({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAdminRoute = pathname?.startsWith("/admin")
  const isAuthRoute = pathname?.startsWith("/auth")

  // Don't render standard layout components for admin routes or auth routes
  if (isAdminRoute || isAuthRoute) {
    return children
  }

  return (
    <>
      <TopBar />
      <Header />
      <main className="min-h-screen">{children}</main>
      <Footer />
    </>
  )
}
