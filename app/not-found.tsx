"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Home,
  Search,
  ArrowLeft,
  UtensilsCrossed,
  ShoppingCart,
  FileText,
  Users,
  Settings,
  AlertTriangle,
  UserPlus,
} from "lucide-react"
import { useSearchParams } from "next/navigation";

export default function NotFound() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [currentPath, setCurrentPath] = useState("")

  useEffect(() => {
    setCurrentPath(window.location.pathname)
  }, [])

  const handleGoBack = () => {
    if (window.history.length > 1) {
      router.back()
    } else {
      router.push("/")
    }
  }

  // Quick links for different user types
  const adminLinks = [
    {
      title: "Dashboard",
      description: "View your main dashboard",
      icon: Home,
      href: "/admin/dashboard",
      badge: null as string | null,
    },
    {
      title: "Menu Creator",
      description: "Manage and create menus",
      icon: UtensilsCrossed,
      href: "/admin/menu",
      badge: null as string | null,
    },
    {
      title: "Orders",
      description: "View and manage all orders",
      icon: ShoppingCart,
      href: "/admin/orders",
      badge: null as string | null,
    },
    {
      title: "Reports",
      description: "View analytics and reports",
      icon: FileText,
      href: "/admin/reports",
      badge: null as string | null,
    },
    {
      title: "Users",
      description: "Manage system users",
      icon: Users,
      href: "/admin/users",
      badge: null as string | null,
    },
    {
      title: "Settings",
      description: "Configure your preferences",
      icon: Settings,
      href: "/admin/settings",
      badge: null as string | null,
    },
  ]

  const employeeLinks = [
    {
      title: "Today's Menu",
      description: "Check out today's lunch options",
      icon: UtensilsCrossed,
      href: "/employee/menu",
      badge: "Popular" as string | null,
    },
    {
      title: "My Orders",
      description: "Track your order history",
      icon: ShoppingCart,
      href: "/employee/orders",
      badge: null as string | null,
    },
  ]

  const guestLinks = [
    {
      title: "Home",
      description: "Return to the homepage",
      icon: Home,
      href: "/",
      badge: null as string | null,
    },
    {
      title: "Sign In",
      description: "Access your account",
      icon: Users,
      href: "auth/?tab=login",
      badge: null as string | null,
    },
    {
      title: "Sign Up",
      description: "Create a new account",
      icon: UserPlus,
      href: "auth/?tab=signup",
      badge: null as string | null,
    },
  ]

  let quickLinks = guestLinks
  if (!loading && user) {
    quickLinks = user.role === "admin" ? adminLinks : employeeLinks
  }

  const getErrorSuggestion = (path: string) => {
    if (path.includes("/admin")) {
      return "This admin page doesn't exist. Check if you have the right permissions."
    }
    if (path.includes("/employee")) {
      return "This employee page wasn't found. Try checking the menu or your orders."
    }
    if (path.includes("/api")) {
      return "This API endpoint doesn't exist. Check the API documentation."
    }
    return "This page doesn't exist. It might have been moved or deleted."
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl mx-auto">
        {/* Main 404 Card */}
        <Card className="mb-8">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-4 bg-red-100 rounded-full w-fit">
              <AlertTriangle className="h-12 w-12 text-red-600" />
            </div>
            <CardTitle className="text-3xl font-bold text-gray-900 mb-2">404 - Page Not Found</CardTitle>
            <CardDescription className="text-lg text-gray-600 max-w-md mx-auto">
              {getErrorSuggestion(currentPath)}
            </CardDescription>
            {currentPath && (
              <div className="mt-4 p-3 bg-gray-100 rounded-lg">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Requested URL:</span>
                  <code className="ml-2 px-2 py-1 bg-white rounded text-red-600">{currentPath}</code>
                </p>
              </div>
            )}
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
              <Button onClick={handleGoBack} variant="outline" className="flex-1 bg-transparent">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
              <Button onClick={() => router.push("/")} className="flex-1">
                <Home className="h-4 w-4 mr-2" />
                Go Home
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Links Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-center">Quick Links</CardTitle>
            <CardDescription className="text-center">
              {loading ? "Loading suggestions..." : "Here are some popular pages you might be looking for"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-20 bg-gray-200 rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {quickLinks.map((link) => {
                  const Icon = link.icon
                  return (
                    <Button
                      key={link.href}
                      variant="ghost"
                      className="h-auto p-4 flex flex-col items-start text-left hover:bg-gray-50 border border-gray-200"
                      onClick={() => router.push(link.href)}
                    >
                      <div className="flex items-center justify-between w-full mb-2">
                        <div className="flex items-center gap-2">
                          <Icon className="h-5 w-5 text-blue-600" />
                          <span className="font-medium">{link.title}</span>
                        </div>
                        {link.badge && (
                          <Badge variant="secondary" className="text-xs">
                            {link.badge}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{link.description}</p>
                    </Button>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* App Info Footer */}
        <div className="text-center mt-8 p-6 bg-white rounded-lg shadow-sm">
          <div className="flex items-center justify-center gap-2 text-gray-700 mb-2">
            <span className="text-2xl">🍽️</span>
            <span className="font-bold text-xl">ChopRek</span>
          </div>
          <p className="text-sm text-gray-500">Lunch Ordering System - Making meal ordering simple and efficient</p>
        </div>
      </div>
    </div>
  )
}
