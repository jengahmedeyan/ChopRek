"use client"

import { useState, useEffect, useRef } from "react"
import { notificationService } from "@/lib/notifications"
import { useAuth } from "@/lib/auth-context"
import type { Notification } from "@/lib/types"
import { toast } from "@/hooks/use-toast"

export function useNotifications() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const previousNotificationsRef = useRef<Notification[]>([])

  useEffect(() => {
    if (!user) {
      setNotifications([])
      setUnreadCount(0)
      setLoading(false)
      return
    }

    let unsubscribe: (() => void) | null = null

    const setupNotificationListener = async () => {
      try {
        unsubscribe = await notificationService.subscribeToUserNotifications(user.uid, (newNotifications) => {
          const previousNotifications = previousNotificationsRef.current
          setNotifications(newNotifications)
          setUnreadCount(newNotifications.filter((n) => !n.read).length)
          setLoading(false)

          // Show toast for new notifications (only after initial load)
          if (previousNotifications.length > 0) {
            const newNotifs = newNotifications.filter(
              (newNotif) => !previousNotifications.some((oldNotif) => oldNotif.id === newNotif.id),
            )

            newNotifs.forEach((notification) => {
              if (!notification.read) {
                toast({
                  title: notification.title,
                  description: notification.message,
                  variant: notification.type === "error" ? "destructive" : "default",
                })
              }
            })
          }

          // Update the ref for next comparison
          previousNotificationsRef.current = newNotifications
        })
      } catch (error) {
        console.error("Error setting up notification listener:", error)
        setLoading(false)
      }
    }

    setupNotificationListener()

    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [user]) // Updated to use the entire user object

  const markAsRead = async (notificationId: string) => {
    await notificationService.markAsRead(notificationId)
  }

  const markAllAsRead = async () => {
    if (user) {
      await notificationService.markAllAsRead(user.uid)
    }
  }

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
  }
}
