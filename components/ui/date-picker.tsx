"use client";

import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/** Parse YYYY-MM-DD to Date; return undefined if invalid or empty. */
function parseDateValue(value: string | undefined): Date | undefined {
  if (value == null || value === "") return undefined;
  const d = new Date(value + "T00:00:00");
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/** Format Date to YYYY-MM-DD for form/store. */
function formatDateValue(date: Date | undefined): string {
  if (!date) return "";
  return format(date, "yyyy-MM-dd");
}

/** Display format: "mm / dd / yyyy" (e.g. "03 / 15 / 2025"). */
function formatDisplay(date: Date | undefined): string {
  if (!date) return "";
  return format(date, "MM / dd / yyyy");
}

const DEFAULT_FROM_YEAR = 1900;
/** No default max; backend can send minDate/maxDate in validation_rules. */
const DEFAULT_TO_YEAR = new Date().getFullYear() + 100;

export interface DatePickerProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "value" | "onChange"> {
  /** Current value (YYYY-MM-DD). */
  value?: string;
  /** Called with YYYY-MM-DD when user selects a date. */
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  fromYear?: number;
  toYear?: number;
}

export const DatePicker = React.forwardRef<HTMLDivElement, DatePickerProps>(
  function DatePicker(
    {
      value,
      onChange,
      placeholder = "mm / dd / yyyy",
      disabled = false,
      id,
      className,
      fromYear = DEFAULT_FROM_YEAR,
      toYear = DEFAULT_TO_YEAR,
      ...rest
    },
    ref
  ) {
    const [open, setOpen] = React.useState(false);
    const date = parseDateValue(value);

    const handleSelect = React.useCallback(
      (d: Date | undefined) => {
        onChange?.(formatDateValue(d));
        setOpen(false);
      },
      [onChange]
    );

    return (
      <div ref={ref} className={cn("w-full", className)} {...rest}>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              id={id}
              type="button"
              variant="outline"
              disabled={disabled}
              className={cn(
                "w-full justify-between text-left font-normal h-10 px-3",
                !date && "text-muted-foreground"
              )}
              aria-label={date ? formatDisplay(date) : placeholder}
            >
              <span>{date ? formatDisplay(date) : placeholder}</span>
              <CalendarIcon className="ml-2 h-4 w-4 shrink-0" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto p-0 duration-[50ms] data-[state=closed]:duration-[50ms]"
            align="start"
            sideOffset={4}
            avoidCollisions
          >
            <Calendar
              mode="single"
              selected={date}
              onSelect={handleSelect}
              defaultMonth={date}
              fromYear={fromYear}
              toYear={toYear}
              disabled={disabled}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
    );
  }
);
