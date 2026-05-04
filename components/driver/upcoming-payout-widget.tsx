"use client";

import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { getWeeklyPayoutData } from "@/lib/data/incentive-utils";

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------

/**
 * Display-only Upcoming Payout widget.
 *
 * v1: tap is a no-op toast — there is no /payout page in v1 (full payout
 * redesign is v2). Visual matches the v3 baseline minus the chevron.
 */
export function UpcomingPayoutWidget() {
  const { toast } = useToast();
  const payoutData = getWeeklyPayoutData();

  const hasBonus = payoutData.bonusesEarned > 0;

  const handleTap = () => {
    toast({
      title: "Payout details coming soon",
      description: "The full payout page is part of the v2 redesign.",
    });
  };

  return (
    <Card
      className="mx-4 mb-4 cursor-pointer rounded-xl bg-white p-4 shadow-sm transition-all hover:shadow-md active:scale-[0.99]"
      onClick={handleTap}
    >
      {/* Section header */}
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-600">Upcoming Payout</h3>
        <span className="text-xs text-gray-400">
          Next payout: {payoutData.nextPayoutDateFormatted}
        </span>
      </div>

      {/* Main amount */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-3xl font-bold text-[#10B981]">
            ${payoutData.totalPayout.toFixed(2)}
          </p>

          {/* Breakdown row */}
          <div className="mt-1 flex items-center gap-1 text-sm">
            <span className="text-gray-500">Base ${payoutData.baseEarnings.toFixed(2)}</span>
            {hasBonus ? (
              <>
                <span className="text-gray-400">·</span>
                <span className="font-semibold text-[#10B981]">
                  +${payoutData.bonusesEarned.toFixed(2)} bonus
                </span>
              </>
            ) : (
              <>
                <span className="text-gray-400">·</span>
                <span className="text-gray-400">$0 bonus</span>
              </>
            )}
          </div>

          {/* Empty state message */}
          {!hasBonus && (
            <p className="mt-2 text-xs text-gray-400">
              No bonuses earned yet this week. Complete an incentive program to earn one.
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
