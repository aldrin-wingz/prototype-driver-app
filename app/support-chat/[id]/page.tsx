"use client";

import { use } from "react";
import { notFound } from "next/navigation";

import { ZendeskChatScreen } from "@/components/driver/zendesk-chat-screen";
import {
  SUPPORT_CHAT_TOPIC_PARAM,
  supportChatTopicFrom,
} from "@/lib/driver-data/support-chat";
import {
  mockCompletedTrips,
  mockInProgressTrips,
  mockNeedsActionTrips,
  mockRequestTrips,
  mockUpcomingTrips,
} from "@/lib/driver-data/mock-trips";

/**
 * ⭐ Production's Zendesk chat, as its own route — catalogue row 17's Now side.
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
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = use(params);
  /**
   * ⛔ Which conversation to open with. `supportChatTopicFrom` STRIPS an
   * unknown value rather than refusing it, so a stale or hand-typed link still
   * opens the driver's chat instead of 404ing — and row 17's parameterless URL
   * resolves to its own topic, unchanged.
   */
  const topic = supportChatTopicFrom(use(searchParams)[SUPPORT_CHAT_TOPIC_PARAM]);
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
  return <ZendeskChatScreen trip={trip} topic={topic} />;
}
