"use client";

import React, { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, ChevronDown, Clock, SlidersHorizontal } from "lucide-react";
import { Header } from "@/components/driver/header";
import { BottomNav } from "@/components/driver/bottom-nav";
import { RequestMap } from "@/components/driver/request-map";
import { RequestListSheet } from "@/components/driver/request-list-sheet";
import { FilterRequestsModal, type RequestFilters } from "@/components/driver/filter-requests-modal";
import { mockRequestTrips } from "@/lib/driver-data/mock-trips";
import {
  applicableFilters,
  filterRequestsByMember,
  showsMemberFilter,
} from "@/lib/driver-data/member-assignment";
import { useSolution } from "@/lib/solutions/solution-context";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  DEFAULT_DETENT, defaultDayKey, groupByPickupDay, visibleTrips,
  type RequestTab, type SheetDetent,
} from "@/lib/driver-data/map-view";
import type { IncentiveType } from "@/lib/data/incentives";

/**
 * Requests — the map view.
 *
 * Replicated from `Project - Map Request View/Help Articles/The Requests Map.md`
 * and the B2 captures. The rules it obeys live in `lib/driver-data/map-view.ts`.
 *
 * ⚠️ Special Offers run in selected states only. Where they do not run there is
 * NO TAB ROW AT ALL — not a disabled tab (capture `10-01`). `SPECIAL_OFFERS_ON`
 * is the switch; flip it to see the other shape.
 */
const SPECIAL_OFFERS_ON = true;

