// -----------------------------------------------------------------------------
// PAYOUT DATA LAYER  (v2 — ported from the v3 baseline payout model)
//
// Provenance: extracted from the v3 prototype's `lib/data/incentives.ts`
// (PayPeriod / PayoutPeriodSummary types + PAY_PERIODS + PAYOUT_PERIOD_SUMMARIES)
// and split into its own module here so the payout surface is self-contained
// and does not bloat v1's incentives.ts.
//
// v1 adaptation notes:
//   - `IncentiveType` is imported from v1's existing incentives module (the
//     enum is identical for the 4 types referenced below).
//   - The `completedTripIds` / `upcomingTripIds` below are the v3 seed ids.
//     v1's mock-trips use different ids, so the rides tabs may render empty
//     until these are re-mapped to real v1 trip ids (follow-up).
// -----------------------------------------------------------------------------

import type { IncentiveType } from "./incentives";

/**
 * A pay period (the Mon–Sun work week) + its payout lifecycle dates.
 *
 * Cadence (per CEO): a week's earnings are added to the driver's Balance on the
 * Thursday after the week closes (a manual process), then deposited to the bank
 * the following Monday. Example: work week Jun 15–21 → added to balance
 * Thu Jun 25 → paid out Mon Jun 29.
 */
export interface PayPeriod {
  id: string;
  startDate: string; // work-week start, e.g. 'Jun 15'
  endDate: string; // work-week end, e.g. 'Jun 21'
  addedToBalanceDate: string; // the Thursday after, e.g. 'Thu, Jun 25'
  payoutDate: string; // the Monday after that, e.g. 'Mon, Jun 29'
  /** Where this week's money sits in the lifecycle. */
  lifecycle: "earning" | "in-balance" | "paid";
}

/**
 * Pre-computed payout summary per (driver, period).
 * Frontend reads this to render `/payout`.
 *
 * `Projected` (current/upcoming) or `Final` (closed) total =
 *   earnedFromCompletedRides + upcomingFromAcceptedRides + incentivesTotal
 */
export interface PayoutPeriodSummary {
  periodId: string;
  // Mini-card 1: completed rides this period
  earnedFromCompletedRides: number;
  completedRidesCount: number;
  // Mini-card 2: accepted/upcoming rides this period
  upcomingFromAcceptedRides: number;
  upcomingRidesCount: number;
  // Mini-card 3: incentive bonuses (earned + projected)
  incentivesTotal: number; // sum of earned + projected
  incentivesEarnedCount: number; // programs already triggered
  incentivesTotalCount: number; // earned + in-progress contributing
  // The trip lists for each tab — by reference
  completedTripIds: string[];
  upcomingTripIds: string[];
  programIdsContributing: IncentiveType[]; // earned + in-progress
}

// -----------------------------------------------------------------------------
// PAY PERIODS (June cadence: 2 paid, 1 in-balance [the focus week], 1 earning)
// -----------------------------------------------------------------------------

export const PAY_PERIODS: PayPeriod[] = [
  {
    id: "period-2026-04-14",
    startDate: "Jun 1",
    endDate: "Jun 7",
    addedToBalanceDate: "Thu, Jun 11",
    payoutDate: "Mon, Jun 15",
    lifecycle: "paid",
  },
  {
    id: "period-2026-04-21",
    startDate: "Jun 8",
    endDate: "Jun 14",
    addedToBalanceDate: "Thu, Jun 18",
    payoutDate: "Mon, Jun 22",
    lifecycle: "paid",
  },
  {
    id: "period-2026-04-28",
    startDate: "Jun 15",
    endDate: "Jun 21",
    addedToBalanceDate: "Thu, Jun 25",
    payoutDate: "Mon, Jun 29",
    lifecycle: "in-balance",
  },
  {
    id: "period-2026-05-05",
    startDate: "Jun 22",
    endDate: "Jun 28",
    addedToBalanceDate: "Thu, Jul 2",
    payoutDate: "Mon, Jul 6",
    lifecycle: "earning",
  },
];

// -----------------------------------------------------------------------------
// PAYOUT PERIOD SUMMARIES (one record per period)
// Sum check (per period): earnedFromCompletedRides + upcomingFromAcceptedRides
//   + incentivesTotal === Projected/Final hero shown
// -----------------------------------------------------------------------------

export const PAYOUT_PERIOD_SUMMARIES: PayoutPeriodSummary[] = [
  // CLOSED — Apr 14–20: 1 completed ride + early-bird program triggered
  // Final = 109.80 + 0 + 75 = 184.80
  {
    periodId: "period-2026-04-14",
    earnedFromCompletedRides: 109.8,
    completedRidesCount: 1,
    upcomingFromAcceptedRides: 0,
    upcomingRidesCount: 0,
    incentivesTotal: 75,
    incentivesEarnedCount: 1,
    incentivesTotalCount: 1,
    completedTripIds: ["COMP-002"],
    upcomingTripIds: [],
    programIdsContributing: ["early-bird"],
  },
  // CLOSED — Apr 21–27: 2 completed rides + loyalty-streak triggered
  // Final = 268.22 + 0 + 85 = 353.22
  {
    periodId: "period-2026-04-21",
    earnedFromCompletedRides: 268.22,
    completedRidesCount: 2,
    upcomingFromAcceptedRides: 0,
    upcomingRidesCount: 0,
    incentivesTotal: 85,
    incentivesEarnedCount: 1,
    incentivesTotalCount: 1,
    completedTripIds: ["COMP-001", "COMP-003"],
    upcomingTripIds: [],
    programIdsContributing: ["loyalty-streak"],
  },
  // CURRENT — Apr 28–May 4: 3 completed + 2 upcoming + 2 in-progress programs
  // Projected = 342.50 + 87 + 150 = 579.50
  {
    periodId: "period-2026-04-28",
    earnedFromCompletedRides: 342.5,
    completedRidesCount: 3,
    upcomingFromAcceptedRides: 87,
    upcomingRidesCount: 2,
    incentivesTotal: 150, // weekend-warrior $50 + peak-hours $100 (both projected)
    incentivesEarnedCount: 0,
    incentivesTotalCount: 2,
    completedTripIds: ["CURRENT-COMP-001", "CURRENT-COMP-002", "CURRENT-COMP-003"],
    upcomingTripIds: ["UP-CURRENT-001", "UP-CURRENT-002"],
    programIdsContributing: ["weekend-warrior", "peak-hours"],
  },
  // UPCOMING — May 5–11: 1 accepted ride scheduled, no programs yet
  // Projected = 0 + 38 + 0 = 38
  {
    periodId: "period-2026-05-05",
    earnedFromCompletedRides: 0,
    completedRidesCount: 0,
    upcomingFromAcceptedRides: 38,
    upcomingRidesCount: 1,
    incentivesTotal: 0,
    incentivesEarnedCount: 0,
    incentivesTotalCount: 0,
    completedTripIds: [],
    upcomingTripIds: ["UP-FUTURE-001"],
    programIdsContributing: [],
  },
];
