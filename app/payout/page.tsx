"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { RideCard } from "@/components/driver/ride-card";
import { IncentiveCard } from "@/components/driver/dashboard-incentive-section";
import {
  mockCompletedTrips,
  mockUpcomingTrips,
  mockRequestTrips,
  mockNeedsActionTrips,
  type Trip,
} from "@/lib/driver-data/mock-trips";
import {
  PAY_PERIODS,
  PAYOUT_PERIOD_SUMMARIES,
  type IncentiveType,
  type PayPeriod,
  type PayoutPeriodSummary,
} from "@/lib/data/incentives";
import { getAllIncentiveProgress } from "@/lib/data/incentive-utils";
import { useVariants } from "@/lib/variants-context";

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

const ALL_TRIPS: Trip[] = [
  ...mockCompletedTrips,
  ...mockUpcomingTrips,
  ...mockRequestTrips,
  ...mockNeedsActionTrips,
];

function findTrips(ids: string[]): Trip[] {
  return ids
    .map((id) => ALL_TRIPS.find((t) => t.id === id))
    .filter((t): t is Trip => t !== undefined);
}

type TabValue = "rides-completed" | "rides-upcoming" | "incentives";

function defaultTabFor(status: PayPeriod["status"]): TabValue {
  return status === "upcoming" ? "rides-upcoming" : "rides-completed";
}

function periodLabel(period: PayPeriod): string {
  return `${period.startDate} – ${period.endDate}`;
}

function statusPillClasses(status: PayPeriod["status"]): string {
  switch (status) {
    case "current":
      return "bg-[#10B981]/15 text-[#047857] border-[#10B981]/30";
    case "upcoming":
      return "bg-blue-100 text-blue-800 border-blue-300";
    case "closed":
    default:
      return "bg-gray-100 text-gray-700 border-gray-300";
  }
}

function statusPillLabel(status: PayPeriod["status"]): string {
  switch (status) {
    case "current":
      return "Current";
    case "upcoming":
      return "Upcoming";
    case "closed":
    default:
      return "Closed";
  }
}

// -----------------------------------------------------------------------------
// PERIOD SELECTOR (date range + Pays <date> stacked in the center)
// -----------------------------------------------------------------------------

interface PeriodSelectorProps {
  period: PayPeriod;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}

function PeriodSelector({ period, hasPrev, hasNext, onPrev, onNext }: PeriodSelectorProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <button
        onClick={onPrev}
        disabled={!hasPrev}
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-full border transition-colors",
          hasPrev
            ? "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            : "cursor-not-allowed border-gray-100 bg-gray-50 text-gray-300"
        )}
        aria-label="Previous pay period"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <div className="flex-1 text-center">
        <div className="text-sm font-semibold leading-tight text-gray-900">
          {periodLabel(period)}
        </div>
        <div className="mt-0.5 text-[11px] text-gray-500">
          Pays {period.payoutDate}
        </div>
      </div>

      <button
        onClick={onNext}
        disabled={!hasNext}
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-full border transition-colors",
          hasNext
            ? "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            : "cursor-not-allowed border-gray-100 bg-gray-50 text-gray-300"
        )}
        aria-label="Next pay period"
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      <Badge
        variant="outline"
        className={cn("ml-1 text-xs font-medium", statusPillClasses(period.status))}
      >
        {statusPillLabel(period.status)}
      </Badge>
    </div>
  );
}

// -----------------------------------------------------------------------------
// MINI-CARDS VARIANT — merged Hero + 3 mini-cells inside ONE card
// -----------------------------------------------------------------------------

interface MiniCardsSummaryProps {
  period: PayPeriod;
  summary: PayoutPeriodSummary;
  total: number;
  activeTab: TabValue;
}

function MiniCardsSummary({ period, summary, total, activeTab }: MiniCardsSummaryProps) {
  const isClosed = period.status === "closed";
  const isFuture = period.status === "upcoming";
  const headlineLabel = isClosed ? "Final" : "Projected";

  // Empty-state subtitles collapse to a single em-dash.
  const earnedSubtitle = isFuture ? "—" : `${summary.completedRidesCount} ✓`;
  const upcomingSubtitle = isClosed ? "—" : `${summary.upcomingRidesCount} ↑`;
  const incentivesSubtitle = `${summary.incentivesEarnedCount} of ${summary.incentivesTotalCount}`;

  return (
    <section className="px-4 pt-2">
      <Card className="overflow-hidden rounded-xl bg-white p-0 shadow-sm">
        {/* Hero */}
        <div className="px-3.5 py-3.5">
          <p className="text-xs font-medium text-gray-500">{headlineLabel}</p>
          <p className="mt-0.5 text-4xl font-bold leading-tight text-[#10B981]">
            ${total.toFixed(2)}
          </p>
        </div>
        {/* Hairline divider — no gap between hero and mini-cells */}
        <div className="h-px bg-gray-200" />
        {/* Mini-cells row — 3 cells separated by vertical hairlines */}
        <div className="grid grid-cols-3 divide-x divide-gray-200">
          <MiniCell
            label="Earned"
            value={`$${summary.earnedFromCompletedRides.toFixed(2)}`}
            subtitle={earnedSubtitle}
            active={activeTab === "rides-completed"}
          />
          <MiniCell
            label="Upcoming"
            value={`$${summary.upcomingFromAcceptedRides.toFixed(2)}`}
            subtitle={upcomingSubtitle}
            active={activeTab === "rides-upcoming"}
          />
          <MiniCell
            label="Incentives"
            value={`$${summary.incentivesTotal.toFixed(2)}`}
            subtitle={incentivesSubtitle}
            active={activeTab === "incentives"}
          />
        </div>
      </Card>
    </section>
  );
}

