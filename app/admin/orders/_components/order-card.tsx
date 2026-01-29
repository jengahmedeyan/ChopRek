import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Clock } from "lucide-react"
import { normalizeDate } from "@/utils/date"
import type { Order } from "@/lib/types"

interface OrderCardProps {
  order: Order
  updateOrderStatus: (orderId: string, newStatus: Order["status"]) => void
}

const OrderCard = ({ order, updateOrderStatus }: OrderCardProps) => {
  const getStatusColor = (status: Order["status"]) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "confirmed":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "delivered":
        return "bg-green-100 text-green-800 border-green-200"
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  return (
    <Card className="mb-3 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm sm:text-base truncate">{order.userName || order.guestName}</h3>
            {order.userEmail && (
              <p className="text-xs text-muted-foreground truncate">{order.userEmail}</p>
            )}
          </div>
          <Badge className={`${getStatusColor(order.status)} text-xs shrink-0 ml-2`}>
            {order.status}
          </Badge>
        </div>
        
        <div className="space-y-2 mb-3">
          <div className="flex justify-between items-start gap-2">
            <span className="text-sm sm:text-base font-medium line-clamp-2">{order.selectedOption.name}</span>
            <span className="text-sm sm:text-base font-bold whitespace-nowrap">D{order.totalPrice.toFixed(2)}</span>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="bg-muted px-2 py-1 rounded">Qty: {order.quantity}</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {String(normalizeDate(order.createdAt, "HH:mm"))}
            </span>
            {order.userDepartment && (
              <Badge variant="outline" className="text-xs">
                {order.userDepartment}
              </Badge>
            )}
          </div>
        </div>
        
        <Select value={order.status} onValueChange={(value) => updateOrderStatus(order.id, value as Order["status"])}>
          <SelectTrigger className="w-full h-9 sm:h-10 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">🕐 Pending</SelectItem>
            <SelectItem value="confirmed">✓ Confirmed</SelectItem>
            <SelectItem value="delivered">✓✓ Delivered</SelectItem>
            <SelectItem value="cancelled">✗ Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  )
}

export default OrderCard