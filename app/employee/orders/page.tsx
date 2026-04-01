"use client"

import { useEffect, useState, useMemo } from "react"
import { subDays, startOfMonth } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Package } from "lucide-react"
import { getDb } from "@/lib/firebase-config"
import { collection, query, where, onSnapshot } from "firebase/firestore"
import { useAuth } from "@/lib/auth-context"
import type { Order } from "@/lib/types"
import { MyOrdersDataTable } from "./_components/data-table"
import { myOrdersColumns } from "./_components/columns"
import OrderCard from "./_components/order-card"


export default function MyOrders() {
  const { user, loading: authLoading } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  const personalStats = useMemo(() => {
    const thisMonthStart = startOfMonth(new Date()).toISOString().split("T")[0]
    const todayStr = new Date().toISOString().split("T")[0]

    const prevWorkday = (dateStr: string) => {
      const d = new Date(dateStr + "T12:00:00")
      const day = d.getDay()
      const daysBack = day === 1 ? 3 : day === 0 ? 2 : 1
      return subDays(d, daysBack).toISOString().split("T")[0]
    }

    const workdayOrders = orders.filter((o) => {
      const day = new Date(o.orderDate + "T12:00:00").getDay()
      return day >= 1 && day <= 5
    })
    const uniqueDates = [...new Set(workdayOrders.map((o) => o.orderDate))].sort().reverse()

    const todayDay = new Date(todayStr + "T12:00:00").getDay()
    const lastWorkday =
      todayDay === 0
        ? subDays(new Date(todayStr + "T12:00:00"), 2).toISOString().split("T")[0]
        : todayDay === 6
        ? subDays(new Date(todayStr + "T12:00:00"), 1).toISOString().split("T")[0]
        : todayStr

    let streak = 0
    if (uniqueDates.length > 0 && (uniqueDates[0] === todayStr || uniqueDates[0] === lastWorkday)) {
      streak = 1
      for (let i = 1; i < uniqueDates.length; i++) {
        if (uniqueDates[i] === prevWorkday(uniqueDates[i - 1])) streak++
        else break
      }
    }

    const mealCounts = new Map<string, number>()
    orders.forEach((o) => mealCounts.set(o.selectedOption.name, (mealCounts.get(o.selectedOption.name) || 0) + 1))
    const sortedMeals = [...mealCounts.entries()].sort((a, b) => b[1] - a[1])

    return {
      streak,
      favoriteMeal: sortedMeals[0]?.[0] ?? "—",
      favoriteMealCount: sortedMeals[0]?.[1] ?? 0,
      ordersThisMonth: orders.filter((o) => o.orderDate >= thisMonthStart).length,
    }
  }, [orders])

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

  return (
    <div className="space-y-3 sm:space-y-4 lg:space-y-6 p-2 sm:p-4 lg:p-6">
      <Card className="shadow-sm">
        <CardHeader className="p-3 sm:p-4 lg:p-6">
          <CardTitle className="text-base sm:text-lg lg:text-xl">My Orders</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 lg:p-6 pt-0">
          {orders.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <Package className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-2 opacity-50 text-gray-500" />
              <p className="text-sm sm:text-base text-gray-500 font-medium">You have not placed any orders yet</p>
              <p className="text-xs sm:text-sm text-gray-400 mt-1">Your orders will appear here once you place them</p>
            </div>
          ) : (
            <>
              <div className="lg:hidden">
                {orders.map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>

              <div className="hidden lg:block">
                <MyOrdersDataTable columns={myOrdersColumns} data={orders} />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
