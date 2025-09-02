"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Clock, CheckCircle, AlertCircle, ArrowUpDown, MoreHorizontal } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
import type { Order } from "@/lib/types"
import { normalizeDate } from "@/utils/date"

const getStatusIcon = (status: Order["status"]) => {
  switch (status) {
    case "pending":
      return <Clock className="h-4 w-4 text-yellow-500" />
    case "confirmed":
      return <CheckCircle className="h-4 w-4 text-blue-500" />
    case "delivered":
      return <CheckCircle className="h-4 w-4 text-green-600" />
    case "cancelled":
      return <AlertCircle className="h-4 w-4 text-red-500" />
    default:
      return <Clock className="h-4 w-4 text-gray-500" />
  }
}

const getStatusColor = (status: Order["status"]) => {
  switch (status) {
    case "pending":
      return "bg-yellow-100 text-yellow-800"
    case "confirmed":
      return "bg-blue-100 text-blue-800"
    case "delivered":
      return "bg-green-100 text-green-800"
    case "cancelled":
      return "bg-red-100 text-red-800"
    default:
      return "bg-gray-100 text-gray-800"
  }
}

export const historicalColumns: ColumnDef<Order>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "orderDate",
    header: ({ column }) => {
      return (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const orderDate = row.getValue("orderDate") as string
      const createdAt = row.original.createdAt
      return (
        <div>
          <p className="font-medium">{orderDate}</p>
          <p className="text-xs text-muted-foreground">{String(normalizeDate(createdAt, "HH:mm"))}</p>
        </div>
      )
    },
  },
  {
    accessorKey: "userName",
    header: ({ column }) => {
      return (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Customer
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const order = row.original
      return (
        <div>
          <p className="font-medium">{order.userName || order.guestName}</p>
          <p className="text-sm text-muted-foreground">{order.userEmail}</p>
        </div>
      )
    },
  },
  {
    accessorKey: "selectedOption",
    header: "Order",
    cell: ({ row }) => {
      const order = row.original
      return (
        <div>
          <p className="font-medium">{order.selectedOption.name}</p>
          <p className="text-sm text-muted-foreground">Qty: {order.quantity}</p>
        </div>
      )
    },
  },
  {
    accessorKey: "userDepartment",
    header: "Department",
    cell: ({ row }) => {
      const department = row.getValue("userDepartment") as string
      return <Badge variant="outline">{department || "N/A"}</Badge>
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as Order["status"]
      return (
        <div className="flex items-center gap-2">
          {getStatusIcon(status)}
          <Badge className={getStatusColor(status)}>{status}</Badge>
        </div>
      )
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: "totalPrice",
    header: ({ column }) => {
      return (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Price
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const amount = Number.parseFloat(row.getValue("totalPrice"))
      return <div className="font-medium">D{amount.toFixed(2)}</div>
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const order = row.original

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
            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(order.id)}>
              Copy order ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>View customer</DropdownMenuItem>
            <DropdownMenuItem>View order details</DropdownMenuItem>
            <DropdownMenuItem>Download receipt</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]
