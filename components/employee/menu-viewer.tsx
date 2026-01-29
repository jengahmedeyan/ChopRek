"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, getDocs, orderBy } from "firebase/firestore"
import { getDb } from "@/lib/firebase-config"
import { useAuth } from "@/lib/auth-context"
import type { Menu, Order } from "@/lib/types"
import { format, isBefore, parse } from "date-fns"
import { Clock, CheckCircle, AlertCircle, Utensils, Loader2, Calendar } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { createBulkNotifications, createNewOrderNotification } from "@/services/notifications"

export function MenuViewer() {
  const { user } = useAuth()
  const [menus, setMenus] = useState<Menu[]>([])
  const [todayMenu, setTodayMenu] = useState<Menu | null>(null)
  const [existingOrder, setExistingOrder] = useState<Order | null>(null)
  const [selectedOption, setSelectedOption] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!user) return

    const initializeData = async () => {
      try {
        const db = await getDb()
        const today = new Date().toISOString().split("T")[0]

        // Fetch all published menus from today onwards
        const menuQuery = query(
          collection(db, "menus"), 
          where("isPublished", "==", true),
          orderBy("date", "asc")
        )

        const unsubscribeMenu = onSnapshot(menuQuery, (snapshot) => {
          const allMenus = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
          })) as Menu[]

          // Filter menus to only show today and future dates
          const filteredMenus = allMenus.filter(menu => menu.date >= today)
          setMenus(filteredMenus)

          // Set today's menu separately
          const todayMenuData = filteredMenus.find(menu => menu.date === today)
          setTodayMenu(todayMenuData || null)
          
          setLoading(false)
        })

        const orderQuery = query(
          collection(db, "orders"),
          where("userId", "==", user.uid),
          where("orderDate", "==", today)
        );

        const unsubscribeOrder = onSnapshot(orderQuery, (orderSnapshot) => {
          if (!orderSnapshot.empty) {
            const orderData = {
              id: orderSnapshot.docs[0].id,
              ...orderSnapshot.docs[0].data(),
              createdAt: orderSnapshot.docs[0].data().createdAt?.toDate() || new Date(),
              updatedAt: orderSnapshot.docs[0].data().updatedAt?.toDate() || new Date(),
            } as Order;
            setExistingOrder(orderData);
            setSelectedOption(orderData.selectedOption.id);
          } else {
            setExistingOrder(null);
            setSelectedOption("");
          }
        });

        return () => {
          unsubscribeMenu();
          unsubscribeOrder();
        };
      } catch (error) {
        console.error("Error initializing menu viewer:", error)
        setLoading(false)
        toast({
          title: "Error",
          description: "Failed to load menu data. Please refresh the page.",
          variant: "destructive",
        })
      }
    }

    initializeData()
  }, [user])

  const isCutoffPassed = () => {
    if (!todayMenu) return false
    const now = new Date()
    const cutoffTime = parse(todayMenu.cutoffTime, "HH:mm", new Date())
    return isBefore(cutoffTime, now)
  }

  const handleSubmitOrder = async () => {
    if (!user || !todayMenu || !selectedOption) return

    setSubmitting(true)
    try {
      const selectedMealOption = todayMenu.options.find((opt) => opt.id === selectedOption)
      if (!selectedMealOption) return

      const db = await getDb()
      const orderData = {
        userId: user.uid,
        userName: user.displayName ?? user.email ?? "",
        userEmail: user.email ?? "",
        userDepartment: user.department || "",
        menuId: todayMenu.id,
        selectedOption: selectedMealOption,
        quantity: 1,
        orderDate: todayMenu.date,
        status: "pending" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        totalPrice: selectedMealOption.price || 0,
        deliveryId: null,
      }

      if (existingOrder) {
        await updateDoc(doc(db, "orders", existingOrder.id), {
          selectedOption: selectedMealOption,
          updatedAt: new Date(),
          totalPrice: selectedMealOption.price || 0,
        })
        toast({
          title: "Order Updated",
          description: `Your lunch choice has been updated to ${selectedMealOption.name}`,
        })
      } else {
        const orderRef = await addDoc(collection(db, "orders"), orderData)
        const adminId = todayMenu.createdBy

        const adminNotification = createNewOrderNotification(
          {
            id: orderRef.id,
            userName: orderData.userName,
            selectedOptionName: selectedMealOption.name,
            orderDate: orderData.orderDate,
          },
          adminId
        )

        await createBulkNotifications([adminNotification])        

        toast({
          title: "Order Placed",
          description: `You've ordered ${selectedMealOption.name} for lunch!`,
        })
      }
    } catch (error) {
      console.error("Error submitting order:", error)
      toast({
        title: "Error",
        description: "Failed to place order. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="ml-4">Loading menus...</p>
      </div>
    )
  }

  if (menus.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Utensils className="h-5 w-5" />
            No Menu Available
          </CardTitle>
          <CardDescription>There are no menus published yet. Check back later!</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-6xl mb-4">🍽️</div>
            <p className="text-gray-500 mb-4">The kitchen is preparing something special for you!</p>
            <p className="text-sm text-gray-400">Contact your administrator if you think this is an error.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const cutoffPassed = todayMenu ? isCutoffPassed() : false
  const today = new Date().toISOString().split("T")[0]
  const upcomingMenus = menus.filter(menu => menu.date > today)

  return (
    <div className="space-y-3 sm:space-y-4 lg:space-y-6 p-2 sm:p-4 lg:p-6">
      <Tabs defaultValue={todayMenu ? "today" : "upcoming"}>
        <TabsList className="grid w-full grid-cols-2 h-auto">
          <TabsTrigger value="today" disabled={!todayMenu} className="text-xs sm:text-sm py-2">
            <span className="hidden xs:inline">Today's Menu</span>
            <span className="xs:hidden">Today</span>
            {todayMenu && " ✓"}
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="text-xs sm:text-sm py-2">
            <span className="hidden xs:inline">Upcoming ({upcomingMenus.length})</span>
            <span className="xs:hidden">Upcoming</span>
          </TabsTrigger>
        </TabsList>

        {todayMenu && (
          <TabsContent value="today" className="space-y-3 sm:space-y-4 lg:space-y-6">
      <Card className="shadow-sm">
        <CardHeader className="p-3 sm:p-4 lg:p-6">
          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg lg:text-xl">
                  <Utensils className="h-4 w-4 sm:h-5 sm:w-5" />
                  {todayMenu.title}
                </CardTitle>
                <CardDescription className="mt-1 sm:mt-2 text-xs sm:text-sm">{format(new Date(todayMenu.date), "EEEE, MMMM dd, yyyy")}</CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 text-xs sm:text-sm bg-muted px-2 py-1 rounded">
                  <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span>Order by {todayMenu.cutoffTime}</span>
                </div>
                {cutoffPassed && (
                  <Badge variant="destructive" className="text-xs">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Cutoff Passed
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 lg:p-6 pt-0">
          <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">{todayMenu.description}</p>

          {todayMenu.imageUrl && (
            <img
              src={todayMenu.imageUrl || "/placeholder.svg"}
              alt={todayMenu.title}
              className="w-full h-40 sm:h-48 lg:h-56 object-cover rounded-lg mb-3 sm:mb-4"
              onError={(e) => {
                e.currentTarget.src = "/placeholder.svg?height=200&width=400"
              }}
            />
          )}

          {existingOrder && (
            <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <span className="text-xs sm:text-sm text-green-800 font-medium block">Order Confirmed: {existingOrder.selectedOption.name}</span>
                  {!cutoffPassed && (
                    <p className="text-xs sm:text-sm text-green-700 mt-1">
                      You can still change your selection before {todayMenu.cutoffTime}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3 sm:space-y-4">
            <h3 className="font-semibold text-sm sm:text-base">Choose your meal:</h3>

            <RadioGroup value={selectedOption} onValueChange={setSelectedOption} disabled={cutoffPassed}>
              {todayMenu.options.map((option) => (
                <div key={option.id} className="flex items-start space-x-2 sm:space-x-3 p-2 sm:p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                  <RadioGroupItem value={option.id} id={option.id} className="mt-1" />
                  <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm sm:text-base">{option.name}</p>
                        </div>
                        {option.description && (
                          <p className="text-xs sm:text-sm text-muted-foreground mt-1">{option.description}</p>
                        )}
                      </div>
                    </div>
                  </Label>
                </div>
              ))}
            </RadioGroup>

            {!cutoffPassed && (
              <Button onClick={handleSubmitOrder} disabled={!selectedOption || submitting} className="w-full h-10 sm:h-11 text-sm sm:text-base">
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : existingOrder ? (
                  "Update Order"
                ) : (
                  "Place Order"
                )}
              </Button>
            )}

            {cutoffPassed && (
              <div className="text-center py-4 sm:py-6">
                <AlertCircle className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-orange-500 mb-2" />
                <p className="text-xs sm:text-sm text-muted-foreground px-4">
                  The order cutoff time has passed. You can no longer place or modify orders for today.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
          </TabsContent>
        )}

        <TabsContent value="upcoming" className="space-y-3 sm:space-y-4">
          {upcomingMenus.length === 0 ? (
            <Card className="shadow-sm">
              <CardContent className="py-8 sm:py-12 text-center p-3 sm:p-6">
                <Calendar className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-gray-400 mb-3 sm:mb-4" />
                <p className="text-sm sm:text-base text-gray-500 font-medium">No upcoming menus available</p>
                <p className="text-xs sm:text-sm text-gray-400 mt-1 sm:mt-2">Check back later for future menus</p>
              </CardContent>
            </Card>
          ) : (
            upcomingMenus.map((menu) => (
              <Card key={menu.id} className="shadow-sm">
                <CardHeader className="p-3 sm:p-4 lg:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                        <Utensils className="h-4 w-4 sm:h-5 sm:w-5" />
                        {menu.title}
                      </CardTitle>
                      <CardDescription className="mt-1 sm:mt-2 text-xs sm:text-sm">
                        {format(new Date(menu.date), "EEEE, MMMM dd, yyyy")}
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="text-xs self-start">
                      <Clock className="h-3 w-3 mr-1" />
                      {menu.cutoffTime}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-3 sm:p-4 lg:p-6 pt-0">
                  <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">{menu.description}</p>
                  
                  {menu.imageUrl && (
                    <img
                      src={menu.imageUrl || "/placeholder.svg"}
                      alt={menu.title}
                      className="w-full h-40 sm:h-48 lg:h-56 object-cover rounded-lg mb-3 sm:mb-4"
                      onError={(e) => {
                        e.currentTarget.src = "/placeholder.svg?height=200&width=400"
                      }}
                    />
                  )}

                  <div className="space-y-2">
                    <h4 className="font-semibold text-xs sm:text-sm">Menu Options:</h4>
                    {menu.options.map((option) => (
                      <div key={option.id} className="p-2 sm:p-3 border rounded-lg">
                        <p className="font-medium text-sm sm:text-base">{option.name}</p>
                        {option.description && (
                          <p className="text-xs sm:text-sm text-muted-foreground mt-1">{option.description}</p>
                        )}
                        <Badge variant="outline" className="mt-2 text-xs">
                          {option.dietary}
                        </Badge>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs sm:text-sm text-blue-800">
                      <strong>Note:</strong> Orders for this menu will open on {format(new Date(menu.date), "MMMM dd, yyyy")}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
