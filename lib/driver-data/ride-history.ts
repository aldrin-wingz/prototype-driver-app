/**
 * Ride History — the filter, replicated from captures `04-02` and `04-03`
 * (shoot `DAB-2026-10-01`, build v6.0.537).
 *
 * The sheet is titled **"Filter ride history"**, carries a single dropdown
 * defaulting to `All`, an **Update** button and a **Clear All** link. The
 * dropdown offers exactly three options and a tick marks the one in use.
 *
 * ⚠️ Only the LABELS are captured. What "Missing Signatures" and "Late Trips"
 * mean is inferred from the labels, and the trips they match are seeded
 * (`Trip.signatureCaptured` / `Trip.wasLate`) rather than derived — the
 * prototype captures no signatures and has no clock.
 */

import type { Trip } from "./mock-trips";

export type RideHistoryFilter = "all" | "missing-signatures" | "late-trips";

/** Order and wording exactly as captured in `04-03`. */
export const RIDE_HISTORY_FILTERS: Array<{ key: RideHistoryFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "missing-signatures", label: "Missing Signatures" },
  { key: "late-trips", label: "Late Trips" },
];

export const DEFAULT_RIDE_HISTORY_FILTER: RideHistoryFilter = "all";

export const RIDE_HISTORY_FILTER_COPY = {
  title: "Filter ride history",
  update: "Update",
  clear: "Clear All",
} as const;

export function filterLabel(key: RideHistoryFilter): string {
  return RIDE_HISTORY_FILTERS.find((f) => f.key === key)!.label;
}

/** Absent `signatureCaptured` counts as captured; only an explicit false is missing. */
export function isMissingSignature(trip: Trip): boolean {
  return trip.signatureCaptured === false;
}

export function isLateTrip(trip: Trip): boolean {
  return trip.wasLate === true;
}

export function applyRideHistoryFilter(trips: Trip[], key: RideHistoryFilter): Trip[] {
  switch (key) {
    case "all": return trips;
    case "missing-signatures": return trips.filter(isMissingSignature);
    case "late-trips": return trips.filter(isLateTrip);
  }
}
