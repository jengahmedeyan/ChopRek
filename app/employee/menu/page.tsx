"use client"

import { useEffect, useState, useMemo } from "react"
import { subDays, startOfMonth } from "date-fns"
import { Package } from "lucide-react"
import { getDb } from "@/lib/firebase-config"
import { collection, query, where, onSnapshot } from "firebase/firestore"
import { useAuth } from "@/lib/auth-context"
import type { Order } from "@/lib/types"
import StatCard from "@/app/employee/orders/_components/stat-card"
import { MenuViewer } from "@/components/employee/menu-viewer"
import { getStreakMessage } from "@/lib/streak-messages"

export default function EmployeeMenuPage() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])

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
      })

      return unsubscribe
    }

    const unsub = fetchOrders()
    return () => {
      unsub && unsub.then((fn) => fn && fn())
    }
  }, [user])

  return (
    <div className="p-2 sm:p-4 lg:p-6">
      {/* Desktop: Stats on top */}
      <div className="hidden sm:block space-y-3 sm:space-y-4 lg:space-y-6">
        <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:gap-4">
          <StatCard
            title="Lunch Streak"
            icon={<Package />}
            value={
              personalStats.streak === 0 ? "—" :
              `🔥 ${personalStats.streak} day${personalStats.streak > 1 ? "s" : ""}`
            }
            description={getStreakMessage(personalStats.streak)}
          />
          <StatCard
            title="Favourite Meal"
            icon={<Package />}
            value={
              <span className="text-xs sm:text-sm lg:text-base truncate block w-full" title={personalStats.favoriteMeal}>
                {personalStats.favoriteMeal}
              </span>
            }
            description={personalStats.favoriteMealCount > 0 ? `${personalStats.favoriteMealCount}× ordered` : "No data yet"}
          />
          <StatCard
            title="This Month"
            icon={<Package />}
            value={personalStats.ordersThisMonth}
            description="orders placed"
          />
        </div>

        <MenuViewer />
      </div>

      {/* Mobile: Menu first, then stats vertically */}
      <div className="sm:hidden space-y-3">
        <MenuViewer />
        
        <div className="grid grid-cols-1 gap-2">
          <StatCard
            title="Lunch Streak"
            icon={<Package />}
            value={
              personalStats.streak === 0 ? "—" :
              `🔥 ${personalStats.streak} day${personalStats.streak > 1 ? "s" : ""}`
            }
            description={getStreakMessage(personalStats.streak)}
          />
          <StatCard
            title="Favourite Meal"
            icon={<Package />}
            value={
              <span className="text-xs truncate block w-full" title={personalStats.favoriteMeal}>
                {personalStats.favoriteMeal}
              </span>
            }
            description={personalStats.favoriteMealCount > 0 ? `${personalStats.favoriteMealCount}× ordered` : "No data yet"}
          />
          <StatCard
            title="This Month"
            icon={<Package />}
            value={personalStats.ordersThisMonth}
            description="orders placed"
          />
        </div>
      </div>
    </div>
  )
}