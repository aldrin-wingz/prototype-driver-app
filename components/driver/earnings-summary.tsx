"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  TODAY_SUMMARY,
  getBalanceSummary,
  getPayoutTransactions,
} from "@/lib/data/wallet";

/**
 * The expanded earnings summary that lives INSIDE the dashboard balance pill
 * (dark surface) when it morphs open: a swipeable Today / This Week / Balance
 * segment + page dots + the "View Weekly Breakdown" button — all within the
 * same container. Wingz-true: no tips/surge/online-time; points → incentives.
 */
export function EarningsSummary({ onViewBreakdown }: { onViewBreakdown: () => void }) {
  const { balance, nextPayoutDate, earnedWeekLabel, periodId } = getBalanceSummary();
  const week = getPayoutTransactions(periodId);
  const weekIncentives = week.incentives.length;

  const cards = [
    {
      key: "today",
      label: "Today",
      amount: TODAY_SUMMARY.earnings,
      sub: `${TODAY_SUMMARY.trips} trips completed`,
    },
    {
      key: "week",
      label: `This Week · ${earnedWeekLabel}`,
      amount: week.earnedTotal,
      sub: `${week.revenue.length} trips · ${weekIncentives} incentive${
        weekIncentives === 1 ? "" : "s"
      }`,
    },
    {
      key: "balance",
      label: "Balance",
      amount: balance,
      sub: `Pays out ${nextPayoutDate}`,
    },
  ];

  const scrollRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(1); // default: This Week

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.clientWidth;
  }, []);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el || el.clientWidth === 0) return;
    setActive(Math.round(el.scrollLeft / el.clientWidth));
  };

  return (
    <div>
      {/* Hairline under the pill header */}
      <div className="mx-4 h-px bg-white/10" />

      {/* Swipeable segments — rendered on the dark surface (no nested cards) */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex snap-x snap-mandatory overflow-x-auto [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: "none" }}
      >
        {cards.map((c) => (
          <div key={c.key} className="w-full shrink-0 snap-center px-5 py-4">
            <p className="text-xs font-medium uppercase tracking-wide text-[#E7F3F3]/60">
              {c.label}
            </p>
            <p className="mt-1 text-3xl font-bold leading-tight text-[#00F9B8]">
              ${c.amount.toFixed(2)}
            </p>
            <p className="mt-1 text-sm text-[#E7F3F3]/70">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Page dots (light on dark) */}
      <div className="flex justify-center gap-1.5">
        {cards.map((c, i) => (
          <span
            key={c.key}
            className={cn(
              "h-1.5 w-1.5 rounded-full transition-colors",
              i === active ? "bg-[#E7F3F3]" : "bg-[#E7F3F3]/30"
            )}
          />
        ))}
      </div>

      {/* View Weekly Breakdown — within the same container */}
      <div className="px-4 pb-4 pt-3">
        <button
          type="button"
          onClick={onViewBreakdown}
          className="flex w-full items-center justify-center gap-1 rounded-full border border-[#E7F3F3]/25 py-2.5 text-sm font-semibold text-[#E7F3F3] transition-colors hover:bg-white/5"
        >
          View Weekly Breakdown
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
