// Service Worker registration and lifecycle management
// Handles service worker registration and updates

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) {
    console.warn("[v0] Service Workers not supported in this browser")
    return null
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    })

    console.log("[v0] Service Worker registered successfully")

    // Listen for updates
    registration.addEventListener("updatefound", () => {
      const newWorker = registration.installing
      if (newWorker) {
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            console.log("[v0] New Service Worker available, refresh recommended")
            // Optional: notify user of update
            window.dispatchEvent(
              new CustomEvent("sw-update-available", {
                detail: { registration },
              }),
            )
          }
        })
      }
    })

    return registration
  } catch (error) {
    console.error("[v0] Service Worker registration failed:", error)
    return null
  }
}

// Check for Service Worker updates
export async function checkForUpdates(): Promise<void> {
  if (!("serviceWorker" in navigator)) return

  try {
    const registration = await navigator.serviceWorker.getRegistration()
    if (registration) {
      await registration.update()
    }
  } catch (error) {
    console.warn("[v0] Error checking for Service Worker updates:", error)
  }
}
