"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent } from "@/components/ui/tabs";
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
// PERIOD SELECTOR
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
// METRIC TAB CELL — clickable cell that doubles as the tab trigger.
// 2 lines only (LABEL / VALUE). No subtitle row. Active state per variant.
// -----------------------------------------------------------------------------

type PayoutVariant = "boxed-tabs" | "edge-to-edge-tabs";

interface MetricTabCellProps {
  label: string;
  value: string;
  active: boolean;
  variant: PayoutVariant;
  onClick: () => void;
}

function MetricTabCell({ label, value, active, variant, onClick }: MetricTabCellProps) {
  // boxed-tabs ACTIVE = full Wingz green bg, white label + value, no underline.
  // edge-to-edge-tabs ACTIVE = subtle green-50 bg, dark text, green underline at bottom.
  const containerClasses =
    variant === "boxed-tabs"
      ? cn(
          "relative px-3 py-3 text-left transition-colors",
          active ? "bg-[#10B981]" : "bg-white hover:bg-gray-50"
        )
      : cn(
          "relative px-3 py-3 text-left transition-colors",
          active ? "bg-[#10B981]/8" : "bg-white hover:bg-gray-50",
          // green underline ONLY for edge-to-edge active state
          active && "after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:bg-[#10B981]"
        );

  const labelClasses =
    variant === "boxed-tabs" && active
      ? "text-[11px] font-medium uppercase tracking-wide text-white"
      : "text-[11px] font-medium uppercase tracking-wide text-gray-500";

  const valueClasses =
    variant === "boxed-tabs" && active
      ? "mt-0.5 text-base font-bold text-white"
      : "mt-0.5 text-base font-bold text-gray-900";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={containerClasses}
    >
      <p className={labelClasses}>{label}</p>
      <p className={valueClasses}>{value}</p>
    </button>
  );
}

// -----------------------------------------------------------------------------
// SUMMARY CARD — shared shell used by BOTH variants.
// Internal structure (Hero / divider / 3 metric cells) is identical.
// The only difference is the OUTER card's relationship to the viewport,
// which is controlled by the section wrapper, not this component.
// -----------------------------------------------------------------------------

interface SummaryCardProps {
  period: PayPeriod;
  summary: PayoutPeriodSummary;
  total: number;
  activeTab: TabValue;
  variant: PayoutVariant;
  onTabChange: (tab: TabValue) => void;
}

function SummaryCard({
  period,
  summary,
  total,
  activeTab,
  variant,
  onTabChange,
}: SummaryCardProps) {
  const isClosed = period.status === "closed";
  const isFuture = period.status === "upcoming";
  const headlineLabel = isClosed ? "Final" : "Projected";

  // Empty-state: single em-dash. Otherwise, raw $ value.
  const earnedValue = isFuture ? "—" : `$${summary.earnedFromCompletedRides.toFixed(2)}`;
  const upcomingValue = isClosed ? "—" : `$${summary.upcomingFromAcceptedRides.toFixed(2)}`;
  const incentivesValue = `$${summary.incentivesTotal.toFixed(2)}`;

  // For edge-to-edge, drop the rounded corners + horizontal margin so the
  // card extends flush to the viewport. For boxed, keep rounded corners.
  const cardClasses =
    variant === "edge-to-edge-tabs"
      ? "overflow-hidden rounded-none border-x-0 bg-white p-0 shadow-sm"
      : "overflow-hidden rounded-xl bg-white p-0 shadow-sm";

  return (
    <Card className={cardClasses}>
      {/* Hero */}
      <div className="px-3.5 py-3.5">
        <p className="text-xs font-medium text-gray-500">{headlineLabel}</p>
        <p className="mt-0.5 text-4xl font-bold leading-tight text-[#10B981]">
          ${total.toFixed(2)}
        </p>
      </div>
      {/* Hairline divider */}
      <div className="h-px bg-gray-200" />
      {/* 3 metric cells = the tab triggers */}
      <div className="grid grid-cols-3 divide-x divide-gray-200">
        <MetricTabCell
          label="Earned"
          value={earnedValue}
          active={activeTab === "rides-completed"}
          variant={variant}
          onClick={() => onTabChange("rides-completed")}
        />
        <MetricTabCell
          label="Upcoming"
          value={upcomingValue}
          active={activeTab === "rides-upcoming"}
          variant={variant}
          onClick={() => onTabChange("rides-upcoming")}
        />
        <MetricTabCell
          label="Incentives"
          value={incentivesValue}
          active={activeTab === "incentives"}
          variant={variant}
          onClick={() => onTabChange("incentives")}
        />
      </div>
    </Card>
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

  // Pull contributing incentive cards (earned + in-progress) for this period.
  const allProgress = getAllIncentiveProgress();
  const periodIncentives = summary.programIdsContributing
    .map((type) => allProgress.find((p) => p.incentiveType === type))
    .filter((p): p is NonNullable<typeof p> => p !== undefined);

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

  const payoutVariant: PayoutVariant = variants.payoutSummary;
  const isEdgeToEdge = payoutVariant === "edge-to-edge-tabs";

  // boxed-tabs = section keeps standard 16px horizontal padding.
  // edge-to-edge-tabs = section drops horizontal padding so the card
  // extends flush to the viewport edges.
  const sectionClasses = isEdgeToEdge ? "pt-2" : "px-4 pt-2";

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
        {/* STICKY REGION: period selector + summary card (cells are the tabs) */}
        <div className="shrink-0">
          <PeriodSelector
            period={period}
            hasPrev={periodIndex > 0}
            hasNext={periodIndex < PAY_PERIODS.length - 1}
            onPrev={handlePrev}
            onNext={handleNext}
          />

          <section className={sectionClasses}>
            <SummaryCard
              period={period}
              summary={summary}
              total={total}
              activeTab={tab}
              variant={payoutVariant}
              onTabChange={setTab}
            />
          </section>
        </div>

        {/* SCROLLABLE REGION — only the list scrolls */}
        <div className="flex-1 overflow-y-auto">
          <TabsContent value="rides-completed" className="mt-0">
            {completedTrips.length === 0 ? (
              <EmptyState message={completedEmpty} />
            ) : (
              <div className="px-4 pt-3 pb-4">
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
              <div className="px-4 pt-3 pb-4">
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
              <div className="space-y-3 px-4 pt-3 pb-4">
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
