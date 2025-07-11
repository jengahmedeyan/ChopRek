"use client"

import React, { Component, ErrorInfo, ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, RefreshCw, Home } from "lucide-react"

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined })
    window.location.reload()
  }

  handleGoHome = () => {
    window.location.href = "/"
  }

  render() {
    if (this.state.hasError) {
      // Check if it's a chunk loading error
      const isChunkError = this.state.error?.message?.includes("Loading chunk") || 
                          this.state.error?.message?.includes("ChunkLoadError")

      if (isChunkError) {
        return (
          <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
            <Card className="w-full max-w-md mx-auto">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-3 bg-yellow-100 rounded-full w-fit">
                  <AlertTriangle className="h-8 w-8 text-yellow-600" />
                </div>
                <CardTitle className="text-xl font-semibold text-gray-900">Connection Issue</CardTitle>
                <CardDescription className="text-gray-600">
                  There was a problem loading some parts of the app. This might be due to a poor internet connection.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Button onClick={this.handleRetry} className="w-full">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry
                  </Button>

                  <Button onClick={this.handleGoHome} variant="ghost" className="w-full">
                    <Home className="h-4 w-4 mr-2" />
                    Go to Homepage
                  </Button>
                </div>

                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-medium text-blue-900 mb-2">What you can try:</h3>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Check your internet connection</li>
                    <li>• Refresh the page</li>
                    <li>• Clear your browser cache</li>
                    <li>• Try again in a few moments</li>
                  </ul>
                </div>

                <div className="text-center pt-4 border-t">
                  <div className="flex items-center justify-center gap-2 text-gray-600">
                    <span className="text-lg">🍽️</span>
                    <span className="font-semibold">ChopRek</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Technical issue detected</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )
      }

      // Default error fallback
      return this.props.fallback || (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
          <Card className="w-full max-w-md mx-auto">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-3 bg-red-100 rounded-full w-fit">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              <CardTitle className="text-xl font-semibold text-gray-900">Something went wrong</CardTitle>
              <CardDescription className="text-gray-600">
                An unexpected error occurred. Please try refreshing the page.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Button onClick={this.handleRetry} className="w-full">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>

                <Button onClick={this.handleGoHome} variant="ghost" className="w-full">
                  <Home className="h-4 w-4 mr-2" />
                  Go to Homepage
                </Button>
              </div>

              {process.env.NODE_ENV === "development" && this.state.error && (
                <details className="mt-4 p-3 bg-gray-100 rounded-lg">
                  <summary className="cursor-pointer font-medium text-gray-700">Error Details</summary>
                  <pre className="mt-2 text-xs text-gray-600 overflow-auto">
                    {this.state.error.message}
                  </pre>
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
} 