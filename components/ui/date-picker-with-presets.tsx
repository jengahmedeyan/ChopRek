"use client"
import { addDays, format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import type { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface DatePickerWithPresetsProps {
  date?: DateRange
  setDate: (date: DateRange | undefined) => void
  className?: string
}

export function DatePickerWithPresets({ date, setDate, className }: DatePickerWithPresetsProps) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")}
                </>
              ) : (
                format(date.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex">
            <div className="flex flex-col gap-2 p-3 border-r">
              <div className="text-sm font-medium">Presets</div>
              <Button
                variant="ghost"
                className="justify-start h-auto p-2 text-sm"
                onClick={() =>
                  setDate({
                    from: new Date(),
                    to: new Date(),
                  })
                }
              >
                Today
              </Button>
              <Button
                variant="ghost"
                className="justify-start h-auto p-2 text-sm"
                onClick={() =>
                  setDate({
                    from: addDays(new Date(), -1),
                    to: new Date(),
                  })
                }
              >
                Yesterday
              </Button>
              <Button
                variant="ghost"
                className="justify-start h-auto p-2 text-sm"
                onClick={() =>
                  setDate({
                    from: addDays(new Date(), -7),
                    to: new Date(),
                  })
                }
              >
                Last 7 days
              </Button>
              <Button
                variant="ghost"
                className="justify-start h-auto p-2 text-sm"
                onClick={() =>
                  setDate({
                    from: addDays(new Date(), -30),
                    to: new Date(),
                  })
                }
              >
                Last 30 days
              </Button>
              <Button
                variant="ghost"
                className="justify-start h-auto p-2 text-sm"
                onClick={() =>
                  setDate({
                    from: addDays(new Date(), -90),
                    to: new Date(),
                  })
                }
              >
                Last 3 months
              </Button>
            </div>
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={date?.from}
              selected={date}
              onSelect={setDate}
              numberOfMonths={2}
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
