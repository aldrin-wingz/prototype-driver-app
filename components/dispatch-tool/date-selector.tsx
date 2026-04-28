/**
 * Source: dispatch-tool (wingz-cs-tool)
 * Date picker with calendar popover for dispatch scheduling.
 * Reused: Header, alivi-otp, driver-availability-exception-modal.
 */
"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DATE_PICKER_INPUT_FORMAT } from "@/constants/date-format";
import dayjs from "@/lib/dayjs";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface DateSelectorProps {
  buttonClassName?: string;
  disabled?: boolean;
  disableDatesBefore?: Date;
  onDateSelect: (date: Date) => void;
  placeholder?: string;
  selectedDate?: Date;
}

export function DateSelector({
  buttonClassName,
  disabled = false,
  disableDatesBefore = dayjs().startOf("day").toDate(),
  onDateSelect,
  placeholder = "Select a date",
  selectedDate,
}: DateSelectorProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "min-w-[10rem] max-w-fit h-7 text-xs justify-start text-left font-normal bg-transparent",
            buttonClassName
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selectedDate ? dayjs(selectedDate).format(DATE_PICKER_INPUT_FORMAT) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 z-[2000]" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          defaultMonth={selectedDate}
          onSelect={(date) => {
            setOpen(false);
            if (date) {
              const localDate = dayjs(date).hour(12).minute(0).second(0).millisecond(0).toDate();
              onDateSelect(localDate);
            }
          }}
          disabled={(date) => date < disableDatesBefore}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
