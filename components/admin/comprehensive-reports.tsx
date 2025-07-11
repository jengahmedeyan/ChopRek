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
import { FileText, TrendingUp, Users, Wallet, Filter, Search } from "lucide-react"
import type { DateRange } from "react-day-picker"
import { normalizeDate } from "@/utils/date"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { DatePickerWithPresets } from "../ui/date-picker-with-presets"

type ReportType = "standard" | "comprehensive" | "custom" | "daily" | "weekly" | "monthly"


// Extend jsPDF type to include autoTable
declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: any) => jsPDF
  }
}

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

// PDF Generation Function
const generateInvoicePDF = (
  reportData: ReportData,
  dateRange: DateRange | undefined,
  logoBase64?: string
) => {
  const doc = new jsPDF("portrait", "mm", "a4")
  const pageWidth = doc.internal.pageSize.width
  const pageHeight = doc.internal.pageSize.height
  let yPosition = 20

  const margin = 20;
  const logoWidth = 30;
  const logoHeight = 30;
  const logoY = yPosition - 8; // align logo with text block

  // Header Section
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("ChopRek", margin, yPosition);

  if (logoBase64) {
    doc.addImage(
      logoBase64,
      "PNG",
      pageWidth - margin - logoWidth,
      logoY,
      logoWidth,
      logoHeight
    );
  }

  yPosition += 10;
  doc.setFontSize(16);
  doc.setFont("helvetica", "normal");
  doc.text("PrimeForge Office Lunch Ordering Invoice", margin, yPosition);

  // Date Range
  yPosition += 10;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const dateRangeText =
    dateRange?.from && dateRange?.to
      ? `Report Period: ${format(dateRange.from, "MMM dd, yyyy")} - ${format(dateRange.to, "MMM dd, yyyy")}`
      : `Generated on: ${format(new Date(), "MMM dd, yyyy")}`;
  doc.text(dateRangeText, margin, yPosition);

  // Horizontal line
  yPosition += 10
  doc.setLineWidth(0.5)
  doc.line(20, yPosition, pageWidth - 20, yPosition)

  // Summary Section
  yPosition += 15
  doc.setFontSize(16)
  doc.setFont("helvetica", "bold")
  doc.text("EXECUTIVE SUMMARY", 20, yPosition)

  yPosition += 10
  doc.setFontSize(11)
  doc.setFont("helvetica", "normal")

  // Summary boxes
  const summaryData = [
    ["Total Orders:", reportData.summary.totalOrders.toString()],
    ["Total Expenses:", `D${reportData.summary.totalRevenue.toFixed(2)}`],
    ["Unique Employees:", reportData.summary.uniqueCustomers.toString()],
    ["Average Order Value:", `D${reportData.summary.averageOrderValue.toFixed(2)}`],
  ]

  // Create summary table
  autoTable(doc, {
    startY: yPosition,
    head: [["Metric", "Value"]],
    body: summaryData,
    theme: "grid",
    headStyles: {
      fillColor: [66, 139, 202],
      textColor: 255,
      fontStyle: "bold",
    },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 60 },
      1: { cellWidth: 40, halign: "right" },
    },
    margin: { left: 20, right: 20 },
    tableWidth: 100,
  })

  yPosition = (doc as any).lastAutoTable.finalY + 15

  // Top Items Section
  if (reportData.summary.topItems.length > 0) {
    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    doc.text("TOP MENU ITEMS", 20, yPosition)

    yPosition += 5
    const topItemsData = reportData.summary.topItems
      .slice(0, 5)
      .map((item, index) => [(index + 1).toString(), item.name, item.count.toString(), `D${item.revenue.toFixed(2)}`])

    autoTable(doc, {
      startY: yPosition,
      head: [["Rank", "Item Name", "Orders", "Expenses"]],
      body: topItemsData,
      theme: "striped",
      headStyles: {
        fillColor: [52, 152, 219],
        textColor: 255,
        fontStyle: "bold",
      },
      columnStyles: {
        0: { cellWidth: 15, halign: "center" },
        1: { cellWidth: 80 },
        2: { cellWidth: 25, halign: "center" },
        3: { cellWidth: 30, halign: "right" },
      },
      margin: { left: 20, right: 20 },
    })

    yPosition = (doc as any).lastAutoTable.finalY + 15
  }

  // Check if we need a new page
  if (yPosition > pageHeight - 80) {
    doc.addPage()
    yPosition = 20
  }

  // Order Details Section
  doc.setFontSize(14)
  doc.setFont("helvetica", "bold")
  doc.text("ORDER DETAILS", 20, yPosition)

  yPosition += 5
  const orderDetailsData = reportData.orders
    .slice(0, 50)
    .map((order) => [
      order.id.substring(0, 8) + "...",
      normalizeDate(order.createdAt, "MMM dd"),
      order.userName || order.guestName || "N/A",
      order.selectedOption.name.length > 25
        ? order.selectedOption.name.substring(0, 25) + "..."
        : order.selectedOption.name,
      order.quantity.toString(),
      `D${(order.totalPrice || 0).toFixed(2)}`,
    ])

  autoTable(doc, {
    startY: yPosition,
    head: [["Order ID", "Date", "Employee", "Item", "Qty", "Price"]],
    body: orderDetailsData.map(row => row.map(cell => typeof cell === "string" ? cell : cell.toString())),
    theme: "striped",
    headStyles: {
      fillColor: [46, 125, 50],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 10,
    },
    bodyStyles: {
      fontSize: 9,
    },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 20 },
      2: { cellWidth: 35 },
      3: { cellWidth: 50 },
      4: { cellWidth: 15, halign: "center" },
      5: { cellWidth: 25, halign: "right" },
    },
    margin: { left: 20, right: 20 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  })

  // Footer
  const totalPages = doc.internal.pages.length - 1
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setFont("helvetica", "normal")
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - 30, pageHeight - 10)
    doc.text("© 2025 ChopRek. All rights reserved.", 20, pageHeight - 10)
  }

  const fileName = `choprek-report-${format(new Date(), "yyyy-MM-dd")}.pdf`
  doc.save(fileName)
}

