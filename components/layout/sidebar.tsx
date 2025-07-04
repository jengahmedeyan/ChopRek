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
} from "lucide-react"
import { cn } from "@/lib/utils"

interface SidebarProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const { user } = useAuth()
  const [collapsed, setCollapsed] = useState(false)

  const adminMenuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, badge: null },
    { id: "orders", label: "Orders", icon: ShoppingCart, badge: "3" },
    { id: "menu", label: "Menu Creator", icon: UtensilsCrossed, badge: null },
    { id: "analytics", label: "Analytics", icon: BarChart3, badge: null },
    { id: "reports", label: "Reports", icon: FileText, badge: null },
    { id: "users", label: "Users", icon: Users, badge: "New" },
    { id: "departments", label: "Departments", icon: Building, badge: null },
    { id: "notifications", label: "Notifications", icon: Bell, badge: "2" },
    { id: "settings", label: "Settings", icon: Settings, badge: null },
  ]

  const employeeMenuItems = [
    { id: "menu", label: "Today's Menu", icon: UtensilsCrossed, badge: null },
    { id: "orders", label: "My Orders", icon: ShoppingCart, badge: null },
    { id: "profile", label: "Profile", icon: User, badge: null },
    { id: "notifications", label: "Notifications", icon: Bell, badge: "1" },
  ]

  const menuItems = user?.role === "admin" ? adminMenuItems : employeeMenuItems

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
            const isActive = activeTab === item.id

            return (
              <li key={item.id}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start h-10",
                    collapsed ? "px-2" : "px-3",
                    isActive && "bg-blue-50 text-blue-700 border-blue-200",
                  )}
                  onClick={() => onTabChange(item.id)}
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
    </div>
  )
}
