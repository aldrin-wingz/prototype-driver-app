/**
 * Seeded conversations for the In-App Chat placement study.
 *
 * ⚠️ Shapes match the PRODUCTION onboarding chat, captured in
 * `references/screenshots/canonical/c-03a` (inbox) and `c-04a` (thread) — not
 * invented. What those two screenshots pin down:
 *
 *   - the inbox row is a circular Wingz-logo avatar + a bold name + one preview
 *     line, with a green `Draft:` prefix when the driver has typed and not sent.
 *     No timestamp and no unread badge on the row itself.
 *   - a thread is bottom-anchored, opens with a grey `Today` date pill, and puts
 *     the tick and the time OUTSIDE the bubble, right-aligned beneath it.
 *
 * `Onboarding Support` is the one that exists today; the other three are the
 * non-support cases this study is proposing.
 *
 * ⚠️ Seeded, never computed — timestamps are fixed strings so a screenshot taken
 * next month matches one taken today.
 */

export type ChatChannel = "in-app" | "support";

/**
 * ⚠️ `same-day-offers` is the user's wording. The vault project is
 * **Special Offers (a.k.a. Ride Offers)** — no "Same-Day Offers" term exists
 * there. Flagged rather than silently renamed; it is one string to change.
 */
export type ChatTopic =
  | "onboarding"
  | "compliance"
  | "same-day-offers"
  | "standing-orders"
  | "support";

export interface ChatMessage {
  id: string;
  /** `them` = Wingz staff, `me` = the driver. */
  from: "them" | "me";
  body: string;
  /** Fixed label rather than a real clock, so screenshots stay stable. */
  timestamp: string;
  /** The ✓ production draws under an outbound bubble. `me` messages only. */
  delivered?: boolean;
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
  /** The row's second line. Ignored when `draft` is set. */
  preview: string;
  /** Unsent text. Production renders a green `Draft:` prefix and shows this. */
  draft?: string;
  /** The grey date pill above the first message of the day. */
  dateLabel: string;
  unread: number;
  messages: ChatMessage[];
  /** `support` threads only — they carry a ticket instead of a transcript. */
  ticket?: SupportTicketSummary;
}

export const MOCK_THREADS: ChatThread[] = [
  {
    id: "onboarding",
    channel: "in-app",
    topic: "onboarding",
    title: "Onboarding Support",
    preview: "You're all set — background check cleared.",
    // Reproduces c-03a/c-04a exactly: an unsent draft, and one outbound message.
    draft: "Luis Test",
    dateLabel: "Today",
    unread: 0,
    messages: [
      { id: "onboarding-1", from: "me", body: "Luis Test", timestamp: "12:20 AM", delivered: true },
    ],
  },
  {
    id: "compliance",
    channel: "in-app",
    topic: "compliance",
    title: "Compliance",
    preview: "Your auto insurance on file expires Sep 24.",
    dateLabel: "Today",
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
    title: "Same-Day Offers",
    preview: "Still yours if you want it — otherwise it goes back at 12.",
    dateLabel: "Today",
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
        delivered: true,
      },
      { id: "offers-3", from: "them", body: "Yes — I'll hold it until noon.", timestamp: "11:48 AM" },
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
    title: "Standing Orders",
    preview: "Tuesday moves to 6:45 AM starting Sep 22.",
    dateLabel: "Yesterday",
    unread: 1,
    messages: [
      {
        id: "so-1",
        from: "them",
        body: "The client changed the Tuesday pickup on your Riverside Dialysis standing order. Starting Sep 22 it moves from 6:15 AM to 6:45 AM.",
        timestamp: "4:02 PM",
      },
      {
        id: "so-2",
        from: "me",
        body: "Does that shift the whole block or just Tuesday?",
        timestamp: "4:15 PM",
        delivered: true,
      },
      {
        id: "so-3",
        from: "them",
        body: "Just Tuesday. Wednesday and Friday stay at 6:15 AM. Nothing for you to do — I've already updated it on our side.",
        timestamp: "4:18 PM",
      },
    ],
  },
  {
    id: "support-370291",
    channel: "support",
    topic: "support",
    title: "Wingz Support",
    preview: "Payment missing for trip #370291",
    dateLabel: "Sep 8",
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
 * ⚠️ Seeded, not `MOCK_THREADS.reduce(...)`. Held at 6 because that is the
 * `messageCount` default the production-replicated header already ships with,
 * and the badge must stay constant across every placement — position is the only
 * variable under test.
 */
export const MOCK_UNREAD_TOTAL = 6;

export function getThread(id: string): ChatThread | undefined {
  return MOCK_THREADS.find((thread) => thread.id === id);
}

/**
 * The threads an inbox shows under a given coexistence model.
 *
 * `unified` = one inbox holding both channels. `separate` = in-app only, because
 * Support Chat has its own entry point.
 */
export function getVisibleThreads(coexistence: "unified" | "separate"): ChatThread[] {
  if (coexistence === "separate") {
    return MOCK_THREADS.filter((thread) => thread.channel === "in-app");
  }
  return MOCK_THREADS;
}
