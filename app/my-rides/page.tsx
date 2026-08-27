"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/driver/header";
import { BottomNav } from "@/components/driver/bottom-nav";
import { RideCard } from "@/components/driver/ride-card";
import { cn } from "@/lib/utils";
import {
  isStale,
  mockInProgressTrips,
  mockNeedsActionTrips,
  mockUpcomingTrips,
  type Trip,
} from "@/lib/driver-data/mock-trips";
import { useRideFlow } from "@/lib/support-data/ride-flow-context";

type TabValue = "in-progress" | "needs-action" | "upcoming" | "pending";

interface TabConfig {
  value: TabValue;
  label: string;
  count: number;
}

export default function MyRidesPage() {
  const router = useRouter();
  // ⚠️ Prototype-only default. In Progress holds one ride per support-case
  // scenario, each labelled with a demo pill, so landing here makes every branch
  // reachable in one tap. The real app's default tab is a product decision nobody
  // has made — revert to "needs-action" before treating this as production.
  const [activeTab, setActiveTab] = useState<TabValue>("in-progress");
  const { pendingForms } = useRideFlow();

  // Only a form that NAMES a trip moves a ride here. A general or payment
  // question lives in the Forms menu instead — it isn't about a ride, so putting
  // one in this tab would be a lie.
  //
  // A ride waiting on Support MOVES to Pending — it does not appear in both
  // places. Otherwise the driver cannot tell which rides still need them.
  const pendingIds = new Set(
    pendingForms
      .map((record) => record.tripId)
      .filter((tripId): tripId is string => Boolean(tripId))
  );
  const withoutPending = (trips: Trip[]) =>
    trips.filter((trip) => !pendingIds.has(trip.id));

  /**
   * ⚠️ Provisional. A trip hours past its appointment needs the driver, so it
   * belongs in Needs Action — and it MOVES there rather than appearing twice, for
   * the same reason a pending ride moves to Pending: two copies and the driver
   * cannot tell what still needs them.
   *
   * Staleness is an OVERLAY, not a status. Membership of a tab is array
   * membership, but `trip.status` is what the detail screen reads, and a
   * `needs-action` status renders the orange confirmation footer instead of the
   * swipe region — which is the one thing a stale trip actually needs. So the
   * trip keeps `status: "in-progress"` and only its filing changes. (The vault's
   * own instrumentation ask makes the same call for refused swipes: do not turn
   * an exceptional state into a status.)
   */
  const staleTrips = mockInProgressTrips.filter(isStale).map((trip) => ({
    ...trip,
    pills: [
      { label: "Stale Trips", variant: "danger" as const },
      ...trip.pills,
    ],
  }));
  const staleIds = new Set(staleTrips.map((trip) => trip.id));
  const inProgressTrips = mockInProgressTrips.filter(
    (trip) => !staleIds.has(trip.id)
  );
  const needsActionTrips = [...mockNeedsActionTrips, ...staleTrips];

  const allRides = [
    ...mockInProgressTrips,
    ...mockNeedsActionTrips,
    ...mockUpcomingTrips,
  ];
  // Carry the pending status onto the card itself. Ride Details spells it out,
  // but a card in the Pending tab that looks like any other card is a miss.
  const pendingTrips = allRides
    .filter((trip) => pendingIds.has(trip.id))
    .map((trip) => ({
      ...trip,
      pills: [
        { label: "Waiting on Support", variant: "attention" as const },
        ...trip.pills,
      ],
    }));

  const tabs: TabConfig[] = [
    {
      value: "in-progress",
      label: "In Progress",
      count: withoutPending(inProgressTrips).length,
    },
    {
      value: "needs-action",
      label: "Needs Action",
      count: withoutPending(needsActionTrips).length,
    },
    {
      value: "upcoming",
      label: "Upcoming",
      count: withoutPending(mockUpcomingTrips).length,
    },
    { value: "pending", label: "Pending", count: pendingTrips.length },
  ];

  const getTripsForTab = (tab: TabValue) => {
    switch (tab) {
      case "in-progress":
        return withoutPending(inProgressTrips);
      case "needs-action":
        // Pending is applied last, so a stale ride whose form has been filed
        // moves on to Pending rather than sitting here as well.
        return withoutPending(needsActionTrips);
      case "upcoming":
        return withoutPending(mockUpcomingTrips);
      case "pending":
        return pendingTrips;
      default:
        return [];
    }
  };

  const currentTrips = getTripsForTab(activeTab);
  
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
              "relative flex-1 px-2 py-3 text-[13px] font-medium leading-tight transition-colors",
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
            <p className="text-gray-500">
              {activeTab === "pending"
                ? "No rides waiting on Support."
                : "No rides in this category"}
            </p>
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
    </div>
  );
}
