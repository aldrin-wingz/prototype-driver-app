/**
 * Planner, replicated from shoot `DAB-2026-10-01` (`03-01` … `03-08`, v6.0.537).
 *
 * ⭐ Planner has NO app header — it opens on a date bar. (`c-01d` recorded the
 * same thing independently; `03-01` is the capture that confirms it.)
 *
 * ⭐ It is a TIME-AXIS SCHEDULE, not a list of cards: a half-hourly rail down
 * the left with blocks positioned against it. The earlier build guessed a card
 * list and was wrong.
 */

export const PLANNER_COPY = {
  summaryTitle: "Daily Summary",
  totalTrips: "Total Trips",
  potentialEarnings: "Potential Earnings",
  /** ⓘ tooltip, verbatim from `03-08`. */
  earningsTooltip: "This is the potential earnings from accepted trips for this day.",
  today: "Today",
  schedule: "Schedule",
  tapToOpen: "Tap to Open Ride Details",
  accepted: "Accepted",
  emptyTitle: "No trips yet — but they're on the way!",
  emptyBody:
    "Hang tight! Trips are assigned throughout the day. Keep your app open and get ready to drive.",
} as const;

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

/** "Thu October 1, 2026" — the long form the date pill uses (`03-01`). */
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

export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Which date controls are live.
 *
 * ⭐ CONFIRMED by capture, no longer inferred. On `Thu October 1` (today) `‹`
 * and `Today` are grey (`03-01`, `03-07`); on `Sat October 3` both are black
 * (`03-03`–`03-06`). So Planner looks forward from today and `Today` is inert
 * only when you are already on it.
 */
export function dateNavState(selected: Date, today: Date) {
  const onToday = isSameDay(selected, today);
  return { canGoBack: !onToday && selected > today, canGoToday: !onToday, canGoForward: true };
}

// ---------------------------------------------------------------------------
// The schedule
// ---------------------------------------------------------------------------

/** Minutes from midnight of the SELECTED day; may exceed 1440 (`(next day)`). */
export type Minutes = number;

export interface PlannerBlock {
  id: string;
  /** `travel` = peach "Leave by…"; `trip` = the pale green accepted leg. */
  kind: "travel" | "trip";
  startMin: Minutes;
  endMin: Minutes;
  rider: string;
  /** Trip blocks only: leg fare shown in the green pill. */
  fare?: number;
  otp?: boolean;
  pickupAddress?: string;
  dropoffAddress?: string;
  /** The ride this block belongs to, so the block can open Ride Details. */
  tripId?: string;
}

/** "9:38 PM", and past midnight "1:18 AM". */
export function formatClock(min: Minutes): string {
  const m = ((min % 1440) + 1440) % 1440;
  const h24 = Math.floor(m / 60);
  const mm = String(m % 60).padStart(2, "0");
  const period = h24 < 12 ? "AM" : "PM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${mm} ${period}`;
}

/** Axis labels carry "(next day)" past midnight — capture `03-06`. */
export function axisLabel(min: Minutes): string {
  return min >= 1440 ? `${formatClock(min)}\n(next day)` : formatClock(min);
}

export function blockWindow(b: PlannerBlock): string {
  return `${formatClock(b.startMin)} - ${formatClock(b.endMin)}`;
}

/** Half-hourly rail spanning the day's blocks, padded a slot either side. */
export function axisTicks(blocks: PlannerBlock[]): Minutes[] {
  if (!blocks.length) return [];
  const first = Math.min(...blocks.map((b) => b.startMin));
  const last = Math.max(...blocks.map((b) => b.endMin));
  const from = Math.floor(first / 30) * 30 - 30;
  const to = Math.ceil(last / 30) * 30 + 30;
  const out: Minutes[] = [];
  for (let t = from; t <= to; t += 30) out.push(t);
  return out;
}

export interface DailySummary { totalTrips: number; potentialEarnings: number }

/**
 * ⭐ `Total Trips` counts TRIPS, and `Potential Earnings` is the TRIP total —
 * not the leg fare shown on a block. In `03-03` the block reads `$92.70` while
 * the summary reads `$185.40`, which is exactly both legs of the one trip.
 * Deriving the summary from the blocks would print half the real figure.
 */
export function dailySummary(day: PlannerDay | null): DailySummary {
  if (!day) return { totalTrips: 0, potentialEarnings: 0 };
  return { totalTrips: day.tripCount, potentialEarnings: day.tripRevenueTotal };
}

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

export interface PlannerDay {
  /** Trips, not legs — what `Total Trips` counts. */
  tripCount: number;
  /** Sum of each trip's TOTAL revenue across its legs. */
  tripRevenueTotal: number;
  blocks: PlannerBlock[];
}

/**
 * ⚠️ SEEDED. Mirrors the shape of `03-03`–`03-06` — one trip, a travel block
 * then the accepted leg crossing midnight — with invented rider and addresses.
 * The captured rider name and endpoints are real and are never copied.
 *
 * Keyed off today so the demo always has one populated day two days out,
 * matching the capture's "today + 2".
 */
const SEEDED_DAY: PlannerDay = {
  tripCount: 1,
  tripRevenueTotal: 185.4,
  blocks: [
    {
      id: "plan-travel-1",
      kind: "travel",
      startMin: 21 * 60 + 38,
      endMin: 22 * 60 + 40,
      rider: "MARISOL ABERNATHY",
    },
    {
      id: "plan-trip-1",
      kind: "trip",
      startMin: 22 * 60 + 40,
      endMin: 24 * 60 + 78,
      rider: "MARISOL ABERNATHY",
      fare: 92.7,
      otp: true,
      pickupAddress: "3021 Lowell Ave, Jacksonville, FL 32254",
      dropoffAddress: "1823 Business Park Blvd, Daytona Beach, FL 32114",
      tripId: "1049800371",
    },
  ],
};

/** Offset from today of the one seeded populated day. */
export const SEEDED_TRIP_DAY_OFFSET = 2;

export function plannerDayFor(day: Date, today: Date): PlannerDay | null {
  return isSameDay(day, addDays(today, SEEDED_TRIP_DAY_OFFSET)) ? SEEDED_DAY : null;
}
