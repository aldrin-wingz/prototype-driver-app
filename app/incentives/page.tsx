"use client";

// App-I-6.2 (Resume Wave, 2026-05-12 — review iteration) — Driver
// Incentives page. Single scrollable view composed of three sections
// (In Progress → Earned → Recently Ended). The tab toggle was dropped
// (tabs reserved for v3 tier + leaderboard); the filter chip row was
// dropped in favor of a Filter button in the header that opens a
// bottom-sheet with a Status radio group + Apply/Reset footer. The
// sheet is designed to grow more filter sections in the future without
// re-architecting the page.
//
// Section rules:
//   - **In Progress**     — active campaigns with live status !== 'earned'.
//   - **Earned**          — all-time. Active status === 'earned' + past earned.
//   - **Recently Ended**  — past non-earned outcomes within RECENTLY_ENDED_DAYS.

import * as React from "react";
import { ChevronLeft, SlidersHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { IncentiveCard } from "@/components/driver/dashboard-incentive-section";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { getAllIncentiveProgress } from "@/lib/data/incentive-utils";
import type { IncentiveProgressInfo } from "@/lib/data/incentive-utils";
import {
  currentDriver,
  type IncentiveType,
} from "@/lib/data/incentives";
import {
  getPastEarnedFor,
  getPastIncentiveProgressInfo,
  getRecentlyEndedFor,
  RECENTLY_ENDED_DAYS,
  type PastIncentiveRow,
} from "@/lib/data/past-outcomes";
import { cn } from "@/lib/utils";

type FilterValue = "all" | "in-progress" | "earned" | "recently-ended";

const FILTER_OPTIONS: { value: FilterValue; label: string }[] = [
  { value: "all", label: "All" },
  { value: "in-progress", label: "In Progress" },
  { value: "earned", label: "Earned" },
  { value: "recently-ended", label: "Recently Ended" },
];

const DEFAULT_FILTER: FilterValue = "all";

export default function IncentivesPage() {
  const router = useRouter();

  // Filter state — `applied` drives the rendered sections; `draft` is the
  // in-sheet edit buffer. Apply commits, Reset wipes draft to default.
  // Two-buffer pattern future-proofs the sheet for multiple filter sections.
  const [appliedFilter, setAppliedFilter] = React.useState<FilterValue>(DEFAULT_FILTER);
  const [draftFilter, setDraftFilter] = React.useState<FilterValue>(DEFAULT_FILTER);
  const [sheetOpen, setSheetOpen] = React.useState(false);

  const openFilters = () => {
    setDraftFilter(appliedFilter);
    setSheetOpen(true);
  };

  const applyFilters = () => {
    setAppliedFilter(draftFilter);
    setSheetOpen(false);
  };

  const resetFilters = () => {
    setDraftFilter(DEFAULT_FILTER);
  };

  const handleCardTap = (type: IncentiveType) => {
    router.push(`/requests?incentive=${type}`);
  };

  // -- Build the three lists ------------------------------------------------

  const allActiveProgress = React.useMemo(() => getAllIncentiveProgress(), []);

  // App-MVP-2 (2026-05-14): per-criterion eligibility stripped — status
  // collapses to a binary `earned` (goal complete) vs `in-progress` axis.
  const allActiveWithStatus = React.useMemo(
    () =>
      allActiveProgress.map((p) => ({
        progress: p,
        status: p.isComplete ? ("earned" as const) : ("in-progress" as const),
      })),
    [allActiveProgress],
  );

  const inProgressItems = React.useMemo(
    () =>
      allActiveWithStatus
        .filter((x) => x.status !== "earned")
        .map((x) => x.progress),
    [allActiveWithStatus],
  );

  const earnedActiveItems = React.useMemo(
    () =>
      allActiveWithStatus
        .filter((x) => x.status === "earned")
        .map((x) => x.progress),
    [allActiveWithStatus],
  );

  const pastEarnedRows = React.useMemo(
    () => getPastEarnedFor(currentDriver.id),
    [],
  );

  const recentlyEndedRows = React.useMemo(
    () => getRecentlyEndedFor(currentDriver.id),
    [],
  );

  const earnedItems: EarnedRow[] = React.useMemo(() => {
    const fromActive: EarnedRow[] = earnedActiveItems.map((p) => ({
      kind: "active",
      progress: p,
    }));
    const fromPast: EarnedRow[] = pastEarnedRows.map((row) => ({
      kind: "past",
      row,
      progress: getPastIncentiveProgressInfo(row),
    }));
    return [...fromActive, ...fromPast];
  }, [earnedActiveItems, pastEarnedRows]);

  const showInProgress = appliedFilter === "all" || appliedFilter === "in-progress";
  const showEarned = appliedFilter === "all" || appliedFilter === "earned";
  const showRecentlyEnded =
    appliedFilter === "all" || appliedFilter === "recently-ended";

  const filterIsActive = appliedFilter !== DEFAULT_FILTER;

  return (
    <div className="flex h-[100dvh] flex-col bg-[#F9FAFB]">
      {/* Header */}
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
        <button
          onClick={openFilters}
          aria-label="Open filters"
          className="relative flex h-10 w-10 items-center justify-center text-gray-700"
        >
          <SlidersHorizontal className="h-5 w-5" />
          {filterIsActive ? (
            <span
              aria-hidden="true"
              className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#10B981]"
            />
          ) : null}
        </button>
      </header>

      {/* Scrollable sections */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {showInProgress ? (
          <Section
            title="In Progress"
            count={inProgressItems.length}
            renderEmpty={appliedFilter === "in-progress"}
            emptyCopy="No active incentives right now. New campaigns will appear here as they launch."
          >
            {inProgressItems.map((item) => (
              <IncentiveCard
                key={item.incentiveId}
                progress={item}
                onTap={handleCardTap}
                variant="full"
              />
            ))}
          </Section>
        ) : null}

        {showEarned ? (
          <Section
            title="Earned"
            count={earnedItems.length}
            renderEmpty={appliedFilter === "earned"}
            emptyCopy="No earned incentives yet. Completed campaigns will appear here."
          >
            {earnedItems.map((row) => (
              <IncentiveCard
                key={row.progress.incentiveId}
                progress={row.progress}
                onTap={handleCardTap}
                variant="full"
                isEnded={row.kind === "past"}
                endedOutcome={row.kind === "past" ? "earned" : undefined}
              />
            ))}
          </Section>
        ) : null}

        {showRecentlyEnded ? (
          <Section
            title="Recently Ended"
            subtitle={`Campaigns that ended in the last ${RECENTLY_ENDED_DAYS} days`}
            count={recentlyEndedRows.length}
            renderEmpty={appliedFilter === "recently-ended"}
            emptyCopy={`Nothing in the last ${RECENTLY_ENDED_DAYS} days. Missed campaigns that ended recently will appear here.`}
          >
            {recentlyEndedRows.map((row) => (
              <IncentiveCard
                key={row.definition.id}
                progress={getPastIncentiveProgressInfo(row)}
                onTap={handleCardTap}
                variant="full"
                isEnded
                endedOutcome="missed-goal"
              />
            ))}
          </Section>
        ) : null}
      </div>

      {/* Filter sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-xl">
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>

          <div className="space-y-4 py-4">
            <FilterSection title="Status">
              <RadioGroup
                value={draftFilter}
                onValueChange={(v) => setDraftFilter(v as FilterValue)}
                className="gap-1"
              >
                {FILTER_OPTIONS.map((opt) => (
                  <Label
                    key={opt.value}
                    htmlFor={`filter-status-${opt.value}`}
                    className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
                  >
                    <RadioGroupItem
                      value={opt.value}
                      id={`filter-status-${opt.value}`}
                    />
                    <span>{opt.label}</span>
                  </Label>
                ))}
              </RadioGroup>
            </FilterSection>
          </div>

          <SheetFooter className="flex-row gap-2 sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={resetFilters}
              disabled={draftFilter === DEFAULT_FILTER}
              className="text-gray-600"
            >
              Reset
            </Button>
            <Button
              type="button"
              onClick={applyFilters}
              className="bg-[#10B981] text-white hover:bg-[#0F9F76]"
            >
              Apply
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Internals
// -----------------------------------------------------------------------------

type EarnedRow =
  | { kind: "active"; progress: IncentiveProgressInfo }
  | { kind: "past"; row: PastIncentiveRow; progress: IncentiveProgressInfo };

function FilterSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
        {title}
      </h3>
      {children}
    </div>
  );
}

interface SectionProps {
  title: string;
  subtitle?: string;
  count: number;
  /** When true, render the empty-state card if `count === 0`. When false,
   *  collapse the section entirely (used for the 'all' filter). */
  renderEmpty: boolean;
  emptyCopy: string;
  children: React.ReactNode;
}

function Section({
  title,
  subtitle,
  count,
  renderEmpty,
  emptyCopy,
  children,
}: SectionProps) {
  if (count === 0 && !renderEmpty) return null;
  return (
    <section className="mb-6">
      <header className="mb-2">
        <div className="flex items-baseline gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-600">
            {title}
          </h2>
          <span className="text-xs font-medium text-gray-400">{count}</span>
        </div>
        {subtitle ? (
          <p className={cn("text-xs text-gray-500")}>{subtitle}</p>
        ) : null}
      </header>
      {count === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
          {emptyCopy}
        </div>
      ) : (
        <div className="space-y-3">{children}</div>
      )}
    </section>
  );
}
