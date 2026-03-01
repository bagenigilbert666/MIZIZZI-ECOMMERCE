import { getActiveTheme } from "@/lib/server/get-theme"
import ThemeCustomizerClient from "./theme-customizer-client"

export default async function ThemePage() {
  // Fetch theme server-side during page render - no loading state needed
  const initialTheme = await getActiveTheme()

  // Render the client component with pre-fetched data
  return <ThemeCustomizerClient initialTheme={initialTheme} />
}