export function ComprehensiveReports() {
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [reportType, setReportType] = useState<ReportType>("weekly")
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
  const [selectedDepartment, setSelectedDepartment] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [orderTypeFilter, setOrderTypeFilter] = useState<string>("all")
  const [logoBase64, setLogoBase64] = useState<string | undefined>(undefined)

  // Local filter state for UI
  const [pendingReportType, setPendingReportType] = useState<ReportType>("weekly")
  const [pendingDateRange, setPendingDateRange] = useState<DateRange | undefined>(undefined)
  const [pendingSelectedDepartment, setPendingSelectedDepartment] = useState("all")

  // Load logo as base64 on mount
  useEffect(() => {
    fetch("/pf_logo.png")
      .then(async (res) => {
        const blob = await res.blob()
        const reader = new FileReader()
        reader.onloadend = () => {
          setLogoBase64(reader.result as string)
        }
        reader.readAsDataURL(blob)
      })
      .catch(() => setLogoBase64(undefined))
  }, [])

  useEffect(() => {
    generateReport("weekly", undefined, "all")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (reportData) {
      filterOrders()
    }
  }, [reportData, searchTerm, orderTypeFilter])

  const generateReport = async (overrideType?: ReportType, overrideRange?: DateRange, overrideDept?: string) => {
    setLoading(true)
    try {
      const db = await getDb()
      let startDate = new Date()
      let endDate = new Date()
      const type = overrideType || pendingReportType
      const range = overrideRange || pendingDateRange
      const dept = overrideDept || pendingSelectedDepartment

      switch (type) {
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
          if (range?.from && range?.to) {
            startDate = range.from
            endDate = range.to
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

      if (dept !== "all") {
        orders = orders.filter((order) => order.userDepartment === dept)
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
      // Update main filter state
      setReportType(type)
      setDateRange(range)
      setSelectedDepartment(dept)
    } catch (error) {
      console.error("Error generating report:", error)
    } finally {
      setLoading(false)
    }
  }

  const filterOrders = () => {
    if (!reportData) return

    let filtered = reportData.orders

    if (orderTypeFilter !== "all") {
      filtered = filtered.filter((order) => order.type === orderTypeFilter)
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (order) =>
          order.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          "" ||
          order.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          "" ||
          order.guestName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          "" ||
          order.selectedOption.name.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    setFilteredOrders(filtered)
  }

  const exportToPDF = () => {
    if (!reportData) return
    generateInvoicePDF(reportData, dateRange, logoBase64)
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
            <FileText className="h-4 w-4 mr-2" />
            Export PDF
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
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Report Type</Label>
              <Select value={pendingReportType} onValueChange={v => setPendingReportType(v as ReportType)}>
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

            {pendingReportType === "custom" && (
              <div className="space-y-2">
                <Label>Date Range</Label>
                <DatePickerWithPresets date={pendingDateRange} setDate={setPendingDateRange} />
              </div>
            )}

            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={pendingSelectedDepartment} onValueChange={setPendingSelectedDepartment}>
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
              <Label>Order Type</Label>
              <Select value={orderTypeFilter} onValueChange={setOrderTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="user">User Orders</SelectItem>
                  <SelectItem value="guest">Guest Orders</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 flex items-end">
              <div className="relative">
                <Button onClick={() => generateReport()} variant="default">
                  Apply Filters
                </Button>
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
            <TabsTrigger value="guestOrders">Guest Orders</TabsTrigger>
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
                  <CardTitle className="text-sm font-medium">Total Expense</CardTitle>
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">D{reportData.summary.totalRevenue.toFixed(2)}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Unique Employees</CardTitle>
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
                  <div className="text-2xl font-bold">D{reportData.summary.averageOrderValue.toFixed(2)}</div>
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
                          <div className="text-sm text-muted-foreground">D{item.revenue.toFixed(2)}</div>
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
                          <div className="font-medium">D{dept.revenue.toFixed(2)}</div>
                          <div className="text-sm text-muted-foreground">
                            D{(dept.revenue / dept.orders).toFixed(2)} avg
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
                        <TableCell>D{(order.totalPrice || 0).toFixed(2)}</TableCell>
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

          <TabsContent value="guestOrders" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Guest Orders</CardTitle>
                <CardDescription>Orders placed for guests</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Guest Name</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Meal Option</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.orders
                      .filter((order) => order.type === "guest")
                      .map((order) => (
                        <TableRow key={order.id}>
                          <TableCell>{order.id}</TableCell>
                          <TableCell>{String(normalizeDate(order.createdAt, "yyyy-MM-dd HH:mm"))}</TableCell>
                          <TableCell>{order.guestName}</TableCell>
                          <TableCell>{order.guestReason}</TableCell>
                          <TableCell>{order.selectedOption.name}</TableCell>
                          <TableCell>{order.quantity}</TableCell>
                          <TableCell>{order.totalPrice}</TableCell>
                          <TableCell>{order.status}</TableCell>
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
