"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/auth-context"
import {
  LayoutDashboard,
  UtensilsCrossed,
  BarChart3,
  FileText,
  Users,
  Building,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
  User,
  ShoppingCart,
  LogOut
} from "lucide-react"
import { cn } from "@/lib/utils"
import { usePathname, useRouter } from "next/navigation"

export function Sidebar() {
  const { user, logout } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  const adminMenuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, badge: null, path: "/admin/dashboard" },
    { id: "orders", label: "Orders", icon: ShoppingCart, badge: "3", path: "/admin/orders" },
    { id: "menu", label: "Menu Creator", icon: UtensilsCrossed, badge: null, path: "/admin/menu" },
    { id: "reports", label: "Reports", icon: FileText, badge: null, path: "/admin/reports" },
    { id: "users", label: "Users", icon: Users, badge: "New", path: "/admin/users" },
    { id: "departments", label: "Departments", icon: Building, badge: null, path: "/admin/departments" },
    // { id: "notifications", label: "Notifications", icon: Bell, badge: "2", path: "/admin/notifications" },
    { id: "settings", label: "Settings", icon: Settings, badge: null, path: "/admin/settings" },
  ]

  const employeeMenuItems = [
    { id: "menu", label: "Today's Menu", icon: UtensilsCrossed, badge: null, path: "/employee/menu" },
    { id: "orders", label: "My Orders", icon: ShoppingCart, badge: null, path: "/employee/orders" },
    // { id: "profile", label: "Profile", icon: User, badge: null, path: "/employee/profile" },
    // { id: "notifications", label: "Notifications", icon: Bell, badge: "1", path: "/employee/notifications" },
  ]

  const menuItems = user?.role === "admin" ? adminMenuItems : employeeMenuItems

  const handleNavigation = (path: string) => {
    router.push(path)
  }

  return (
    <div
      className={cn(
        "bg-white border-r border-gray-200 flex flex-col transition-all duration-300",
        collapsed ? "w-16" : "w-64",
      )}
    >
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900">🍽️ LunchHub</h2>
            </div>
          )}
          <Button variant="ghost" size="sm" onClick={() => setCollapsed(!collapsed)} className="h-8 w-8 p-0">
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {!collapsed && user && (
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="h-4 w-4 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user.displayName || user.email}</p>
              <p className="text-xs text-gray-500 capitalize">{user.role}</p>
              {user.department && <p className="text-xs text-gray-400">{user.department}</p>}
            </div>
          </div>
        </div>
      )}

      <nav className="flex-1 p-2">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.path

            return (
              <li key={item.id}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start h-10",
                    collapsed ? "px-2" : "px-3",
                    isActive && "bg-blue-50 text-blue-700 border-blue-200",
                  )}
                  onClick={() => handleNavigation(item.path)}
                >
                  <Icon className={cn("h-4 w-4", collapsed ? "" : "mr-3")} />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      {item.badge && (
                        <Badge variant="secondary" className="ml-auto text-xs">
                          {item.badge}
                        </Badge>
                      )}
                    </>
                  )}
                </Button>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="p-2">
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 h-10",
            collapsed ? "px-2" : "px-3"
          )}
          onClick={logout}
        >
          <LogOut className={cn("h-4 w-4", collapsed ? "" : "mr-3")} />
          {!collapsed && "Sign Out"}
        </Button>
      </div>
    </div>
  )
}