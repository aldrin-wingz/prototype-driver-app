"use client";

import { useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useIncentiveEarned } from "@/lib/incentive-earned-context";
import { incentiveDefinitions } from "@/lib/data/incentives";
import {
  INCENTIVE_PILL_COLORS,
  getWeeklyPayoutData,
} from "@/lib/data/incentive-utils";
import { cn } from "@/lib/utils";

const AUTO_DISMISS_MS = 6000;

/**
 * Celebratory popup shown when a driver earns an incentive bonus.
 *
 * v1: stripped of TierBadge, tier ring, mini tier-progress block, and the
 * "View Earnings" / "View My Incentives" CTAs. Single Dismiss CTA + 6s
 * auto-dismiss.
 */
export function IncentiveEarnedPopup() {
  const { activeIncentive, dismiss } = useIncentiveEarned();

  // Auto-dismiss after 6s
  useEffect(() => {
    if (!activeIncentive) return;
    const timer = setTimeout(() => dismiss(), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [activeIncentive, dismiss]);

  const data = useMemo(() => {
    if (!activeIncentive) return null;
    const def = incentiveDefinitions.find((d) => d.type === activeIncentive);
    if (!def) return null;
    const colors = INCENTIVE_PILL_COLORS[activeIncentive];
    return { def, colors };
  }, [activeIncentive]);

  if (!activeIncentive || !data) {
    return null;
  }

  const payoutData = getWeeklyPayoutData();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="incentive-earned-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
    >
      {/* Dark backdrop — tap-to-dismiss */}
      <button
        type="button"
        aria-label="Dismiss celebration"
        onClick={dismiss}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
      />

      {/* Modal card */}
      <div
        className={cn(
          "relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl",
          "animate-in fade-in zoom-in-95 duration-300"
        )}
      >
        {/* Headline */}
        <h2
          id="incentive-earned-title"
          className="text-center text-2xl font-bold tracking-tight text-gray-900"
        >
          Incentive Earned!
        </h2>

        {/* Incentive name pill */}
        <div className="mt-3 flex justify-center">
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold",
              data.colors.bg,
              data.colors.text,
              data.colors.border
            )}
          >
            {/* App-I-4 (2026-05-12): fix pre-existing stale ref — `def.name`
                was renamed to `def.title` in I-1; this consumer was missed
                in the grep sweep. */}
            {data.def.title}
          </span>
        </div>

        {/* Big dollar amount */}
        <p className="mt-4 text-center text-5xl font-bold text-[#10B981]">
          +${data.def.bonusAmount}
        </p>

        {/* Sub-line — payout date */}
        <p className="mt-1 text-center text-sm text-gray-500">
          Added to your next payout on{" "}
          <span className="font-semibold text-gray-900">
            {payoutData.nextPayoutDateFormatted}
          </span>
        </p>

        {/* Single CTA */}
        <div className="mt-6">
          <Button
            onClick={dismiss}
            className="h-12 w-full rounded-full bg-[#10B981] text-base font-semibold text-white shadow-sm hover:bg-[#0EA371]"
          >
            Dismiss
          </Button>
        </div>
      </div>
    </div>
  );
}
