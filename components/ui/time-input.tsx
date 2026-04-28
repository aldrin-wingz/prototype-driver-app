"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Clock } from "lucide-react";
import { useMemo, useState } from "react";

interface TimeInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  minTime?: string;
  maxTime?: string;
}

export function TimeInput({ value, onChange, className, minTime, maxTime }: TimeInputProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const convertTo12Hour = (time24: string) => {
    const [hours, minutes] = time24.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${hours12}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  // Generate time options in 30-minute intervals (memoized)
  const timeOptions = useMemo(() => {
    const options: string[] = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
        if (minTime && timeString < minTime) continue;
        if (maxTime && timeString > maxTime) continue;
        options.push(timeString);
      }
    }
    return options;
  }, [minTime, maxTime]);

  const handleTimeChange = (newValue: string) => {
    if (minTime && newValue < minTime) return;
    if (maxTime && newValue > maxTime) return;
    onChange(newValue);
  };

  return (
    <div className={"relative"}>
      <Input
        type="text"
        value={value ? convertTo12Hour(value) : ""}
        readOnly
        className={cn("pr-7", className)}
        onFocus={() => setIsDropdownOpen(true)}
        // prevent native keyboards
        inputMode="none"
        autoComplete="off"
        placeholder="--:--"
      />
      <Clock className="h-4 w-4 opacity-50 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
      {isDropdownOpen && timeOptions.length > 0 && (
        <div className="absolute top-full left-0 z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto">
          {timeOptions.map((time) => (
            <button
              key={time}
              type="button"
              className="w-full px-3 py-1 text-left text-sm hover:bg-gray-100 focus:bg-gray-100"
              onMouseDown={(e) => {
                e.preventDefault();
                handleTimeChange(time);
                setIsDropdownOpen(false);
              }}
            >
              {convertTo12Hour(time)}
            </button>
          ))}
        </div>
      )}
      {isDropdownOpen && <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />}
    </div>
  );
}
