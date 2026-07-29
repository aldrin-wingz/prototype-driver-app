"use client";

import { Suspense, useMemo } from "react";
import { ChevronLeft } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { PAY_PERIODS } from "@/lib/data/payout";
import { getEarningsActivity } from "@/lib/data/wallet";
import { EarningsActivityCard } from "@/components/driver/earnings-activity-card";
import { PageHelpSheet } from "@/components/driver/page-help-sheet";

function EarningsActivityContent() {
  const router = useRouter();
  const search = useSearchParams();
  const weekParam = search.get("week");

  const periodId = useMemo(() => {
    if (weekParam && PAY_PERIODS.some((p) => p.id === weekParam)) return weekParam;
    return PAY_PERIODS.find((p) => p.lifecycle === "in-balance")?.id ?? PAY_PERIODS[0].id;
  }, [weekParam]);

  const period = PAY_PERIODS.find((p) => p.id === periodId)!;
  const days = getEarningsActivity(periodId);

  return (
    <div className="flex min-h-screen flex-col bg-white font-wingz">
      {/* Header */}
      <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between bg-white px-4">
        <button
          onClick={() => router.back()}
          className="flex h-10 w-10 items-center justify-center text-gray-700"
          aria-label="Back"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900">Earnings Activity</h1>
        <PageHelpSheet
          title="Earnings activity"
          intro="Everything that made up this week's earnings, newest first."
          points={[
            {
              label: "Trips",
              body: "Each completed trip shows what you earned, with the pickup and drop-off.",
            },
            {
              label: "Incentives",
              body: "Bonuses you accomplished this week, added on top of your trip earnings.",
            },
            {
              label: "Penalties",
              body: "Amounts deducted — for example, a trip sent back within 24 hours of pickup.",
            },
          ]}
        />
      </header>

      {/* Week context */}
      <p className="px-4 pb-3 text-sm text-gray-500">
        {period.startDate} – {period.endDate}
      </p>

      {/* Feed */}
      {days.length === 0 ? (
        <div className="px-4 py-16 text-center text-sm text-gray-400">
          No activity this week.
        </div>
      ) : (
        <div className="pb-10">
          {days.map((day) => (
            <section key={day.dateLabel}>
              <div className="bg-gray-50 px-4 py-2">
                <span className="text-sm font-medium text-gray-500">{day.dateLabel}</span>
              </div>
              <div className="divide-y divide-gray-100">
                {day.items.map((it) => (
                  <EarningsActivityCard key={it.id} item={it} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

export default function EarningsActivityPage() {
  return (
    <Suspense fallback={null}>
      <EarningsActivityContent />
    </Suspense>
  );
}
