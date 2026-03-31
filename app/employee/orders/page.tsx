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
import StatCard from "./_components/stat-card"


const streakMessages: {
  milestones: Record<number, string[]>
  ranges: { min: number; max: number; messages: string[] }[]
} = {
  milestones: {
    0:   ["Bro seriously? Go eat something 😒", "You haven't ordered once. We're disappointed 😤", "The menu is RIGHT THERE bro 👀"],
    1:   ["One day... wow, slow down champ 🙄", "Day 1. Bold start. Let's see if it lasts 😏"],
    3:   ["3 days in a row. You're building momentum 👀", "Day 3. This might actually stick 😳"],
    5:   ["5 days straight. You're locked in now 🔒", "Day 5. This is becoming a habit 😅"],
    7:   ["A full week and still going? Seek help 🆘", "7 days straight. Your family misses you 😭"],
    10:  ["10 DAYS. We are simultaneously impressed and concerned 👀", "Day 10. You're not well. We love that for you 💀"],
    14:  ["Two full weeks. You are not normal. We respect it 🫡", "14 days. This is a lifestyle now 😮"],
    20:  ["20 DAYS?! That's a full work month 🏆 You win. We quit.", "Day 20. The caterer has started naming things after you 🍛"],
    25:  ["25 days. Quarter to 100. You're deep in this now 😳", "Day 25. This is commitment on another level 💯"],
    30:  ["30 DAYS?! You've transcended human behavior 🧘‍♂️", "One month straight. Are you even human? 🤖"],
    50:  ["50 DAYS. This is no longer a streak, it's a religion 🙏", "Day 50. We have a shrine for you in the kitchen now 🫙"],
    75:  ["75 days. You're basically part of the staff now 👨‍🍳", "Day 75. Do you even remember cooking at home? 🤨"],
    100: ["100 DAYS. You ARE ChopRek now 👑", "A century of lunches. You are the chosen one 🌟"],
  },

  ranges: [
    {
      min: 2, max: 4,
      messages: [
        "You're getting into this now huh 😏",
        "Careful... this is how habits start 😂",
        "Mildly impressive, not gonna lie 👀",
        "Early days, but we see the vision 👁️",
        "This might become a problem… soon 😅"
      ]
    },
    {
      min: 5, max: 6,
      messages: [
        "You're basically living in the kitchen now 🍳",
        "At this point just rent a seat there 🪑",
        "This is getting suspicious 🤨",
        "You're showing commitment… we respect it 👀",
        "Lowkey impressive consistency 😤"
      ]
    },
    {
      min: 8, max: 9,
      messages: [
        "At this point you're basically a kitchen appliance 🍳",
        "9 days. You smell like jollof rice now, don't you 🍚",
        "Still going? No breaks? Interesting 🤨",
        "You're locked into the routine now 🔁",
        "We’re starting to take you seriously 😳"
      ]
    },
    {
      min: 11, max: 13,
      messages: [
        "Your desk is basically a restaurant 🪑🍽️",
        "The caterer knows your order by heart now 😭",
        "You have a usual order… don't you 👀",
        "You're a regular now. No denying it 🧾",
        "This is structured behavior now 📊"
      ]
    },
    {
      min: 15, max: 19,
      messages: [
        "Your blood type is probably Domoda now 🥜",
        "This is no longer a streak, it's a lifestyle 😅",
        "Are you okay? Touch grass bro 🌿",
        "We're watching… and slightly concerned 😬",
        "You might need a break. Just saying 😭",
        "You're deep in the system now 🧠"
      ]
    },
    {
      min: 21, max: 29,
      messages: [
        "You've become one with the menu 😨",
        "The food recognizes you now 👁️",
        "This is elite behavior… or madness 🤯",
        "Legend or menace? The jury's still out 🧑‍⚖️",
        "You're operating on another level now 🚀",
        "We can't stop you anymore 😭"
      ]
    },
    {
      min: 31, max: Infinity,
      messages: [
        "Legends say you never miss a day 🐐",
        "At this point we're just spectators 🎬",
        "You ARE ChopRek. The app works for YOU now 👑",
        "The caterer cooks for you specifically now 🫡",
        "You've broken the system. Congrats 💥",
        "You're not a user anymore. You're lore now 📖"
      ]
    }
  ]
}

const rareMessages = [
  "DEV NOTE: How are you still going?? 😭",
  "This streak is being monitored by scientists 🧪",
  "Achievement unlocked: Unstoppable 🍽️",
  "You might actually be him 👀"
]

function getRandom(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function getStreakMessage(streak: number): string {
  // 2% rare chance
  if (Math.random() < 0.02) {
    return getRandom(rareMessages)
  }

  if (streakMessages.milestones[streak]) {
    return getRandom(streakMessages.milestones[streak])
  }

  const range = streakMessages.ranges.find(r => streak >= r.min && streak <= r.max)

  if (range) {
    return getRandom(range.messages)
  }

  return "You're doing… something. We respect it 😅"
}

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
            <span className="text-sm sm:text-base lg:text-lg truncate block" title={personalStats.favoriteMeal}>
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
