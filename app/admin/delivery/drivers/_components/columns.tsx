"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowUpDown, MoreHorizontal } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { DeliveryDriver } from "@/lib/types"

interface ColumnsProps {
  onEdit: (driver: DeliveryDriver) => void
  onToggleStatus: (driverId: string, isActive: boolean) => void
  onDelete: (driver: DeliveryDriver) => void
  driverStats: Record<string, any>
}

export const getColumns = ({ onEdit, onToggleStatus, onDelete, driverStats }: ColumnsProps): ColumnDef<DeliveryDriver>[] => [
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="h-8 px-2 sm:px-4">
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => (
      <div className="font-medium">{row.original.name}</div>
    ),
  },
  {
    accessorKey: "phone",
    header: "Phone",
    cell: ({ row }) => (
      <div className="text-sm">{row.original.phone || '-'}</div>
    ),
  },
  {
    accessorKey: "isActive",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant={row.original.isActive ? "default" : "secondary"}>
        {row.original.isActive ? 'Active' : 'Inactive'}
      </Badge>
    ),
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: "deliveries",
    header: "Deliveries",
    cell: ({ row }) => {
      const stats = driverStats[row.original.id]
      return <div>{stats?.totalDeliveries || 0}</div>
    },
  },
  {
    accessorKey: "orders",
    header: "Orders",
    cell: ({ row }) => {
      const stats = driverStats[row.original.id]
      return <div>{stats?.totalOrders || 0}</div>
    },
  },
  {
    accessorKey: "earnings",
    header: ({ column }) => {
      return (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="h-8 px-2 sm:px-4">
          Earnings
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const stats = driverStats[row.original.id]
      return <div className="font-medium">D{(stats?.totalEarnings || 0).toFixed(2)}</div>
    },
    sortingFn: (rowA, rowB) => {
      const statsA = driverStats[rowA.original.id]
      const statsB = driverStats[rowB.original.id]
      return (statsA?.totalEarnings || 0) - (statsB?.totalEarnings || 0)
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const driver = row.original

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
            <DropdownMenuItem onClick={() => onEdit(driver)}>
              Edit Driver
            </DropdownMenuItem>
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
      )
    },
  },
]
