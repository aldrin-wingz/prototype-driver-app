"use client";

import { use } from "react";
import { notFound } from "next/navigation";

import { ZendeskChatScreen } from "@/components/driver/zendesk-chat-screen";
import {
  mockCompletedTrips,
  mockInProgressTrips,
  mockNeedsActionTrips,
  mockRequestTrips,
  mockUpcomingTrips,
} from "@/lib/driver-data/mock-trips";

/**
 * ⭐ Production's Zendesk chat, as its own route — catalogue row 16's Now side.
 *
 * ⛔ A ROUTE rather than a sheet, because that is what production does: the
 * driver LEAVES the ride. The ride is not sitting behind this screen, and
 * getting back to it is a deliberate step. Softening that into an overlay would
 * make the dead end look like a detour.
 *
 * ⚠️ The trip id is in the path so the auto-sent template can name the real
 * trip. A chat that opened with a blank ticket would be the one part of this
 * flow Support could not act on.
 */
export default function SupportChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  // ⚠️ Every pool, matching `my-rides/[id]` — a declined ride can be in any of
  // them, and a lookup narrower than the screen it was reached from would 404
  // on a trip the driver was just looking at.
  const trip = [
    ...mockNeedsActionTrips,
    ...mockUpcomingTrips,
    ...mockInProgressTrips,
    ...mockCompletedTrips,
    ...mockRequestTrips,
  ].find((candidate) => candidate.id === id);
  if (!trip) notFound();
  return <ZendeskChatScreen trip={trip} />;
}
