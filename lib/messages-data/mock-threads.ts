/**
 * Seeded conversations for the In-App Chat placement study.
 *
 * Two channels live side by side here on purpose. `in-app` is the GetStream chat
 * that already ships (driver <-> Wingz staff, scoped to Onboarding today);
 * `support` is Zendesk, which stays as "Support Chat" and is a different
 * application entirely — see `SUPPORT_HANDOFF_NOTE` below for why its thread
 * renders as a handoff rather than as bubbles.
 *
 * ⚠️ Seeded, never computed — the repo convention. Timestamps are fixed strings
 * and unread counts are literals, so a screenshot taken next month matches one
 * taken today.
 */

export type ChatChannel = "in-app" | "support";

/**
 * The non-support topics the study is testing chat against.
 *
 * ⚠️ `same-day-offers` is the user's wording. The vault project is
 * **Special Offers (a.k.a. Ride Offers)** — no "Same-Day Offers" term exists
 * there. Flagged rather than silently renamed; it is one string to change.
 */
export type ChatTopic =
  | "compliance"
  | "same-day-offers"
  | "standing-orders"
  | "onboarding"
  | "support";

export interface ChatMessage {
  id: string;
  /** `them` = Wingz staff, `me` = the driver. */
  from: "them" | "me";
  body: string;
  /** Fixed label rather than a real clock, so screenshots stay stable. */
  timestamp: string;
}

/** What the handoff panel shows for a Zendesk thread. No message bodies. */
export interface SupportTicketSummary {
  subject: string;
  status: string;
  updatedAt: string;
}

export interface ChatThread {
  id: string;
  channel: ChatChannel;
  topic: ChatTopic;
  /** Who the driver sees they are talking to. */
  title: string;
  /** One-line row preview in the inbox. */
  preview: string;
  timestamp: string;
  unread: number;
  messages: ChatMessage[];
  /** `support` threads only — they carry a ticket instead of a transcript. */
  ticket?: SupportTicketSummary;
}

export const MOCK_THREADS: ChatThread[] = [
  {
    id: "compliance",
    channel: "in-app",
    topic: "compliance",
    title: "Wingz Compliance",
    preview: "Your auto insurance on file expires Sep 24 — send the new declaration page when you have it.",
    timestamp: "2:14 PM",
    unread: 2,
    messages: [
      {
        id: "compliance-1",
        from: "them",
        body: "Heads up — the auto insurance we have on file expires Sep 24. Send over the new declaration page whenever the carrier issues it and we'll get it on your record.",
        timestamp: "2:11 PM",
      },
      {
        id: "compliance-2",
        from: "them",
        body: "No rush today, just don't want it to lapse. You can attach a photo here.",
        timestamp: "2:14 PM",
      },
    ],
  },
  {
    id: "same-day-offers",
    channel: "in-app",
    topic: "same-day-offers",
    title: "Wingz Dispatch",
    preview: "Two legs opened up for this afternoon — Nashville to Murfreesboro, 3:40 PM pickup.",
    timestamp: "11:52 AM",
    unread: 3,
    messages: [
      {
        id: "offers-1",
        from: "them",
        body: "Two legs just opened for this afternoon: Nashville to Murfreesboro, 3:40 PM pickup, $68.50 total. You're the closest driver still open.",
        timestamp: "11:44 AM",
      },
      {
        id: "offers-2",
        from: "me",
        body: "Can I get back to you in ten? Finishing a drop-off.",
        timestamp: "11:47 AM",
      },
      {
        id: "offers-3",
        from: "them",
        body: "Yes — I'll hold it until noon.",
        timestamp: "11:48 AM",
      },
      {
        id: "offers-4",
        from: "them",
        body: "Still yours if you want it. Otherwise it goes back to the feed at 12.",
        timestamp: "11:52 AM",
      },
    ],
  },
  {
    id: "standing-orders",
    channel: "in-app",
    topic: "standing-orders",
    title: "Wingz Ops",
    preview: "Tuesday standing order moves to 6:45 AM starting Sep 22. Wednesday and Friday are unchanged.",
    timestamp: "Yesterday",
    unread: 1,
    messages: [
      {
        id: "so-1",
        from: "them",
        body: "The client changed the Tuesday pickup on your Riverside Dialysis standing order. Starting Sep 22 it moves from 6:15 AM to 6:45 AM.",
        timestamp: "Yesterday",
      },
      {
        id: "so-2",
        from: "me",
        body: "Does that shift the whole block or just Tuesday?",
        timestamp: "Yesterday",
      },
      {
        id: "so-3",
        from: "them",
        body: "Just Tuesday. Wednesday and Friday stay at 6:15 AM. Nothing for you to do — I've already updated it on our side.",
        timestamp: "Yesterday",
      },
    ],
  },
  {
    id: "onboarding",
    channel: "in-app",
    topic: "onboarding",
    title: "Wingz Onboarding",
    preview: "You're all set — background check cleared and your first trips are unlocked.",
    timestamp: "Jul 28",
    unread: 0,
    messages: [
      {
        id: "onboarding-1",
        from: "them",
        body: "Background check came back clear. You're activated — trips will start showing in your Requests feed today.",
        timestamp: "Jul 28",
      },
      {
        id: "onboarding-2",
        from: "me",
        body: "Great, thanks for the help getting through it.",
        timestamp: "Jul 28",
      },
    ],
  },
  {
    id: "support-370291",
    channel: "support",
    topic: "support",
    title: "Wingz Support",
    preview: "Payment missing for trip #370291",
    timestamp: "Sep 8",
    unread: 0,
    messages: [],
    ticket: {
      subject: "Payment missing for trip #370291",
      status: "Open — waiting on Support",
      updatedAt: "Sep 8",
    },
  },
];

/**
 * The unread count the header badge shows.
 *
 * ⚠️ Seeded, not `MOCK_THREADS.reduce(...)`. It is held at 6 because that is the
 * `messageCount` default the production-replicated header already ships with
 * (`components/driver/header.tsx`), and the badge must stay constant across every
 * placement and coexistence value — position is the only variable under test.
 */
export const MOCK_UNREAD_TOTAL = 6;

/** Why a Zendesk thread shows a handoff panel instead of a transcript. */
export const SUPPORT_HANDOFF_NOTE =
  "Support Chat runs in Zendesk, a separate app. The prototype shows the handoff rather than fake bubbles — rendering it identically to in-app chat would answer the study's own question.";

export function getThread(id: string): ChatThread | undefined {
  return MOCK_THREADS.find((thread) => thread.id === id);
}

/**
 * The threads an inbox shows under a given coexistence model.
 *
 * `unified` = one inbox holding both channels. `separate` = in-app only, because
 * Support has its own entry point in the chrome.
 */
export function getVisibleThreads(coexistence: "unified" | "separate"): ChatThread[] {
  if (coexistence === "separate") {
    return MOCK_THREADS.filter((thread) => thread.channel === "in-app");
  }
  return MOCK_THREADS;
}
