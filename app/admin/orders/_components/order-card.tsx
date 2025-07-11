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

const OrderCard = ({ order, updateOrderStatus }: OrderCardProps) => (
  <Card className="mb-4">
    <CardContent className="p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-medium text-sm">{order.userName || order.guestName}</h3>
          <p className="text-xs text-gray-500">{order.userEmail}</p>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-yellow-500" />
          <Badge className="bg-yellow-100 text-yellow-800 text-xs">{order.status}</Badge>
        </div>
      </div>
      <div className="space-y-2 mb-3">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">{order.selectedOption.name}</span>
          <span className="text-sm font-bold">D{order.totalPrice.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center text-xs text-gray-500">
          <span>Qty: {order.quantity}</span>
          <span>{String(normalizeDate(order.createdAt, "HH:mm"))}</span>
        </div>
        {order.userDepartment && (
          <Badge variant="outline" className="text-xs">
            {order.userDepartment}
          </Badge>
        )}
      </div>
      <Select value={order.status} onValueChange={(value) => updateOrderStatus(order.id, value as Order["status"])}>
        <SelectTrigger className="w-full h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="confirmed">Confirmed</SelectItem>
          <SelectItem value="delivered">Delivered</SelectItem>
          <SelectItem value="cancelled">Cancelled</SelectItem>
        </SelectContent>
      </Select>
    </CardContent>
  </Card>
)

export default OrderCard