"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IncentiveCard } from "@/components/driver/dashboard-incentive-section";
import { TierProgressTab } from "@/components/driver/tier-progress-tab";
import { LeaderboardTab } from "@/components/driver/leaderboard-tab";
import { getAllIncentiveProgress } from "@/lib/data/incentive-utils";
import type { IncentiveType } from "@/lib/data/incentives";

// -----------------------------------------------------------------------------
// Main Page Component
// -----------------------------------------------------------------------------

export default function IncentivesPage() {
  const router = useRouter();
  const progressItems = getAllIncentiveProgress();

  const handleCardTap = (type: IncentiveType) => {
    router.push(`/requests?incentive=${type}`);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#F9FAFB]">
      {/* Header - WHITE background per BIBLE */}
      <header className="sticky top-0 z-50 flex h-14 items-center justify-between bg-white px-4 shadow-sm">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="flex h-10 w-10 items-center justify-center text-gray-700"
          aria-label="Back"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>

        {/* Title */}
        <h1 className="absolute left-1/2 -translate-x-1/2 text-lg font-semibold text-gray-900">
          Driver Incentives
        </h1>

        {/* Spacer for balance (Variants pill renders globally as floating button) */}
        <div className="w-10" />
      </header>

      {/* Tabs */}
      <Tabs defaultValue="incentives" className="flex-1">
        <TabsList className="w-full justify-start rounded-none border-b bg-white px-4 h-12">
          <TabsTrigger
            value="incentives"
            className="flex-1 data-[state=active]:border-b-2 data-[state=active]:border-[#10B981] data-[state=active]:text-[#10B981] data-[state=active]:shadow-none rounded-none"
          >
            Incentives
          </TabsTrigger>
          <TabsTrigger
            value="leaderboard"
            className="flex-1 data-[state=active]:border-b-2 data-[state=active]:border-[#10B981] data-[state=active]:text-[#10B981] data-[state=active]:shadow-none rounded-none"
          >
            Leaderboard
          </TabsTrigger>
          <TabsTrigger
            value="tier-progress"
            className="flex-1 data-[state=active]:border-b-2 data-[state=active]:border-[#10B981] data-[state=active]:text-[#10B981] data-[state=active]:shadow-none rounded-none"
          >
            Tier Progress
          </TabsTrigger>
        </TabsList>

        {/* Incentives Tab - Full stacked cards (reuses IncentiveCard from I-3) */}
        <TabsContent value="incentives" className="mt-0 p-4">
          <div className="space-y-3">
            {progressItems.map((item) => (
              <IncentiveCard
                key={item.incentiveType}
                progress={item}
                onTap={handleCardTap}
                variant="full"
              />
            ))}
          </div>
        </TabsContent>

        {/* Leaderboard Tab (I-6) */}
        <TabsContent value="leaderboard" className="mt-0">
          <LeaderboardTab />
        </TabsContent>

        {/* Tier Progress Tab (I-6) */}
        <TabsContent value="tier-progress" className="mt-0">
          <TierProgressTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
