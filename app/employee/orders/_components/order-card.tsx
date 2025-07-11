import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Order } from "@/lib/types";

const OrderCard = ({ order }: { order: Order }) => (
  <Card className="mb-4">
    <CardContent className="p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-medium text-sm">{order.selectedOption?.name}</h3>
          <p className="text-xs text-gray-500">Qty: {order.quantity}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={
              order.status === "pending"
                ? "bg-yellow-100 text-yellow-800"
                : order.status === "confirmed"
                ? "bg-blue-100 text-blue-800"
                : order.status === "delivered"
                ? "bg-green-100 text-green-800"
                : order.status === "cancelled"
                ? "bg-red-100 text-red-800"
                : "bg-gray-100 text-gray-800"
            }
          >
            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
          </Badge>
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Price:</span>
          <span className="text-sm font-bold">
            D{order.totalPrice?.toFixed(2) || "0.00"}
          </span>
        </div>
        <div className="flex justify-between items-center text-xs text-gray-500">
          <span>Date: {order.orderDate}</span>
          {/* <span>{order.createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span> */}
        </div>
      </div>
    </CardContent>
  </Card>
);

export default OrderCard;
