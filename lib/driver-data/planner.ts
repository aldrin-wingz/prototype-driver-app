/**
 * Planner, replicated from capture `03-01` (shoot `DAB-2026-10-01`, v6.0.537).
 *
 * ⭐ Planner has NO app header — no chat bubble, no title bar. The screen
 * starts with a date bar. The chat placement study recorded the same thing
 * independently (`c-01d`: "a date-picker header with no icons").
 *
 * ⛔ ONLY THE EMPTY DAY IS CAPTURED. Every shot of this tab shows a day with no
 * trips, so the trip list, its card shape, and Daily Summary with non-zero
 * values are all unknown. Nothing below invents them.
 */

import type { Trip } from "./mock-trips";

export const PLANNER_COPY = {
  summaryTitle: "Daily Summary",
  totalTrips: "Total Trips",
  potentialEarnings: "Potential Earnings",
  today: "Today",
  emptyTitle: "No trips yet — but they're on the way!",
  emptyBody:
    "Hang tight! Trips are assigned throughout the day. Keep your app open and get ready to drive.",
} as const;

/** "Thu October 1, 2026" — the long form the date pill uses in `03-01`. */
export function plannerDateLabel(d: Date): string {
  const weekday = d.toLocaleDateString("en-US", { weekday: "short" });
  const month = d.toLocaleDateString("en-US", { month: "long" });
  return `${weekday} ${month} ${d.getDate()}, ${d.getFullYear()}`;
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

/**
 * Which date controls are live.
 *
 * In `03-01` the driver is on today: `‹` and `Today` are greyed while `›` is
 * black. So Planner looks FORWARD only — you cannot page into the past, and
 * `Today` is inert when you are already there.
 *
 * ⚠️ Inferred from one capture of one day. A past day has never been shot, so
 * whether `‹` re-enables once you have moved forward is an assumption; it is
 * modelled as "you may come back toward today, never before it".
 */
export function dateNavState(selected: Date, today: Date) {
  const onToday = isSameDay(selected, today);
  return {
    canGoBack: selected > today && !onToday,
    canGoToday: !onToday,
    canGoForward: true,
  };
}

export interface DailySummary { totalTrips: number; potentialEarnings: number }

/**
 * Derived from whatever trips fall on the day — never hardcoded, so the card
 * cannot disagree with the list beneath it.
 */
export function dailySummary(trips: Trip[]): DailySummary {
  return {
    totalTrips: trips.length,
    potentialEarnings: trips.reduce((sum, t) => sum + t.totalRevenue, 0),
  };
}

/**
 * Trips scheduled for a given day.
 *
 * ⚠️ The seed assigns nothing to Planner, so this returns empty for every day
 * and the screen always renders the captured empty state. That is deliberate:
 * a populated Planner has never been photographed, and inventing one would put
 * a screen in the mirror that nobody can check.
 */
export function plannerTripsFor(_day: Date): Trip[] {
  return [];
}
