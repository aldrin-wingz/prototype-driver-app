/**
 * The Requests Map View — every rule the screen obeys, in one place.
 *
 * ⛔ NO CODE FOR THIS SCREEN EXISTS IN ANY BRANCH. It is replicated from two
 * sources, in this order of precedence:
 *
 *   1. `Project - Map Request View/Help Articles/The Requests Map.md` — the
 *      element-by-element contract, written from the build
 *   2. The B2 captures (2026-09-24), via `references/captures/INDEX.md`, whose
 *      `Shows` column carries the literal on-screen strings
 *
 * Rules live here rather than inline in JSX so a test can reach them and so two
 * renderers cannot quietly disagree about the same rule.
 */

import type { Trip } from "./mock-trips";

// ---------------------------------------------------------------------------
// The pull-up sheet
// ---------------------------------------------------------------------------

/**
 * Three positions, per contract Part 1. `halfway` is where Requests OPENS —
 * not `down`, and not `up`.
 */
export type SheetDetent = "down" | "halfway" | "up";
export const DEFAULT_DETENT: SheetDetent = "halfway";

/** Prompt above the sheet header. Capture `03-10` collapsed / `04-04` expanded. */
export function sheetPrompt(detent: SheetDetent): string {
  return detent === "up" ? "TAP TO COLLAPSE" : "PULL UP FOR THE FULL LIST";
}

// ---------------------------------------------------------------------------
// The two counts
// ---------------------------------------------------------------------------

/**
 * ⭐ THE TWO NUMBERS MEASURE DIFFERENT THINGS, and the contract is explicit
 * about it because drivers misread it:
 *
 *   visible — trips currently on screen. Falls as you zoom IN.
 *   total   — trips available for the day under the current filters. Changes
 *             ONLY when a filter changes, never when you zoom.
 *
 * When they match, every trip the filters allow is on screen — which is what
 * the default-zoom control is for.
 *
 * Format from capture `03-10`: "16 of 16 trips shown · Thu, Sep 24".
 * ⚠️ The noun is "trips", never "rides" — match the phone, not the glossary.
 */
export function countLine(visible: number, total: number, dayLabel: string): string {
  return `${visible} of ${total} trips shown · ${dayLabel}`;
}

/**
 * How much of the map the sheet leaves uncovered, as a percentage of its height.
 * The sheet sits over the map, so a pin behind it is genuinely not on screen.
 */
export const EXPOSED_PCT: Record<SheetDetent, number> = { down: 78, halfway: 48, up: 0 };

/**
 * The trips actually ON SCREEN — the FIRST count.
 *
 * ⚠️ This has to be measured, not assumed. Deriving it from zoom alone makes
 * the two counts move together and the number stops meaning what the contract
 * says it means. A pin is on screen when its position — after the map's
 * centre-origin zoom — still falls inside the uncovered part of the map.
 */
export function visibleTrips(trips: Trip[], detent: SheetDetent, zoom: number): Trip[] {
  const exposed = EXPOSED_PCT[detent];
  return trips.filter((t) => {
    const { leftPct, topPct } = pinPosition(t);
    const x = 50 + (leftPct - 50) * zoom;
    const y = 50 + (topPct - 50) * zoom;
    return x >= 0 && x <= 100 && y >= 0 && y <= exposed;
  });
}

// ---------------------------------------------------------------------------
// Sort — lives in the LIST SHEET, not the filter sheet
// ---------------------------------------------------------------------------

/** Order per contract Part 4 ② and capture `04-05`. A tick marks the one in use. */
export type SortKey = "earliest-expiration" | "earliest-pickup" | "nearest-first" | "highest-fare";

export const SORT_OPTIONS: Array<{ key: SortKey; label: string }> = [
  { key: "earliest-expiration", label: "Earliest expiration" },
  { key: "earliest-pickup", label: "Earliest pickup" },
  { key: "nearest-first", label: "Nearest first" },
  { key: "highest-fare", label: "Highest fare" },
];

export const DEFAULT_SORT: SortKey = "highest-fare";

/** Miles from `distance` ("8.2 mi away"); Infinity when absent, so it sorts last. */
export function milesAway(trip: Trip): number {
  const m = trip.distance.match(/([\d.]+)\s*mi/);
  return m ? parseFloat(m[1]) : Number.POSITIVE_INFINITY;
}

/** Days until expiry from the "Expires in N days/hours" pill; Infinity when absent. */
export function expiresInHours(trip: Trip): number {
  for (const pill of trip.pills) {
    const m = pill.label.match(/Expires in (\d+) (day|hour)/);
    if (m) return parseInt(m[1], 10) * (m[2] === "day" ? 24 : 1);
  }
  return Number.POSITIVE_INFINITY;
}

/** Minutes past midnight of the first leg's time, for pickup ordering. */
export function pickupMinutes(trip: Trip): number {
  const m = trip.legs[0]?.time.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!m) return Number.POSITIVE_INFINITY;
  let h = parseInt(m[1], 10) % 12;
  if (/pm/i.test(m[3])) h += 12;
  return h * 60 + parseInt(m[2], 10);
}

