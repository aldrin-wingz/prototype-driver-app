"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/driver/header";
import { RideCard } from "@/components/driver/ride-card";
import { RideHistoryFilterModal } from "@/components/driver/ride-history-filter-modal";
import { mockCompletedTrips } from "@/lib/driver-data/mock-trips";
import { useToast } from "@/hooks/use-toast";
import {
  DEFAULT_RIDE_HISTORY_FILTER, applyRideHistoryFilter, filterLabel,
  type RideHistoryFilter,
} from "@/lib/driver-data/ride-history";

/**
 * Ride History — reconciled against capture `04-01` (shoot DAB-2026-10-01).
 *
 * Three things the previous version had wrong, all visible in that capture:
 *   - the filter was a "coming in I-5" toast; it is a real sheet (`04-02`/`04-03`)
 *   - fares rendered blue; the capture shows the same green as Requests
 *   - a card logged to the console; tapping one opens the completed Ride
 *     Details (`04-04`), which the base now supports
 *
 * Header is back-chevron + filter + refresh with no messages icon and no bottom
 * nav — a stack-pushed screen, exactly as captured.
 */
export default function RideHistoryPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [filter, setFilter] = useState<RideHistoryFilter>(DEFAULT_RIDE_HISTORY_FILTER);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const trips = useMemo(() => applyRideHistoryFilter(mockCompletedTrips, filter), [filter]);

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F6F8]">
      <Header
        title="Ride History"
        showBack={true}
        showMessages={false}
        showFilter={true}
        showRefresh={true}
        onFilterClick={() => setIsFilterOpen(true)}
        onRefreshClick={() => toast({ title: "Refreshing...", description: "History refreshed." })}
      />

      <main className="flex-1 space-y-4 p-4">
        {filter !== "all" && (
          <p className="text-sm text-gray-600">
            Showing <span className="font-semibold text-gray-900">{filterLabel(filter)}</span> —{" "}
            {trips.length} of {mockCompletedTrips.length} trips
          </p>
        )}

        {trips.length === 0 ? (
          <p className="py-10 text-center text-gray-600">No trips match this filter.</p>
        ) : (
          trips.map((trip) => (
            <RideCard
              key={trip.id}
              trip={trip}
              revenueColor="green"
              showDistance={false}
              onClick={() => router.push(`/my-rides/${trip.id}`)}
            />
          ))
        )}
      </main>

      <RideHistoryFilterModal
        open={isFilterOpen}
        value={filter}
        onApply={setFilter}
        onClose={() => setIsFilterOpen(false)}
      />

      {/* No BottomNav — this is a stack-pushed screen (capture `04-01`). */}
    </div>
  );
}
