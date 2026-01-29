"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Delivery } from '@/lib/types'
import { 
  subscribeToDeliveries,
  deleteDelivery,
  completeDelivery,
  updateDelivery
} from '@/services/deliveries'
import { Button } from '@/components/ui/button'
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card'
import { 
  Plus, 
  Truck, 
  Users, 
  BarChart3,
  CheckCircle,
  Clock,
  Package
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useIsMobile } from '@/hooks/use-mobile'
import { DataTable } from './_components/data-table'
import { getColumns } from './_components/columns'
import DeliveryCard from './_components/delivery-card'

export default function DeliveryOverviewPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedDelivery, setSelectedDelivery] = useState<string | null>(null)
  const isMobile = useIsMobile()

  useEffect(() => {
    const unsubscribe = subscribeToDeliveries((data) => {
      setDeliveries(data)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const handleComplete = async (deliveryId: string) => {
    try {
      await completeDelivery(deliveryId)
      toast({
        title: "Success",
        description: "Delivery marked as completed and all orders updated",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to complete delivery",
        variant: "destructive",
      })
    }
  }

  const handleUpdateStatus = async (deliveryId: string, status: Delivery['status']) => {
    try {
      await updateDelivery(deliveryId, { status })
      toast({
        title: "Success",
        description: `Delivery status updated to ${status}`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update delivery status",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async () => {
    if (!selectedDelivery) return

    try {
      await deleteDelivery(selectedDelivery)
      toast({
        title: "Success",
        description: "Delivery deleted successfully",
      })
      setDeleteDialogOpen(false)
      setSelectedDelivery(null)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete delivery",
        variant: "destructive",
      })
    }
  }

  const handleViewDetails = (deliveryId: string) => {
    router.push(`/admin/delivery/${deliveryId}`)
  }

  const columns = getColumns({
    onComplete: handleComplete,
    onUpdateStatus: handleUpdateStatus,
    onDelete: (deliveryId) => {
      setSelectedDelivery(deliveryId)
      setDeleteDialogOpen(true)
    },
    onViewDetails: handleViewDetails,
  })

  const stats = {
    total: deliveries.length,
    pending: deliveries.filter(d => d.status === 'pending').length,
    inTransit: deliveries.filter(d => d.status === 'in_transit').length,
    completed: deliveries.filter(d => d.status === 'completed').length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-muted-foreground">Loading deliveries...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3 sm:space-y-4 lg:space-y-6 p-2 sm:p-4 lg:p-6">
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:justify-between sm:items-center">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Delivery Management</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Manage deliveries and drivers</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => router.push('/admin/delivery/reports')}
            className="h-9 sm:h-10 text-xs sm:text-sm"
          >
            <BarChart3 className="mr-2 h-4 w-4" />
            <span className="hidden xs:inline">Reports</span>
            <span className="xs:hidden">📊</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push('/admin/delivery/drivers')}
            className="h-9 sm:h-10 text-xs sm:text-sm"
          >
            <Users className="mr-2 h-4 w-4" />
            <span className="hidden xs:inline">Drivers</span>
            <span className="xs:hidden">👥</span>
          </Button>
          <Button 
            onClick={() => router.push('/admin/delivery/create')}
            className="h-9 sm:h-10 text-xs sm:text-sm"
          >
            <Plus className="mr-2 h-4 w-4" />
            <span className="hidden xs:inline">Create Delivery</span>
            <span className="xs:hidden">Create</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Total</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-xl sm:text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-xl sm:text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">In Transit</CardTitle>
            <Package className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-xl sm:text-2xl font-bold">{stats.inTransit}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-xl sm:text-2xl font-bold">{stats.completed}</div>
          </CardContent>
        </Card>
      </div>

      {/* Deliveries View */}
      {isMobile ? (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold px-1">All Deliveries</h2>
          {deliveries.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No deliveries found. Create your first delivery!
              </CardContent>
            </Card>
          ) : (
            deliveries.map((delivery) => (
              <DeliveryCard
                key={delivery.id}
                delivery={delivery}
                onComplete={handleComplete}
                onUpdateStatus={handleUpdateStatus}
                onDelete={(deliveryId) => {
                  setSelectedDelivery(deliveryId)
                  setDeleteDialogOpen(true)
                }}
                onViewDetails={handleViewDetails}
              />
            ))
          )}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All Deliveries</CardTitle>
            <CardDescription>View and manage all deliveries</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable columns={columns} data={deliveries} />
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the delivery and remove the delivery ID from all associated orders.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
