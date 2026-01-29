import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Order } from "@/lib/types";

const OrderCard = ({ order }: { order: Order }) => {
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
            <h3 className="font-semibold text-sm sm:text-base line-clamp-2">{order.selectedOption?.name}</h3>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="bg-muted px-2 py-0.5 rounded">Qty: {order.quantity}</span>
            </p>
          </div>
          <Badge className={`${getStatusColor(order.status)} text-xs shrink-0 ml-2`}>
            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
          </Badge>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <span>Date: {order.orderDate}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
};

export default OrderCard;
