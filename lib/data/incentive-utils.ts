// =============================================================================
// INCENTIVE UTILITY FUNCTIONS
// =============================================================================
// Helper functions for mapping incentive types to display values.
// =============================================================================

import type { IncentiveType, DriverIncentiveProgress } from "./incentives";
import { incentiveDefinitions, driverIncentiveProgress } from "./incentives";

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
};

// -----------------------------------------------------------------------------
// PROGRESS HELPERS
// -----------------------------------------------------------------------------

/**
 * Get progress info for an incentive type.
 * Returns current/target count, bonus amount, and completion status.
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
  const allTypes: IncentiveType[] = [
    'weekend-warrior',
    'early-bird', 
    'peak-hours',
    'loyalty-streak',
  ];
  
  const progressItems = allTypes
    .map(type => getIncentiveProgressInfo(type))
    .filter((info): info is IncentiveProgressInfo => info !== null);
  
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
