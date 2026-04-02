"use client"

import { useEffect, useState, useMemo } from "react"
import { subDays, startOfMonth } from "date-fns"
import { Package } from "lucide-react"
import { getDb } from "@/lib/firebase-config"
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore"
import { useAuth } from "@/lib/auth-context"
import type { Order } from "@/lib/types"
import StatCard from "@/app/employee/orders/_components/stat-card"
import { MenuViewer } from "@/components/employee/menu-viewer"
import { getStreakMessage } from "@/lib/streak-messages"

export default function EmployeeMenuPage() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])

  const personalStats = useMemo(() => {
    const formatLocalDate = (date: Date) => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }

    const today = new Date()
    const thisMonthStart = formatLocalDate(startOfMonth(today))
    const todayStr = formatLocalDate(today)

    const prevWorkday = (dateStr: string) => {
      const d = new Date(dateStr + "T12:00:00")
      const day = d.getDay()
      // Since uniqueDates only contains workdays (Mon-Fri), we only handle those cases
      // Monday (1) -> go back 3 days to Friday, otherwise go back 1 day
      const daysBack = day === 1 ? 3 : 1
      return formatLocalDate(subDays(d, daysBack))
    }

    const workdayOrders = orders.filter((o) => {
      // Only count orders that were actually fulfilled (exclude cancelled orders)
      if (o.status === "cancelled") return false
      const day = new Date(o.orderDate + "T12:00:00").getDay()
      return day >= 1 && day <= 5
    })
    const uniqueDates = [...new Set(workdayOrders.map((o) => o.orderDate))].sort().reverse()

    const todayDay = today.getDay()
    const lastWorkday =
      todayDay === 0
        ? formatLocalDate(subDays(today, 2)) // Sunday -> Friday
        : todayDay === 6
        ? formatLocalDate(subDays(today, 1)) // Saturday -> Friday
        : todayStr

    let streak = 0
    if (uniqueDates.length > 0 && uniqueDates[0] === lastWorkday) {
      streak = 1
      for (let i = 1; i < uniqueDates.length; i++) {
        if (uniqueDates[i] === prevWorkday(uniqueDates[i - 1])) streak++
        else break
      }
    }

    const mealCounts = new Map<string, { originalName: string; count: number }>()
    orders.forEach((o) => {
      // Exclude cancelled orders from favorite meal calculation
      if (o.status === "cancelled") return
      const lowerName = o.selectedOption.name.toLowerCase()
      const existing = mealCounts.get(lowerName)
      if (existing) {
        existing.count++
      } else {
        mealCounts.set(lowerName, { originalName: o.selectedOption.name, count: 1 })
      }
    })
    const sortedMeals = [...mealCounts.values()].sort((a, b) => b.count - a.count)

    return {
      streak,
      favoriteMeal: sortedMeals[0]?.originalName ?? "—",
      favoriteMealCount: sortedMeals[0]?.count ?? 0,
      ordersThisMonth: orders.filter((o) => o.orderDate >= thisMonthStart && o.status !== "cancelled").length,
    }
  }, [orders])

  useEffect(() => {
    if (!user) return

    let unsubscribe: (() => void) | null = null

    const fetchOrders = async () => {
      try {
        const db = await getDb()
        const ordersQuery = query(
          collection(db, "orders"),
          where("userId", "==", user.uid),
          orderBy("orderDate", "desc")
        )

        unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
          const ordersData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
            updatedAt: doc.data().updatedAt?.toDate() || new Date(),
          })) as Order[]

          setOrders(ordersData)
        })
      } catch (error) {
        console.error("Error fetching orders:", error)
      }
    }

    fetchOrders()

    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
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