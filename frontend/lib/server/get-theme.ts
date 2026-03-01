import type { Theme } from "@/types/theme"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://mizizzi-ecommerce-1.onrender.com"

export async function getActiveTheme(): Promise<Theme | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/theme/active`, {
      next: { revalidate: 60 }, // Cache for 60 seconds
    })

    if (!response.ok) {
      console.error("[v0] Failed to fetch theme:", response.status)
      return null
    }

    const data = await response.json()

    if (data.success && data.theme) {
      return data.theme
    }

    return null
  } catch (error) {
    console.error("[v0] Error fetching theme on server:", error)
    return null
  }
}

export function generateThemeCSS(theme: Theme | null): string {
  if (!theme || !theme.colors) {
    return ""
  }

  const { colors } = theme

  return `
    :root {
      --color-primary: ${colors.primary.main};
      --color-primary-light: ${colors.primary.light};
      --color-primary-dark: ${colors.primary.dark};
      --color-secondary: ${colors.secondary.main};
      --color-accent: ${colors.secondary.accent};
      --color-background: ${colors.background.main};
      --color-card-bg: ${colors.background.card};
      --color-surface: ${colors.background.surface};
      --color-text-primary: ${colors.text.primary};
      --color-text-secondary: ${colors.text.secondary};
      --color-text-on-primary: ${colors.text.onPrimary};
      --color-border: ${colors.border.main};
      --color-divider: ${colors.border.divider};
      --color-button-primary-bg: ${colors.button.primary.background};
      --color-button-primary-text: ${colors.button.primary.text};
      --color-button-primary-hover: ${colors.button.primary.hover};
      --color-button-secondary-bg: ${colors.button.secondary.background};
      --color-button-secondary-text: ${colors.button.secondary.text};
      --color-success: ${colors.status.success};
      --color-warning: ${colors.status.warning};
      --color-error: ${colors.status.error};
      --color-info: ${colors.status.info};
      --color-header-bg: ${colors.header.background};
      --color-header-text: ${colors.header.text};
      --color-footer-bg: ${colors.footer.background};
      --color-footer-text: ${colors.footer.text};
      --color-link: ${colors.link.main};
      --color-link-hover: ${colors.link.hover};
      --color-badge-bg: ${colors.badge.background};
      --color-badge-text: ${colors.badge.text};
      --color-nav-bg: ${colors.navigation.background};
      --color-nav-text: ${colors.navigation.text};
      --color-nav-active: ${colors.navigation.active};
      --color-carousel-bg: ${colors.carousel.background};
      --color-carousel-overlay-dark: ${colors.carousel.overlayDark};
      --color-carousel-overlay-light: ${colors.carousel.overlayLight};
      --color-carousel-badge-bg: ${colors.carousel.badgeBg};
      --color-carousel-badge-text: ${colors.carousel.badgeText};
    }
  `
}
