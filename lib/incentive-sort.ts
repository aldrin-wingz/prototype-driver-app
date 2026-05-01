import type { IncentiveDefinition } from "@/lib/data/incentives";

/**
 * Sort incentive programs by tierLevel descending (Gold → Silver → Bronze).
 * Stable sort — programs within the same tier retain their order.
 */
export function sortByTierDesc(programs: IncentiveDefinition[]): IncentiveDefinition[] {
  const tierOrder: Record<string, number> = {
    gold: 0,
    silver: 1,
    bronze: 2,
  };

  return [...programs].sort((a, b) => {
    const tierA = tierOrder[a.tierLevel] ?? 999;
    const tierB = tierOrder[b.tierLevel] ?? 999;
    return tierA - tierB;
  });
}
