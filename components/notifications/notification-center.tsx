"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useNotifications } from "@/hooks/use-notifications"
import { Bell, CheckCheck, Loader2, Trash2, X, Check } from "lucide-react"
import { NotificationItem } from "./notification-item"
import { toast } from "@/hooks/use-toast"

export function NotificationCenter() {
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteMultipleNotifications,
  } = useNotifications()
  const [isOpen, setIsOpen] = useState(false)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isDeleting, setIsDeleting] = useState(false)

  const handleNotificationRead = async (id: string) => {
    await markAsRead(id)
  }

  const handleNotificationDelete = async (id: string) => {
    try {
      await deleteNotification(id)
      toast({
        title: "Notification deleted",
        description: "The notification has been removed.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete notification. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleSelect = (id: string, selected: boolean) => {
    const newSelected = new Set(selectedIds)
    if (selected) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }
    setSelectedIds(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedIds.size === notifications.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(notifications.map((n) => n.id)))
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return

    setIsDeleting(true)
    try {
      await deleteMultipleNotifications(Array.from(selectedIds))
      setSelectedIds(new Set())
      setSelectionMode(false)
      toast({
        title: "Notifications deleted",
        description: `${selectedIds.size} notification(s) have been removed.`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete notifications. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const exitSelectionMode = () => {
    setSelectionMode(false)
    setSelectedIds(new Set())
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs">
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end" forceMount>
        <div className="flex items-center justify-between p-4">
          {selectionMode ? (
            <div className="flex items-center gap-2 flex-1">
              <Button variant="ghost" size="sm" onClick={exitSelectionMode} className="h-auto p-1">
                <X className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium">{selectedIds.size} selected</span>
              <div className="flex items-center gap-1 ml-auto">
                <Button variant="ghost" size="sm" onClick={handleSelectAll} className="h-auto p-1">
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBulkDelete}
                  disabled={selectedIds.size === 0 || isDeleting}
                  className="h-auto p-1 text-red-600 hover:text-red-700"
                >
                  {isDeleting ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <h4 className="font-semibold">Notifications</h4>
              <div className="flex items-center gap-2">
                {notifications.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectionMode(true)}
                    className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Delete
                  </Button>
                )}
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <CheckCheck className="h-3 w-3 mr-1" />
                    Mark all read
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
        <Separator />

        {selectionMode && notifications.length > 0 && (
          <>
            <div className="p-2 bg-muted/30">
              <p className="text-xs text-muted-foreground text-center">
                Swipe left or use checkboxes to select notifications
              </p>
            </div>
            <Separator />
          </>
        )}

        <ScrollArea className="h-96">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <p className="ml-2 text-sm text-muted-foreground">Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bell className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
              <p className="text-xs text-muted-foreground mt-1">You'll see updates about your orders here</p>
            </div>
          ) : (
            <div className="space-y-1">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onRead={handleNotificationRead}
                  onDelete={handleNotificationDelete}
                  isSelected={selectedIds.has(notification.id)}
                  onSelect={handleSelect}
                  selectionMode={selectionMode}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
