import type { Trip } from "./mock-trips";
import { zendeskDeclineMessage } from "./rider-declined";
import { zendeskStandingOrderMessage } from "./send-back-reasons";

/**
 * Which conversation the Zendesk chat opens with.
 *
 * ⛔⛔ **Added because routing a second case at that screen would have LIED.**
 * `ZendeskChatScreen` auto-sends its template the moment it opens, and until now
 * that template was hard-wired to `zendeskDeclineMessage` — row 17's. Sending a
 * standing-order driver there unchanged would have opened a chat whose first and
 * only message says *"My member no longer needs transportation"*, over a trip
 * whose member needs it fine. A false statement on screen, auto-sent, with the
 * driver's name on it.
 *
 * ⚠️ The screen itself is unchanged in every other way, and deliberately so: the
 * chat is a dead end for row 17 and a destination for row 14, but it is the same
 * surface, and two copies of it would drift.
 *
 * ⛔ Two topics is not a pattern yet. Resist adding a third until something asks
 * for one — a registry with one real user is a registry nobody maintains.
 */
export type SupportChatTopic = "rider-declined" | "standing-order-send-back";

export interface SupportChatMessage {
  intro: string;
  lines: Array<{ label: string; value: string }>;
}

/**
 * ⛔ The default is row 17's, so every URL that existed before this module is
 * byte-identical after it. `supportChatRoute` emits no parameter at all for the
 * default, and a check asserts that — a query string appearing on row 17's link
 * would be this module changing a screen it was meant to leave alone.
 */
export const DEFAULT_SUPPORT_CHAT_TOPIC: SupportChatTopic = "rider-declined";

const BUILDERS: Record<SupportChatTopic, (trip: Trip) => SupportChatMessage> = {
  "rider-declined": zendeskDeclineMessage,
  "standing-order-send-back": zendeskStandingOrderMessage,
};

/** ⚠️ Derived from the builder map, so a topic cannot exist without a message. */
export const SUPPORT_CHAT_TOPICS = Object.keys(BUILDERS) as SupportChatTopic[];

export function supportChatMessage(trip: Trip, topic: SupportChatTopic): SupportChatMessage {
  return BUILDERS[topic](trip);
}

export const SUPPORT_CHAT_TOPIC_PARAM = "topic";

/**
 * ⛔ **Strips, never refuses** — the same shape as `applicableFilters`. An
 * unknown or absent topic falls back to the default rather than 404ing, because
 * a hand-typed or stale URL should still open the driver's chat.
 */
export function supportChatTopicFrom(raw: string | string[] | undefined): SupportChatTopic {
  const one = Array.isArray(raw) ? raw[0] : raw;
  return SUPPORT_CHAT_TOPICS.includes(one as SupportChatTopic)
    ? (one as SupportChatTopic)
    : DEFAULT_SUPPORT_CHAT_TOPIC;
}

export function supportChatRoute(tripId: string, topic: SupportChatTopic): string {
  return topic === DEFAULT_SUPPORT_CHAT_TOPIC
    ? `/support-chat/${tripId}`
    : `/support-chat/${tripId}?${SUPPORT_CHAT_TOPIC_PARAM}=${topic}`;
}
