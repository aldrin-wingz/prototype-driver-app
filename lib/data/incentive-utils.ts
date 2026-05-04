// =============================================================================
// INCENTIVE UTILITY FUNCTIONS  (v1 — post I-0 strip)
// =============================================================================
// Helper functions for mapping incentive types to display values. Tier color
// theming, leaderboard helpers, payout-breakdown helpers, and the gold-first
// `sortByTierDesc` were removed in I-0. The `getAllIncentiveProgress` callsite
// uses a placeholder ASC-by-id sort until I-1 wires the admin `sortOrder` field.
// =============================================================================

import type {
  IncentiveType,
  DriverIncentiveProgress,
} from "./incentives";
import { incentiveDefinitions, driverIncentiveProgress } from "./incentives";
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

export interface IncentiveProgressInfo {
  incentiveType: IncentiveType;
  name: string;
  currentCount: number;
  goal: number;
  remainingCount: number;
  bonusAmount: number;
  isComplete: boolean;
  description: string;
}

export function getIncentiveProgressInfo(type: IncentiveType): IncentiveProgressInfo | null {
  const definition = incentiveDefinitions.find(d => d.type === type);
  if (!definition) return null;

  const progress = driverIncentiveProgress.find(p => p.incentiveId === definition.id);

  const currentCount = progress?.currentCount ?? 0;
  const goal = definition.goal;
  const remainingCount = Math.max(0, goal - currentCount);

  return {
    incentiveType: type,
    name: definition.title,
    currentCount,
    goal,
    remainingCount,
    bonusAmount: definition.bonusAmount,
    isComplete: progress?.isComplete ?? false,
    description: definition.description,
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
