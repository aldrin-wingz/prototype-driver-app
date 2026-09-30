"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Info } from "lucide-react";
import { BottomNav } from "@/components/driver/bottom-nav";
import { PlannerSchedule } from "@/components/driver/planner-schedule";
import { PlannerDatePicker } from "@/components/driver/planner-date-picker";
import { cn } from "@/lib/utils";
import {
  PLANNER_COPY, addDays, dailySummary, dateNavState, plannerDateLabel, plannerDayFor,
} from "@/lib/driver-data/planner";
import { MOCK_TODAY } from "@/lib/driver-data/mock-trips";

/**
 * Planner — replicated from shoot `DAB-2026-10-01` (`03-01` … `03-08`).
 *
 * ⭐ No app header: the screen opens on a date bar. ⭐ The body is a TIME-AXIS
 * schedule, not a list of cards — the earlier build guessed a list and an
 * earlier one before that invented the whole screen.
 */
export default function PlannerPage() {
  // Seeded "today", so a demo gives the same answer next month.
  const today = useMemo(() => {
    const [y, m, d] = MOCK_TODAY.split("-").map(Number);
    return new Date(y, m - 1, d);
  }, []);
  const [selected, setSelected] = useState<Date>(today);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [tipOpen, setTipOpen] = useState(false);

  const day = plannerDayFor(selected, today);
  const summary = dailySummary(day);
  const nav = dateNavState(selected, today);

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F6F8] pb-20">
      {/* Date bar — the top of the screen; there is no app header. */}
      <div className="flex items-center gap-2 border-b border-gray-200 bg-white px-4 py-3">
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-gray-300 px-3 py-3"
        >
          <CalendarDays className="h-5 w-5 flex-shrink-0 text-gray-900" />
          <span className="truncate whitespace-nowrap text-[15px] text-gray-900">
            {plannerDateLabel(selected)}
          </span>
        </button>

        <button
          type="button"
          aria-label="Previous day"
          disabled={!nav.canGoBack}
          onClick={() => setSelected((d) => addDays(d, -1))}
          className={cn(
            "flex h-11 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-gray-300",
            nav.canGoBack ? "text-gray-900" : "text-gray-300",
          )}
        >
          <ChevronLeft className="h-6 w-6" />
        </button>

        <button
          type="button"
          disabled={!nav.canGoToday}
          onClick={() => setSelected(today)}
          className={cn(
            "flex-shrink-0 rounded-xl border border-gray-300 px-3 py-3 text-[15px]",
            nav.canGoToday ? "text-gray-900" : "text-gray-400",
          )}
        >
          {PLANNER_COPY.today}
        </button>

        <button
          type="button"
          aria-label="Next day"
          onClick={() => setSelected((d) => addDays(d, 1))}
          className="flex h-11 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-gray-400 text-gray-900"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>

      <main className="flex-1 space-y-5 p-4">
        <section className="relative rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900">{PLANNER_COPY.summaryTitle}</h2>
          <div className="flex items-start justify-around pt-4">
            <div className="flex flex-col items-center gap-1">
              <p className="text-2xl font-bold text-gray-900">{summary.totalTrips}</p>
              <p className="text-gray-500">{PLANNER_COPY.totalTrips}</p>
            </div>
            <div className="flex flex-col items-center gap-1">
              <p className="text-2xl font-bold text-gray-900">
                ${summary.potentialEarnings.toFixed(2)}
              </p>
              <button
                type="button"
                onClick={() => setTipOpen((o) => !o)}
                className="flex items-center gap-1 text-gray-500"
              >
                {PLANNER_COPY.potentialEarnings}
                <Info className="h-4 w-4 text-gray-400" />
              </button>
            </div>
          </div>

          {tipOpen && (
            <>
              <button
                type="button"
                aria-label="Dismiss"
                onClick={() => setTipOpen(false)}
                className="fixed inset-0 z-10 cursor-default"
              />
              <div className="absolute right-4 top-[72%] z-20 w-64 rounded-lg bg-white p-4 text-[15px] leading-snug text-gray-900 shadow-[0_4px_20px_rgba(0,0,0,0.18)]">
                {PLANNER_COPY.earningsTooltip}
              </div>
            </>
          )}
        </section>

        {day ? (
          <PlannerSchedule blocks={day.blocks} />
        ) : (
          <section className="flex min-h-[380px] flex-col items-center justify-center rounded-2xl bg-white px-8 text-center shadow-sm">
            <CalendarDays className="h-14 w-14 text-gray-900" strokeWidth={1.5} />
            <p className="pt-6 text-xl font-bold text-gray-900">{PLANNER_COPY.emptyTitle}</p>
            <p className="pt-3 text-[17px] leading-snug text-gray-700">{PLANNER_COPY.emptyBody}</p>
          </section>
        )}
      </main>

      {pickerOpen && (
        <PlannerDatePicker
          selected={selected}
          onPick={setSelected}
          onClose={() => setPickerOpen(false)}
        />
      )}
      <BottomNav />
    </div>
  );
}
