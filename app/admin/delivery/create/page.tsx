"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Order, DeliveryDriver, Menu } from '@/lib/types'
import { getConfirmedOrdersForDelivery, createDelivery } from '@/services/deliveries'
import { getActiveDrivers } from '@/services/drivers'
import { getActiveMenu } from '@/services/menus'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, Package, CheckCircle, Users, DollarSign } from 'lucide-react'

export default function CreateDeliveryPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [orders, setOrders] = useState<Order[]>([])
  const [drivers, setDrivers] = useState<DeliveryDriver[]>([])
  const [activeMenu, setActiveMenu] = useState<Menu | null>(null)
  
  const [formData, setFormData] = useState({
    deliveryMethod: 'motorcycle' as 'motorcycle' | 'taxi',
    driverId: '',
    taxiServiceName: '',
    deliveryDate: '',
    deliveryTime: '',
    deliveryPrice: '',
    notes: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // First get the active menu to know which date to filter orders by
      const menuData = await getActiveMenu()
      setActiveMenu(menuData)
      
      // Then get orders for that menu's date
      const [ordersData, driversData] = await Promise.all([
        getConfirmedOrdersForDelivery(menuData?.date),
        getActiveDrivers()
      ])
      setOrders(ordersData)
      setDrivers(driversData)

      console.log('Loaded orders:', ordersData)
      console.log('Active menu date:', menuData?.date)
      
      // Auto-set delivery date from active menu if available
      if (menuData?.date && !formData.deliveryDate) {
        setFormData(prev => ({ ...prev, deliveryDate: menuData.date }))
      }
    } catch (error) {
      console.error('Load data error:', error)
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (orders.length === 0) {
      toast({
        title: "Error",
        description: "No confirmed orders available for delivery",
        variant: "destructive",
      })
      return
    }

    if (!formData.deliveryDate || !formData.deliveryTime) {
      toast({
        title: "Error",
        description: "Please select delivery date and time",
        variant: "destructive",
      })
      return
    }

    if (formData.deliveryMethod === 'motorcycle' && !formData.driverId) {
      toast({
        title: "Error",
        description: "Please select a driver",
        variant: "destructive",
      })
      return
    }

    if (formData.deliveryMethod === 'taxi' && !formData.taxiServiceName) {
      toast({
        title: "Error",
        description: "Please enter taxi service name",
        variant: "destructive",
      })
      return
    }

    if (!formData.deliveryPrice || parseFloat(formData.deliveryPrice) <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid delivery price",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      const selectedDriver = drivers.find(d => d.id === formData.driverId)
      
      const deliveryData: any = {
        deliveryMethod: formData.deliveryMethod,
        orderIds: orders.map(order => order.id),
        deliveryDate: formData.deliveryDate,
        deliveryTime: formData.deliveryTime,
        deliveryPrice: parseFloat(formData.deliveryPrice),
        status: 'pending' as const
      }

      // Add method-specific fields
      if (formData.deliveryMethod === 'motorcycle') {
        deliveryData.driverId = formData.driverId
        deliveryData.driverName = selectedDriver?.name
      } else {
        deliveryData.taxiServiceName = formData.taxiServiceName
      }

      // Add optional notes if provided
      if (formData.notes) {
        deliveryData.notes = formData.notes
      }

      await createDelivery(deliveryData)

      toast({
        title: "Success",
        description: `Delivery created successfully with ${orders.length} orders`,
      })

      router.push('/admin/delivery')
    } catch (error) {
      console.error('Create delivery error:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create delivery",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const totalOrdersValue = orders.reduce((sum, order) => sum + (order.totalPrice || 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Create Bulk Delivery</h1>
          <p className="text-muted-foreground">Create delivery for all confirmed orders</p>
        </div>
      </div>

      {activeMenu && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Active Menu:</strong> {activeMenu.title} - {activeMenu.date}
            <span className="text-muted-foreground ml-2">
              (All orders for this menu will be included)
            </span>
          </AlertDescription>
        </Alert>
      )}

      {!activeMenu && (
        <Alert variant="destructive">
          <AlertDescription>
            <strong>No active menu found.</strong> Please set an active menu in the Menu Management page before creating deliveries.
          </AlertDescription>
        </Alert>
      )}

      {/* Order Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orders.length}</div>
            <p className="text-xs text-muted-foreground">
              Confirmed orders to deliver
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">D{totalOrdersValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Combined order value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Menu Date</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeMenu?.date || 'N/A'}</div>
            <p className="text-xs text-muted-foreground">
              Delivery date
            </p>
          </CardContent>
        </Card>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Orders List */}
          <Card>
            <CardHeader>
              <CardTitle>Orders to Deliver ({orders.length})</CardTitle>
              <CardDescription>
                All confirmed orders will be included in this delivery
              </CardDescription>
            </CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="mx-auto h-12 w-12 mb-2 opacity-50" />
                  <p>No confirmed orders available for delivery</p>
                  <p className="text-sm mt-2">Orders must be confirmed before creating a delivery</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-start justify-between p-3 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="font-medium flex items-center gap-2">
                          {order.type === 'user' ? order.userName : order.guestName}
                          {order.type === 'guest' && (
                            <Badge variant="secondary" className="text-xs">Guest</Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {order.selectedOption.name} × {order.quantity}
                        </div>
                        {order.userDepartment && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {order.userDepartment}
                          </div>
                        )}
                      </div>
                      <div className="text-sm font-medium">
                        ${order.totalPrice.toFixed(2)}
                      </div>
                    </div>
                  ))}
                  <div className="pt-3 border-t">
                    <div className="flex justify-between font-semibold">
                      <span>Total:</span>
                      <span>${totalOrdersValue.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Delivery Details */}
          <Card>
            <CardHeader>
              <CardTitle>Delivery Details</CardTitle>
              <CardDescription>Configure delivery information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Delivery Method */}
              <div className="space-y-2">
                <Label>Delivery Method</Label>
                <RadioGroup
                  value={formData.deliveryMethod}
                  onValueChange={(value: 'motorcycle' | 'taxi') =>
                    setFormData({ ...formData, deliveryMethod: value })
                  }
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="motorcycle" id="motorcycle" />
                    <Label htmlFor="motorcycle">🏍️ Motorcycle</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="taxi" id="taxi" />
                    <Label htmlFor="taxi">🚕 Taxi</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Driver / Taxi Selection */}
              {formData.deliveryMethod === 'motorcycle' ? (
                <div className="space-y-2">
                  <Label htmlFor="driver">Select Driver *</Label>
                  <Select
                    value={formData.driverId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, driverId: value })
                    }
                  >
                    <SelectTrigger id="driver">
                      <SelectValue placeholder="Choose a driver" />
                    </SelectTrigger>
                    <SelectContent>
                      {drivers.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground">
                          No active drivers available
                        </div>
                      ) : (
                        drivers.map((driver) => (
                          <SelectItem key={driver.id} value={driver.id}>
                            {driver.name}
                            {driver.phone && ` (${driver.phone})`}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {drivers.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      Add drivers in the Driver Management section
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="taxiService">Taxi Driver's Name *</Label>
                  <Input
                    id="taxiService"
                    value={formData.taxiServiceName}
                    onChange={(e) =>
                      setFormData({ ...formData, taxiServiceName: e.target.value })
                    }
                    placeholder="e.g., Mr. Fat Fat"
                    required
                  />
                </div>
              )}

              {/* Date and Time */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Delivery Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.deliveryDate}
                    onChange={(e) =>
                      setFormData({ ...formData, deliveryDate: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">Delivery Time *</Label>
                  <Input
                    id="time"
                    type="time"
                    value={formData.deliveryTime}
                    onChange={(e) =>
                      setFormData({ ...formData, deliveryTime: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              {/* Delivery Price */}
              <div className="space-y-2">
                <Label htmlFor="price">Delivery Price (D) *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.deliveryPrice}
                  onChange={(e) =>
                    setFormData({ ...formData, deliveryPrice: e.target.value })
                  }
                  placeholder="0.00"
                  required
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Additional delivery instructions..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create Delivery'}
          </Button>
        </div>
      </form>
    </div>
  )
}
