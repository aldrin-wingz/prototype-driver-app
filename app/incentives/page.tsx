"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IncentiveCard } from "@/components/driver/dashboard-incentive-section";
import { TierProgressSection } from "@/components/driver/tier-progress-section";
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
    <div className="flex h-[100dvh] flex-col bg-[#F9FAFB]">
      {/* Header — WHITE background per BIBLE */}
      <header className="flex h-14 shrink-0 items-center justify-between bg-white px-4 shadow-sm">
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

        {/* Spacer (Variants pill renders as floating button globally) */}
        <div className="w-10" />
      </header>

      {/* Tabs — 2 tabs after I-6.1 (Tier Progress tab dropped, content moved into Incentives tab) */}
      <Tabs defaultValue="incentives" className="flex flex-1 flex-col overflow-hidden">
        <TabsList className="h-12 w-full shrink-0 justify-start rounded-none border-b bg-white px-4">
          <TabsTrigger
            value="incentives"
            className="flex-1 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-[#10B981] data-[state=active]:text-[#10B981] data-[state=active]:shadow-none"
          >
            Incentives
          </TabsTrigger>
          <TabsTrigger
            value="leaderboard"
            className="flex-1 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-[#10B981] data-[state=active]:text-[#10B981] data-[state=active]:shadow-none"
          >
            Leaderboard
          </TabsTrigger>
        </TabsList>

        {/* Incentives Tab — sticky TierProgressSection at top + scrollable IncentiveCard list */}
        <TabsContent value="incentives" className="mt-0 flex-1 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col">
          {/* Sticky tier section */}
          <div className="shrink-0 px-4 pb-3 pt-4">
            <TierProgressSection />
          </div>

          {/* Scrollable IncentiveCard list */}
          <div className="flex-1 space-y-3 overflow-y-auto px-4 pb-4">
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

        {/* Leaderboard Tab — internal sticky regions + scrollable ranks list */}
        <TabsContent value="leaderboard" className="mt-0 flex-1 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col">
          <LeaderboardTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
