"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import { RideDetailLayout } from "@/components/driver/ride-detail-layout";
import { mockNeedsActionTrips, mockUpcomingTrips, mockInProgressTrips } from "@/lib/driver-data/mock-trips";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function MyRideDetailPage({ params }: PageProps) {
  const { id } = use(params);
  
  // Search across all my-rides categories
  const allMyRides = [...mockNeedsActionTrips, ...mockUpcomingTrips, ...mockInProgressTrips];
  const trip = allMyRides.find((t) => t.id === id);
  
  if (!trip) {
    notFound();
  }
  
  // Map trip status onto the detail state. `in-progress` used to be collapsed
  // into "needs-action"; it now has its own state so the swipe progress and the
  // support entry points can render.
  const state =
    trip.status === "upcoming"
      ? "before-taken"
      : trip.status === "in-progress"
        ? "in-progress"
        : "needs-action";

  return (
    <RideDetailLayout
      trip={trip}
      state={state}
      backHref="/my-rides"
    />
  );
}
