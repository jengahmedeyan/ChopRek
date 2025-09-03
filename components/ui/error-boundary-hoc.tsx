"use client"

import React, { ReactNode } from "react"
import { ErrorBoundary } from "./error-boundary"
import { AlertTriangle, Shield, Server, Network, Database } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "./card"
import { Button } from "./button"

// Specialized Error Boundaries

interface WithErrorBoundaryOptions {
  level?: 'page' | 'component' | 'global'
  name?: string
  fallback?: ReactNode
  onError?: (error: any, errorInfo: any) => void
}

export function withErrorBoundary<T extends object>(
  Component: React.ComponentType<T>,
  options: WithErrorBoundaryOptions = {}
) {
  const WrappedComponent = (props: T) => (
    <ErrorBoundary
      level={options.level || 'component'}
      name={options.name || Component.displayName || Component.name}
      fallback={options.fallback}
      onError={options.onError}
    >
      <Component {...props} />
    </ErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  return WrappedComponent
}

// Page-level Error Boundary
export function PageErrorBoundary({ 
  children, 
  title = "Page Error",
  onError 
}: { 
  children: ReactNode
  title?: string
  onError?: (error: any, errorInfo: any) => void
}) {
  return (
    <ErrorBoundary 
      level="page" 
      name={title}
      onError={onError}
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
          <Card className="w-full max-w-md mx-auto">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-3 bg-red-100 rounded-full w-fit">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              <CardTitle>Page Unavailable</CardTitle>
              <p className="text-gray-600 mt-2">
                This page couldn't be loaded. Please try again or go back to the homepage.
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button onClick={() => window.location.reload()} className="w-full">
                  Reload Page
                </Button>
                <Button onClick={() => window.location.href = "/"} variant="ghost" className="w-full">
                  Go Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  )
}

// Auth-specific Error Boundary
export function AuthErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary 
      level="component" 
      name="AuthErrorBoundary"
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
          <Card className="w-full max-w-md mx-auto">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-3 bg-orange-100 rounded-full w-fit">
                <Shield className="h-8 w-8 text-orange-600" />
              </div>
              <CardTitle>Authentication Error</CardTitle>
              <p className="text-gray-600 mt-2">
                There was a problem with your session. Please sign in again.
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button onClick={() => window.location.href = "/auth"} className="w-full">
                  Sign In
                </Button>
                <Button onClick={() => window.location.href = "/"} variant="ghost" className="w-full">
                  Go Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  )
}

// API/Data Error Boundary
export function DataErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary 
      level="component" 
      name="DataErrorBoundary"
      fallback={
        <div className="p-6 text-center">
          <div className="mx-auto mb-4 p-3 bg-blue-100 rounded-full w-fit">
            <Database className="h-6 w-6 text-blue-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Data Loading Error
          </h3>
          <p className="text-gray-600 mb-4">
            We couldn't load the data. Please try again.
          </p>
          <Button onClick={() => window.location.reload()} size="sm">
            Retry
          </Button>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  )
}

// Network/API Error Boundary
export function NetworkErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary 
      level="component" 
      name="NetworkErrorBoundary"
      fallback={
        <div className="p-6 text-center">
          <div className="mx-auto mb-4 p-3 bg-blue-100 rounded-full w-fit">
            <Network className="h-6 w-6 text-blue-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Connection Problem
          </h3>
          <p className="text-gray-600 mb-4">
            Please check your internet connection and try again.
          </p>
          <Button onClick={() => window.location.reload()} size="sm">
            Retry
          </Button>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  )
}

// Firebase/Backend Error Boundary
export function BackendErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary 
      level="component" 
      name="BackendErrorBoundary"
      fallback={
        <div className="p-6 text-center">
          <div className="mx-auto mb-4 p-3 bg-purple-100 rounded-full w-fit">
            <Server className="h-6 w-6 text-purple-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Service Unavailable
          </h3>
          <p className="text-gray-600 mb-4">
            Our services are temporarily unavailable. Please try again in a moment.
          </p>
          <Button onClick={() => window.location.reload()} size="sm">
            Retry
          </Button>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  )
}

// Component-level Error Boundary (minimal UI impact)
export function ComponentErrorBoundary({ 
  children, 
  name,
  fallback 
}: { 
  children: ReactNode
  name?: string
  fallback?: ReactNode
}) {
  return (
    <ErrorBoundary 
      level="component" 
      name={name}
      fallback={fallback || (
        <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
          <div className="flex items-center gap-2 text-red-800">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">Component Error</span>
          </div>
          <p className="text-xs text-red-600 mt-1">
            This component failed to load. Please refresh the page.
          </p>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  )
}

// Global App Error Boundary
export function GlobalErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary 
      level="global" 
      name="GlobalErrorBoundary"
      onError={(error, errorInfo) => {
        // Global error reporting logic
        console.error('Global Error:', error, errorInfo)
        
        // Send to error reporting service
        if (typeof window !== 'undefined' && 'gtag' in window) {
          (window as any).gtag('event', 'exception', {
            description: error.message,
            fatal: true
          })
        }
      }}
    >
      {children}
    </ErrorBoundary>
  )
}
