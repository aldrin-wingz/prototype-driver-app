"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import { SupportChatScreen } from "@/components/driver/support-chat-screen";
import {
  mockNeedsActionTrips,
  mockUpcomingTrips,
  mockInProgressTrips,
} from "@/lib/driver-data/mock-trips";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function SupportChatPage({ params }: PageProps) {
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

  return <SupportChatScreen trip={trip} backHref={`/my-rides/${id}`} />;
}
