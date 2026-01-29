"use client"

import { X } from 'lucide-react';
import type { Table } from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { DataTableFacetedFilter } from '@/components/data-table/faceted-filter';
import { DataTableViewOptions } from '@/components/data-table/view-options';

interface DataTableToolbarProps<TData> {
  table: Table<TData>
  departments: string[]
}

const roles = [
  {
    value: "admin",
    label: "Admin",
  },
  {
    value: "employee",
    label: "Employee",
  },
]

export function DataTableToolbar<TData>({ table, departments }: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0

  const departmentOptions = departments.map(dept => ({
    value: dept,
    label: dept,
  }))

  return (
    <div className="space-y-2">
      {/* Search and Filters Row */}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter users..."
              value={(table.getColumn("displayName")?.getFilterValue() as string) ?? ""}
              onChange={(event) => table.getColumn("displayName")?.setFilterValue(event.target.value)}
              className="h-8 w-full sm:w-[150px] lg:w-[250px] pl-8"
            />
          </div>
          <div className="flex items-center gap-2">
            {table.getColumn("role") && (
              <DataTableFacetedFilter column={table.getColumn("role")} title="Role" options={roles} />
            )}
            {table.getColumn("department") && departmentOptions.length > 0 && (
              <DataTableFacetedFilter column={table.getColumn("department")} title="Department" options={departmentOptions} />
            )}
            {isFiltered && (
              <Button variant="ghost" onClick={() => table.resetColumnFilters()} className="h-8 px-2 lg:px-3">
                Reset
                <X className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        <DataTableViewOptions table={table} />
      </div>
    </div>
  )
}
