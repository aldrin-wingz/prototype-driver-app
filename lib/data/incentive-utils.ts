// =============================================================================
// INCENTIVE UTILITY FUNCTIONS  (v1 — post App-I-4 v6 catch-up)
// =============================================================================
// Helper functions for mapping incentive types to display values + rolling-window
// helpers ported from Manager P-11/P-11.1 (2026-05-12). Tier color theming,
// leaderboard helpers, payout-breakdown helpers, and the gold-first
// `sortByTierDesc` were removed in I-0.
//
// App-I-4 additions (2026-05-12):
//   - `IncentiveProgressInfo` interface extended with `goalMode` discriminator
//     + optional `goalDays`. `goal` field stays as a flat count for display.
//   - `getIncentiveProgressInfo` unpacks the new `Goal` discriminated union.
//   - `formatRollingWindow` ported from Manager 1:1 (signature adapted to
//     accept ISO strings since App stores window dates as strings).
//   - `computeCurrentWindowProgress` new helper — counts qualifying trips in
//     the CURRENT Y-day window (`[today - (days-1), today]`, clamped to
//     startDate). NOT "best window so far" — corrected 2026-05-12 per user
//     direction (driver-facing metric, not eval question). Falls back to
//     seeded `currentCount` if compute returns 0 (prototype simplification —
//     `seedTrips` may not have enough density).
// =============================================================================

import type {
  Goal,
  IncentiveType,
  DriverIncentiveProgress,
} from "./incentives";
import {
  incentiveDefinitions,
  driverIncentiveProgress,
  seedTrips,
} from "./incentives";
import { mockRequestTrips } from "@/lib/driver-data/mock-trips";

// -----------------------------------------------------------------------------
// INCENTIVE DISPLAY NAMES
// -----------------------------------------------------------------------------

/** Human-readable names for incentive types (used in pill labels) */
export const INCENTIVE_DISPLAY_NAMES: Record<IncentiveType, string> = {
  'weekend-warrior': 'Weekend Warrior',
  'early-bird': 'Early Bird',
  'peak-hours': 'Peak Performer',
  'loyalty-streak': 'Loyalty Streak',
  'new-rider-bonus': 'New Rider',
  'long-haul': 'Long Haul',
  'perfect-rating': 'Perfect Rating',
  'white-glove': 'White Glove',
  'quick-wins': 'Quick Wins',
  'hometown-hero': 'Hometown Hero',
  'squad-goals': 'Squad Goals',
};

/** Short trip labels (e.g., "Early Bird Trip") */
export function getIncentiveTripLabel(type: IncentiveType): string {
  return `${INCENTIVE_DISPLAY_NAMES[type]} Trip`;
}

// -----------------------------------------------------------------------------
// INCENTIVE COLORS (soft pill backgrounds)
// -----------------------------------------------------------------------------

