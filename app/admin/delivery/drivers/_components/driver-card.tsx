import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Phone, TrendingUp, MoreVertical } from "lucide-react"
import type { DeliveryDriver } from "@/lib/types"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface DriverCardProps {
  driver: DeliveryDriver
  stats: any
  onEdit: (driver: DeliveryDriver) => void
  onToggleStatus: (driverId: string, isActive: boolean) => void
  onDelete: (driver: DeliveryDriver) => void
}

const DriverCard = ({ driver, stats, onEdit, onToggleStatus, onDelete }: DriverCardProps) => {
  return (
    <Card className="mb-3 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm sm:text-base truncate">{driver.name}</h3>
            {driver.phone && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <Phone className="h-3 w-3" />
                {driver.phone}
              </p>
            )}
          </div>
          <Badge 
            variant={driver.isActive ? "default" : "secondary"} 
            className="text-xs shrink-0 ml-2"
          >
            {driver.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>
        
        <div className="grid grid-cols-3 gap-2 mb-3 text-center">
          <div className="bg-muted rounded p-2">
            <div className="text-xs text-muted-foreground">Deliveries</div>
            <div className="text-sm font-semibold">{stats?.totalDeliveries || 0}</div>
          </div>
          <div className="bg-muted rounded p-2">
            <div className="text-xs text-muted-foreground">Orders</div>
            <div className="text-sm font-semibold">{stats?.totalOrders || 0}</div>
          </div>
          <div className="bg-muted rounded p-2">
            <div className="text-xs text-muted-foreground">Earnings</div>
            <div className="text-sm font-semibold">${(stats?.totalEarnings || 0).toFixed(0)}</div>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="flex-1 h-9 text-xs sm:text-sm"
            onClick={() => onEdit(driver)}
          >
            Edit
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9 shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onToggleStatus(driver.id, driver.isActive)}>
                {driver.isActive ? 'Deactivate' : 'Activate'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onDelete(driver)}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  )
}

export default DriverCard
