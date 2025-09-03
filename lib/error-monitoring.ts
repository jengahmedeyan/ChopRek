"use client"

import { AppError } from "@/lib/error-handling"

export interface ErrorReport {
  id: string
  timestamp: string
  error: {
    message: string
    stack?: string
    name: string
  }
  context: {
    component?: string
    level?: string
    userId?: string
    url: string
    userAgent: string
    retryCount?: number
    [key: string]: any
  }
  severity: 'low' | 'medium' | 'high' | 'critical'
  category: 'network' | 'permission' | 'chunk' | 'render' | 'auth' | 'firebase' | 'unknown'
  resolved: boolean
}

class ErrorMonitoringService {
  private errors: ErrorReport[] = []
  private readonly maxErrors = 100
  private readonly storageKey = 'choprek-error-reports'

  constructor() {
    if (typeof window !== 'undefined') {
      this.loadFromStorage()
    }
  }

  reportError(error: AppError | Error): string {
    const errorReport: ErrorReport = {
      id: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      error: {
        message: error.message,
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : (error as AppError).code || 'AppError'
      },
      context: {
        ...(error instanceof Error ? {} : (error as AppError).context || {}),
        url: typeof window !== 'undefined' ? window.location.href : 'unknown',
        userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'unknown'
      },
      severity: this.determineSeverity(error),
      category: this.categorizeError(error),
      resolved: false
    }

    this.addError(errorReport)
    this.saveToStorage()
    
    if (process.env.NODE_ENV === 'production') {
      this.sendToExternalService(errorReport)
    }

    return errorReport.id
  }

  private determineSeverity(error: AppError | Error): ErrorReport['severity'] {
    const message = error.message.toLowerCase()
    
    if (message.includes('network') || message.includes('timeout')) {
      return 'medium'
    }
    
    if (message.includes('permission') || message.includes('auth')) {
      return 'high'
    }
    
    if (message.includes('chunk') || message.includes('loading')) {
      return 'low'
    }
    
    if (message.includes('firebase') || message.includes('database')) {
      return 'high'
    }
    
    return 'medium'
  }

  private categorizeError(error: AppError | Error): ErrorReport['category'] {
    const message = error.message.toLowerCase()
    
    if (message.includes('network') || message.includes('fetch')) return 'network'
    if (message.includes('permission') || message.includes('unauthorized')) return 'permission'
    if (message.includes('chunk') || message.includes('loading')) return 'chunk'
    if (message.includes('auth') || message.includes('login')) return 'auth'
    if (message.includes('firebase') || message.includes('firestore')) return 'firebase'
    if (message.includes('render') || message.includes('component')) return 'render'
    
    return 'unknown'
  }

  private addError(errorReport: ErrorReport) {
    this.errors.unshift(errorReport)
    
    // Keep only the latest errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(0, this.maxErrors)
    }
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.storageKey)
      if (stored) {
        this.errors = JSON.parse(stored)
      }
    } catch (error) {
      console.warn('Failed to load error reports from storage:', error)
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.errors))
    } catch (error) {
      console.warn('Failed to save error reports to storage:', error)
    }
  }

  private async sendToExternalService(errorReport: ErrorReport) {
    try {
      // Replace with your actual error reporting service
      // Example: Sentry, LogRocket, Bugsnag, etc.
      
      const response = await fetch('/api/error-reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(errorReport)
      })

      if (!response.ok) {
        console.warn('Failed to send error report to external service')
      }
    } catch (error) {
      console.warn('Error sending report to external service:', error)
    }
  }

  getErrors(): ErrorReport[] {
    return [...this.errors]
  }

  getErrorById(id: string): ErrorReport | undefined {
    return this.errors.find(error => error.id === id)
  }

  getErrorsByCategory(category: ErrorReport['category']): ErrorReport[] {
    return this.errors.filter(error => error.category === category)
  }

  getErrorsBySeverity(severity: ErrorReport['severity']): ErrorReport[] {
    return this.errors.filter(error => error.severity === severity)
  }

  getUnresolvedErrors(): ErrorReport[] {
    return this.errors.filter(error => !error.resolved)
  }

  markErrorAsResolved(id: string): boolean {
    const error = this.errors.find(err => err.id === id)
    if (error) {
      error.resolved = true
      this.saveToStorage()
      return true
    }
    return false
  }

  clearErrors(): void {
    this.errors = []
    this.saveToStorage()
  }

  clearResolvedErrors(): void {
    this.errors = this.errors.filter(error => !error.resolved)
    this.saveToStorage()
  }

  getErrorStats() {
    const total = this.errors.length
    const byCategory = this.errors.reduce((acc, error) => {
      acc[error.category] = (acc[error.category] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const bySeverity = this.errors.reduce((acc, error) => {
      acc[error.severity] = (acc[error.severity] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const unresolved = this.getUnresolvedErrors().length
    const resolved = total - unresolved

    return {
      total,
      unresolved,
      resolved,
      byCategory,
      bySeverity
    }
  }

  exportErrors(): string {
    return JSON.stringify(this.errors, null, 2)
  }

  importErrors(jsonData: string): boolean {
    try {
      const importedErrors = JSON.parse(jsonData)
      if (Array.isArray(importedErrors)) {
        this.errors = importedErrors
        this.saveToStorage()
        return true
      }
      return false
    } catch (error) {
      console.error('Failed to import errors:', error)
      return false
    }
  }
}

// Create singleton instance
export const errorMonitor = new ErrorMonitoringService()

// React hook for error monitoring
export function useErrorMonitoring() {
  const reportError = (error: AppError | Error) => {
    return errorMonitor.reportError(error)
  }

  const getErrors = () => errorMonitor.getErrors()
  const getStats = () => errorMonitor.getErrorStats()
  const clearErrors = () => errorMonitor.clearErrors()
  const markResolved = (id: string) => errorMonitor.markErrorAsResolved(id)

  return {
    reportError,
    getErrors,
    getStats,
    clearErrors,
    markResolved,
    monitor: errorMonitor
  }
}

// Global error handler setup
export function setupGlobalErrorHandling() {
  if (typeof window === 'undefined') return

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const error = new Error(event.reason?.message || 'Unhandled promise rejection')
    error.name = 'UnhandledPromiseRejection'
    
    errorMonitor.reportError(error)
    console.error('Unhandled promise rejection:', event.reason)
  })

  // Handle global JavaScript errors
  window.addEventListener('error', (event) => {
    const error = new Error(event.message || 'Global JavaScript error')
    error.name = event.error?.name || 'GlobalError'
    error.stack = event.error?.stack
    
    errorMonitor.reportError(error)
    console.error('Global error:', event.error)
  })

  // Handle resource loading errors
  window.addEventListener('error', (event) => {
    if (event.target && event.target !== window) {
      const target = event.target as HTMLElement
      const error = new Error(`Failed to load resource: ${target.tagName}`)
      error.name = 'ResourceError'
      
      errorMonitor.reportError(error)
      console.error('Resource loading error:', target)
    }
  }, true)
}
