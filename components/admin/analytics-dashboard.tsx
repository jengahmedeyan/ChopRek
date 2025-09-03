"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { collection, query, where, getDocs, orderBy } from "firebase/firestore"
import type { Order } from "@/lib/types"
import { format, subDays, startOfMonth } from "date-fns"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { Download, TrendingUp, Users, Award } from "lucide-react"
import { normalizeDate } from "@/utils/date"
import { getDb } from "@/lib/firebase-config"

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"]

export function AnalyticsDashboard() {
  const [orders, setOrders] = useState<Order[]>([])
  const [timeRange, setTimeRange] = useState("7days")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchOrders()
  }, [timeRange])

  const fetchOrders = async () => {
    setLoading(true)
    try {
      let startDate = new Date()

      switch (timeRange) {
        case "7days":
          startDate = subDays(new Date(), 7)
          break
        case "30days":
          startDate = subDays(new Date(), 30)
          break
        case "thisMonth":
          startDate = startOfMonth(new Date())
          break
        default:
          startDate = subDays(new Date(), 7)
      }

      const db = await getDb()
      const ordersQuery = query(
        collection(db, "orders"),
        where("createdAt", ">=", startDate),
        orderBy("createdAt", "desc"),
      )

      const snapshot = await getDocs(ordersQuery)
      const ordersData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Order[]

      setOrders(ordersData)
    } catch (error) {
      console.error("Error fetching orders:", error)
    } finally {
      setLoading(false)
    }
  }

  const getDailyStats = () => {
    const dailyStats = new Map()
    orders.forEach((order) => {
      const date = normalizeDate(order.createdAt, "yyyy-MM-dd")
      dailyStats.set(date, (dailyStats.get(date) || 0) + 1)
    })
    return Array.from(dailyStats.entries()).map(([date, orders]) => ({ date, orders }))
  }

  const getMealStats = () => {
    const mealStats = new Map()
    orders.forEach((order) => {
      const mealName = order.selectedOption.name
      mealStats.set(mealName, (mealStats.get(mealName) || 0) + 1)
    })
    return Array.from(mealStats.entries()).map(([name, value]) => ({ name, value }))
  }

  const getEmployeeStats = () => {
    const employeeStats = new Map()
    orders.forEach((order) => {
      const userName = order.userName
      employeeStats.set(userName, (employeeStats.get(userName) || 0) + 1)
    })
    return Array.from(employeeStats.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }

  const exportToCSV = () => {
    const csvContent = [
      ["Date", "Employee","Meal Option", "Dietary Type"],
      ...orders.map((order) => [
        normalizeDate(order.createdAt, "yyyy-MM-dd"),
        order.userName,
        order.selectedOption.name,
        order.selectedOption.dietary,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `lunch-orders-${normalizeDate(new Date(), "yyyy-MM-dd")}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return <div>Loading analytics...</div>
  }

  const dailyStats = getDailyStats()
  const mealStats = getMealStats()
  const employeeStats = getEmployeeStats()
  const totalOrders = orders.length
  const uniqueEmployees = new Set(orders.map((o) => o.userId)).size

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 days</SelectItem>
              <SelectItem value="30days">Last 30 days</SelectItem>
              <SelectItem value="thisMonth">This month</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportToCSV} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueEmployees}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Orders/Day</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dailyStats.length > 0 ? Math.round(totalOrders / dailyStats.length) : 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Most Popular</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold">{mealStats.length > 0 ? mealStats[0].name : "N/A"}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Daily Orders</CardTitle>
            <CardDescription>Orders per day over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="orders" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Meal Preferences</CardTitle>
            <CardDescription>Distribution of meal choices</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={mealStats}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {mealStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top Employees</CardTitle>
          <CardDescription>Most active lunch orderers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {employeeStats.map(({ name, count }, index) => (
              <div key={name} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">#{index + 1}</span>
                  <span>{name}</span>
                </div>
                <span className="text-sm text-muted-foreground">{count} orders</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