export function sortTrips(trips: Trip[], key: SortKey): Trip[] {
  const out = [...trips];
  switch (key) {
    case "earliest-expiration": return out.sort((a, b) => expiresInHours(a) - expiresInHours(b));
    case "earliest-pickup":     return out.sort((a, b) => pickupMinutes(a) - pickupMinutes(b));
    case "nearest-first":       return out.sort((a, b) => milesAway(a) - milesAway(b));
    case "highest-fare":        return out.sort((a, b) => b.totalRevenue - a.totalRevenue);
  }
}

// ---------------------------------------------------------------------------
// Pins
// ---------------------------------------------------------------------------

/**
 * A will-call trip carries a small AMBER PHONE BADGE on its fare pin, and its
 * card reads "Est Pick-up Time - Wait For Call" (contract Part 3 ②; captures
 * `03-10` on the $75.47 pin, `03-14` both pin types).
 */
export function isWillCall(trip: Trip): boolean {
  return trip.legs.some((leg) => leg.type === "wait-for-call");
}

/**
 * Where a pin sits, as a percentage of the map box.
 *
 * ⚠️ SEEDED, not geocoded. The prototype has no geocoder and the captures do
 * not disclose coordinates. Derived deterministically from the trip id so a pin
 * does not move between renders — a jumping pin would read as a bug, and a
 * demo has to look the same twice.
 *
 * ⛔ Pins DO NOT CLUSTER. On a busy day they overlap and the driver pinches to
 * separate them; they never collapse into a numbered bubble (Internal Guide FAQ,
 * capture `03-03` at 342 trips). Overlap here is correct, not a defect.
 */
export function pinPosition(trip: Trip): { leftPct: number; topPct: number } {
  // ⚠️ Needs AVALANCHE, not just a hash. A plain `h * 31 + c` accumulator gives
  // near-identical outputs for ids that differ only in their last character —
  // REQ-PH-001/002/003 landed 0.1% apart and 16 trips rendered as 6 visible
  // pins. FNV-1a plus a final mix makes one changed character reshuffle the
  // whole value, so trips scatter the way real pickups do.
  let h = 0x811c9dc5;
  for (let i = 0; i < trip.id.length; i++) {
    h ^= trip.id.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  const mix = (x: number) => {
    x = Math.imul(x ^ (x >>> 16), 0x7feb352d) >>> 0;
    x = Math.imul(x ^ (x >>> 15), 0x846ca68b) >>> 0;
    return (x ^ (x >>> 16)) >>> 0;
  };
  const a = mix(h), b = mix(h ^ 0x9e3779b9);
  return {
    leftPct: 8 + (a / 0xffffffff) * 76,
    topPct: 10 + (b / 0xffffffff) * 66,
  };
}

// ---------------------------------------------------------------------------
// Tabs and card banners
// ---------------------------------------------------------------------------

/**
 * ⭐ THE WHOLE TAB ROW IS ABSENT where Special Offers do not run — Requests
 * opens straight onto the trips and nothing else changes (contract Part 6 ④,
 * capture `10-01`, Alivi Florida). It is not a disabled tab; it is no tabs.
 */
export type RequestTab = "standard" | "special-offers";

/** The banner at the top of every card. Contract Part 6 ② / ③. */
export const BANNER: Record<RequestTab, { label: string; note: string }> = {
  standard: { label: "Standard", note: "Instant assignment" },
  "special-offers": { label: "Needs approval", note: "Manual review" },
};

// ---------------------------------------------------------------------------
// Pickup-day grouping
// ---------------------------------------------------------------------------

/**
 * Requests filters by PICKUP DAY by default — this is why drivers see fewer
 * trips than the legacy list did.
 *
 * ⛔ A day with no trips DOES NOT APPEAR in the picker at all — it is absent,
 * not greyed out (contract Part 5 ①, capture `05-13`). Grouping by the days
 * that actually have trips is what produces that, so there is no separate
 * "hide empty days" rule to forget.
 */
export interface DayGroup { key: string; label: string; short: string; trips: Trip[] }

export function groupByPickupDay(trips: Trip[]): DayGroup[] {
  const map = new Map<string, Trip[]>();
  for (const t of trips) (map.get(t.date) ?? map.set(t.date, []).get(t.date)!).push(t);
  return [...map].map(([label, ts]) => ({
    key: label,
    label,
    // "Sun, Nov 1, 2026" -> "Sun, Nov 1", the form the count line uses
    short: label.split(",").slice(0, 2).join(",").trim(),
    trips: ts,
  }));
}

/** Requests opens on the NEXT DAY THAT HAS TRIPS, so you never land on an empty one. */
export function defaultDayKey(groups: DayGroup[]): string | null {
  return groups.length ? groups[0].key : null;
}

// ---------------------------------------------------------------------------
// Empty state — exact strings from capture `07-01`
// ---------------------------------------------------------------------------

export const EMPTY_TITLE = "No trips match these filters";
export const EMPTY_BODY = "Clear filters to see more trips.";
