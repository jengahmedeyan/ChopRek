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
  deleteDoc,
} from "firebase/firestore"
import { getDb } from "@/lib/firebase-config"
import type { Notification, Order, Menu, NewOrderNotificationPayload } from "@/lib/types"

let db: any = null
async function getDatabase() {
  if (!db) {
    db = await getDb()
  }
  return db
}

export async function createNotification(notification: Omit<Notification, "id" | "createdAt">) {
  try {
    const db = await getDatabase()
    await addDoc(collection(db, "notifications"), {
      ...notification,
      createdAt: new Date(),
    })
  } catch (error) {
    console.error("Error creating notification:", error)
  }
}

export async function createBulkNotifications(notifications: Array<Omit<Notification, "id" | "createdAt">>) {
  try {
    const db = await getDatabase()
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

export function subscribeToUserNotifications(
  userId: string,
  callback: (notifications: Notification[]) => void,
) {
  return new Promise<() => void>(async (resolve) => {
    try {
      const db = await getDatabase()
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

export async function markAsRead(notificationId: string) {
  try {
    const db = await getDatabase()
    await updateDoc(doc(db, "notifications", notificationId), {
      read: true,
    })
  } catch (error) {
    console.error("Error marking notification as read:", error)
  }
}

export async function markAllAsRead(userId: string) {
  try {
    const db = await getDatabase()
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

export async function deleteNotification(notificationId: string) {
  try {
    const db = await getDatabase()
    await deleteDoc(doc(db, "notifications", notificationId))
  } catch (error) {
    console.error("Error deleting notification:", error)
  }
}

// Notification templates
export function createOrderStatusNotification(
  order: Order,
  newStatus: Order["status"],
): Omit<Notification, "id" | "createdAt"> {
  const statusMessages = {
    pending: "Your order has been received and is pending confirmation.",
    confirmed: "Your order has been confirmed and is being prepared.",
    delivered: "Your order has been delivered.",
    cancelled: "Your order has been cancelled.",
  }

  return {
    userId: order.userId ?? "guest",
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

export function createNewMenuNotification(menu: Menu, userId: string): Omit<Notification, "id" | "createdAt"> {
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

export function createOrderReminderNotification(menu: Menu, userId: string): Omit<Notification, "id" | "createdAt"> {
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

export function createNewOrderNotification(
  payload: NewOrderNotificationPayload,
  adminUserId: string
): Omit<Notification, "id" | "createdAt"> {
  return {
    userId: adminUserId,
    title: "New Order Received",
    message: `${payload.userName ?? 'A user'} ordered ${payload.selectedOptionName} for ${payload.orderDate}`,
    type: "info",
    read: false,
    metadata: {
      orderId: payload.id,
    },
  }
}
