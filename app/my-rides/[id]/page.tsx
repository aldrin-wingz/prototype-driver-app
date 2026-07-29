"use client";

import { use } from "react";
import { notFound, useSearchParams } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { RideDetailLayout } from "@/components/driver/ride-detail-layout";
import {
  mockNeedsActionTrips,
  mockUpcomingTrips,
  mockInProgressTrips,
  mockCompletedTrips,
  mockRequestTrips,
} from "@/lib/driver-data/mock-trips";
import { getPenaltyForTrip } from "@/lib/data/wallet";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function MyRideDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const isSentBack = searchParams.get("sentback") === "1";

  // Search across ALL trip pools — the payout portal deep-links to completed
  // trips (revenue rows) and request trips (sent-back penalty rows), not just
  // the my-rides categories.
  const allTrips = [
    ...mockNeedsActionTrips,
    ...mockUpcomingTrips,
    ...mockInProgressTrips,
    ...mockCompletedTrips,
    ...mockRequestTrips,
  ];
  const trip = allTrips.find((t) => t.id === id);

  if (!trip) {
    notFound();
  }

  const penalty = isSentBack ? getPenaltyForTrip(id) : undefined;

  // Sent-back and completed trips render read-only ("completed" state — no
  // accept/reject footer). Upcoming = before-taken; everything else needs-action.
  let state: "before-taken" | "needs-action" | "completed";
  if (isSentBack || trip.status === "completed") {
    state = "completed";
  } else if (trip.status === "upcoming") {
    state = "before-taken";
  } else {
    state = "needs-action";
  }

  const banner = isSentBack ? (
    <div className="mx-4 mt-4 rounded-lg border border-[#F87171] bg-[#FEE2E2] px-4 py-3">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#DC2626]" />
        <div>
          <p className="font-semibold text-[#991B1B]">Penalty — sent back late</p>
          <p className="text-sm text-[#991B1B]">
            You sent this ride back less than 24 hours before pickup, so you were
            penalized{penalty ? ` $${penalty.amount.toFixed(2)}` : ""}.
          </p>
        </div>
      </div>
    </div>
  ) : undefined;

  return (
    <RideDetailLayout trip={trip} state={state} backHref="/my-rides" banner={banner} />
  );
}
