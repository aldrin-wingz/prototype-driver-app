'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { DayPicker, useDayPicker, useNavigation } from 'react-day-picker'
import { format, setMonth, setYear, startOfMonth } from 'date-fns'
import { enUS } from 'date-fns/locale'

import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export type CalendarProps = React.ComponentProps<typeof DayPicker>

const MONTH_NAMES = Array.from({ length: 12 }, (_, i) =>
  format(new Date(2000, i, 1), 'MMMM', { locale: enUS })
)

/** Custom caption with shadcn Select for month/year (replaces native dropdowns). */
function CalendarCaptionDropdowns(props: { displayMonth: Date; id?: string }) {
  const { displayMonth, id } = props
  const { fromDate, toDate } = useDayPicker()
  const { goToMonth } = useNavigation()

  const fromYear = fromDate?.getFullYear() ?? 1900
  const toYear = toDate?.getFullYear() ?? new Date().getFullYear() + 100
  const years = Array.from(
    { length: toYear - fromYear + 1 },
    (_, i) => fromYear + i
  )

  const handleMonthChange = (value: string) => {
    const monthIndex = Number(value)
    const newDate = setMonth(startOfMonth(displayMonth), monthIndex)
    goToMonth(newDate)
  }

  const handleYearChange = (value: string) => {
    const year = Number(value)
    const newDate = setYear(startOfMonth(displayMonth), year)
    goToMonth(newDate)
  }

  if (!fromDate || !toDate) return null

  return (
    <div
      id={id}
      className="flex flex-wrap items-center justify-center gap-2 pb-3"
      role="presentation"
      aria-live="polite"
    >
      <Select
        value={String(displayMonth.getMonth())}
        onValueChange={handleMonthChange}
      >
        <SelectTrigger
          aria-label="Select month"
          className="h-9 w-[130px] gap-1.5 border-input bg-background"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MONTH_NAMES.map((name, i) => (
            <SelectItem key={i} value={String(i)}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={String(displayMonth.getFullYear())}
        onValueChange={handleYearChange}
      >
        <SelectTrigger
          aria-label="Select year"
          className="h-9 w-[90px] gap-1.5 border-input bg-background"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {years.map((y) => (
            <SelectItem key={y} value={String(y)}>
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

const DEFAULT_FROM_YEAR = 1900
/** No default max; backend can send minDate/maxDate in validation_rules. */
const DEFAULT_TO_YEAR = new Date().getFullYear() + 100

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  fromYear = DEFAULT_FROM_YEAR,
  toYear = DEFAULT_TO_YEAR,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      locale={enUS}
      captionLayout="dropdown"
      fromYear={fromYear}
      toYear={toYear}
      className={cn('p-3', className)}
      classNames={{
        months: 'flex flex-col space-y-4',
        month: 'space-y-4',
        caption: 'flex justify-center pt-0',
        caption_label: 'sr-only',
        nav: 'flex items-center gap-1',
        nav_button: cn(
          buttonVariants({ variant: 'outline' }),
          'h-8 w-8 bg-transparent p-0 opacity-70 hover:opacity-100'
        ),
        nav_button_previous: 'absolute left-1',
        nav_button_next: 'absolute right-1',
        table: 'w-full border-collapse space-y-1',
        head_row: 'flex',
        head_cell:
          'text-muted-foreground w-9 rounded-md text-[0.8rem] font-medium',
        row: 'flex w-full mt-2',
        cell: 'relative h-9 w-9 p-0 text-center text-sm [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20',
        day: cn(
          buttonVariants({ variant: 'ghost' }),
          'h-9 w-9 p-0 font-normal aria-selected:opacity-100'
        ),
        day_range_end: 'day-range-end',
        day_selected:
          'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground',
        day_today: 'bg-accent text-accent-foreground font-medium',
        day_outside:
          'day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground',
        day_disabled: 'text-muted-foreground opacity-50',
        day_range_middle:
          'aria-selected:bg-accent aria-selected:text-accent-foreground',
        day_hidden: 'invisible',
        ...classNames,
      }}
      components={{
        IconLeft: () => <ChevronLeft className="h-4 w-4" />,
        IconRight: () => <ChevronRight className="h-4 w-4" />,
        Caption: (captionProps) => (
          <CalendarCaptionDropdowns
            displayMonth={captionProps.displayMonth}
            id={captionProps.id}
          />
        ),
      }}
      {...props}
    />
  )
}
Calendar.displayName = 'Calendar'

export { Calendar }