/** Background colors for incentive pills (soft tints) */
export const INCENTIVE_PILL_COLORS: Record<IncentiveType, { bg: string; text: string; border: string }> = {
  'weekend-warrior': { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300' },
  'early-bird': { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300' },
  'peak-hours': { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
  'loyalty-streak': { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300' },
  'new-rider-bonus': { bg: 'bg-teal-100', text: 'text-teal-800', border: 'border-teal-300' },
  'long-haul': { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-300' },
  'perfect-rating': { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300' },
  'white-glove': { bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-300' },
  'squad-goals': { bg: 'bg-fuchsia-100', text: 'text-fuchsia-800', border: 'border-fuchsia-300' },
  'quick-wins': { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
  'hometown-hero': { bg: 'bg-cyan-100', text: 'text-cyan-800', border: 'border-cyan-300' },
};

/** Muted/desaturated colors for completed trips in Ride History */
export const INCENTIVE_PILL_COLORS_MUTED: Record<IncentiveType, { bg: string; text: string; border: string }> = {
  'weekend-warrior': { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-300' },
  'early-bird': { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-300' },
  'peak-hours': { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-300' },
  'loyalty-streak': { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-300' },
  'new-rider-bonus': { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-300' },
  'long-haul': { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-300' },
  'perfect-rating': { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-300' },
  'white-glove': { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-300' },
  'quick-wins': { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-300' },
  'hometown-hero': { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-300' },
  'squad-goals': { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-300' },
};

// -----------------------------------------------------------------------------
// PROGRESS HELPERS
// -----------------------------------------------------------------------------

/**
 * App-I-4 (v6): extended with mode discriminator + optional window days so
 * display components can render mode-aware captions + the explicit
 * rolling-window date chip. `goal` stays as a flat count for the progress
 * bar (mode-agnostic at the bar level).
 */
export interface IncentiveProgressInfo {
  incentiveType: IncentiveType;
  name: string;
  currentCount: number;
  goal: number;
  remainingCount: number;
  bonusAmount: number;
  isComplete: boolean;
  description: string;
  /** App-I-4: discriminator carried from `IncentiveDefinition.goal.type`. */
  goalMode: Goal["type"];
  /** App-I-4: only set when `goalMode === "rolling-window"`. */
  goalDays?: number;
  /** App-I-4: ISO datetime strings — needed by `formatRollingWindow` consumers. */
  startDate: string;
  endDate: string;
}

export function getIncentiveProgressInfo(type: IncentiveType): IncentiveProgressInfo | null {
  const definition = incentiveDefinitions.find(d => d.type === type);
  if (!definition) return null;

  const progress = driverIncentiveProgress.find(p => p.incentiveId === definition.id);

  // App-I-4: unpack the discriminated Goal union.
  const goalCount = definition.goal.count;
  const goalMode = definition.goal.type;
  const goalDays = definition.goal.type === "rolling-window" ? definition.goal.days : undefined;

  // App-I-4: for rolling-window incentives, compute the CURRENT window count
  // from seeded trips (NOT "best window so far"). Per user direction
  // 2026-05-12: the driver-facing metric is "what's my count in the current
  // 7-day window right now?" — the window slides forward each day. Fall back
  // to the seeded `currentCount` if the live computation surfaces 0 due to
  // sparse seed trip density.
  let currentCount = progress?.currentCount ?? 0;
  if (goalMode === "rolling-window" && goalDays != null) {
    const computed = computeCurrentWindowProgress(
      type,
      goalCount,
      goalDays,
      definition.startDate,
      definition.endDate,
    );
    if (computed.done > 0) {
      currentCount = computed.done;
    }
    // else: fall through to seeded `currentCount` (prototype simplification —
    // TODO: when real backend wires in, remove this fallback).
  }

  const remainingCount = Math.max(0, goalCount - currentCount);

  return {
    incentiveType: type,
    name: definition.title,
    currentCount,
    goal: goalCount,
    remainingCount,
    bonusAmount: definition.bonusAmount,
    isComplete: progress?.isComplete ?? false,
    description: definition.description,
    goalMode,
    goalDays,
    startDate: definition.startDate,
    endDate: definition.endDate,
  };
}

export function getMultipleIncentiveProgressInfo(types: IncentiveType[]): IncentiveProgressInfo[] {
  return types
    .map(type => getIncentiveProgressInfo(type))
    .filter((info): info is IncentiveProgressInfo => info !== null);
}

export function formatProgressString(current: number, target: number): string {
  return `${current}/${target} trips`;
}

export function formatBonusString(amount: number): string {
  return `$${amount}`;
}

// -----------------------------------------------------------------------------
// PAYOUT HELPERS
// -----------------------------------------------------------------------------

export interface WeeklyPayoutData {
  baseEarnings: number;
  bonusesEarned: number;
  totalPayout: number;
  nextPayoutDate: string;
  nextPayoutDateFormatted: string;
}

/**
 * Get all incentive progress items, sorted by sortOrder ASC (then in-progress before completed).
 */
export function getAllIncentiveProgress(): IncentiveProgressInfo[] {
  const sortedDefinitions = [...incentiveDefinitions].sort((a, b) =>
    a.sortOrder - b.sortOrder
  );

  const progressItems = sortedDefinitions
    .map(def => getIncentiveProgressInfo(def.type))
    .filter((info): info is IncentiveProgressInfo => info !== null);

  return progressItems.sort((a, b) => {
    if (a.isComplete === b.isComplete) return 0;
    return a.isComplete ? 1 : -1;
  });
}

/**
 * Get weekly payout data for the current driver.
 * Display-only in v1 (IncentiveEarnedPopup sub-line, pill renderer badge).
 */
export function getWeeklyPayoutData(): WeeklyPayoutData {
  const baseEarnings = 342.50;

  const completedBonuses = driverIncentiveProgress
    .filter(p => p.isComplete)
    .reduce((sum, p) => sum + p.bonusEarned, 0);

  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + daysUntilMonday);

  const payoutDateFormatted = nextMonday.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return {
    baseEarnings,
    bonusesEarned: completedBonuses,
    totalPayout: baseEarnings + completedBonuses,
    nextPayoutDate: nextMonday.toISOString(),
    nextPayoutDateFormatted: payoutDateFormatted,
  };
}

// -----------------------------------------------------------------------------
// REQUEST FEED COUNT HELPERS
// -----------------------------------------------------------------------------

/**
 * Count of qualifying request trips for a given incentive type, computed live
 * from the mock request feed. Used by the "Available trips" CTA on Incentive cards.
 */
export function getQualifyingTripsCount(type: IncentiveType): number {
  return mockRequestTrips.filter((t) => t.incentiveTypes.includes(type)).length;
}

// -----------------------------------------------------------------------------
// ROLLING-WINDOW HELPERS  (App-I-4, ported from Manager P-11 + P-11.1)
// -----------------------------------------------------------------------------

const ROLLING_SHORT_MONTH = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** Short "MMM D" label for rolling-window range chips. */
function formatRollingWindowDateShort(d: Date): string {
  return `${ROLLING_SHORT_MONTH[d.getMonth()]} ${d.getDate()}`;
}

/**
 * App-I-4 — Rolling-window dates that slide forward each day.
 * Ported from Manager `lib/data/incentives.ts::formatRollingWindow`
 * (P-11.1, 2026-05-12). Identical semantic; signature accepts ISO datetime
 * strings (App stores window dates as strings rather than Date objects).
 *
 * Returns the current applicable `from`/`to` dates for a rolling-window
 * incentive, given the campaign window + today's date. Returns `null` for
 * total-mode goals OR for rolling-window incentives that haven't started
 * yet (today < startDate). For ended campaigns the pointer clamps to
 * endDate so drivers see the FINAL window when reviewing closed incentives.
 *
 * Examples (assume goal.days = 7):
 *   - Active mid-campaign on 2026-05-12 → from = 2026-05-06, to = 2026-05-12
 *   - Active early-campaign (campaign started 2026-05-10, today 2026-05-12)
 *       → from = 2026-05-10 (clamped to startDate), to = 2026-05-12 (partial window)
 *   - Upcoming (today < startDate) → null
 *   - Ended (today > endDate) → from = endDate - 6d, to = endDate
 *
 * **Treatment goal (per user direction 2026-05-12):** the App must render
 * this MORE explicitly than the Manager preview's muted caption — bordered
 * chip with leading calendar icon, not text-only treatment.
 */
export function formatRollingWindow(
  goal: Goal,
  startDateIso: string,
  endDateIso: string,
  today: Date = new Date(),
): { fromIso: string; toIso: string; fromLabel: string; toLabel: string } | null {
  if (goal.type !== "rolling-window") return null;

  const startDate = new Date(startDateIso);
  const endDate = new Date(endDateIso);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return null;
  }

  const todayMs = today.getTime();
  const startMs = startDate.getTime();
  const endMs = endDate.getTime();
  if (todayMs < startMs) return null;

  // Pointer = today, clamped to endDate so ended campaigns show the final window.
  const pointerMs = Math.min(todayMs, endMs);
  // Window start = pointer - (days - 1), clamped to startDate so early-campaign
  // partial windows don't read pre-campaign dates.
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const targetFromMs = pointerMs - (goal.days - 1) * ONE_DAY_MS;
  const fromMs = Math.max(targetFromMs, startMs);

  const fromDate = new Date(fromMs);
  const toDate = new Date(pointerMs);
  return {
    fromIso: fromDate.toISOString(),
    toIso: toDate.toISOString(),
    fromLabel: formatRollingWindowDateShort(fromDate),
    toLabel: formatRollingWindowDateShort(toDate),
  };
}

/**
 * App-I-4 — CURRENT-window progress helper for rolling-window incentives.
 *
 * Counts completed trips that match the incentive type AND fall within the
 * **current** rolling window — i.e., `[today - (days - 1), today]`, clamped
 * to `[startDate, endDate]`. This is the driver-facing metric: "what's my
 * count in the last Y days right now?" The window slides forward each day.
 *
 * **NOT "best window so far."** Per user direction 2026-05-12 the prototype
 * shows the current window while in-progress; on completion, the system
 * would freeze the chip to the window where the driver completed (V1 simpler
 * path: existing `progress.isComplete` badge + opacity treatment serves as
 * the completion indicator; freezing the chip to the completion-window is a
 * future enhancement that would require a `completedWindowFromIso`/`ToIso`
 * field on `DriverIncentiveProgress`).
 *
 * Returns `{ done: 0, remaining: count }` when no qualifying trips are
 * found in the current window — the caller (typically
 * `getIncentiveProgressInfo`) can fall back to the seeded
 * `DriverIncentiveProgress.currentCount` for prototype demos where
 * `seedTrips` lacks density in the last Y days.
 *
 * **Note (V1 simplification):** `Trip.date` is a human-readable string like
 * `"May 4, 2026"`. We parse with `new Date(date)` — works for this seed
 * format but fragile in general. Real backend would carry ISO datetime
 * strings on completed-trip records.
 */
export function computeCurrentWindowProgress(
  type: IncentiveType,
  count: number,
  days: number,
  startDateIso: string,
  endDateIso: string,
  today: Date = new Date(),
): { done: number; remaining: number } {
  const startMs = new Date(startDateIso).getTime();
  const endMs = new Date(endDateIso).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
    return { done: 0, remaining: count };
  }
  const pointerMs = Math.min(today.getTime(), endMs);
  if (pointerMs < startMs) return { done: 0, remaining: count };

  // Current window = [pointer - (days - 1), pointer], clamped to startDate.
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const targetFromMs = pointerMs - (days - 1) * ONE_DAY_MS;
  const winStartMs = Math.max(targetFromMs, startMs);
  const winEndMs = pointerMs;

  let done = 0;
  for (const t of seedTrips) {
    if (t.status !== "completed") continue;
    if (!t.incentiveTypes.includes(type)) continue;
    const parsed = new Date(t.date).getTime();
    if (!Number.isFinite(parsed)) continue;
    if (parsed < winStartMs || parsed > winEndMs) continue;
    done++;
  }

  return {
    done: Math.min(done, count),
    remaining: Math.max(0, count - done),
  };
}
