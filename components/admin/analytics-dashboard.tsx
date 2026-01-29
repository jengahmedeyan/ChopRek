"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { collection, query, where, getDocs, orderBy } from "firebase/firestore"
import type { Order } from "@/lib/types"
import { format, subDays, startOfMonth } from "date-fns"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from "recharts"
import { Download, TrendingUp, Users, Award } from "lucide-react"
import { normalizeDate } from "@/utils/date"
import { getDb } from "@/lib/firebase-config"

const COLORS = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#14b8a6", "#f97316"]

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
      const date = normalizeDate(order.createdAt, "MMM dd")
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
    return Array.from(mealStats.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }

  const getEmployeeStats = () => {
    const employeeStats = new Map()
    orders.forEach((order) => {
      const key = (order.userName && order.userName.trim()) || (order.guestName && order.guestName.trim()) || 'Guest'
      employeeStats.set(key, (employeeStats.get(key) || 0) + 1)
    })
    return Array.from(employeeStats.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }

  const exportToCSV = () => {
    const csvContent = [
      ["Date", "Employee", "Meal Option", "Dietary Type"],
      ...orders.map((order) => [
        normalizeDate(order.createdAt, "yyyy-MM-dd"),
        order.userName || order.guestName || 'Guest',
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

  // Custom tooltip for better styling
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg shadow-lg p-3">
          <p className="font-semibold text-sm mb-1">{label}</p>
          <p className="text-sm text-primary">
            Orders: <span className="font-bold">{payload[0].value}</span>
          </p>
        </div>
      )
    }
    return null
  }

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg shadow-lg p-3">
          <p className="font-semibold text-sm">{payload[0].name}</p>
          <p className="text-sm text-primary">
            Orders: <span className="font-bold">{payload[0].value}</span>
          </p>
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-muted-foreground">Loading analytics...</div>
      </div>
    )
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <TrendingUp className="h-4 w-4 text-violet-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalOrders}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {timeRange === "7days" ? "Last 7 days" : timeRange === "30days" ? "Last 30 days" : "This month"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Employees</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{uniqueEmployees}</div>
            <p className="text-xs text-muted-foreground mt-1">Unique users ordering</p>
          </CardContent>
        </Card>

        <Card className="border-l-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Orders/Day</CardTitle>
            <Award className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {dailyStats.length > 0 ? Math.round(totalOrders / dailyStats.length) : 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Daily average</p>
          </CardContent>
        </Card>

        <Card className="border-l-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Most Popular</CardTitle>
            <Award className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold truncate">{mealStats.length > 0 ? mealStats[0].name : "N/A"}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {mealStats.length > 0 ? `${mealStats[0].value} orders` : "No data"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Daily Order Trend</CardTitle>
            <CardDescription>Track orders over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={dailyStats} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  stroke="#6b7280"
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  stroke="#6b7280"
                />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="orders" 
                  stroke="#8b5cf6" 
                  strokeWidth={3}
                  dot={{ fill: "#8b5cf6", r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Meal Distribution</CardTitle>
            <CardDescription>Popular meal choices breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={mealStats}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  paddingAngle={2}
                >
                  {mealStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  formatter={(value) => <span className="text-sm">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top 10 Most Active Employees</CardTitle>
          <CardDescription>Employees with the most lunch orders</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {employeeStats.map(({ name, count }, index) => {
              const maxCount = employeeStats[0]?.count || 1
              const percentage = (count / maxCount) * 100
              
              return (
                <div key={`${name}-${index}`} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span 
                        className={`
                          flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold
                          ${index === 0 ? 'bg-yellow-500 text-white' : 
                            index === 1 ? 'bg-gray-400 text-white' : 
                            index === 2 ? 'bg-orange-600 text-white' : 
                            'bg-gray-200 text-gray-700'}
                        `}
                      >
                        {index + 1}
                      </span>
                      <span className="font-medium">{name}</span>
                    </div>
                    <span className="text-sm font-semibold text-muted-foreground">{count} orders</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        index === 0 ? 'bg-yellow-500' : 
                        index === 1 ? 'bg-gray-400' : 
                        index === 2 ? 'bg-orange-600' : 
                        'bg-violet-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}