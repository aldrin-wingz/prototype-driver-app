"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { IncentiveCard } from "@/components/driver/dashboard-incentive-section";
import { getAllIncentiveProgress } from "@/lib/data/incentive-utils";
import type { IncentiveType } from "@/lib/data/incentives";

/**
 * Driver Incentives page (full list).
 *
 * v1: Tabs / Leaderboard / TierProgressSection / YourPlacementCard / sticky
 * Top-3 podium were all stripped in I-0. Page is now a header + scrollable
 * list of full IncentiveCards.
 */
export default function IncentivesPage() {
  const router = useRouter();
  const progressItems = getAllIncentiveProgress();

  const handleCardTap = (type: IncentiveType) => {
    router.push(`/requests?incentive=${type}`);
  };

  return (
    <div className="flex h-[100dvh] flex-col bg-[#F9FAFB]">
      {/* Header — WHITE background per BIBLE */}
      <header className="relative flex h-14 shrink-0 items-center justify-between bg-white px-4 shadow-sm">
        <button
          onClick={() => router.back()}
          className="flex h-10 w-10 items-center justify-center text-gray-700"
          aria-label="Back"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>

        <h1 className="absolute left-1/2 -translate-x-1/2 text-lg font-semibold text-gray-900">
          Driver Incentives
        </h1>

        <div className="w-10" />
      </header>

      {/* Scrollable IncentiveCard list */}
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {progressItems.map((item) => (
          <IncentiveCard
            key={item.incentiveType}
            progress={item}
            onTap={handleCardTap}
            variant="full"
          />
        ))}
      </div>
    </div>
  );
}
