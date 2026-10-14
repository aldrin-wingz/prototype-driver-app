"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/driver/header";
import { BottomNav } from "@/components/driver/bottom-nav";
import { RideCard } from "@/components/driver/ride-card";
import { cn } from "@/lib/utils";
import { 
  mockInProgressTrips, 
  mockNeedsActionTrips, 
  mockUpcomingTrips 
} from "@/lib/driver-data/mock-trips";
import type { Trip } from "@/lib/driver-data/mock-trips";
import { ClientCancellationAlert } from "@/components/driver/client-cancellation-alert";
import {
  isClientCancelled,
  listableRides,
} from "@/lib/driver-data/client-cancellation";

type TabValue = "in-progress" | "needs-action" | "upcoming";

/**
 * Whether the cancellation alert has already been raised this session.
 *
 * ⛔ Scaffolding, and the only scaffolding in this fold-in. Production raises
 * `CAP-341` from a push the moment Wingz cancels; this mirror has no push, so
 * something has to stand in for one. A module-level flag rather than state
 * because it must survive a remount, and because React's double-invoked effects
 * would otherwise raise it twice on the first render in development.
 */
let cancelAlertRaised = false;

interface TabConfig {
  value: TabValue;
  label: string;
  count: number;
}

export default function MyRidesPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabValue>("needs-action");
  
  const tabs: TabConfig[] = [
    { value: "in-progress", label: "In Progress", count: mockInProgressTrips.length },
    { value: "needs-action", label: "Needs Action", count: mockNeedsActionTrips.length },
    // ⛔⛔ `listableRides`, not the raw array. A ride Wingz cancelled appears in
    // NO tab — not here, not anywhere — and the count has to agree with the
    // list or the badge claims a ride the driver cannot find.
    { value: "upcoming", label: "Upcoming", count: listableRides(mockUpcomingTrips).length },
  ];
  
  const getTripsForTab = (tab: TabValue) => {
    switch (tab) {
      case "in-progress":
        return mockInProgressTrips;
      case "needs-action":
        return mockNeedsActionTrips;
      case "upcoming":
        return listableRides(mockUpcomingTrips);
      default:
        return [];
    }
  };
  
  const currentTrips = getTripsForTab(activeTab);

  /**
   * ⭐⭐ `CAP-341` — the alert, and the only route to the ride behind it.
   *
   * ⛔ Raised once per session on first entry, because the trigger is the one
   * thing this mirror cannot replicate: production gets a push. Everything the
   * alert SAYS and DOES is the capture's.
   */
  const [cancelAlertTrip, setCancelAlertTrip] = useState<Trip | null>(null);
  useEffect(() => {
    if (cancelAlertRaised) return;
    const first = mockUpcomingTrips.find(isClientCancelled);
    if (!first) return;
    cancelAlertRaised = true;
    setCancelAlertTrip(first);
  }, []);
  
  return (
    <div className="flex min-h-screen flex-col pb-20">
      <Header title="My Rides" showFilter={false} />
      
      {/* Tab row */}
      <div className="flex border-b border-gray-200 bg-white">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={cn(
              "relative flex-1 px-4 py-3 text-sm font-medium transition-colors",
              activeTab === tab.value
                ? "text-gray-900"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            <span className="flex items-center justify-center gap-1">
              {tab.label}
              <sup className={cn(
                "text-[10px]",
                activeTab === tab.value ? "text-red-500" : "text-gray-400"
              )}>
                {tab.count}
              </sup>
            </span>
            {activeTab === tab.value && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#10B981]" />
            )}
          </button>
        ))}
      </div>
      
      <main className="flex-1 space-y-4 p-4">
        {currentTrips.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-gray-500">No rides in this category</p>
          </div>
        ) : (
          currentTrips.map((trip) => (
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
      
      <BottomNav />

      {/* ⛔ At the page root — production raises it over whatever the driver is
          looking at, and `Go to ride` navigates away from here entirely. */}
      <ClientCancellationAlert
        trip={cancelAlertTrip}
        onOpenChange={(open) => {
          if (!open) setCancelAlertTrip(null);
        }}
      />
    </div>
  );
}
