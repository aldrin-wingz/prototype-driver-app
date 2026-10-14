"use client";

import { Suspense, use } from "react";
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
import { detailStateFor } from "@/lib/driver-data/ride-detail-state";

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * ⚠️ `useSearchParams` must sit inside a Suspense boundary, matching the pattern
 * `app/requests/page.tsx` already uses. Without one the route can fail at
 * `next build` while `next dev` stays green — dev never prerenders, so this is
 * only ever caught by the production build.
 */
function MyRideDetailContent({ id }: { id: string }) {
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
  const trip = allTrips.find((candidate) => candidate.id === id);

  if (!trip) {
    notFound();
  }

  const penalty = isSentBack ? getPenaltyForTrip(id) : undefined;

  // ⛔ The phase is a RULE, and it lives in `lib/` so a check can drive it over
  // every seeded ride. It used to be an if/else chain right here, which is
  // exactly the shape §28 cannot reach.
  const state = detailStateFor(trip, { isSentBack });

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

export default function MyRideDetailPage({ params }: PageProps) {
  const { id } = use(params);
  return (
    <Suspense fallback={null}>
      <MyRideDetailContent id={id} />
    </Suspense>
  );
}
