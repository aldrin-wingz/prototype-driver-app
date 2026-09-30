"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { isSameDay } from "@/lib/driver-data/planner";

/**
 * Month calendar behind the date pill — capture `03-07`.
 *
 * Green ‹ ›, "October 2026" centred, Sun–Sat headers, leading days from the
 * previous month greyed out, and the selected day in a filled green circle.
 */
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * ⚠️ The parent MOUNTS this only while open, so `month` re-initialises from
 * `selected` every time. Keeping it mounted and returning null instead left the
 * month stuck at whatever was selected on first render — the picker opened on
 * July while August 2 was selected, and the selected day was not even in the
 * grid.
 */
export function PlannerDatePicker({
  selected, onPick, onClose,
}: { selected: Date; onPick: (d: Date) => void; onClose: () => void }) {
  const [month, setMonth] = useState(new Date(selected.getFullYear(), selected.getMonth(), 1));

  const firstDow = month.getDay();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const daysInPrev = new Date(month.getFullYear(), month.getMonth(), 0).getDate();

  const cells: Array<{ d: Date; muted: boolean }> = [];
  for (let i = firstDow - 1; i >= 0; i--) {
    cells.push({ d: new Date(month.getFullYear(), month.getMonth() - 1, daysInPrev - i), muted: true });
  }
  for (let i = 1; i <= daysInMonth; i++) {
    cells.push({ d: new Date(month.getFullYear(), month.getMonth(), i), muted: false });
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 px-5" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between pb-4">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
            className="text-[#34D399]"
          >
            <ChevronLeft className="h-7 w-7" />
          </button>
          <p className="text-xl text-gray-900">
            {month.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </p>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
            className="text-[#34D399]"
          >
            <ChevronRight className="h-7 w-7" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-y-2 text-center">
          {DOW.map((d) => (
            <p key={d} className="text-[15px] text-gray-400">{d}</p>
          ))}
          {cells.map(({ d, muted }) => {
            const isSel = isSameDay(d, selected);
            return (
              <button
                key={d.toISOString()}
                type="button"
                disabled={muted}
                onClick={() => { onPick(d); onClose(); }}
                className={cn(
                  "mx-auto flex h-10 w-10 items-center justify-center rounded-full text-lg",
                  muted && "text-gray-300",
                  !muted && !isSel && "text-gray-900",
                  isSel && "bg-[#4ECFA0] font-semibold text-white",
                )}
              >
                {d.getDate()}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
