"use client"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { NotificationCenter } from "@/components/notifications/notification-center"
import { MobileSidebar } from "@/components/layout/sidebar"
import { useAuth } from "@/lib/auth-context"
import { LogOut, Settings, User } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useTheme } from "next-themes"
import { Moon, Sun } from "lucide-react"
import { useRouter } from "next/navigation"

export function Navbar() {
  const { user, logout } = useAuth()
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logout()
      toast({
        title: "Signed out",
        description: "You have been successfully signed out.",
      })
      router.push("/auth/signin")
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      })
    }
  }

  if (!user) return null

  return (
    <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <MobileSidebar />

          <div className="hidden sm:block">
            <h1 className="text-xl font-semibold text-gray-900">
              {user.role === "admin" ? "Admin Dashboard" : "Employee Portal"}
            </h1>
            <p className="text-sm text-gray-500">Welcome back, {user.displayName || user.email?.split("@")[0]}</p>
          </div>

          <div className="sm:hidden">
            <h1 className="text-lg font-semibold text-gray-900">🍽️ ChopRek</h1>
          </div>
        </div>

        <div className="flex items-center space-x-2 lg:space-x-4">
          {/* <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle theme"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="h-8 w-8"
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button> */}
          <NotificationCenter />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-blue-100 text-blue-600">
                    {user.displayName
                      ? user.displayName
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                      : user.email?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user.displayName || "User"}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs capitalize">
                      {user.role}
                    </Badge>
                    {user.department && (
                      <Badge variant="outline" className="text-xs">
                        {user.department}
                      </Badge>
                    )}
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
