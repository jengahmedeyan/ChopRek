import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Clock, Package, CheckCircle, MoreVertical } from "lucide-react"
import type { Delivery } from "@/lib/types"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface DeliveryCardProps {
  delivery: Delivery
  onComplete: (deliveryId: string) => void
  onUpdateStatus: (deliveryId: string, status: Delivery['status']) => void
  onDelete: (deliveryId: string) => void
  onViewDetails: (deliveryId: string) => void
}

const DeliveryCard = ({ delivery, onComplete, onUpdateStatus, onDelete, onViewDetails }: DeliveryCardProps) => {
  const getStatusColor = (status: Delivery["status"]) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "in_transit":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "completed":
        return "bg-green-100 text-green-800 border-green-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getStatusIcon = (status: Delivery["status"]) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4" />
      case "in_transit":
        return <Package className="h-4 w-4" />
      case "completed":
        return <CheckCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  return (
    <Card className="mb-3 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm sm:text-base truncate">
              {delivery.deliveryMethod === 'motorcycle' 
                ? delivery.driverName 
                : delivery.taxiServiceName}
            </h3>
            <p className="text-xs text-muted-foreground">
              {delivery.deliveryMethod === 'motorcycle' ? '🏍️ Motorcycle' : '🚕 Taxi'}
            </p>
          </div>
          <Badge className={`${getStatusColor(delivery.status)} text-xs shrink-0 ml-2 flex items-center gap-1`}>
            {getStatusIcon(delivery.status)}
            {delivery.status.replace('_', ' ')}
          </Badge>
        </div>
        
        <div className="space-y-2 mb-3">
          <div className="flex justify-between items-center gap-2">
            <span className="text-sm text-muted-foreground">Orders</span>
            <span className="text-sm font-medium">{delivery.orderIds.length}</span>
          </div>
          
          <div className="flex justify-between items-center gap-2">
            <span className="text-sm text-muted-foreground">Price</span>
            <span className="text-sm font-bold">D{delivery.deliveryPrice.toFixed(2)}</span>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="bg-muted px-2 py-1 rounded">{delivery.deliveryDate}</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {delivery.deliveryTime}
            </span>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="flex-1 h-9 text-xs sm:text-sm"
            onClick={() => onViewDetails(delivery.id)}
          >
            View Details
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9 shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              {delivery.status === 'pending' && (
                <DropdownMenuItem onClick={() => onUpdateStatus(delivery.id, 'in_transit')}>
                  Mark In Transit
                </DropdownMenuItem>
              )}
              {delivery.status !== 'completed' && (
                <DropdownMenuItem onClick={() => onComplete(delivery.id)}>
                  Mark Completed
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onDelete(delivery.id)}
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

export default DeliveryCard
