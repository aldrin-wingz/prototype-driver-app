"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import { MoreOptionsScreen } from "@/components/driver/more-options-screen";
import {
  mockNeedsActionTrips,
  mockUpcomingTrips,
  mockInProgressTrips,
} from "@/lib/driver-data/mock-trips";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function MoreOptionsPage({ params }: PageProps) {
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

  return <MoreOptionsScreen trip={trip} backHref={`/my-rides/${id}`} />;
}
