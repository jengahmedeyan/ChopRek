import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { getDb } from "@/lib/firebase-config"
import { collection, query, where, onSnapshot } from "firebase/firestore"
import type { Order } from "@/lib/types"

export function useOrdersCount() {
  const { user } = useAuth()
  const [count, setCount] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setCount(0)
      setLoading(false)
      return
    }

    setLoading(true)
    let unsubscribe: (() => void) | undefined

    const fetchCount = async () => {
      const db = await getDb()
      let ordersQuery
      if (user.role === "admin") {
        // Admin: all orders for today
        const today = new Date().toISOString().split("T")[0]
        ordersQuery = query(collection(db, "orders"), where("orderDate", "==", today))
      } else {
        // Employee: all their orders
        ordersQuery = query(collection(db, "orders"), where("userId", "==", user.uid))
      }
      unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
        setCount(snapshot.size)
        setLoading(false)
      })
    }

    fetchCount()
    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [user])

  return { count, loading }
} 