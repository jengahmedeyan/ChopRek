"use client"

import type React from "react"

import { useAuth } from "@/lib/auth-context"
import { Sidebar } from "@/components/layout/sidebar"
import { Navbar } from "@/components/layout/navbar"
import { AuthErrorBoundary, DataErrorBoundary, ComponentErrorBoundary } from "@/components/ui/error-boundary-hoc"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { loading } = useAuth()

  if (loading) {
    return (
      <ComponentErrorBoundary name="AdminLayoutLoading">
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </ComponentErrorBoundary>
    )
  }

  return (
    <AuthErrorBoundary>
      <div className="min-h-screen bg-gray-50 flex">
        <ComponentErrorBoundary name="AdminSidebar">
          <Sidebar/>
        </ComponentErrorBoundary>
        <div className="flex-1 flex flex-col min-w-0">
          <ComponentErrorBoundary name="AdminNavbar">
            <Navbar />
          </ComponentErrorBoundary>
          <main className="flex-1 p-4 lg:p-6 overflow-auto">
            <DataErrorBoundary>
              {children}
            </DataErrorBoundary>
          </main>
        </div>
      </div>
    </AuthErrorBoundary>
  )
}