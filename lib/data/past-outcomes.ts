// App-I-6.2 (Resume Wave, 2026-05-12) — Driver-level past incentives
// archive. Joins onto `incentiveDefinitions` so past campaigns can render
// through the shared `<IncentiveCard>` (no parallel card component).
//
// Section layout on `/incentives`:
//   - **Earned**          — all-time. Past outcomes with `outcome === 'earned'`.
//   - **Recently Ended**  — past outcomes within the last 30 days where
//                           `outcome !== 'earned'` (missed-goal only post
//                           App-MVP-2 strip; the missed-criterion outcome
//                           was retired together with the per-criterion
//                           eligibility subsystem on 2026-05-14).
//
// `finalCount` carries the trip count at campaign close so the reused
// `<IncentiveCard>` can render the same progress bar UI (e.g. "5/8" for
// a missed-goal outcome). Earned outcomes default to `goal.count` when
// `finalCount` is omitted.

import {
  currentDriver,
  incentiveDefinitions,
  type IncentiveDefinition,
} from "./incentives";
import type { IncentiveProgressInfo } from "./incentive-utils";

// -----------------------------------------------------------------------------
// CONSTANTS
// -----------------------------------------------------------------------------

/**
 * App-I-6.2 — Recently Ended cutoff. Past outcomes ended within this many
 * days from today surface on the Recently Ended section; older missed
 * outcomes fall off (Earned outcomes stay forever). Surfaced as user-
 * visible copy ("Last 30 days") via the section subtitle.
 */
export const RECENTLY_ENDED_DAYS = 30;

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export type PastOutcomeType = "earned" | "missed-goal";

export interface PastOutcome {
  incentiveId: string;
  driverId: string;
  outcome: PastOutcomeType;
  /** Set when `outcome === 'earned'` — the bonus dollars paid. */
  amountEarned?: number;
  /**
   * Trip count at campaign close (used by `<IncentiveCard>` progress bar).
   * Earned outcomes default to `goal.count` when omitted. Missed outcomes
   * should always seed an explicit value so the partial progress is visible.
   */
  finalCount?: number;
  /** Optional human-readable miss reason. */
  missedReason?: string;
}

export interface PastIncentiveRow {
  outcome: PastOutcome;
  definition: IncentiveDefinition;
}

// -----------------------------------------------------------------------------
// SEED DATA  (4 entries for currentDriver covering all 3 outcome types)
// -----------------------------------------------------------------------------

export const seedPastOutcomes: PastOutcome[] = [
  {
    incentiveId: "inc-past-001",
    driverId: currentDriver.id,
    outcome: "earned",
    amountEarned: 10,
    finalCount: 5,
  },
  {
    incentiveId: "inc-past-002",
    driverId: currentDriver.id,
    outcome: "earned",
    amountEarned: 30,
    finalCount: 8,
  },
  {
    incentiveId: "inc-past-003",
    driverId: currentDriver.id,
    outcome: "missed-goal",
    finalCount: 5,
    missedReason: "Reached 5 of 8 weekend trips before the campaign ended.",
  },
];

// -----------------------------------------------------------------------------
// JOIN HELPERS
// -----------------------------------------------------------------------------

/**
 * Join `seedPastOutcomes` × `incentiveDefinitions` for the given driver.
 * Filters out rows whose `incentiveId` doesn't resolve and sorts by
 * `endDate` descending so the most recently-ended campaigns appear first.
 */
export function getPastOutcomesFor(driverId: string): PastIncentiveRow[] {
  return seedPastOutcomes
    .filter((o) => o.driverId === driverId)
    .map((outcome): PastIncentiveRow | null => {
      const definition = incentiveDefinitions.find(
        (d) => d.id === outcome.incentiveId,
      );
      if (!definition) return null;
      return { outcome, definition };
    })
    .filter((r): r is PastIncentiveRow => r !== null)
    .sort((a, b) =>
      b.definition.endDate.localeCompare(a.definition.endDate),
    );
}

/**
 * Subset of `getPastOutcomesFor` that returns only earned outcomes
 * (all-time, no date cutoff). Sorted by endDate desc.
 */
export function getPastEarnedFor(driverId: string): PastIncentiveRow[] {
  return getPastOutcomesFor(driverId).filter(
    (r) => r.outcome.outcome === "earned",
  );
}

/**
 * Subset of `getPastOutcomesFor` for the Recently Ended section. Filters
 * to non-earned outcomes whose `endDate` falls within the last
 * `RECENTLY_ENDED_DAYS` days. Sorted by endDate desc.
 */
export function getRecentlyEndedFor(
  driverId: string,
  now: Date = new Date(),
): PastIncentiveRow[] {
  const cutoffMs = now.getTime() - RECENTLY_ENDED_DAYS * ONE_DAY_MS;
  return getPastOutcomesFor(driverId).filter((r) => {
    if (r.outcome.outcome === "earned") return false;
    const end = new Date(r.definition.endDate).getTime();
    if (!Number.isFinite(end)) return false;
    return end >= cutoffMs;
  });
}

// -----------------------------------------------------------------------------
// PROGRESS-INFO ADAPTER  (reuse <IncentiveCard> for past items)
// -----------------------------------------------------------------------------

/**
 * Construct an `IncentiveProgressInfo` from a past outcome + its
 * definition. Lets the shared `<IncentiveCard>` render past items
 * without a parallel component. `currentCount` resolves from
 * `outcome.finalCount` (Earned defaults to `goal.count` when omitted;
 * Missed should always provide an explicit value).
 */
export function getPastIncentiveProgressInfo(
  row: PastIncentiveRow,
): IncentiveProgressInfo {
  const { definition, outcome } = row;
  const goalCount = definition.goal.count;
  const isEarned = outcome.outcome === "earned";
  const currentCount =
    outcome.finalCount ?? (isEarned ? goalCount : 0);
  const remainingCount = Math.max(0, goalCount - currentCount);

  return {
    incentiveType: definition.type,
    incentiveId: definition.id,
    name: definition.title,
    currentCount,
    goal: goalCount,
    remainingCount,
    bonusAmount: definition.bonusAmount,
    isComplete: isEarned,
    description: definition.description,
    goalMode: definition.goal.type,
    goalDays:
      definition.goal.type === "rolling-window"
        ? definition.goal.days
        : undefined,
    startDate: definition.startDate,
    endDate: definition.endDate,
  };
}
