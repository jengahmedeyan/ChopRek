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
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xl lg:text-2xl font-bold">{orders.length}</div>
                <p className="text-xs text-muted-foreground">Today's orders</p>
              </div>
              <div className="text-xs text-muted-foreground text-right ml-4">
                {Object.entries(orderBreakdown).map(([item, count]) => (
                  <div key={item}>{count} × {item}</div>
                ))}
              </div>
            </div>
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
            <CardTitle className="text-xs lg:text-sm font-medium">Confirmed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl lg:text-2xl font-bold">{orders.filter((o) => o.status === "confirmed").length}</div>
            <p className="text-xs text-muted-foreground">Confirmed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs lg:text-sm font-medium">Revenue</CardTitle>
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

      {/* Orders Section with Tabs */}
      <Tabs defaultValue="today" className="space-y-4">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="today" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Today's Orders
          </TabsTrigger>
          <TabsTrigger 
            value="all" 
            className="flex items-center gap-2"
            onClick={() => {
              if (allOrders.length === 0 && !allOrdersLoading) {
                loadAllOrders()
              }
            }}
          >
            <History className="h-4 w-4" />
            All Orders
          </TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-lg lg:text-xl">Today's Orders</CardTitle>
                  <CardDescription className="text-sm">Manage and track all lunch orders for today</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Mobile Orders List */}
              <div className="lg:hidden">
                {orders.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-50 text-gray-500" />
                    <p className="text-gray-500">No orders found</p>
                    <p className="text-sm text-gray-400">Orders will appear here when customers place them</p>
                  </div>
                ) : (
                  <div>
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

        <TabsContent value="all" className="space-y-4">
          {/* Historical Stats Cards */}
          {allOrders.length > 0 && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs lg:text-sm font-medium">Total Orders</CardTitle>
                  <History className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl lg:text-2xl font-bold">{allOrders.length}</div>
                  <p className="text-xs text-muted-foreground">Historical orders</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs lg:text-sm font-medium">Delivered</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl lg:text-2xl font-bold">
                    {allOrders.filter((o) => o.status === "delivered").length}
                  </div>
                  <p className="text-xs text-muted-foreground">Successfully completed</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs lg:text-sm font-medium">Cancelled</CardTitle>
                  <AlertCircle className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl lg:text-2xl font-bold">
                    {allOrders.filter((o) => o.status === "cancelled").length}
                  </div>
                  <p className="text-xs text-muted-foreground">Cancelled orders</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs lg:text-sm font-medium">Total Revenue</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl lg:text-2xl font-bold">
                    D{allOrders
                      .filter((o) => o.status === "delivered")
                      .reduce((sum, order) => sum + (order.totalPrice || 0), 0)
                      .toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground">From delivered orders</p>
                </CardContent>
              </Card>
            </div>
          )}

          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-lg lg:text-xl">All Orders</CardTitle>
                  <CardDescription className="text-sm">Complete order history (last 100 orders)</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export All
                  </Button>
                  <Button variant="secondary" size="sm" onClick={loadAllOrders}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {allOrdersLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  <p className="ml-4">Loading historical orders...</p>
                </div>
              ) : (
                <>
                  {/* Mobile Orders List */}
                  <div className="lg:hidden">
                    {allOrders.length === 0 ? (
                      <div className="text-center py-8">
                        <History className="h-8 w-8 mx-auto mb-2 opacity-50 text-gray-500" />
                        <p className="text-gray-500">No historical orders found</p>
                        <p className="text-sm text-gray-400">Historical orders will appear here</p>
                      </div>
                    ) : (
                      <div>
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
