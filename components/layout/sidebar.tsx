"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetDescription, SheetTrigger } from "@/components/ui/sheet"
import { useAuth } from "@/lib/auth-context"
import {
  LayoutDashboard,
  UtensilsCrossed,
  FileText,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  User,
  ShoppingCart,
  LogOut,
  Menu,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { usePathname, useRouter } from "next/navigation"

interface SidebarProps {
  isMobile?: boolean
  onClose?: () => void
}

function SidebarContent({ isMobile = false, onClose }: SidebarProps) {
  const { user, logout } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  if (!user) return null;

  const adminMenuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, badge: null, path: "/admin/dashboard" },
    { id: "orders", label: "Orders", icon: ShoppingCart, badge: null, path: "/admin/orders" },
    { id: "OrdersForSelf", label: "Order for Self", icon: ShoppingCart, badge: null, path: "/employee/menu" },
    { id: "menu", label: "Menu Creator", icon: UtensilsCrossed, badge: null, path: "/admin/menu" },
    { id: "reports", label: "Reports", icon: FileText, badge: null, path: "/admin/reports" },
    { id: "users", label: "Users", icon: Users, badge: null, path: "/admin/users" },
    { id: "settings", label: "Settings", icon: Settings, badge: null, path: "/admin/settings" },
  ]

  const employeeMenuItems = [
    { id: "menu", label: "Today's Menu", icon: UtensilsCrossed, badge: null, path: "/employee/menu" },
    { id: "orders", label: "My Orders", icon: ShoppingCart, badge: null, path: "/employee/orders" },
  ]

  const menuItems = user?.role === "admin" ? adminMenuItems : employeeMenuItems

  const handleNavigation = (path: string) => {
    router.push(path)
    if (isMobile && onClose) {
      onClose()
    }
  }

  const handleLogout = () => {
    logout()
    if (isMobile && onClose) {
      onClose()
    }
  }

  return (
    <div
      className={cn(
        "bg-white border-r border-gray-200 flex flex-col transition-all duration-300 h-full",
        !isMobile && (collapsed ? "w-16" : "w-64"),
        isMobile && "w-full",
      )}
    >
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          {(!collapsed || isMobile) && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900">🍽️ ChopRek</h2>
            </div>
          )}
          {!isMobile && (
            <Button variant="ghost" size="sm" onClick={() => setCollapsed(!collapsed)} className="h-8 w-8 p-0">
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </div>

      {(!collapsed || isMobile) && user && (
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

      <nav className="flex-1 p-2 overflow-y-auto">
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
                    !isMobile && collapsed ? "px-2" : "px-3",
                    isActive && "bg-blue-50 text-blue-700 border-blue-200",
                  )}
                  onClick={() => handleNavigation(item.path)}
                >
                  <Icon className={cn("h-4 w-4", !isMobile && collapsed ? "" : "mr-3")} />
                  {(!collapsed || isMobile) && (
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
            !isMobile && collapsed ? "px-2" : "px-3",
          )}
          onClick={handleLogout}
        >
          <LogOut className={cn("h-4 w-4", !isMobile && collapsed ? "" : "mr-3")} />
          {(!collapsed || isMobile) && "Sign Out"}
        </Button>
      </div>
    </div>
  )
}

export function Sidebar() {
  return (
    <>
      <div className="hidden lg:block">
        <SidebarContent />
      </div>
    </>
  )
}

export function MobileSidebar() {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="lg:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle navigation menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-64">
        <SheetDescription className="sr-only">Navigation menu for mobile devices</SheetDescription>
        <SidebarContent isMobile onClose={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  )
}
