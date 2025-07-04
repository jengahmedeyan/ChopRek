"use client"

import { useAuth } from "@/lib/auth-context"
import { LoginForm } from "@/components/auth/login-form"
import { SignUpForm } from "@/components/auth/signup-form"
import { EnhancedMenuCreator } from "@/components/admin/enhanced-menu-creator"
import { OrdersDashboard } from "@/components/admin/orders-dashboard"
import { ComprehensiveReports } from "@/components/admin/comprehensive-reports"
import { MenuViewer } from "@/components/employee/menu-viewer"
import { Sidebar } from "@/components/layout/sidebar"
import { Navbar } from "@/components/layout/navbar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, RefreshCw } from "lucide-react"
import { useState } from "react"
import { AnalyticsDashboard } from "@/components/admin/analytics-dashboard"
import MyOrders from "@/components/employee/my-orders"

export default function Home() {
  const { user, loading, error } = useAuth()
  const [authMode, setAuthMode] = useState<"login" | "signup">("login")
  const [activeTab, setActiveTab] = useState(user?.role === "admin" ? "dashboard" : "menu")

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="ml-2">
                <RefreshCw className="h-4 w-4 mr-1" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

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

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🍽️</div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">LunchHub</h1>
            <p className="text-gray-600">Professional lunch ordering system for modern offices</p>
          </div>

          <Tabs value={authMode} onValueChange={(value) => setAuthMode(value as "login" | "signup")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Create Account</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <LoginForm />
            </TabsContent>
            <TabsContent value="signup">
              <SignUpForm />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    )
  }

  // Show main application
  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="flex-1 flex flex-col">
        <Navbar />

        <main className="flex-1 p-6 overflow-auto">
          {user.role === "admin" ? (
            <>
              {activeTab === "dashboard" && <OrdersDashboard />}
              {activeTab === "orders" && <OrdersDashboard />}
              {activeTab === "menu" && <EnhancedMenuCreator />}
              {activeTab === "analytics" && <AnalyticsDashboard />}
              {activeTab === "reports" && <ComprehensiveReports />}
              {activeTab === "users" && (
                <div className="text-center py-12">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">User Management</h3>
                  <p className="text-gray-600">Coming Soon - Comprehensive user management system</p>
                </div>
              )}
              {activeTab === "departments" && (
                <div className="text-center py-12">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Department Management</h3>
                  <p className="text-gray-600">Coming Soon - Department budgets and management</p>
                </div>
              )}
              {activeTab === "notifications" && (
                <div className="text-center py-12">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Notifications</h3>
                  <p className="text-gray-600">Coming Soon - Real-time notification system</p>
                </div>
              )}
              {activeTab === "settings" && (
                <div className="text-center py-12">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Settings</h3>
                  <p className="text-gray-600">Coming Soon - System configuration and preferences</p>
                </div>
              )}
            </>
          ) : (
            <>
              {activeTab === "menu" && <MenuViewer />}
              {activeTab === "orders" && <MyOrders />}
              {activeTab === "profile" && (
                <div className="text-center py-12">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Profile Settings</h3>
                  <p className="text-gray-600">Coming Soon - Manage your profile and preferences</p>
                </div>
              )}
              {activeTab === "notifications" && (
                <div className="text-center py-12">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Notifications</h3>
                  <p className="text-gray-600">Coming Soon - View your notifications and alerts</p>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
