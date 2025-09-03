"use client"

import React, { Component, ErrorInfo, ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, RefreshCw, Home, Bug, Wifi, Server, Database, Shield } from "lucide-react"
import { handleError, logError, isNetworkError, isPermissionError, type AppError } from "@/lib/error-handling"

interface Props {
  children: ReactNode
  fallback?: ReactNode
  level?: 'page' | 'component' | 'global'
  name?: string
  onError?: (error: AppError, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
  appError?: AppError
  retryCount: number
  errorId: string
}

type ErrorCategory = 'network' | 'permission' | 'chunk' | 'render' | 'auth' | 'firebase' | 'unknown'

interface ErrorCategoryInfo {
  icon: React.ComponentType<{ className?: string }>
  color: string
  title: string
  description: string
  suggestions: string[]
  canRetry: boolean
}

const ERROR_CATEGORIES: Record<ErrorCategory, ErrorCategoryInfo> = {
  network: {
    icon: Wifi,
    color: 'text-blue-600 bg-blue-100',
    title: 'Connection Issue',
    description: 'There was a problem connecting to our servers.',
    suggestions: [
      'Check your internet connection',
      'Refresh the page',
      'Try again in a few moments'
    ],
    canRetry: true
  },
  permission: {
    icon: Shield,
    color: 'text-orange-600 bg-orange-100',
    title: 'Access Denied',
    description: 'You don\'t have permission to access this resource.',
    suggestions: [
      'Sign in with the correct account',
      'Contact your administrator',
      'Go to the homepage'
    ],
    canRetry: false
  },
  chunk: {
    icon: RefreshCw,
    color: 'text-yellow-600 bg-yellow-100',
    title: 'Loading Issue',
    description: 'There was a problem loading parts of the application.',
    suggestions: [
      'Clear your browser cache',
      'Refresh the page',
      'Check your internet connection'
    ],
    canRetry: true
  },
  render: {
    icon: Bug,
    color: 'text-purple-600 bg-purple-100',
    title: 'Display Error',
    description: 'Something went wrong while displaying this content.',
    suggestions: [
      'Refresh the page',
      'Try a different browser',
      'Clear your browser data'
    ],
    canRetry: true
  },
  auth: {
    icon: Shield,
    color: 'text-red-600 bg-red-100',
    title: 'Authentication Error',
    description: 'There was a problem with your session.',
    suggestions: [
      'Sign in again',
      'Clear your browser data',
      'Check your network connection'
    ],
    canRetry: false
  },
  firebase: {
    icon: Database,
    color: 'text-indigo-600 bg-indigo-100',
    title: 'Service Unavailable',
    description: 'Our backend services are temporarily unavailable.',
    suggestions: [
      'Try again in a few moments',
      'Check your internet connection',
      'Contact support if this persists'
    ],
    canRetry: true
  },
  unknown: {
    icon: AlertTriangle,
    color: 'text-red-600 bg-red-100',
    title: 'Unexpected Error',
    description: 'An unexpected error occurred.',
    suggestions: [
      'Refresh the page',
      'Try again later',
      'Contact support if this persists'
    ],
    canRetry: true
  }
}

export class ErrorBoundary extends Component<Props, State> {
  private retryTimeouts: NodeJS.Timeout[] = []

  constructor(props: Props) {
    super(props)
    this.state = { 
      hasError: false, 
      retryCount: 0,
      errorId: this.generateErrorId()
    }
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private categorizeError(error: Error): ErrorCategory {
    const message = error.message?.toLowerCase() || ''
    const stack = error.stack?.toLowerCase() || ''

    // Network errors
    if (isNetworkError(error) || 
        message.includes('network') || 
        message.includes('fetch') ||
        message.includes('timeout')) {
      return 'network'
    }

    // Permission errors
    if (isPermissionError(error) || 
        message.includes('permission') || 
        message.includes('unauthorized') ||
        message.includes('forbidden')) {
      return 'permission'
    }

    // Chunk loading errors
    if (message.includes('loading chunk') || 
        message.includes('chunkloaderror') ||
        message.includes('loading css chunk')) {
      return 'chunk'
    }

    // Authentication errors
    if (message.includes('auth') || 
        message.includes('login') ||
        message.includes('session')) {
      return 'auth'
    }

    // Firebase errors
    if (message.includes('firebase') || 
        message.includes('firestore') ||
        stack.includes('firebase')) {
      return 'firebase'
    }

    // Render errors
    if (stack.includes('react') || 
        message.includes('render') ||
        message.includes('component')) {
      return 'render'
    }

    return 'unknown'
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { 
      hasError: true, 
      error,
      errorId: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const appError = handleError(error, `error-boundary-${this.props.level || 'component'}`)
    
    // Enhanced error logging
    logError({
      ...appError,
      context: {
        ...appError.context,
        boundaryLevel: this.props.level || 'component',
        boundaryName: this.props.name,
        componentStack: errorInfo.componentStack,
        errorId: this.state.errorId,
        retryCount: this.state.retryCount,
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString()
      }
    })

    this.setState({ 
      errorInfo, 
      appError 
    })

    // Call optional error callback
    if (this.props.onError) {
      this.props.onError(appError, errorInfo)
    }

    // Auto-retry for certain error types (with exponential backoff)
    const category = this.categorizeError(error)
    if (ERROR_CATEGORIES[category].canRetry && this.state.retryCount < 3) {
      const delay = Math.pow(2, this.state.retryCount) * 1000 // 1s, 2s, 4s
      const timeout = setTimeout(() => {
        this.handleRetry()
      }, delay)
      this.retryTimeouts.push(timeout)
    }
  }

  componentWillUnmount() {
    // Clear any pending retry timeouts
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout))
  }

