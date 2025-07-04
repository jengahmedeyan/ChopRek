"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { collection, query, where, getDocs, orderBy } from "firebase/firestore"
import { getDb } from "@/lib/firebase-config"
import type { Order, User } from "@/lib/types"
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from "date-fns"
import { Download, FileText, TrendingUp, Users, DollarSign, Filter, Search, Mail, Printer } from "lucide-react"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import type { DateRange } from "react-day-picker"
import { normalizeDate } from "@/utils/date"

interface ReportData {
  orders: Order[]
  users: User[]
  summary: {
    totalOrders: number
    totalRevenue: number
    uniqueCustomers: number
    averageOrderValue: number
    topItems: { name: string; count: number; revenue: number }[]
    departmentBreakdown: { department: string; orders: number; revenue: number }[]
  }
}

export function ComprehensiveReports() {
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [reportType, setReportType] = useState("daily")
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 7),
    to: new Date(),
  })
  const [selectedDepartment, setSelectedDepartment] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])

  useEffect(() => {
    generateReport()
  }, [reportType, dateRange, selectedDepartment])

  useEffect(() => {
    if (reportData) {
      filterOrders()
    }
  }, [reportData, searchTerm])

  const generateReport = async () => {
    setLoading(true)
    try {
      const db = await getDb()

      let startDate = new Date()
      let endDate = new Date()

      switch (reportType) {
        case "daily":
          startDate = new Date()
          startDate.setHours(0, 0, 0, 0)
          endDate = new Date()
          endDate.setHours(23, 59, 59, 999)
          break
        case "weekly":
          startDate = startOfWeek(new Date())
          endDate = endOfWeek(new Date())
          break
        case "monthly":
          startDate = startOfMonth(new Date())
          endDate = endOfMonth(new Date())
          break
        case "custom":
          if (dateRange?.from && dateRange?.to) {
            startDate = dateRange.from
            endDate = dateRange.to
          }
          break
      }

      const ordersQuery = query(
        collection(db, "orders"),
        where("createdAt", ">=", startDate),
        where("createdAt", "<=", endDate),
        orderBy("createdAt", "desc"),
      )

      const ordersSnapshot = await getDocs(ordersQuery)
      let orders = ordersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Order[]

      if (selectedDepartment !== "all") {
        orders = orders.filter((order) => order.userDepartment === selectedDepartment)
      }

    const usersSnapshot = await getDocs(collection(db, "users"))
    const users = usersSnapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        uid: data.uid,
        email: data.email,
        displayName: data.displayName,
        role: data.role,
        createdAt: data.createdAt,
      } as User
    })


      const totalOrders = orders.length
      const totalRevenue = orders.reduce((sum, order) => sum + (order.totalPrice || 0), 0)
      const uniqueCustomers = new Set(orders.map((order) => order.userId)).size
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

      const itemStats = new Map()
      orders.forEach((order) => {
        const key = order.selectedOption.name
        const existing = itemStats.get(key) || { count: 0, revenue: 0 }
        itemStats.set(key, {
          name: key,
          count: existing.count + order.quantity,
          revenue: existing.revenue + (order.totalPrice || 0),
        })
      })
      const topItems = Array.from(itemStats.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)

      const deptStats = new Map()
      orders.forEach((order) => {
        if (order.userDepartment) {
          const existing = deptStats.get(order.userDepartment) || { orders: 0, revenue: 0 }
          deptStats.set(order.userDepartment, {
            department: order.userDepartment,
            orders: existing.orders + 1,
            revenue: existing.revenue + (order.totalPrice || 0),
          })
        }
      })
      const departmentBreakdown = Array.from(deptStats.values())

      setReportData({
        orders,
        users,
        summary: {
          totalOrders,
          totalRevenue,
          uniqueCustomers,
          averageOrderValue,
          topItems,
          departmentBreakdown,
        },
      })
    } catch (error) {
      console.error("Error generating report:", error)
    } finally {
      setLoading(false)
    }
  }

  const filterOrders = () => {
    if (!reportData) return

    let filtered = reportData.orders

    if (searchTerm) {
      filtered = filtered.filter(
        (order) =>
          order.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.selectedOption.name.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    setFilteredOrders(filtered)
  }

  const exportToPDF = () => {
    window.print()
  }

  const exportToCSV = () => {
    if (!reportData) return

    const csvContent = [
      ["Order ID", "Date", "Employee", "Department","Meal Option", "Quantity", "Price", "Status"],
      ...reportData.orders.map((order) => [
        order.id,
        normalizeDate(order.createdAt, "yyyy-MM-dd HH:mm"),
        order.userName,
        order.userDepartment || "",
        order.userEmail,
        order.selectedOption.name,
        order.quantity.toString(),
        (order.totalPrice || 0).toString(),
        order.status,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `lunch-report-${format(new Date(), "yyyy-MM-dd")}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Comprehensive Reports</h2>
          <p className="text-gray-600">Generate detailed reports for analysis and compliance</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={exportToPDF} variant="outline" size="sm">
            <Printer className="h-4 w-4 mr-2" />
            PDF
          </Button>
          <Button onClick={exportToCSV} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Report Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {reportType === "custom" && (
              <div className="space-y-2">
                <Label>Date Range</Label>
                <DatePickerWithRange date={dateRange} setDate={setDateRange} />
              </div>
            )}

            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  <SelectItem value="engineering">Engineering</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="hr">HR</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search orders..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {reportData && (
        <Tabs defaultValue="summary" className="space-y-6">
          <TabsList>
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="orders">Order Details</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="financial">Financial</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{reportData.summary.totalOrders}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${reportData.summary.totalRevenue.toFixed(2)}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Unique Customers</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{reportData.summary.uniqueCustomers}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${reportData.summary.averageOrderValue.toFixed(2)}</div>
                </CardContent>
              </Card>
            </div>

            {/* Top Items and Department Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Top Menu Items</CardTitle>
                  <CardDescription>Most popular items by order count</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {reportData.summary.topItems.map((item, index) => (
                      <div key={item.name} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-medium">
                            {index + 1}
                          </div>
                          <span className="font-medium">{item.name}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{item.count} orders</div>
                          <div className="text-sm text-muted-foreground">${item.revenue.toFixed(2)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Department Breakdown</CardTitle>
                  <CardDescription>Orders and spending by department</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {reportData.summary.departmentBreakdown.map((dept) => (
                      <div key={dept.department} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium capitalize">{dept.department}</div>
                          <div className="text-sm text-muted-foreground">{dept.orders} orders</div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">${dept.revenue.toFixed(2)}</div>
                          <div className="text-sm text-muted-foreground">
                            ${(dept.revenue / dept.orders).toFixed(2)} avg
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="orders" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Order Details</CardTitle>
                <CardDescription>
                  Showing {filteredOrders.length} of {reportData.orders.length} orders
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Employee</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Rating</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.slice(0, 50).map((order) => (
                      <TableRow key={order.id}>
                        <TableCell>{String(normalizeDate(order.createdAt, "MMM dd, HH:mm"))}</TableCell>
                        <TableCell>{order.userName}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {order.userDepartment || "N/A"}
                          </Badge>
                        </TableCell>
                        <TableCell>{order.selectedOption.name}</TableCell>
                        <TableCell>{order.quantity}</TableCell>
                        <TableCell>${(order.totalPrice || 0).toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              order.status === "delivered"
                                ? "default"
                                : order.status === "cancelled"
                                  ? "destructive"
                                  : "secondary"
                            }
                          >
                            {order.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
