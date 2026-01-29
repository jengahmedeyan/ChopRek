"use client"

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { DeliveryWithOrders } from '@/lib/types'
import { getDeliveryWithOrders, completeDelivery, updateDelivery } from '@/services/deliveries'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, CheckCircle, Truck, Calendar, DollarSign, Package, MapPin } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default function DeliveryDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const [delivery, setDelivery] = useState<DeliveryWithOrders | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDelivery()
  }, [params.id])

  const loadDelivery = async () => {
    try {
      const data = await getDeliveryWithOrders(params.id as string)
      setDelivery(data)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load delivery",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleComplete = async () => {
    if (!delivery) return

    try {
      await completeDelivery(delivery.id)
      toast({
        title: "Success",
        description: "Delivery marked as completed",
      })
      loadDelivery()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to complete delivery",
        variant: "destructive",
      })
    }
  }

  const handleUpdateStatus = async (status: DeliveryWithOrders['status']) => {
    if (!delivery) return

    try {
      await updateDelivery(delivery.id, { status })
      toast({
        title: "Success",
        description: `Delivery status updated to ${status}`,
      })
      loadDelivery()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update delivery status",
        variant: "destructive",
      })
    }
  }

  const getStatusBadge = (status: DeliveryWithOrders['status']) => {
    const colors = {
      pending: "bg-yellow-500",
      in_transit: "bg-blue-500",
      completed: "bg-green-500"
    }

    return (
      <Badge className={colors[status]}>
        {status.replace('_', ' ')}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-muted-foreground">Loading delivery...</p>
        </div>
      </div>
    )
  }

  if (!delivery) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <div className="text-center">
          <p className="text-lg font-medium mb-2">Delivery not found</p>
          <Button onClick={() => router.push('/admin/delivery')}>
            Back to Deliveries
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/admin/delivery')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Delivery Details</h1>
            <p className="text-muted-foreground">View delivery information</p>
          </div>
        </div>
        <div className="flex gap-2">
          {delivery.status === 'pending' && (
            <Button
              variant="outline"
              onClick={() => handleUpdateStatus('in_transit')}
            >
              Mark In Transit
            </Button>
          )}
          {delivery.status !== 'completed' && (
            <Button onClick={handleComplete}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Complete Delivery
            </Button>
          )}
        </div>
      </div>

      {/* Delivery Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {getStatusBadge(delivery.status)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivery Method</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-medium">
              {delivery.deliveryMethod === 'motorcycle' ? '🏍️ Motorcycle' : '🚕 Taxi'}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {delivery.deliveryMethod === 'motorcycle' 
                ? delivery.driverName 
                : delivery.taxiServiceName}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivery Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">D{delivery.deliveryPrice.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Delivery Information */}
      <Card>
        <CardHeader>
          <CardTitle>Delivery Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Delivery ID</p>
              <p className="text-sm font-mono mt-1">{delivery.id}</p>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">Delivery Date</p>
              <p className="text-sm mt-1 flex items-center">
                <Calendar className="mr-2 h-4 w-4" />
                {delivery.deliveryDate}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Delivery Time</p>
              <p className="text-sm mt-1">{delivery.deliveryTime}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Orders Count</p>
              <p className="text-sm mt-1 flex items-center">
                <Package className="mr-2 h-4 w-4" />
                {delivery.orderIds.length} orders
              </p>
            </div>
            {delivery.notes && (
              <div className="col-span-2">
                <p className="text-sm font-medium text-muted-foreground">Notes</p>
                <p className="text-sm mt-1">{delivery.notes}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Orders in Delivery */}
      <Card>
        <CardHeader>
          <CardTitle>Orders in This Delivery</CardTitle>
          <CardDescription>
            {delivery.orders.length} order(s) included in this delivery
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead className="text-right">Price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {delivery.orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono text-xs">
                    {order.id.substring(0, 8)}...
                  </TableCell>
                  <TableCell>
                    {order.type === 'user' ? order.userName : order.guestName}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {order.type}
                    </Badge>
                  </TableCell>
                  <TableCell>{order.selectedOption.name}</TableCell>
                  <TableCell>{order.quantity}</TableCell>
                  <TableCell className="text-right font-medium">
                    ${order.totalPrice.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="font-bold bg-muted/50">
                <TableCell colSpan={5}>Total Order Value</TableCell>
                <TableCell className="text-right">
                  ${delivery.orders.reduce((sum, o) => sum + o.totalPrice, 0).toFixed(2)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
