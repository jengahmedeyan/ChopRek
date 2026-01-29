"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { collection, query, where, onSnapshot, updateDoc, doc, getDocs, addDoc, orderBy, limit } from "firebase/firestore"
import { getDb } from "@/lib/firebase-config"
import { useAuth } from "@/lib/auth-context"
import type { Order, Menu, MenuOption } from "@/lib/types"
import { Download, RefreshCw, Clock, CheckCircle, Package, Loader2, History, Calendar, AlertCircle } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { createNotification, createOrderStatusNotification } from "@/services/notifications"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { DataTable } from "./_components/data-table"
import { columns } from "./_components/columns"
import { historicalColumns } from "./_components/historical-columns"
import OrderCard from "./_components/order-card"

export default function OrdersDashboard() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [allOrders, setAllOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [allOrdersLoading, setAllOrdersLoading] = useState(false)
  const [guestOrderOpen, setGuestOrderOpen] = useState(false)
  const [guestName, setGuestName] = useState("")
  const [guestReason, setGuestReason] = useState("")
  const [menuOptions, setMenuOptions] = useState<MenuOption[]>([])
  const [selectedMenuOption, setSelectedMenuOption] = useState<string>("")
  const [menuId, setMenuId] = useState<string>("")
  const [guestOrderLoading, setGuestOrderLoading] = useState(false)


  const loadAllOrders = async () => {
    if (!user || user.role !== "admin") return

    setAllOrdersLoading(true)
    try {
      const db = await getDb()
      const allOrdersQuery = query(
        collection(db, "orders"),
        orderBy("createdAt", "desc"),
        limit(100) // Limit to last 100 orders for performance
      )

      const unsubscribe = onSnapshot(allOrdersQuery, (snapshot) => {
        const ordersData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        })) as Order[]

        setAllOrders(ordersData)
        setAllOrdersLoading(false)
      })

      return () => {
        unsubscribe()
      }
    } catch (error) {
      console.error("Error loading all orders:", error)
      setAllOrdersLoading(false)
      toast({
        title: "Error",
        description: "Failed to load historical orders.",
        variant: "destructive",
      })
    }
  }

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
        userId: user?.uid,
        createdBy: user?.uid,
      }

      await addDoc(collection(db, "orders"), order)
      toast({ title: "Guest Order Placed", description: `Order for ${guestName} placed successfully!` })
      setGuestOrderOpen(false)
      setGuestName("")
      setGuestReason("")
      setSelectedMenuOption("")
    } catch (error) {
      console.error("Error creating guest order:", error)
      toast({ 
        title: "Error", 
        description: "Failed to place guest order. Please check permissions and try again.", 
        variant: "destructive" 
      })
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

  const orderBreakdown = orders.reduce<Record<string, number>>((acc, order) => {
    const itemName = order.selectedOption?.name || "Unknown";
    acc[itemName] = (acc[itemName] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-3 sm:space-y-4 lg:space-y-6 p-2 sm:p-4 lg:p-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-center sm:justify-between">
        <Button onClick={() => setGuestOrderOpen(true)} className="w-full sm:w-auto text-sm sm:text-base h-9 sm:h-10">
          Place Guest Order
        </Button>
        {/* Action Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button variant="outline" size="sm" className="flex-1 sm:flex-initial h-9">
            <Download className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="text-xs sm:text-sm">Export</span>
          </Button>
          <Button variant="secondary" size="sm" onClick={() => window.location.reload()} className="flex-1 sm:flex-initial h-9">
            <RefreshCw className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="text-xs sm:text-sm">Refresh</span>
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Orders</CardTitle>
            <Package className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0 sm:pt-0">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-lg sm:text-xl lg:text-2xl font-bold">{orders.length}</div>
                <p className="text-xs text-muted-foreground">Today's orders</p>
              </div>
              <div className="text-xs text-muted-foreground text-right ml-2 max-h-16 overflow-y-auto">
                {Object.entries(orderBreakdown).slice(0, 3).map(([item, count]) => (
                  <div key={item} className="truncate">{count} × {item}</div>
                ))}
                {Object.entries(orderBreakdown).length > 3 && (
                  <div className="text-xs">+{Object.entries(orderBreakdown).length - 3} more</div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4">
            <CardTitle className="text-xs sm:text-sm font-medium">Pending</CardTitle>
            <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-500" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0 sm:pt-0">
            <div className="text-lg sm:text-xl lg:text-2xl font-bold">{orders.filter((o) => o.status === "pending").length}</div>
            <p className="text-xs text-muted-foreground">Awaiting</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4">
            <CardTitle className="text-xs sm:text-sm font-medium">Confirmed</CardTitle>
            <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0 sm:pt-0">
            <div className="text-lg sm:text-xl lg:text-2xl font-bold">{orders.filter((o) => o.status === "confirmed").length}</div>
            <p className="text-xs text-muted-foreground">Confirmed</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4">
            <CardTitle className="text-xs sm:text-sm font-medium">Revenue</CardTitle>
            <Package className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0 sm:pt-0">
            <div className="text-lg sm:text-xl lg:text-2xl font-bold">
              D{orders.reduce((sum, order) => sum + (order.totalPrice || 0), 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Today's total</p>
          </CardContent>
        </Card>
      </div>

      {/* Orders Section with Tabs */}
      <Tabs defaultValue="today" className="space-y-3 sm:space-y-4">
        <TabsList className="grid w-full grid-cols-2 h-auto">
          <TabsTrigger value="today" className="flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm py-2">
            <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline">Today's Orders</span>
            <span className="xs:hidden">Today</span>
          </TabsTrigger>
          <TabsTrigger 
            value="all" 
            className="flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm py-2"
            onClick={() => {
              if (allOrders.length === 0 && !allOrdersLoading) {
                loadAllOrders()
              }
            }}
          >
            <History className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline">All Orders</span>
            <span className="xs:hidden">History</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-3 sm:space-y-4">
          <Card className="shadow-sm">
            <CardHeader className="p-3 sm:p-4 lg:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                <div>
                  <CardTitle className="text-base sm:text-lg lg:text-xl">Today's Orders</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Manage and track all lunch orders for today</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 lg:p-6 pt-0">
              {/* Mobile Orders List */}
              <div className="lg:hidden">
                {orders.length === 0 ? (
                  <div className="text-center py-8 sm:py-12">
                    <Package className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-2 opacity-50 text-gray-500" />
                    <p className="text-sm sm:text-base text-gray-500 font-medium">No orders found</p>
                    <p className="text-xs sm:text-sm text-gray-400 mt-1">Orders will appear here when customers place them</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {orders.map((order) => (
                      <OrderCard key={order.id} order={order} updateOrderStatus={updateOrderStatus} />
                    ))}
                  </div>
                )}
              </div>

              {/* Desktop Data Table */}
              <div className="hidden lg:block">
                <DataTable columns={columns} data={orders} onUpdateOrderStatus={updateOrderStatus} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all" className="space-y-3 sm:space-y-4">
          {/* Historical Stats Cards */}
          {allOrders.length > 0 && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
              <Card className="shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4">
                  <CardTitle className="text-xs sm:text-sm font-medium">Total Orders</CardTitle>
                  <History className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="p-3 sm:p-4 pt-0 sm:pt-0">
                  <div className="text-lg sm:text-xl lg:text-2xl font-bold">{allOrders.length}</div>
                  <p className="text-xs text-muted-foreground">Historical</p>
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4">
                  <CardTitle className="text-xs sm:text-sm font-medium">Delivered</CardTitle>
                  <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
                </CardHeader>
                <CardContent className="p-3 sm:p-4 pt-0 sm:pt-0">
                  <div className="text-lg sm:text-xl lg:text-2xl font-bold">
                    {allOrders.filter((o) => o.status === "delivered").length}
                  </div>
                  <p className="text-xs text-muted-foreground">Completed</p>
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4">
                  <CardTitle className="text-xs sm:text-sm font-medium">Cancelled</CardTitle>
                  <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 text-red-500" />
                </CardHeader>
                <CardContent className="p-3 sm:p-4 pt-0 sm:pt-0">
                  <div className="text-lg sm:text-xl lg:text-2xl font-bold">
                    {allOrders.filter((o) => o.status === "cancelled").length}
                  </div>
                  <p className="text-xs text-muted-foreground">Cancelled</p>
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4">
                  <CardTitle className="text-xs sm:text-sm font-medium">Total Revenue</CardTitle>
                  <Package className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="p-3 sm:p-4 pt-0 sm:pt-0">
                  <div className="text-lg sm:text-xl lg:text-2xl font-bold">
                    D{allOrders
                      .filter((o) => o.status === "delivered")
                      .reduce((sum, order) => sum + (order.totalPrice || 0), 0)
                      .toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground">Delivered only</p>
                </CardContent>
              </Card>
            </div>
          )}

          <Card className="shadow-sm">
            <CardHeader className="p-3 sm:p-4 lg:p-6">
              <div className="flex flex-col gap-3">
                <div>
                  <CardTitle className="text-base sm:text-lg lg:text-xl">All Orders</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Complete order history (last 100 orders)</CardDescription>
                </div>

              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 lg:p-6 pt-0">
              {allOrdersLoading ? (
                <div className="flex flex-col items-center justify-center h-32 sm:h-40">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  <p className="ml-4 text-sm sm:text-base mt-2">Loading historical orders...</p>
                </div>
              ) : (
                <>
                  {/* Mobile Orders List */}
                  <div className="lg:hidden">
                    {allOrders.length === 0 ? (
                      <div className="text-center py-8 sm:py-12">
                        <History className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-2 opacity-50 text-gray-500" />
                        <p className="text-sm sm:text-base text-gray-500 font-medium">No historical orders found</p>
                        <p className="text-xs sm:text-sm text-gray-400 mt-1">Historical orders will appear here</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {allOrders.map((order) => (
                          <OrderCard key={order.id} order={order} updateOrderStatus={updateOrderStatus} />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Desktop Data Table */}
                  <div className="hidden lg:block">
                    <DataTable columns={historicalColumns} data={allOrders} />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
