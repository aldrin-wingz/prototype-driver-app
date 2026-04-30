"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RideCard } from "@/components/driver/ride-card";
import { IncentiveCard } from "@/components/driver/dashboard-incentive-section";
import { mockCompletedTrips } from "@/lib/driver-data/mock-trips";
import {
  getWeeklyPayoutData,
  getAllIncentiveProgress,
} from "@/lib/data/incentive-utils";
import type { IncentiveType } from "@/lib/data/incentives";

// -----------------------------------------------------------------------------
// EMPTY STATE
// -----------------------------------------------------------------------------

function EmptyState({ message }: { message: string }) {
  return (
    <div className="px-4 py-8">
      <Card className="border-dashed border-gray-200 bg-gray-50 p-12 text-center shadow-none">
        <p className="text-sm text-gray-500">{message}</p>
      </Card>
    </div>
  );
}

// -----------------------------------------------------------------------------
// PAYOUT PAGE
// -----------------------------------------------------------------------------

export default function PayoutPage() {
  const router = useRouter();
  const payoutData = getWeeklyPayoutData();
  const allProgress = getAllIncentiveProgress();

  // Filter sources
  const completedTrips = mockCompletedTrips;
  const completedIncentives = allProgress.filter((p) => p.isComplete);

  const hasBonus = payoutData.bonusesEarned > 0;

  const handleIncentiveTap = (type: IncentiveType) => {
    router.push(`/requests?incentive=${type}`);
  };

  const handleRideTap = () => {
    console.log("[v0] PayoutPage: completed ride card tapped (no nav)");
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#F9FAFB]">
      {/* Header - WHITE, back chevron left, centered title */}
      <header className="sticky top-0 z-50 flex h-14 items-center justify-between bg-white px-4 shadow-sm">
        <button
          onClick={() => router.back()}
          className="flex h-10 w-10 items-center justify-center text-gray-700"
          aria-label="Back"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>

        <h1 className="absolute left-1/2 -translate-x-1/2 text-lg font-semibold text-gray-900">
          Upcoming Payout
        </h1>

        {/* Spacer (Variants pill renders as global floating button) */}
        <div className="w-10" />
      </header>

      {/* Summary Section */}
      <section className="px-4 pt-4">
        <Card className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">
            Next payout:{" "}
            <span className="font-medium text-gray-700">
              {payoutData.nextPayoutDateFormatted}
            </span>
          </p>
          <p className="mt-1 text-3xl font-bold text-[#10B981]">
            ${payoutData.totalPayout.toFixed(2)}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1 text-sm">
            <span className="text-gray-600">
              Base ${payoutData.baseEarnings.toFixed(2)}
            </span>
            <span className="text-gray-400">·</span>
            {hasBonus ? (
              <span className="font-semibold text-[#10B981]">
                Bonuses +${payoutData.bonusesEarned.toFixed(2)}
              </span>
            ) : (
              <span className="text-gray-400">Bonuses +$0.00</span>
            )}
          </div>
          {!hasBonus && (
            <p className="mt-2 text-xs text-gray-500">
              No bonuses earned yet this week
            </p>
          )}
        </Card>
      </section>

      {/* Tabs */}
      <Tabs defaultValue="rides" className="mt-4 flex-1">
        <TabsList className="h-12 w-full justify-start rounded-none border-b bg-white px-4">
          <TabsTrigger
            value="rides"
            className="flex-1 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-[#10B981] data-[state=active]:text-[#10B981] data-[state=active]:shadow-none"
          >
            Rides Completed
          </TabsTrigger>
          <TabsTrigger
            value="incentives"
            className="flex-1 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-[#10B981] data-[state=active]:text-[#10B981] data-[state=active]:shadow-none"
          >
            Completed Incentives
          </TabsTrigger>
        </TabsList>

        {/* Rides Completed Tab */}
        <TabsContent value="rides" className="mt-0">
          {completedTrips.length === 0 ? (
            <EmptyState message="No rides completed in this pay period yet." />
          ) : (
            <div className="px-4 py-4">
              <p className="mb-3 text-xs font-medium text-gray-500">
                {completedTrips.length} ride{completedTrips.length === 1 ? "" : "s"} this pay period
              </p>
              <div className="space-y-3">
                {completedTrips.map((trip) => (
                  <RideCard
                    key={trip.id}
                    trip={trip}
                    revenueColor="blue"
                    onClick={handleRideTap}
                    showDistance={false}
                  />
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Completed Incentives Tab */}
        <TabsContent value="incentives" className="mt-0">
          {completedIncentives.length === 0 ? (
            <EmptyState message="No incentives completed yet this pay period. Complete an incentive program to see it here." />
          ) : (
            <div className="space-y-3 p-4">
              {completedIncentives.map((item) => (
                <IncentiveCard
                  key={item.incentiveType}
                  progress={item}
                  onTap={handleIncentiveTap}
                  variant="full"
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
