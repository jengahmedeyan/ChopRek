import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  doc,
  writeBatch,
  getDocs,
} from "firebase/firestore"
import { getDb } from "@/lib/firebase-config"
import type { Notification, Order, Menu } from "@/lib/types"

export class NotificationService {
  private static instance: NotificationService
  private db: any = null

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService()
    }
    return NotificationService.instance
  }

  private async getDatabase() {
    if (!this.db) {
      this.db = await getDb()
    }
    return this.db
  }

  // Create a notification for a specific user
  async createNotification(notification: Omit<Notification, "id" | "createdAt">) {
    try {
      const db = await this.getDatabase()
      await addDoc(collection(db, "notifications"), {
        ...notification,
        createdAt: new Date(),
      })
    } catch (error) {
      console.error("Error creating notification:", error)
    }
  }

  // Create notifications for multiple users
  async createBulkNotifications(notifications: Array<Omit<Notification, "id" | "createdAt">>) {
    try {
      const db = await this.getDatabase()
      const batch = writeBatch(db)

      notifications.forEach((notification) => {
        const notificationRef = doc(collection(db, "notifications"))
        batch.set(notificationRef, {
          ...notification,
          createdAt: new Date(),
        })
      })

      await batch.commit()
    } catch (error) {
      console.error("Error creating bulk notifications:", error)
    }
  }

  // Listen to notifications for a specific user
  subscribeToUserNotifications(userId: string, callback: (notifications: Notification[]) => void) {
    return new Promise<() => void>(async (resolve) => {
      try {
        const db = await this.getDatabase()
        const notificationsQuery = query(
          collection(db, "notifications"),
          where("userId", "==", userId),
          orderBy("createdAt", "desc"),
        )

        const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
          const notifications = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
          })) as Notification[]

          callback(notifications)
        })

        resolve(unsubscribe)
      } catch (error) {
        console.error("Error subscribing to notifications:", error)
        resolve(() => {})
      }
    })
  }

  // Mark notification as read
  async markAsRead(notificationId: string) {
    try {
      const db = await this.getDatabase()
      await updateDoc(doc(db, "notifications", notificationId), {
        read: true,
      })
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  // Mark all notifications as read for a user
  async markAllAsRead(userId: string) {
    try {
      const db = await this.getDatabase()
      const batch = writeBatch(db)

      const notificationsQuery = query(
        collection(db, "notifications"),
        where("userId", "==", userId),
        where("read", "==", false),
      )

      const snapshot = await getDocs(notificationsQuery)
      snapshot.docs.forEach((doc) => {
        batch.update(doc.ref, { read: true })
      })

      await batch.commit()
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
    }
  }

  // Notification templates
  static createOrderStatusNotification(
    order: Order,
    newStatus: Order["status"],
  ): Omit<Notification, "id" | "createdAt"> {
    const statusMessages = {
      pending: "Your order has been received and is pending confirmation.",
      confirmed: "Your order has been confirmed and is being prepared.",
      preparing: "Your order is currently being prepared.",
      ready: "Your order is ready for pickup!",
      delivered: "Your order has been delivered.",
      cancelled: "Your order has been cancelled.",
    }

    return {
      userId: order.userId,
      title: `Order ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}`,
      message: `${order.selectedOption.name} - ${statusMessages[newStatus]}`,
      type: "order_status",
      read: false,
      metadata: {
        orderId: order.id,
        orderStatus: newStatus,
      },
    }
  }

  static createNewMenuNotification(menu: Menu, userId: string): Omit<Notification, "id" | "createdAt"> {
    return {
      userId,
      title: "New Menu Available!",
      message: `${menu.title} is now available for ${menu.date}. Order before ${menu.cutoffTime}!`,
      type: "new_menu",
      read: false,
      metadata: {
        menuId: menu.id,
      },
    }
  }

  static createOrderReminderNotification(menu: Menu, userId: string): Omit<Notification, "id" | "createdAt"> {
    return {
      userId,
      title: "Order Reminder",
      message: `Don't forget to place your order for ${menu.title}! Cutoff time is ${menu.cutoffTime}.`,
      type: "reminder",
      read: false,
      metadata: {
        menuId: menu.id,
      },
    }
  }

  static createNewOrderNotification(order: Order, adminUserId: string): Omit<Notification, "id" | "createdAt"> {
    return {
      userId: adminUserId,
      title: "New Order Received",
      message: `${order.userName} ordered ${order.selectedOption.name} for ${order.orderDate}`,
      type: "info",
      read: false,
      metadata: {
        orderId: order.id,
      },
    }
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance()
