import { collection, query, where, onSnapshot, addDoc, updateDoc, doc } from "firebase/firestore"
import { getDb } from "@/lib/firebase-config"
import type { Order } from "@/lib/types"

export function subscribeToUserOrders(userId: string, callback: (orders: Order[]) => void) {
  getDb().then(db => {
    const ordersQuery = query(collection(db, "orders"), where("userId", "==", userId))
    onSnapshot(ordersQuery, (snapshot) => {
      const orders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      })) as Order[]
      callback(orders)
    })
  })
}

export async function createOrder(order: Omit<Order, "id" | "createdAt" | "updatedAt">) {
  const db = await getDb()
  await addDoc(collection(db, "orders"), {
    ...order,
    createdAt: new Date(),
    updatedAt: new Date(),
  })
}

export async function updateOrder(orderId: string, data: Partial<Order>) {
  const db = await getDb()
  await updateDoc(doc(db, "orders", orderId), {
    ...data,
    updatedAt: new Date(),
  })
}