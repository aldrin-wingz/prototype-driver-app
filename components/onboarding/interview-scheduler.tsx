"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Clock,
  Check,
} from "lucide-react";

interface TimeSlot {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  label: string; // e.g. "9:00 AM"
  available: boolean;
}

interface InterviewSchedulerProps {
  value?: string;
  onChange: (slotId: string) => void;
  /** API endpoint to fetch available slots (future integration) */
  slotsEndpoint?: string;
}

// Deterministic "random" for slot availability (avoids hydration mismatch)
function slotAvailable(id: string): boolean {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return (Math.abs(hash) % 10) > 3;
}

// Generate mock available slots for the next 2 weeks (fixed ref date for SSR consistency)
function generateMockSlots(): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const refDate = new Date("2026-03-13T12:00:00Z");

  for (let dayOffset = 1; dayOffset <= 14; dayOffset++) {
    const date = new Date(refDate);
    date.setUTCDate(refDate.getUTCDate() + dayOffset);

    // Skip weekends
    if (date.getUTCDay() === 0 || date.getUTCDay() === 6) continue;

    const dateStr = date.toISOString().split("T")[0];

    // Available times: 9am, 10am, 11am, 1pm, 2pm, 3pm
    const times = [
      { time: "09:00", label: "9:00 AM" },
      { time: "10:00", label: "10:00 AM" },
      { time: "11:00", label: "11:00 AM" },
      { time: "13:00", label: "1:00 PM" },
      { time: "14:00", label: "2:00 PM" },
      { time: "15:00", label: "3:00 PM" },
    ];

    for (const t of times) {
      const slotId = `${dateStr}-${t.time}`;
      const available = slotAvailable(slotId);
      slots.push({
        id: slotId,
        date: dateStr,
        time: t.time,
        label: t.label,
        available,
      });
    }
  }

  return slots;
}

export function InterviewScheduler({
  value,
  onChange,
}: InterviewSchedulerProps) {
  const allSlots = useMemo(() => generateMockSlots(), []);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Get unique dates
  const uniqueDates = useMemo(() => {
    const dates = [...new Set(allSlots.map((s) => s.date))];
    return dates.sort();
  }, [allSlots]);

  // Paginate by week
  const [weekOffset, setWeekOffset] = useState(0);
  const datesInView = useMemo(() => {
    const start = weekOffset * 5;
    return uniqueDates.slice(start, start + 5);
  }, [uniqueDates, weekOffset]);

  const hasNextWeek = (weekOffset + 1) * 5 < uniqueDates.length;
  const hasPrevWeek = weekOffset > 0;

  // Slots for the selected date
  const slotsForDate = useMemo(() => {
    if (!selectedDate) return [];
    return allSlots.filter((s) => s.date === selectedDate);
  }, [allSlots, selectedDate]);

  // Format date for display
  function formatDate(dateStr: string) {
    const date = new Date(dateStr + "T00:00:00");
    return {
      dayName: date.toLocaleDateString("en-US", { weekday: "short" }),
      dayNum: date.getDate(),
      month: date.toLocaleDateString("en-US", { month: "short" }),
    };
  }

  function formatFullDate(dateStr: string) {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }

  // The selected slot details
  const selectedSlot = value
    ? allSlots.find((s) => s.id === value)
    : null;

  return (
    <div className="flex flex-col gap-5">
      {/* Selected confirmation */}
      {selectedSlot && (
        <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
          <Check className="h-5 w-5 text-primary shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">
              Interview Scheduled
            </p>
            <p className="text-xs text-muted-foreground">
              {formatFullDate(selectedSlot.date)} at {selectedSlot.label}
            </p>
          </div>
          <button
            type="button"
            className="text-xs text-primary hover:underline"
            onClick={() => onChange("")}
          >
            Change
          </button>
        </div>
      )}

      {/* Date picker row */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            Select a Date
          </h4>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={!hasPrevWeek}
              onClick={() => setWeekOffset((w) => w - 1)}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Previous week"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={!hasNextWeek}
              onClick={() => setWeekOffset((w) => w + 1)}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Next week"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {datesInView.map((dateStr) => {
            const { dayName, dayNum, month } = formatDate(dateStr);
            const isSelected = selectedDate === dateStr;
            const availableCount = allSlots.filter(
              (s) => s.date === dateStr && s.available
            ).length;

            return (
              <button
                key={dateStr}
                type="button"
                onClick={() => setSelectedDate(dateStr)}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-xl border p-3 transition-all",
                  isSelected
                    ? "border-primary bg-primary/10 ring-1 ring-primary"
                    : "border-border hover:border-primary/40 hover:bg-accent/50"
                )}
              >
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                  {dayName}
                </span>
                <span
                  className={cn(
                    "text-lg font-semibold",
                    isSelected ? "text-primary" : "text-foreground"
                  )}
                >
                  {dayNum}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {month}
                </span>
                <span
                  className={cn(
                    "mt-1 text-[10px]",
                    availableCount > 0
                      ? "text-primary"
                      : "text-muted-foreground"
                  )}
                >
                  {availableCount} slots
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Time slots for selected date */}
      {selectedDate && (
        <div>
          <h4 className="text-sm font-medium text-foreground flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Available Times for {formatFullDate(selectedDate)}
          </h4>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {slotsForDate.map((slot) => {
              const isChosen = value === slot.id;
              return (
                <button
                  key={slot.id}
                  type="button"
                  disabled={!slot.available}
                  onClick={() => onChange(slot.id)}
                  className={cn(
                    "rounded-lg border px-4 py-2.5 text-sm font-medium transition-all",
                    isChosen
                      ? "border-primary bg-primary text-primary-foreground"
                      : slot.available
                        ? "border-border text-foreground hover:border-primary/40 hover:bg-accent/50"
                        : "border-border text-muted-foreground/40 cursor-not-allowed line-through"
                  )}
                >
                  {slot.label}
                </button>
              );
            })}
          </div>
          {slotsForDate.filter((s) => s.available).length === 0 && (
            <p className="mt-2 text-sm text-muted-foreground text-center">
              No available slots for this date. Please select another date.
            </p>
          )}
        </div>
      )}

      {!selectedDate && !selectedSlot && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Select a date above to see available interview times.
        </p>
      )}
    </div>
  );
}
