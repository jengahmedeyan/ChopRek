"use client"

import type React from "react"

import { useAuth } from "@/lib/auth-context"
import { Sidebar } from "@/components/layout/sidebar"
import { Navbar } from "@/components/layout/navbar"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { AuthErrorBoundary, DataErrorBoundary, ComponentErrorBoundary } from "@/components/ui/error-boundary-hoc"

export default function EmployeeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && (!user || (user.role !== "employee" && user.role !== "admin"))) {
      router.push("/")
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <ComponentErrorBoundary name="EmployeeLayoutLoading">
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </ComponentErrorBoundary>
    )
  }

  if (!user || (user.role !== "employee" && user.role !== "admin")) {
    return null
  }

  return (
    <AuthErrorBoundary>
      <div className="min-h-screen bg-gray-50 flex">
        <ComponentErrorBoundary name="EmployeeSidebar">
          <Sidebar />
        </ComponentErrorBoundary>
        <div className="flex-1 flex flex-col min-w-0">
          <ComponentErrorBoundary name="EmployeeNavbar">
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
