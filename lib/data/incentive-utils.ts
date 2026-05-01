// =============================================================================
// INCENTIVE UTILITY FUNCTIONS
// =============================================================================
// Helper functions for mapping incentive types to display values.
// =============================================================================

import type {
  IncentiveType,
  IncentiveTierLevel,
  DriverIncentiveProgress,
} from "./incentives";
import { incentiveDefinitions, driverIncentiveProgress } from "./incentives";
import { sortByTierDesc } from "@/lib/incentive-sort";
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
  // Gold tier — White Glove (rose) & Squad Goals (fuchsia)
  'white-glove': { bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-300' },
  'squad-goals': { bg: 'bg-fuchsia-100', text: 'text-fuchsia-800', border: 'border-fuchsia-300' },
  // Bronze tier — Quick Wins (yellow / warm tan)
  'quick-wins': { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
  // Silver tier — Hometown Hero (cyan / blue family)
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
// TIER COLORS (per IncentiveTierLevel — drives banner/card theming)
// -----------------------------------------------------------------------------

export interface TierColorTheme {
  hex: string;            // raw color value
  bgClass: string;        // Tailwind bg class
  textClass: string;      // primary text class with adequate contrast on bg
  mutedTextClass: string; // muted/secondary text class on bg
  markBackdropClass: string; // backdrop behind the small Wingz mark
  progressTrackClass: string; // progress bar track on this bg
  progressFillClass: string;  // progress bar completed-fill on this bg
}

export const INCENTIVE_TIER_COLORS: Record<IncentiveTierLevel, TierColorTheme> = {
  gold: {
    hex: '#EAB308',
    bgClass: 'bg-[#EAB308]',
    textClass: 'text-gray-900',
    mutedTextClass: 'text-gray-800/80',
    markBackdropClass: 'bg-white/40',
    progressTrackClass: 'bg-white/40',
    progressFillClass: 'bg-gray-900',
  },
  silver: {
    hex: '#94A3B8',
    bgClass: 'bg-[#94A3B8]',
    textClass: 'text-gray-900',
    mutedTextClass: 'text-gray-800/80',
    markBackdropClass: 'bg-white/50',
    progressTrackClass: 'bg-white/40',
    progressFillClass: 'bg-gray-900',
  },
  bronze: {
    hex: '#B45309',
    bgClass: 'bg-[#B45309]',
    textClass: 'text-white',
    mutedTextClass: 'text-amber-100',
    markBackdropClass: 'bg-white/25',
    progressTrackClass: 'bg-black/30',
    progressFillClass: 'bg-white',
  },
};

/** Get the tierLevel for a given incentive type, or null if unknown. */
export function getIncentiveTierLevel(type: IncentiveType): IncentiveTierLevel | null {
  return incentiveDefinitions.find(d => d.type === type)?.tierLevel ?? null;
}

// -----------------------------------------------------------------------------
// PROGRESS HELPERS
// -----------------------------------------------------------------------------

/**
 * Get progress info for an incentive type.
 * Returns current/target count, bonus amount, completion status, and tier.
 */
export interface IncentiveProgressInfo {
  incentiveType: IncentiveType;
  name: string;
  currentCount: number;       // Completed trips
  scheduledCount: number;     // Scheduled/accepted trips (not yet completed)
  targetCount: number;        // Total trips needed
  remainingCount: number;     // Trips still needed to take (target - current - scheduled)
  bonusAmount: number;
  isComplete: boolean;
  description: string;
  tierLevel: IncentiveTierLevel;
}

export function getIncentiveProgressInfo(type: IncentiveType): IncentiveProgressInfo | null {
  // Find the definition
  const definition = incentiveDefinitions.find(d => d.type === type);
  if (!definition) return null;

  // Find the progress
  const progress = driverIncentiveProgress.find(p => p.incentiveId === definition.id);
  
  const currentCount = progress?.currentCount ?? 0;
  const scheduledCount = progress?.scheduledCount ?? 0;
  const targetCount = definition.targetCount;
  const remainingCount = Math.max(0, targetCount - currentCount - scheduledCount);
  
  return {
    incentiveType: type,
    name: definition.name,
    currentCount,
    scheduledCount,
    targetCount,
    remainingCount,
    bonusAmount: definition.bonusAmount,
    isComplete: progress?.isComplete ?? false,
    description: definition.description,
    tierLevel: definition.tierLevel,
  };
}

/**
 * Get progress info for multiple incentive types.
 */
export function getMultipleIncentiveProgressInfo(types: IncentiveType[]): IncentiveProgressInfo[] {
  return types
    .map(type => getIncentiveProgressInfo(type))
    .filter((info): info is IncentiveProgressInfo => info !== null);
}

/**
 * Format progress as "X/Y trips" string.
 */
export function formatProgressString(current: number, target: number): string {
  return `${current}/${target} trips`;
}

/**
 * Format bonus as "$X" string.
 */
export function formatBonusString(amount: number): string {
  return `$${amount}`;
}

// -----------------------------------------------------------------------------
// PAYOUT HELPERS
// -----------------------------------------------------------------------------

/**
 * Weekly payout data structure.
 */
export interface WeeklyPayoutData {
  baseEarnings: number;
  bonusesEarned: number;
  totalPayout: number;
  nextPayoutDate: string;
  nextPayoutDateFormatted: string;
}

/**
 * Get all incentive progress items (for dashboard display).
 */
export function getAllIncentiveProgress(): IncentiveProgressInfo[] {
  // Sort incentive definitions by tier (Gold → Silver → Bronze)
  const sortedDefinitions = sortByTierDesc(incentiveDefinitions);
  
  // Map to IncentiveType based on sorted order
  const sortedTypes: IncentiveType[] = sortedDefinitions.map(def => def.type);
  
  const progressItems = sortedTypes
    .map(type => getIncentiveProgressInfo(type))
    .filter((info): info is IncentiveProgressInfo => info !== null);
  
  // Then sort by completion status (in-progress first, completed last)
  return progressItems.sort((a, b) => {
    if (a.isComplete === b.isComplete) return 0;
    return a.isComplete ? 1 : -1;
  });
}

/**
 * Get weekly payout data for the current driver.
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

/**
 * Payout breakdown item.
 */
export interface PayoutBreakdownItem {
  name: string;
  incentiveType: IncentiveType;
  currentCount: number;
  targetCount: number;
  bonusAmount: number;
  isComplete: boolean;
}

/**
 * Get completed program details for payout breakdown.
 */
export function getPayoutBreakdown(): PayoutBreakdownItem[] {
  const allProgress = getAllIncentiveProgress();
  
  return allProgress.map(item => ({
    name: item.name,
    incentiveType: item.incentiveType,
    currentCount: item.currentCount,
    targetCount: item.targetCount,
    bonusAmount: item.bonusAmount,
    isComplete: item.isComplete,
  }));
}

/**
 * Get total projected bonus if all in-progress programs complete.
 */
export function getProjectedTotalBonus(): number {
  const allProgress = getAllIncentiveProgress();
  return allProgress.reduce((sum, item) => sum + item.bonusAmount, 0);
}

// -----------------------------------------------------------------------------
// REQUEST FEED COUNT HELPERS
// -----------------------------------------------------------------------------

/**
 * Count of qualifying request trips for a given incentive type, computed live
 * from the mock request feed. Used by the "Available trips" CTA on Incentive cards.
 */
export function getQualifyingTripsCount(type: IncentiveType): number {
  return mockRequestTrips.filter((t) => t.incentiveType === type).length;
}
