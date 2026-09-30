"use client";

import { Suspense, useMemo, useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { PAY_PERIODS } from "@/lib/data/payout";
import { getDailyNet, getPayoutTransactions } from "@/lib/data/wallet";
import { PageHelpSheet } from "@/components/driver/page-help-sheet";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function BreakdownRow({
  label,
  value,
  tone = "default",
  bold = false,
}: {
  label: string;
  value: string;
  tone?: "default" | "negative";
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={cn("text-gray-700", bold && "font-semibold text-gray-900")}>
        {label}
      </span>
      <span
        className={cn(
          tone === "negative" ? "text-[#DC2626]" : "text-gray-900",
          bold ? "font-semibold" : "font-medium"
        )}
      >
        {value}
      </span>
    </div>
  );
}

function WeeklyEarningsContent() {
  const router = useRouter();

  const search = useSearchParams();
  const weekParam = search.get("week");
  const initialId = useMemo(() => {
    if (weekParam && PAY_PERIODS.some((p) => p.id === weekParam)) return weekParam;
    return PAY_PERIODS.find((p) => p.lifecycle === "in-balance")?.id ?? PAY_PERIODS[0].id;
  }, [weekParam]);
  const [periodId, setPeriodId] = useState(initialId);

  const index = PAY_PERIODS.findIndex((p) => p.id === periodId);
  const period = PAY_PERIODS[index];
  const t = getPayoutTransactions(periodId);
  const daily = getDailyNet(periodId);

  // Diverging chart geometry: bars grow up from a zero line (green) or down
  // below it (red) when a day nets negative (e.g. a penalty with no revenue).
  const maxPos = Math.max(0, ...daily.map((d) => d.amount));
  const minNeg = Math.min(0, ...daily.map((d) => d.amount));
  const range = maxPos - minNeg || 1;
  const zeroPct = (maxPos / range) * 100; // distance of the zero line from the top
  const hasNeg = minNeg < 0;
  const startNum = parseInt(period.startDate.replace(/\D/g, ""), 10) || 0;
  const trips = t.revenue.length;
  const incentiveCount = t.incentives.length;
  const penaltyCount = t.penalties.length;

  const hasPrev = index > 0;
  const hasNext = index < PAY_PERIODS.length - 1;

  return (
    <div className="flex min-h-screen flex-col bg-white font-wingz">
      {/* Header: close · week range · help */}
      <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between bg-white px-4">
        <button
          onClick={() => router.back()}
          className="flex h-10 w-10 items-center justify-center text-gray-700"
          aria-label="Close"
        >
          <X className="h-6 w-6" />
        </button>
        <span className="text-base font-semibold text-gray-900">
          {period.startDate} – {period.endDate}
        </span>
        <PageHelpSheet
          title="Your weekly earnings"
          intro="What you earned this week and when it pays out."
          points={[
            {
              label: "What you earned",
              body: "Your total for the week — trip revenue plus incentives, minus any penalties.",
            },
            {
              label: "When you get paid",
              body: "Each week's earnings are added to your Balance the Thursday after the week ends, then deposited to your bank the following Monday.",
            },
            {
              label: "The chart",
              body: "Each bar is a day's net trip earnings. Green is positive; a red bar below the line means penalties outweighed trips that day.",
            },
          ]}
        />
      </header>

      {/* Total + week nav */}
      <div className="flex items-center justify-center gap-8 bg-white pb-4">
        <button
          onClick={() => hasPrev && setPeriodId(PAY_PERIODS[index - 1].id)}
          disabled={!hasPrev}
          className={cn("text-gray-700", !hasPrev && "text-gray-200")}
          aria-label="Previous week"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <p className="text-5xl font-semibold tracking-tight text-gray-900">
          ${t.earnedTotal.toFixed(2)}
        </p>
        <button
          onClick={() => hasNext && setPeriodId(PAY_PERIODS[index + 1].id)}
          disabled={!hasNext}
          className={cn("text-gray-700", !hasNext && "text-gray-200")}
          aria-label="Next week"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>

      {/* Daily net bar chart — diverging: green above a labeled $0 line, red below */}
      <div className="px-4 pl-16">
        <div className="relative h-52">
          {/* peak reference line + label */}
          <div className="absolute inset-x-0 top-0 border-t border-dashed border-gray-400" />
          <span className="absolute -left-12 top-0 -translate-y-1/2 text-[11px] text-gray-400">
            ${maxPos.toFixed(2)}
          </span>
          {/* zero baseline + its label */}
          <div
            className="absolute inset-x-0 border-t border-dashed border-gray-400"
            style={{ top: `${zeroPct}%` }}
          />
          <span
            className="absolute -left-12 -translate-y-1/2 text-[11px] text-gray-400"
            style={{ top: `${zeroPct}%` }}
          >
            $0
          </span>
          {/* trough reference */}
          {hasNeg && (
            <span
              className="absolute -left-12 bottom-0 translate-y-1/2 text-[11px] text-[#DC2626]"
            >
              −${Math.abs(minNeg).toFixed(2)}
            </span>
          )}
          {/* bars */}
          <div className="absolute inset-0 flex justify-between gap-2">
            {daily.map((d, i) => {
              const pos = d.amount >= 0;
              const hPct = (Math.abs(d.amount) / range) * 100;
              return (
                <div key={i} className="relative flex-1">
                  {d.amount !== 0 && (
                    <div
                      className={cn(
                        "absolute w-full",
                        pos ? "rounded-t bg-[#00B692]" : "rounded-b bg-[#DC2626]"
                      )}
                      style={
                        pos
                          ? { top: `${zeroPct - hPct}%`, height: `${hPct}%`, minHeight: 4 }
                          : { top: `${zeroPct}%`, height: `${hPct}%`, minHeight: 4 }
                      }
                      title={`$${d.amount.toFixed(2)}`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div className="mt-1 flex justify-between gap-2 border-t border-gray-100 pt-2">
          {daily.map((d, i) => (
            <div key={i} className="flex-1 text-center">
              <p className="text-sm font-medium text-gray-900">{startNum + i}</p>
              <p className="text-[11px] text-gray-400">{WEEKDAYS[i]}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <section className="px-4 pt-8">
        <h2 className="text-2xl font-semibold text-gray-900">Stats</h2>
        <div className="mt-4 grid grid-cols-3 gap-y-5">
          <div>
            <p className="text-sm text-gray-500">Rides</p>
            <p className="text-2xl font-semibold text-gray-900">{trips}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Incentives</p>
            <p className="text-2xl font-semibold text-gray-900">{incentiveCount}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Send Backs</p>
            <p className="text-2xl font-semibold text-gray-900">{penaltyCount}</p>
          </div>
        </div>
      </section>

      {/* Breakdown */}
      <section className="px-4 pt-8">
        <h2 className="text-2xl font-semibold text-gray-900">Breakdown</h2>
        <div className="mt-4 space-y-3">
          <BreakdownRow label="Rides" value={`$${t.revenueTotal.toFixed(2)}`} />
          <BreakdownRow label="Incentives" value={`+$${t.incentivesTotal.toFixed(2)}`} />
          <BreakdownRow
            label="Send Backs"
            value={`−$${t.penaltiesTotal.toFixed(2)}`}
            tone="negative"
          />
          <div className="border-t border-gray-200 pt-3">
            <BreakdownRow label="Total Earned" value={`$${t.earnedTotal.toFixed(2)}`} bold />
          </div>
        </div>
      </section>

      {/* Actions */}
      <div className="mt-8 px-4 pb-10">
        <button
          type="button"
          onClick={() => router.push(`/earnings-activity?week=${periodId}`)}
          className="w-full rounded-2xl bg-[#131A1B] py-3.5 text-sm font-semibold text-white transition-colors hover:bg-black"
        >
          See earnings activity
        </button>
      </div>
    </div>
  );
}

export default function WeeklyEarningsPage() {
  return (
    <Suspense fallback={null}>
      <WeeklyEarningsContent />
    </Suspense>
  );
}
