"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowUpDown, MoreHorizontal, Clock, Package, CheckCircle } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Delivery } from "@/lib/types"

const getStatusIcon = (status: Delivery["status"]) => {
  switch (status) {
    case "pending":
      return <Clock className="h-4 w-4 text-yellow-500" />
    case "in_transit":
      return <Package className="h-4 w-4 text-blue-500" />
    case "completed":
      return <CheckCircle className="h-4 w-4 text-green-600" />
    default:
      return <Clock className="h-4 w-4 text-gray-500" />
  }
}

const getStatusColor = (status: Delivery["status"]) => {
  switch (status) {
    case "pending":
      return "bg-yellow-100 text-yellow-800"
    case "in_transit":
      return "bg-blue-100 text-blue-800"
    case "completed":
      return "bg-green-100 text-green-800"
    default:
      return "bg-gray-100 text-gray-800"
  }
}

const getMethodBadge = (method: Delivery['deliveryMethod']) => {
  return method === 'motorcycle' ? '🏍️ Motorcycle' : '🚕 Taxi'
}

interface ColumnsProps {
  onComplete: (deliveryId: string) => void
  onUpdateStatus: (deliveryId: string, status: Delivery['status']) => void
  onDelete: (deliveryId: string) => void
  onViewDetails: (deliveryId: string) => void
}

export const getColumns = ({ onComplete, onUpdateStatus, onDelete, onViewDetails }: ColumnsProps): ColumnDef<Delivery>[] => [
  {
    accessorKey: "id",
    header: "ID",
    cell: ({ row }) => (
      <div className="font-mono text-xs">
        {row.original.id.substring(0, 8)}...
      </div>
    ),
  },
  {
    accessorKey: "driver",
    header: ({ column }) => {
      return (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="h-8 px-2 sm:px-4">
          Driver / Taxi
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => (
      <div className="text-sm">
        {row.original.deliveryMethod === 'motorcycle' 
          ? row.original.driverName 
          : row.original.taxiServiceName}
      </div>
    ),
  },
  {
    accessorKey: "deliveryMethod",
    header: "Method",
    cell: ({ row }) => (
      <Badge variant="outline" className="text-xs">
        {getMethodBadge(row.original.deliveryMethod)}
      </Badge>
    ),
  },
  {
    accessorKey: "orderIds",
    header: "Orders",
    cell: ({ row }) => (
      <div className="font-medium">{row.original.orderIds.length}</div>
    ),
  },
  {
    accessorKey: "deliveryPrice",
    header: ({ column }) => {
      return (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="h-8 px-2 sm:px-4">
          Price
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => (
      <div className="font-medium">D{row.original.deliveryPrice.toFixed(2)}</div>
    ),
  },
  {
    accessorKey: "deliveryDate",
    header: ({ column }) => {
      return (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="h-8 px-2 sm:px-4">
          Date & Time
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => (
      <div className="text-sm">
        <div>{row.original.deliveryDate}</div>
        <div className="text-muted-foreground text-xs">{row.original.deliveryTime}</div>
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status
      return (
        <div className="flex items-center gap-1">
          {getStatusIcon(status)}
          <Badge className={getStatusColor(status)}>
            {status.replace('_', ' ')}
          </Badge>
        </div>
      )
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const delivery = row.original

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onViewDetails(delivery.id)}>
              View Details
            </DropdownMenuItem>
            <DropdownMenuSeparator />
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
      )
    },
  },
]
