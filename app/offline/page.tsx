"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { WifiOff, RefreshCw, Home, Clock } from "lucide-react"

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    // Check initial online status
    setIsOnline(navigator.onLine)
    setLastUpdated(new Date())

    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true)
      setLastUpdated(new Date())
    }

    const handleOffline = () => {
      setIsOnline(false)
      setLastUpdated(new Date())
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  const handleRetry = () => {
    // Simple reload without complex logic
    window.location.reload()
  }

  const handleGoHome = () => {
    window.location.href = "/"
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-gray-100 rounded-full w-fit">
            <WifiOff className="h-8 w-8 text-gray-600" />
          </div>
          <CardTitle className="text-xl font-semibold text-gray-900">You're Offline</CardTitle>
          <CardDescription className="text-gray-600">
            It looks like you've lost your internet connection. Don't worry, you can still view some cached content.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Connection Status */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${isOnline ? "bg-green-500" : "bg-red-500"}`} />
              <span className="text-sm font-medium">{isOnline ? "Back Online!" : "No Connection"}</span>
            </div>
            {lastUpdated && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Clock className="h-3 w-3" />
                {lastUpdated.toLocaleTimeString()}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            <Button onClick={handleRetry} className="w-full" variant={isOnline ? "default" : "outline"}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {isOnline ? "Reload Page" : "Try Again"}
            </Button>

            <Button onClick={handleGoHome} variant="ghost" className="w-full">
              <Home className="h-4 w-4 mr-2" />
              Go to Homepage
            </Button>
          </div>

          {/* Helpful Tips */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">While you're offline:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Check your internet connection</li>
              <li>• Try refreshing the page</li>
              <li>• Some cached content may still be available</li>
              <li>• Your data will sync when you're back online</li>
            </ul>
          </div>

          {/* App Info */}
          <div className="text-center pt-4 border-t">
            <div className="flex items-center justify-center gap-2 text-gray-600">
              <span className="text-lg">🍽️</span>
              <span className="font-semibold">ChopRek</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Offline mode - Limited functionality</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
