"use client"

import { useEffect, useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"
import { getDb } from "@/lib/firebase-config"
import { collection, query, where, onSnapshot } from "firebase/firestore"
import { useAuth } from "@/lib/auth-context"
import type { Order } from "@/lib/types"

export default function MyOrders() {
  const { user, loading: authLoading } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    const fetchOrders = async () => {
      const db = await getDb()
      const ordersQuery = query(collection(db, "orders"), where("userId", "==", user.uid))
      const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
        const ordersData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        })) as Order[]
        setOrders(ordersData)
        setLoading(false)
      })
      return unsubscribe
    }
    const unsub = fetchOrders()
    return () => {
      unsub && unsub.then((fn) => fn && fn())
    }
  }, [user])

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="ml-4">Loading your orders...</p>
      </div>
    )
  }

  if (!user) {
    return <div className="text-center mt-8">Please log in to view your orders.</div>
  }

  if (orders.length === 0) {
    return <div className="text-center mt-8">You have not placed any orders yet.</div>
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>My Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Menu Item</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <Badge variant="outline" className={
                      order.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                      order.status === "confirmed" ? "bg-blue-100 text-blue-800" :
                      order.status === "delivered" ? "bg-green-100 text-green-800" :
                      order.status === "cancelled" ? "bg-red-100 text-red-800" :
                      "bg-gray-100 text-gray-800"
                    }>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>{order.selectedOption?.name}</TableCell>
                  <TableCell>{order.quantity}</TableCell>
                  <TableCell>{order.orderDate}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
} 