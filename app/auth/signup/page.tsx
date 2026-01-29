"use client"

import { useAuth } from "@/lib/auth-context"
import { SignUpForm } from "@/components/auth/signup-form"
import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function SignUpPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user) {
      if (user.role === "admin") {
        router.push("/admin/dashboard")
      } else {
        router.push("/employee/menu")
      }
    }
  }, [user, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your lunch experience...</p>
          <p className="mt-2 text-sm text-gray-500">This should only take a moment</p>
        </div>
      </div>
    )
  }

  if (user) {
    return null // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 shadow-lg mb-4">
            <span className="text-3xl">🍽️</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">ChopRek</h1>
          <p className="text-gray-600">Streamline your office lunch ordering</p>
        </div>
        <SignUpForm />
      </div>
    </div>
  )
} 