"use client"

import { type Table } from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DataTableViewOptions } from "@/components/data-table/view-options"
import { DataTableFacetedFilter } from "@/components/data-table/faceted-filter"
import { Search, X } from "lucide-react"

interface DataTableToolbarProps<TData> {
  table: Table<TData>
  searchPlaceholder?: string
  filterableColumns?: {
    id: string
    title: string
    options: { label: string; value: string }[]
  }[]
}

export function DataTableToolbar<TData>({
  table,
  searchPlaceholder = "Search...",
  filterableColumns = []
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0

  const searchColumn = searchPlaceholder.includes("guest") ? "guestName" : "userName"

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={(table.getColumn(searchColumn)?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn(searchColumn)?.setFilterValue(event.target.value)
            }
            className="pl-8 max-w-sm"
          />
        </div>
        
        {filterableColumns.map((column) => {
          const tableColumn = table.getColumn(column.id)
          if (!tableColumn) return null
          
          return (
            <DataTableFacetedFilter
              key={column.id}
              column={tableColumn}
              title={column.title}
              options={column.options}
            />
          )
        })}
        
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => table.resetColumnFilters()}
            className="h-8 px-2 lg:px-3"
          >
            Reset
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
      <DataTableViewOptions table={table} />
    </div>
  )
}