interface MiniCellProps {
  label: string;
  value: string;
  subtitle: string;
  active: boolean;
}

function MiniCell({ label, value, subtitle, active }: MiniCellProps) {
  return (
    <div className={cn("p-3", active && "bg-[#10B981]/5")}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-0.5 text-base font-bold text-gray-900">{value}</p>
      <p className="mt-0.5 text-[11px] text-gray-500">{subtitle}</p>
    </div>
  );
}

// -----------------------------------------------------------------------------
// TABS-AS-METRICS VARIANT — metric cells live inside the TabsList
// -----------------------------------------------------------------------------

interface MetricTabCellProps {
  label: string;
  value: string;
  subtitle: string;
}

function MetricTabCell({ label, value, subtitle }: MetricTabCellProps) {
  return (
    <div className="flex w-full flex-col items-start gap-0.5 py-1.5">
      <span className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
        {label}
      </span>
      <span className="text-base font-bold text-[#10B981]">{value}</span>
      <span className="text-[11px] text-gray-500">{subtitle}</span>
    </div>
  );
}

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
// Flex column at viewport height. Sticky region (header + period selector +
// summary card + tabs) does NOT scroll; only the active tab's list scrolls.
// -----------------------------------------------------------------------------

export default function PayoutPage() {
  const router = useRouter();
  const { variants } = useVariants();

  const initialPeriodId = useMemo(
    () => PAY_PERIODS.find((p) => p.status === "current")?.id ?? PAY_PERIODS[0].id,
    []
  );
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>(initialPeriodId);

  const periodIndex = PAY_PERIODS.findIndex((p) => p.id === selectedPeriodId);
  const period = PAY_PERIODS[periodIndex];
  const summary =
    PAYOUT_PERIOD_SUMMARIES.find((s) => s.periodId === selectedPeriodId) ??
    PAYOUT_PERIOD_SUMMARIES[0];

  const total =
    summary.earnedFromCompletedRides +
    summary.upcomingFromAcceptedRides +
    summary.incentivesTotal;

  const [tab, setTab] = useState<TabValue>(defaultTabFor(period.status));

  // Reset tab to the period-appropriate default when the period changes
  useEffect(() => {
    setTab(defaultTabFor(period.status));
  }, [period.status, period.id]);

  const handlePrev = () => {
    if (periodIndex > 0) {
      setSelectedPeriodId(PAY_PERIODS[periodIndex - 1].id);
    }
  };
  const handleNext = () => {
    if (periodIndex < PAY_PERIODS.length - 1) {
      setSelectedPeriodId(PAY_PERIODS[periodIndex + 1].id);
    }
  };

  const handleIncentiveTap = (type: IncentiveType) => {
    router.push(`/requests?incentive=${type}`);
  };
  const handleRideTap = () => {
    console.log("[v0] PayoutPage: ride card tapped (no nav)");
  };

  const completedTrips = findTrips(summary.completedTripIds);
  const upcomingTrips = findTrips(summary.upcomingTripIds);

  // Pull the contributing incentive cards (earned + in-progress) for this period.
  const allProgress = getAllIncentiveProgress();
  const periodIncentives = summary.programIdsContributing
    .map((type) => allProgress.find((p) => p.incentiveType === type))
    .filter((p): p is NonNullable<typeof p> => p !== undefined);

  // Empty-state copy
  const completedEmpty =
    period.status === "upcoming"
      ? "Period not yet started — no rides completed."
      : "No rides completed in this pay period yet.";
  const upcomingEmpty =
    period.status === "closed"
      ? "Pay period closed — no upcoming rides."
      : "No upcoming rides accepted for this period yet.";
  const incentivesEmpty =
    period.status === "upcoming"
      ? "No incentive activity yet for this period."
      : "No incentive activity for this pay period.";

  const isMiniCards = variants.payoutSummary === "mini-cards";

  return (
    <div className="flex h-[100dvh] flex-col bg-[#F9FAFB]">
      {/* Header (sticky region — does not scroll) */}
      <header className="relative z-50 flex h-14 shrink-0 items-center justify-between bg-white px-4 shadow-sm">
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
        <div className="w-10" />
      </header>

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as TabValue)}
        className="flex flex-1 flex-col overflow-hidden"
      >
        {/* STICKY REGION: period selector + summary card + tabs row */}
        <div className="shrink-0">
          <PeriodSelector
            period={period}
            hasPrev={periodIndex > 0}
            hasNext={periodIndex < PAY_PERIODS.length - 1}
            onPrev={handlePrev}
            onNext={handleNext}
          />

          {isMiniCards ? (
            <MiniCardsSummary
              period={period}
              summary={summary}
              total={total}
              activeTab={tab}
            />
          ) : (
            <section className="px-4 pt-2">
              <Card className="rounded-xl bg-white p-3.5 shadow-sm">
                <p className="text-xs font-medium text-gray-500">
                  {period.status === "closed" ? "Final" : "Projected"}
                </p>
                <p className="mt-0.5 text-4xl font-bold leading-tight text-[#10B981]">
                  ${total.toFixed(2)}
                </p>
              </Card>
            </section>
          )}

          {/* Tabs hug the summary's bottom (mt-2 ~= 8px below the card) */}
          {isMiniCards ? (
            <TabsList className="mt-2 h-12 w-full justify-start rounded-none border-b bg-white px-4">
              <TabsTrigger
                value="rides-completed"
                className="flex-1 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-[#10B981] data-[state=active]:text-[#10B981] data-[state=active]:shadow-none"
              >
                Rides Completed
              </TabsTrigger>
              <TabsTrigger
                value="rides-upcoming"
                className="flex-1 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-[#10B981] data-[state=active]:text-[#10B981] data-[state=active]:shadow-none"
              >
                Rides Upcoming
              </TabsTrigger>
              <TabsTrigger
                value="incentives"
                className="flex-1 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-[#10B981] data-[state=active]:text-[#10B981] data-[state=active]:shadow-none"
              >
                Incentives
              </TabsTrigger>
            </TabsList>
          ) : (
            <TabsList className="mt-2 grid h-auto w-full grid-cols-3 gap-0 rounded-none border-b bg-white px-2">
              <TabsTrigger
                value="rides-completed"
                className="rounded-none px-2 data-[state=active]:border-b-2 data-[state=active]:border-[#10B981] data-[state=active]:bg-[#10B981]/5 data-[state=active]:shadow-none"
              >
                <MetricTabCell
                  label="Earned"
                  value={`$${summary.earnedFromCompletedRides.toFixed(2)}`}
                  subtitle={
                    period.status === "upcoming" ? "—" : `${summary.completedRidesCount} ✓`
                  }
                />
              </TabsTrigger>
              <TabsTrigger
                value="rides-upcoming"
                className="rounded-none px-2 data-[state=active]:border-b-2 data-[state=active]:border-[#10B981] data-[state=active]:bg-[#10B981]/5 data-[state=active]:shadow-none"
              >
                <MetricTabCell
                  label="Upcoming"
                  value={`$${summary.upcomingFromAcceptedRides.toFixed(2)}`}
                  subtitle={
                    period.status === "closed" ? "—" : `${summary.upcomingRidesCount} ↑`
                  }
                />
              </TabsTrigger>
              <TabsTrigger
                value="incentives"
                className="rounded-none px-2 data-[state=active]:border-b-2 data-[state=active]:border-[#10B981] data-[state=active]:bg-[#10B981]/5 data-[state=active]:shadow-none"
              >
                <MetricTabCell
                  label="Incentives"
                  value={`$${summary.incentivesTotal.toFixed(2)}`}
                  subtitle={`${summary.incentivesEarnedCount} of ${summary.incentivesTotalCount}`}
                />
              </TabsTrigger>
            </TabsList>
          )}
        </div>

        {/* SCROLLABLE REGION — only the list scrolls */}
        <div className="flex-1 overflow-y-auto">
          <TabsContent value="rides-completed" className="mt-0">
            {completedTrips.length === 0 ? (
              <EmptyState message={completedEmpty} />
            ) : (
              <div className="px-4 pt-2 pb-4">
                <p className="mb-3 text-xs font-medium text-gray-500">
                  {completedTrips.length} ride
                  {completedTrips.length === 1 ? "" : "s"} this pay period
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

          <TabsContent value="rides-upcoming" className="mt-0">
            {upcomingTrips.length === 0 ? (
              <EmptyState message={upcomingEmpty} />
            ) : (
              <div className="px-4 pt-2 pb-4">
                <p className="mb-3 text-xs font-medium text-gray-500">
                  {upcomingTrips.length} accepted ride
                  {upcomingTrips.length === 1 ? "" : "s"} for this period
                </p>
                <div className="space-y-3">
                  {upcomingTrips.map((trip) => (
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

          <TabsContent value="incentives" className="mt-0">
            {periodIncentives.length === 0 ? (
              <EmptyState message={incentivesEmpty} />
            ) : (
              <div className="space-y-3 px-4 pt-2 pb-4">
                {periodIncentives.map((item) => (
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
        </div>
      </Tabs>
    </div>
  );
}
