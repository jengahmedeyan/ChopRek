"use client"

import { useState, useEffect } from 'react'
import { DeliveryDriver } from '@/lib/types'
import {
  createDriver,
  updateDriver,
  deleteDriver,
  toggleDriverStatus,
  getDriverStatistics,
  subscribeToDrivers
} from '@/services/drivers'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, Plus, User, TrendingUp } from 'lucide-react'
import { useRouter } from 'next/navigation'
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
import DriverCard from './_components/driver-card'

export default function DriversPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [drivers, setDrivers] = useState<DeliveryDriver[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedDriver, setSelectedDriver] = useState<DeliveryDriver | null>(null)
  const [driverStats, setDriverStats] = useState<Record<string, any>>({})
  const isMobile = useIsMobile()
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    isActive: true
  })

  useEffect(() => {
    const unsubscribe = subscribeToDrivers((data) => {
      setDrivers(data)
      setLoading(false)
      loadDriverStats(data)
    })

    return () => unsubscribe()
  }, [])

  const loadDriverStats = async (driversData: DeliveryDriver[]) => {
    const stats: Record<string, any> = {}
    for (const driver of driversData) {
      try {
        stats[driver.id] = await getDriverStatistics(driver.id)
      } catch (error) {
        console.error(`Failed to load stats for driver ${driver.id}`)
      }
    }
    setDriverStats(stats)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      isActive: true
    })
    setSelectedDriver(null)
  }

  const handleOpenDialog = (driver?: DeliveryDriver) => {
    if (driver) {
      setSelectedDriver(driver)
      setFormData({
        name: driver.name,
        phone: driver.phone || '',
        isActive: driver.isActive
      })
    } else {
      resetForm()
    }
    setDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Driver name is required",
        variant: "destructive",
      })
      return
    }

    try {
      if (selectedDriver) {
        await updateDriver(selectedDriver.id, formData)
        toast({
          title: "Success",
          description: "Driver updated successfully",
        })
      } else {
        await createDriver(formData)
        toast({
          title: "Success",
          description: "Driver created successfully",
        })
      }
      setDialogOpen(false)
      resetForm()
    } catch (error) {
      toast({
        title: "Error",
        description: selectedDriver ? "Failed to update driver" : "Failed to create driver",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async () => {
    if (!selectedDriver) return

    try {
      await deleteDriver(selectedDriver.id)
      toast({
        title: "Success",
        description: "Driver deleted successfully",
      })
      setDeleteDialogOpen(false)
      setSelectedDriver(null)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete driver",
        variant: "destructive",
      })
    }
  }

  const handleToggleStatus = async (driverId: string, isActive: boolean) => {
    try {
      await toggleDriverStatus(driverId, !isActive)
      toast({
        title: "Success",
        description: `Driver ${!isActive ? 'activated' : 'deactivated'} successfully`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update driver status",
        variant: "destructive",
      })
    }
  }

  const columns = getColumns({
    onEdit: handleOpenDialog,
    onToggleStatus: handleToggleStatus,
    onDelete: (driver) => {
      setSelectedDriver(driver)
      setDeleteDialogOpen(true)
    },
    driverStats,
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-muted-foreground">Loading drivers...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3 sm:space-y-4 lg:space-y-6 p-2 sm:p-4 lg:p-6">
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:justify-between sm:items-center">
        <div className="flex items-center gap-2 sm:gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/admin/delivery')}
            className="h-9 w-9 sm:h-10 sm:w-10"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Driver Management</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Manage delivery drivers</p>
          </div>
        </div>
        <Button 
          onClick={() => handleOpenDialog()}
          className="h-9 sm:h-10 text-xs sm:text-sm"
        >
          <Plus className="mr-2 h-4 w-4" />
          <span className="hidden xs:inline">Add Driver</span>
          <span className="xs:hidden">Add</span>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Total</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-xl sm:text-2xl font-bold">{drivers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Active</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-xl sm:text-2xl font-bold">
              {drivers.filter(d => d.isActive).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Inactive</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-xl sm:text-2xl font-bold">
              {drivers.filter(d => !d.isActive).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Drivers View */}
      {isMobile ? (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold px-1">All Drivers</h2>
          {drivers.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No drivers found. Add your first driver!
              </CardContent>
            </Card>
          ) : (
            drivers.map((driver) => (
              <DriverCard
                key={driver.id}
                driver={driver}
                stats={driverStats[driver.id]}
                onEdit={handleOpenDialog}
                onToggleStatus={handleToggleStatus}
                onDelete={(driver) => {
                  setSelectedDriver(driver)
                  setDeleteDialogOpen(true)
                }}
              />
            ))
          )}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All Drivers</CardTitle>
            <CardDescription>View and manage delivery drivers</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable columns={columns} data={drivers} />
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Driver Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedDriver ? 'Edit Driver' : 'Add New Driver'}
            </DialogTitle>
            <DialogDescription>
              {selectedDriver
                ? 'Update driver information'
                : 'Add a new delivery driver to your team'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Driver name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+1234567890"
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="h-4 w-4"
                />
                <Label htmlFor="isActive" className="font-normal">
                  Active (available for deliveries)
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDialogOpen(false)
                  resetForm()
                }}
              >
                Cancel
              </Button>
              <Button type="submit">
                {selectedDriver ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the driver. This action cannot be undone.
              Drivers with existing deliveries cannot be deleted.
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
