"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { subscribeToUserNotifications, markAsRead, markAllAsRead, deleteNotification } from "@/services/notifications"
import { writeBatch, doc } from "firebase/firestore"
import { getDb } from "@/lib/firebase-config"
import type { Notification } from "@/lib/types"

export function useNotifications() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setNotifications([])
      setLoading(false)
      return
    }

    const unsubscribePromise = subscribeToUserNotifications(user.uid, (notifications) => {
      setNotifications(notifications)
      setLoading(false)
    })

    return () => {
      unsubscribePromise.then((unsubscribe) => unsubscribe())
    }
  }, [user])

  const unreadCount = notifications.filter((n) => !n.read).length

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markAsRead(notificationId)
    } catch (error) {
      console.error("Error marking notification as read:", error)
      throw error
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      if (!user) return
      await markAllAsRead(user.uid)
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
      throw error
    }
  }

  const handleDeleteNotification = async (notificationId: string) => {
    try {
      await deleteNotification(notificationId)
    } catch (error) {
      console.error("Error deleting notification:", error)
      throw error
    }
  }

  const deleteMultipleNotifications = async (notificationIds: string[]) => {
    try {
      const db = await getDb()
      const batch = writeBatch(db)

      notificationIds.forEach((id) => {
        const notificationRef = doc(db, "notifications", id)
        batch.delete(notificationRef)
      })

      await batch.commit()
    } catch (error) {
      console.error("Error deleting multiple notifications:", error)
      throw error
    }
  }

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead: handleMarkAsRead,
    markAllAsRead: handleMarkAllAsRead,
    deleteNotification: handleDeleteNotification,
    deleteMultipleNotifications,
  }
}