function DayChip({ label, count, onClick }: { label: string; count: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 rounded-full bg-[#111827] px-4 py-2.5 text-white"
    >
      <CalendarDays className="h-4 w-4 text-[#34D399]" />
      <span className="font-semibold">{label}</span>
      <span className="text-gray-300">· {count} trips</span>
      <ChevronDown className="h-4 w-4" />
    </button>
  );
}

function RequestsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  /**
   * ⛔ Catalogue row 10's gate, read HERE and passed down. The filter sheet is
   * production's own screen and is told whether to offer the Member row; it
   * does not ask. See `showsMemberFilter`.
   */
  const { demo } = useSolution();

  const incentiveParam = searchParams.get("incentive") as IncentiveType | null;
  /**
   * Catalogue row 10's deep link — `/requests?member=AMARA%20OKONKWO`.
   *
   * ⚠️ Deep-linked for the same reason `incentive` is: the selector has to be
   * able to land a reviewer IN the demonstrated state. A catalogue entry that
   * just said "open the filter sheet and pick her" would be an instruction, not
   * a demo, and the alternate branch — a member with nothing posted — would be
   * indistinguishable from the primary one by route.
   */
  const memberParam = searchParams.get("member");

  const [tab, setTab] = useState<RequestTab>("standard");
  const [detent, setDetent] = useState<SheetDetent>(DEFAULT_DETENT);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<RequestFilters>(() => ({
    incentiveType: incentiveParam ?? undefined,
    member: memberParam ?? undefined,
  }));

  /**
   * ⛔⛔ **Only two of the sheet's six filters are applied here**, and that is
   * inherited, not an oversight of this slice. `pickupLocation`, `day`,
   * `client`, `sortBy` and `mode` are rendered by `FilterRequestsModal` and
   * read by nothing — the base replicated the captured production sheet
   * faithfully, controls and all. Wiring them is a change to base behaviour and
   * belongs in its own decision, not smuggled in beside a feature.
   *
   * `member` is catalogue row 10 and does filter. `incentiveType` predates it.
   */
  /**
   * ⛔⛔ **The filters as they actually apply**, which is not the same object
   * as the ones the driver has set. In `"now"` the member filter does not
   * exist, so a deep link carrying one lands on the UNFILTERED feed — twenty
   * trips and a name to hunt for, which is row 10's dead end.
   *
   * ⚠️ Everything downstream reads THIS and never `appliedFilters`: the feed,
   * the badge on the filter icon, the sheet's initial values and the empty
   * state. Three of those reading the raw object would each show a filter the
   * driver has no control for.
   */
  const applied = useMemo(
    () => applicableFilters(appliedFilters, demo),
    [appliedFilters, demo],
  );

  const filtered = useMemo(() => {
    let result = mockRequestTrips;
    if (applied.incentiveType) {
      result = result.filter((t) => t.incentiveTypes.includes(applied.incentiveType as IncentiveType));
    }
    if (applied.member) {
      result = filterRequestsByMember(result, applied.member);
    }
    return result;
  }, [applied]);

  // Grouped by pickup day — a day with no trips is ABSENT, not greyed out.
  const groups = useMemo(() => groupByPickupDay(filtered), [filtered]);
  const [dayKey, setDayKey] = useState<string | null>(null);
  const activeKey = dayKey ?? defaultDayKey(groups);
  const active = groups.find((g) => g.key === activeKey) ?? groups[0];
  const dayTrips = active?.trips ?? [];

  // ⚠️ Both params in ONE effect, setting the whole filter object. Two effects
  // each calling `setAppliedFilters` with their own key would race, and the
  // second to run would erase the first's filter — which reads on screen as a
  // deep link that silently ignored half of itself.
  React.useEffect(() => {
    if (incentiveParam || memberParam) {
      setAppliedFilters({
        incentiveType: incentiveParam ?? undefined,
        member: memberParam ?? undefined,
      });
    }
  }, [incentiveParam, memberParam]);

  /**
   * The first count is trips ON SCREEN; the second is the total for the day
   * under the filters, which moves only when a filter changes. They are
   * measured from different things on purpose — that is the distinction the
   * contract spells out, because drivers misread it.
   */
  const visibleCount = useMemo(
    () => visibleTrips(dayTrips, detent, zoom).length,
    [dayTrips, detent, zoom],
  );

  /**
   * Count of filters BEYOND day and time — that is what the badge counts.
   *
   * ⛔ From `applied`, not `appliedFilters`. In `"now"` a member deep link
   * would otherwise put a `1` on the filter icon for a filter that is not
   * narrowing the feed and has no control in the sheet — a badge the driver
   * can see, cannot explain and cannot clear.
   */
  const extraFilterCount = Object.values(applied).filter(Boolean).length;

  function clearFilters() {
    setAppliedFilters({});
    setDayKey(null);
    router.replace("/requests", { scroll: false });
  }

  return (
    /*
      ⛔⛔ `relative` is load-bearing. The filter button below is positioned
      `absolute right-14 top-2`, and with no positioned ancestor it resolved
      against the VIEWPORT — so it floated up out of the page and landed inside
      the solutions strip's header row, overlapping the strip's own controls and
      stealing the tap that opens the solution picker. Invisible until row 10
      made `/requests` an entry route and someone actually tried to switch
      solutions from it.
    */
    <div className="relative flex h-screen flex-col overflow-hidden">
      <Header
        title="Requests"
        showFilter={false}
        showRefresh={true}
        onRefreshClick={() => toast({ title: "Refreshing...", description: "Request list refreshed." })}
      />

      {/* Filter icon carries a badge counting filters beyond day and time */}
      <button
        type="button"
        onClick={() => setIsFilterOpen(true)}
        aria-label="Filter Requests"
        className="absolute right-14 top-2 z-[60] flex h-10 w-10 items-center justify-center text-gray-700"
      >
        <SlidersHorizontal className="h-5 w-5" />
        {extraFilterCount > 0 && (
          <span className="absolute -right-0.5 top-0 flex h-4 w-4 items-center justify-center rounded-full bg-[#10B981] text-[10px] font-bold text-white">
            {extraFilterCount}
          </span>
        )}
      </button>

      {/* ⛔ No tab row at all where Special Offers do not run */}
      {SPECIAL_OFFERS_ON && (
        <div data-request-tabs className="flex shrink-0 gap-6 border-b border-gray-200 bg-white px-4">
          {([["standard", "Standard"], ["special-offers", "Special Offers"]] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => { setTab(key); setSelectedId(null); }}
              className={cn(
                "-mb-px border-b-[3px] pb-2 pt-3 text-lg",
                tab === key
                  ? "border-[#10B981] font-bold text-gray-900"
                  : "border-transparent text-gray-500",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Chips. Pickup Time is always shown, even when empty, so it can be
          tapped without hunting for it. They wrap when the day chip is wide. */}
      <div className="flex shrink-0 flex-wrap gap-2 bg-white px-4 py-3">
        {active && (
          <DayChip
            label={active.short}
            count={active.trips.length}
            onClick={() => {
              const i = groups.findIndex((g) => g.key === active.key);
              setDayKey(groups[(i + 1) % groups.length].key);
              setSelectedId(null);
            }}
          />
        )}
        <button
          type="button"
          onClick={() => setIsFilterOpen(true)}
          className="flex items-center gap-2 rounded-full border border-[#10B981] bg-[#ECFDF5] px-4 py-2.5 text-gray-900"
        >
          <Clock className="h-4 w-4" />
          <span className="font-semibold">Pickup Time</span>
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>

      <FilterRequestsModal
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        onUpdate={(f) => { setAppliedFilters(f); router.replace("/requests", { scroll: false }); }}
        initialFilters={applied}
        showMemberFilter={showsMemberFilter(demo)}
      />

      {/* Map with the sheet over it.
          pb-16 clears the FIXED bottom nav — without it the sheet runs underneath
          it and the last card is cut off. */}
      <div className="relative flex-1 overflow-hidden pb-16">
        <RequestMap
          trips={dayTrips}
          selectedId={selectedId}
          onSelect={setSelectedId}
          zoom={zoom}
          onZoom={setZoom}
        />
        <RequestListSheet
          detent={detent}
          onDetent={setDetent}
          trips={dayTrips}
          visibleCount={visibleCount}
          dayLabel={active?.short ?? ""}
          tab={tab}
          selectedId={selectedId}
          onOpenTrip={(id) => router.push(`/requests/${id}`)}
          onClearFilters={clearFilters}
          hasFilters={extraFilterCount > 0}
        />
      </div>

      <BottomNav />
    </div>
  );
}

export default function RequestsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col pb-20">
          <Header title="Requests" showRefresh={true} />
          <main className="flex flex-1 items-center justify-center p-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#10B981]" />
          </main>
          <BottomNav />
        </div>
      }
    >
      <RequestsPageContent />
    </Suspense>
  );
}