  handleRetry = () => {
    this.setState(prevState => ({ 
      hasError: false, 
      error: undefined, 
      errorInfo: undefined,
      appError: undefined,
      retryCount: prevState.retryCount + 1,
      errorId: this.generateErrorId()
    }))
    
    // Force a re-render by updating key
    if (this.state.retryCount >= 2) {
      window.location.reload()
    }
  }

  handleGoHome = () => {
    window.location.href = "/"
  }

  handleReportIssue = () => {
    const error = this.state.error
    const errorInfo = this.state.errorInfo
    
    const reportData = {
      errorId: this.state.errorId,
      message: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString()
    }

    // Copy to clipboard for easy reporting
    navigator.clipboard.writeText(JSON.stringify(reportData, null, 2))
      .then(() => {
        alert('Error details copied to clipboard! Please share this with support.')
      })
      .catch(() => {
        console.log('Error report data:', reportData)
        alert('Error details logged to console. Please check the browser console and share with support.')
      })
  }

  render() {
    if (this.state.hasError && this.state.error) {
      const category = this.categorizeError(this.state.error)
      const categoryInfo = ERROR_CATEGORIES[category]
      const Icon = categoryInfo.icon

      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg mx-auto">
            <CardHeader className="text-center">
              <div className={`mx-auto mb-4 p-3 rounded-full w-fit ${categoryInfo.color}`}>
                <Icon className="h-8 w-8" />
              </div>
              
              <div className="flex items-center justify-center gap-2 mb-2">
                <CardTitle className="text-xl font-semibold text-gray-900">
                  {categoryInfo.title}
                </CardTitle>
                <Badge variant="outline" className="text-xs">
                  {category.toUpperCase()}
                </Badge>
              </div>
              
              <CardDescription className="text-gray-600">
                {categoryInfo.description}
              </CardDescription>

              {this.state.retryCount > 0 && (
                <Badge variant="secondary" className="mt-2">
                  Attempt {this.state.retryCount + 1}
                </Badge>
              )}
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-2">
                {categoryInfo.canRetry && (
                  <Button 
                    onClick={this.handleRetry} 
                    className="w-full"
                    disabled={this.state.retryCount >= 3}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {this.state.retryCount >= 3 ? 'Maximum Retries Reached' : 'Try Again'}
                  </Button>
                )}

                <Button onClick={this.handleGoHome} variant="ghost" className="w-full">
                  <Home className="h-4 w-4 mr-2" />
                  Go to Homepage
                </Button>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-medium text-blue-900 mb-2">What you can try:</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  {categoryInfo.suggestions.map((suggestion, index) => (
                    <li key={index}>• {suggestion}</li>
                  ))}
                </ul>
              </div>

              {process.env.NODE_ENV === "development" && (
                <details className="p-3 bg-gray-100 rounded-lg">
                  <summary className="cursor-pointer font-medium text-gray-700 mb-2">
                    Error Details (Development)
                  </summary>
                  <div className="space-y-2 text-xs">
                    <div>
                      <strong>Error ID:</strong> {this.state.errorId}
                    </div>
                    <div>
                      <strong>Category:</strong> {category}
                    </div>
                    <div>
                      <strong>Message:</strong>
                      <pre className="mt-1 text-red-600 overflow-auto">
                        {this.state.error.message}
                      </pre>
                    </div>
                    {this.state.error.stack && (
                      <div>
                        <strong>Stack:</strong>
                        <pre className="mt-1 text-gray-600 overflow-auto max-h-32">
                          {this.state.error.stack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}

              <div className="flex justify-between items-center pt-4 border-t">
                <div className="flex items-center gap-2 text-gray-600">
                  <span className="text-lg">🍽️</span>
                  <span className="font-semibold">ChopRek</span>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={this.handleReportIssue}
                  className="text-xs"
                >
                  <Bug className="h-3 w-3 mr-1" />
                  Report Issue
                </Button>
              </div>

              <p className="text-xs text-gray-500 text-center">
                Error ID: {this.state.errorId}
              </p>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
} 