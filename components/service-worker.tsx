"use client"

import { useEffect } from "react"
import { toast } from "@/hooks/use-toast"

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      // Register service worker
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("Service Worker registered successfully:", registration)

          // Check for updates
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                  // New content is available
                  toast({
                    title: "App Updated",
                    description: "A new version is available. Refresh to update.",
                    action: (
                      <button
                        onClick={() => {
                          newWorker.postMessage({ type: "SKIP_WAITING" })
                          window.location.reload()
                        }}
                        className="text-sm underline"
                      >
                        Refresh
                      </button>
                    ),
                  })
                }
              })
            }
          })
        })
        .catch((error) => {
          console.error("Service Worker registration failed:", error)
        })

      // Listen for service worker messages
      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data && event.data.type === "SW_UPDATED") {
          toast({
            title: "App Updated",
            description: "The app has been updated. Please refresh the page.",
          })
        }
      })

      // Handle online/offline status
      const handleOnline = () => {
        toast({
          title: "Back Online",
          description: "Your internet connection has been restored.",
        })
      }

      const handleOffline = () => {
        toast({
          title: "You're Offline",
          description: "Some features may not be available.",
          variant: "destructive",
        })
      }

      window.addEventListener("online", handleOnline)
      window.addEventListener("offline", handleOffline)

      return () => {
        window.removeEventListener("online", handleOnline)
        window.removeEventListener("offline", handleOffline)
      }
    }

    // Global error handlers for chunk loading and network issues
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason
      
      // Check for chunk loading errors
      if (error && typeof error === 'object' && 'message' in error) {
        const message = String(error.message)
        if (message.includes('Loading chunk') || message.includes('ChunkLoadError')) {
          console.warn('Chunk loading error detected:', error)
          event.preventDefault()
          
          // Show a user-friendly message
          toast({
            title: "Connection Issue",
            description: "There was a problem loading some parts of the app. Please refresh the page.",
            variant: "destructive",
          })
          return
        }
      }
      
      // Check for network errors
      if (error && typeof error === 'object' && 'code' in error) {
        const code = String(error.code)
        if (code === 'NETWORK_ERROR' || code === 'ERR_INTERNET_DISCONNECTED') {
          console.warn('Network error detected:', error)
          event.preventDefault()
          
          toast({
            title: "Network Error",
            description: "Please check your internet connection and try again.",
            variant: "destructive",
          })
          return
        }
      }
    }

    const handleError = (event: ErrorEvent) => {
      const error = event.error
      
      // Check for chunk loading errors
      if (error && typeof error === 'object' && 'message' in error) {
        const message = String(error.message)
        if (message.includes('Loading chunk') || message.includes('ChunkLoadError')) {
          console.warn('Chunk loading error detected:', error)
          event.preventDefault()
          
          toast({
            title: "Connection Issue",
            description: "There was a problem loading some parts of the app. Please refresh the page.",
            variant: "destructive",
          })
          return
        }
      }
    }

    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    window.addEventListener('error', handleError)

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
      window.removeEventListener('error', handleError)
    }
  }, [])

  return null
}
