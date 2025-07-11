"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { collection, query, where, onSnapshot, updateDoc, doc, getDocs, addDoc } from "firebase/firestore"
import { getDb } from "@/lib/firebase-config"
import { useAuth } from "@/lib/auth-context"
import type { Order, Menu, MenuOption } from "@/lib/types"
import { Search, Download, RefreshCw, Clock, CheckCircle, AlertCircle, Package, Loader2, Filter } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { normalizeDate } from "@/utils/date"
import { createNotification, createOrderStatusNotification } from "@/services/notifications"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

export function OrdersDashboard() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [departmentFilter, setDepartmentFilter] = useState<string>("all")
  const [guestOrderOpen, setGuestOrderOpen] = useState(false)
  const [guestName, setGuestName] = useState("")
  const [guestReason, setGuestReason] = useState("")
  const [menuOptions, setMenuOptions] = useState<MenuOption[]>([])
  const [selectedMenuOption, setSelectedMenuOption] = useState<string>("")
  const [menuId, setMenuId] = useState<string>("")
  const [guestOrderLoading, setGuestOrderLoading] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)

  useEffect(() => {
    if (!user || user.role !== "admin") return

    const initializeData = async () => {
      try {
        const db = await getDb()
        const today = new Date().toISOString().split("T")[0]
        const ordersQuery = query(collection(db, "orders"), where("orderDate", "==", today))

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

        return () => {
          unsubscribe()
        }
      } catch (error) {
        console.error("Error loading orders:", error)
        setLoading(false)
        toast({
          title: "Error",
          description: "Failed to load orders. Please refresh the page.",
          variant: "destructive",
        })
      }
    }

    initializeData()
  }, [user])

  useEffect(() => {
    let filtered = orders

    if (searchTerm) {
      filtered = filtered.filter(
        (order) =>
          (order.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
          (order.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
          (order.selectedOption?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false),
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((order) => order.status === statusFilter)
    }

    if (departmentFilter !== "all") {
      filtered = filtered.filter((order) => order.userDepartment === departmentFilter)
    }

    setFilteredOrders(filtered)
  }, [orders, searchTerm, statusFilter, departmentFilter])

  const updateOrderStatus = async (orderId: string, newStatus: Order["status"]) => {
    try {
      const db = await getDb()
      const order = orders.find((o) => o.id === orderId)
      if (!order) return

      await updateDoc(doc(db, "orders", orderId), {
        status: newStatus,
        updatedAt: new Date(),
      })

      const notification = createOrderStatusNotification({ ...order, status: newStatus }, newStatus)
      await createNotification(notification)

      toast({
        title: "Order Updated",
        description: `Order status changed to ${newStatus}`,
      })
    } catch (error) {
      console.error("Error updating order:", error)
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive",
      })
    }
  }

  const getStatusIcon = (status: Order["status"]) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />
      case "confirmed":
        return <CheckCircle className="h-4 w-4 text-blue-500" />
      case "delivered":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "cancelled":
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: Order["status"]) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "confirmed":
        return "bg-blue-100 text-blue-800"
      case "delivered":
        return "bg-green-100 text-green-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const departments = Array.from(new Set(orders.map((order) => order.userDepartment).filter(Boolean)))

  useEffect(() => {
    if (!guestOrderOpen) return

    const fetchMenu = async () => {
      setGuestOrderLoading(true)
      try {
        const db = await getDb()
        const today = new Date().toISOString().split("T")[0]
        const menuQuery = query(collection(db, "menus"), where("date", "==", today), where("isPublished", "==", true))
        const menuSnapshot = await getDocs(menuQuery)

        if (!menuSnapshot.empty) {
          const menuData = menuSnapshot.docs[0].data() as Menu
          setMenuOptions(menuData.options)
          setMenuId(menuSnapshot.docs[0].id)
        } else {
          setMenuOptions([])
          setMenuId("")
        }
      } catch (e) {
        setMenuOptions([])
        setMenuId("")
      } finally {
        setGuestOrderLoading(false)
      }
    }

    fetchMenu()
  }, [guestOrderOpen])

  const handleGuestOrderSubmit = async () => {
    if (!guestName || !selectedMenuOption || !menuId) return

    setGuestOrderLoading(true)
    try {
      const db = await getDb()
      const selectedOption = menuOptions.find((opt) => opt.id === selectedMenuOption)
      if (!selectedOption) return

      const order = {
        type: "guest",
        guestName,
        guestReason,
        menuId,
        selectedOption,
        quantity: 1,
        orderDate: new Date().toISOString().split("T")[0],
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
        totalPrice: selectedOption.price || 0,
      }

      await addDoc(collection(db, "orders"), order)
      toast({ title: "Guest Order Placed", description: `Order for ${guestName} placed successfully!` })
      setGuestOrderOpen(false)
      setGuestName("")
      setGuestReason("")
      setSelectedMenuOption("")
    } catch (e) {
      toast({ title: "Error", description: "Failed to place guest order.", variant: "destructive" })
    } finally {
      setGuestOrderLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="ml-4">Loading orders...</p>
      </div>
    )
  }

  // Mobile Order Card Component
  const OrderCard = ({ order }: { order: Order }) => (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-medium text-sm">{order.userName || order.guestName}</h3>
            <p className="text-xs text-gray-500">{order.userEmail}</p>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon(order.status)}
            <Badge className={`${getStatusColor(order.status)} text-xs`}>{order.status}</Badge>
          </div>
        </div>

        <div className="space-y-2 mb-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">{order.selectedOption.name}</span>
            <span className="text-sm font-bold">D{order.totalPrice.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center text-xs text-gray-500">
            <span>Qty: {order.quantity}</span>
            <span>{String(normalizeDate(order.createdAt, "HH:mm"))}</span>
          </div>
          {order.userDepartment && (
            <Badge variant="outline" className="text-xs">
              {order.userDepartment}
            </Badge>
          )}
        </div>

        <Select value={order.status} onValueChange={(value) => updateOrderStatus(order.id, value as Order["status"])}>
          <SelectTrigger className="w-full h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <Button onClick={() => setGuestOrderOpen(true)} className="w-full sm:w-auto">
          Place Guest Order
        </Button>

        {/* Desktop Action Buttons */}
        <div className="hidden sm:flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="secondary" size="sm" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Guest Order Dialog */}
      <Dialog open={guestOrderOpen} onOpenChange={setGuestOrderOpen}>
        <DialogContent className="w-[95vw] max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle>Place Guest Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="guestName">Guest Name</Label>
              <Input id="guestName" value={guestName} onChange={(e) => setGuestName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="guestReason">Reason (optional)</Label>
              <Input id="guestReason" value={guestReason} onChange={(e) => setGuestReason(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="menuOption">Menu Item</Label>
              <Select value={selectedMenuOption} onValueChange={setSelectedMenuOption}>
                <SelectTrigger id="menuOption">
                  <SelectValue placeholder={guestOrderLoading ? "Loading..." : "Select menu item"} />
                </SelectTrigger>
                <SelectContent>
                  {menuOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleGuestOrderSubmit}
              disabled={guestOrderLoading || !guestName || !selectedMenuOption}
              className="w-full sm:w-auto"
            >
              {guestOrderLoading ? "Placing..." : "Place Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs lg:text-sm font-medium">Total Orders</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl lg:text-2xl font-bold">{orders.length}</div>
            <p className="text-xs text-muted-foreground">Today's orders</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs lg:text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl lg:text-2xl font-bold">{orders.filter((o) => o.status === "pending").length}</div>
            <p className="text-xs text-muted-foreground">Awaiting confirmation</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs lg:text-sm font-medium">Confirm</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl lg:text-2xl font-bold">{orders.filter((o) => o.status === "confirmed").length}</div>
            <p className="text-xs text-muted-foreground">Confirm</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs lg:text-sm font-medium">Expenses</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl lg:text-2xl font-bold">
              D{orders.reduce((sum, order) => sum + (order.totalPrice || 0), 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Today's total</p>
          </CardContent>
        </Card>
      </div>

      {/* Orders Section */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-lg lg:text-xl">Today's Orders</CardTitle>
              <CardDescription className="text-sm">Manage and track all lunch orders for today</CardDescription>
            </div>

            {/* Mobile Action Buttons */}
            <div className="flex sm:hidden items-center gap-2">
              <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 bg-transparent"
                onClick={() => window.location.reload()}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search and Filters */}
          <div className="space-y-4 mb-6">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Mobile Filters */}
            <div className="flex lg:hidden items-center gap-2">
              <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                    <Filter className="h-4 w-4 mr-2" />
                    Filters
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[300px]">
                  <SheetHeader>
                    <SheetTitle>Filter Orders</SheetTitle>
                  </SheetHeader>
                  <div className="space-y-4 mt-4">
                    <div>
                      <Label>Status</Label>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="confirmed">Confirmed</SelectItem>
                          <SelectItem value="delivered">Delivered</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Department</Label>
                      <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="Department" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Departments</SelectItem>
                          {departments.map((dept) => (
                            <SelectItem key={dept} value={dept!}>
                              {dept}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* Desktop Filters */}
            <div className="hidden lg:flex items-center gap-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept!}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Mobile Orders List */}
          <div className="lg:hidden">
            {filteredOrders.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-50 text-gray-500" />
                <p className="text-gray-500">No orders found</p>
                <p className="text-sm text-gray-400">Orders will appear here when customers place them</p>
              </div>
            ) : (
              <div>
                {filteredOrders.map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            )}
          </div>

          {/* Desktop Table */}
          <div className="hidden lg:block">
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <div className="text-gray-500">
                          <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>No orders found</p>
                          <p className="text-sm">Orders will appear here when customers place them</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{order.userName || order.guestName}</p>
                            <p className="text-sm text-gray-500">{order.userEmail}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{order.selectedOption.name}</p>
                            <p className="text-sm text-gray-500">Qty: {order.quantity}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{order.userDepartment || "N/A"}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(order.status)}
                            <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                          </div>
                        </TableCell>
                        <TableCell>D{order.totalPrice.toFixed(2)}</TableCell>
                        <TableCell>
                          <p className="text-sm">{String(normalizeDate(order.createdAt, "HH:mm"))}</p>
                          <p className="text-xs text-gray-500">{String(normalizeDate(order.createdAt, "MMM dd"))}</p>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={order.status}
                            onValueChange={(value) => updateOrderStatus(order.id, value as Order["status"])}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="confirmed">Confirmed</SelectItem>
                              <SelectItem value="delivered">Delivered</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
