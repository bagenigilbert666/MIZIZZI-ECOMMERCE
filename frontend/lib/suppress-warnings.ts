// Suppress React 19 ref deprecation warning from Radix UI
// This is a known issue with Radix UI that will be fixed in future versions
export function suppressRadixUIRefWarning() {
  if (typeof window === "undefined") return

  const originalError = console.error

  console.error = function (...args: any[]) {
    // Suppress the React 19 ref warning from Radix UI components
    const errorMessage = args[0]?.toString?.() || ""
    
    if (
      errorMessage.includes("Accessing element.ref was removed in React 19") ||
      errorMessage.includes("ref is now a regular prop") ||
      (args[0] instanceof Error && args[0].message?.includes("element.ref"))
    ) {
      // Silently ignore this warning
      return
    }

    // Call original console.error for other errors
    originalError.apply(console, args)
  }
}
