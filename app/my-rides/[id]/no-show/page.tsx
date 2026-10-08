"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import { MemberNoShowScreen } from "@/components/driver/member-no-show-screen";
import {
  mockNeedsActionTrips,
  mockUpcomingTrips,
  mockInProgressTrips,
} from "@/lib/driver-data/mock-trips";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function MemberNoShowPage({ params }: PageProps) {
  const { id } = use(params);

  const allMyRides = [
    ...mockNeedsActionTrips,
    ...mockUpcomingTrips,
    ...mockInProgressTrips,
  ];
  const trip = allMyRides.find((candidate) => candidate.id === id);

  if (!trip) {
    notFound();
  }

  // Deliberately NOT gated here. Guardrail 1 hides the tile that reaches this
  // route, and a driver who types the URL should see the screen rather than a
  // 404 — the refusal they get on Submit is the honest answer either way.
  return (
    <MemberNoShowScreen trip={trip} backHref={`/my-rides/${id}/more`} />
  );
}
