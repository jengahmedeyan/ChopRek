"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, getDocs } from "firebase/firestore"
import { getDb } from "@/lib/firebase-config"
import { useAuth } from "@/lib/auth-context"
import type { Menu, Order } from "@/lib/types"
import { format, isBefore, parse } from "date-fns"
import { Clock, CheckCircle, AlertCircle, Utensils, Loader2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { createBulkNotifications, createNewOrderNotification } from "@/services/notifications"

export function MenuViewer() {
  const { user } = useAuth()
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

        const menuQuery = query(collection(db, "menus"), where("date", "==", today), where("isPublished", "==", true))

        const unsubscribeMenu = onSnapshot(menuQuery, (snapshot) => {
          if (!snapshot.empty) {
            const menuData = {
              id: snapshot.docs[0].id,
              ...snapshot.docs[0].data(),
              createdAt: snapshot.docs[0].data().createdAt?.toDate() || new Date(),
            } as Menu
            setTodayMenu(menuData)
          } else {
            setTodayMenu(null)
          }
          setLoading(false)
        })

        const checkExistingOrder = async () => {
          const orderQuery = query(
            collection(db, "orders"),
            where("userId", "==", user.uid),
            where("orderDate", "==", today),
          )

          const orderSnapshot = await getDocs(orderQuery)
          if (!orderSnapshot.empty) {
            const orderData = {
              id: orderSnapshot.docs[0].id,
              ...orderSnapshot.docs[0].data(),
              createdAt: orderSnapshot.docs[0].data().createdAt?.toDate() || new Date(),
              updatedAt: orderSnapshot.docs[0].data().updatedAt?.toDate() || new Date(),
            } as Order
            setExistingOrder(orderData)
            setSelectedOption(orderData.selectedOption.id)
          }
        }

        await checkExistingOrder()

        return () => {
          unsubscribeMenu()
        }
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

        const adminUsersQuery = query(collection(db, "users"), where("role", "==", "admin"))
        const adminSnapshot = await getDocs(adminUsersQuery)

        const adminNotifications = adminSnapshot.docs.map((adminDoc) =>
          createNewOrderNotification({
            ...orderData, id: orderRef.id,
            type: "user"
          }, adminDoc.id),
        )

        if (adminNotifications.length > 0) {
          await createBulkNotifications(adminNotifications)
        }

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
        <p className="ml-4">Loading today's menu...</p>
      </div>
    )
  }

  if (!todayMenu) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Utensils className="h-5 w-5" />
            No Menu Available
          </CardTitle>
          <CardDescription>There's no menu published for today yet. Check back later!</CardDescription>
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

  const cutoffPassed = isCutoffPassed()

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Utensils className="h-5 w-5" />
                {todayMenu.title}
              </CardTitle>
              <CardDescription>{format(new Date(todayMenu.date), "EEEE, MMMM dd, yyyy")}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="text-sm">Order by {todayMenu.cutoffTime}</span>
              {cutoffPassed && (
                <Badge variant="destructive">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Cutoff Passed
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">{todayMenu.description}</p>

          {todayMenu.imageUrl && (
            <img
              src={todayMenu.imageUrl || "/placeholder.svg"}
              alt={todayMenu.title}
              className="w-full h-48 object-cover rounded-lg mb-4"
              onError={(e) => {
                e.currentTarget.src = "/placeholder.svg?height=200&width=400"
              }}
            />
          )}

          {existingOrder && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-green-800 font-medium">Order Confirmed: {existingOrder.selectedOption.name}</span>
              </div>
              {!cutoffPassed && (
                <p className="text-sm text-green-700 mt-1">
                  You can still change your selection before {todayMenu.cutoffTime}
                </p>
              )}
            </div>
          )}

          <div className="space-y-4">
            <h3 className="font-semibold">Choose your meal:</h3>

            <RadioGroup value={selectedOption} onValueChange={setSelectedOption} disabled={cutoffPassed}>
              {todayMenu.options.map((option) => (
                <div key={option.id} className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                  <RadioGroupItem value={option.id} id={option.id} />
                  <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{option.name}</p>
                          {option.price && (
                            <Badge variant="outline" className="text-green-600">
                              ${option.price.toFixed(2)}
                            </Badge>
                          )}
                        </div>
                        {option.description && (
                          <p className="text-sm text-muted-foreground mt-1">{option.description}</p>
                        )}
                        {option.calories && <p className="text-xs text-gray-500 mt-1">{option.calories} calories</p>}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant="secondary" className="capitalize">
                          {option.dietary}
                        </Badge>
                        {option.allergens && option.allergens.length > 0 && (
                          <div className="text-xs text-orange-600">Contains: {option.allergens.join(", ")}</div>
                        )}
                      </div>
                    </div>
                  </Label>
                </div>
              ))}
            </RadioGroup>

            {!cutoffPassed && (
              <Button onClick={handleSubmitOrder} disabled={!selectedOption || submitting} className="w-full">
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
              <div className="text-center py-4">
                <p className="text-gray-500">Order cutoff time has passed for today.</p>
                <p className="text-sm text-gray-400">Check back tomorrow for the next menu!</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
