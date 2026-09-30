"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Info } from "lucide-react";
import { BottomNav } from "@/components/driver/bottom-nav";
import { cn } from "@/lib/utils";
import {
  PLANNER_COPY, addDays, dailySummary, dateNavState,
  plannerDateLabel, plannerTripsFor,
} from "@/lib/driver-data/planner";
import { MOCK_TODAY } from "@/lib/driver-data/mock-trips";

/**
 * Planner — replicated from capture `03-01` (shoot `DAB-2026-10-01`).
 *
 * ⛔ The previous version was invented: a generic app Header, a grey calendar
 * circle, "Schedule and plan your rides here." and "(Placeholder - not part of
 * prototype scope)". None of it is in the capture.
 *
 * ⭐ The real screen has NO app header at all. It opens on a date bar.
 *
 * ⛔ ONLY THE EMPTY DAY IS CAPTURED, so this always renders the empty state —
 * see `plannerTripsFor`. A populated Planner has never been photographed and is
 * not guessed at here.
 */
export default function PlannerPage() {
  // Seeded "today", so a demo gives the same answer next month.
  const today = useMemo(() => {
    const [y, m, d] = MOCK_TODAY.split("-").map(Number);
    return new Date(y, m - 1, d);
  }, []);
  const [selected, setSelected] = useState<Date>(today);

  const trips = plannerTripsFor(selected);
  const summary = dailySummary(trips);
  const nav = dateNavState(selected, today);

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F6F8] pb-20">
      {/* Date bar — this is the top of the screen; there is no app header. */}
      <div className="flex items-center gap-2 border-b border-gray-200 bg-white px-4 py-3">
        {/* The capture shows the date on ONE line. At phone width the long form
            wraps, so the pill shrinks its text rather than growing taller. */}
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-gray-300 px-3 py-3">
          <CalendarDays className="h-5 w-5 flex-shrink-0 text-gray-900" />
          <span className="truncate whitespace-nowrap text-[15px] text-gray-900">
            {plannerDateLabel(selected)}
          </span>
        </div>

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
        <section className="rounded-2xl bg-white p-5 shadow-sm">
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
              <p className="flex items-center gap-1 text-gray-500">
                {PLANNER_COPY.potentialEarnings}
                <Info className="h-4 w-4 text-gray-400" />
              </p>
            </div>
          </div>
        </section>

        <section className="flex min-h-[380px] flex-col items-center justify-center rounded-2xl bg-white px-8 text-center shadow-sm">
          <CalendarDays className="h-14 w-14 text-gray-900" strokeWidth={1.5} />
          <p className="pt-6 text-xl font-bold text-gray-900">{PLANNER_COPY.emptyTitle}</p>
          <p className="pt-3 text-[17px] leading-snug text-gray-700">{PLANNER_COPY.emptyBody}</p>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
