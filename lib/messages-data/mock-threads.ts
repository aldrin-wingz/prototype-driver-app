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
 * ⚠️ Seeded, never computed — timestamps are fixed strings so a screenshot taken
 * next month matches one taken today.
 */

/**
 * WHERE a conversation lives, which is not the same as what it is about.
 *
 * ⚠️ Renamed from `ChatChannel`. "Channel" now means the driver-facing grouping
 * below, so the surface needed its own word — two meanings of channel in one
 * file is how the Ops side got confusing in the first place.
 */
export type ChatSurface = "in-app" | "support";

/**
 * The four conversations a driver has, and the whole model after the CEO review.
 *
 * ⭐ THIS REPLACES AN ELEVEN-TOPIC CATALOGUE. The earlier version mirrored the
 * CS Tool's topic list one-for-one, which meant a driver opened a list of ten
 * threads to find the one that needed them. Three Ops channels plus Support is
 * the whole surface now: few enough that the chooser can open each one DIRECTLY
 * into its conversation, with no thread list in between.
 *
 * ⚠️ THE CS TOOL NO LONGER DEFINES THESE. Its topic catalogue
 * (`lib/comms-conversation-topics.ts`) was removed when the Topics prototype was
 * unwound, so this file is the source of truth until the Ops side is rebuilt
 * against the same three names. Do not restore the old "mirror the CS Tool"
 * claim — there is nothing to mirror.
 *
 * ⚠️ Where the old topics went:
 *   trip-offers-dispatch    ← on-demand-offers, single-leg-offers,
 *                             driver-trip-confirmation, routed-trips-confirmation,
 *                             driver-incentives
 *   compliance-requirements ← compliance, policy-updates
 *   safety-reliability      ← incident-escalations
 *   support                 ← urgent-app-issues, earnings-pay-disputes
 *
 * Those last two have no seeded transcript any more: they belong to Support,
 * and Support is Zendesk, which this prototype reproduces as its own generic
 * conversation list per `c-05a` rather than as Wingz-authored threads.
 */
export type ChatChannelId =
  | "trip-offers-dispatch"
  | "compliance-requirements"
  | "safety-reliability"
  | "support";

/**
 * Whether a channel expects the driver to answer.
 *
 * ⚠️ Load-bearing for the `roles` option. All three Ops channels are `two-way`
 * and several of the things inside them are time-boxed — an unanswered Routed
 * Trips Confirmation costs the driver the manifest, and a same-day offer
 * expires. Calling that surface a "notification tray" undersells what it does.
 *
 * ⚠️ Announcements (the old Driver Incentives and Policy Updates threads) now
 * sit INSIDE two-way channels rather than in broadcast-only ones. A channel the
 * driver can always reply to is the simpler promise, and it is the one the
 * merged chooser can make without a per-row exception.
 */
export type ChatKind = "two-way" | "broadcast";

export interface ChatMessage {
  id: string;
  /** `them` = Wingz staff, `me` = the driver. */
  from: "them" | "me";
  body: string;
  /** Fixed label rather than a real clock, so screenshots stay stable. */
  timestamp: string;
  /**
   * The day this message was sent, when it differs from the one before it.
   *
   * ⚠️ Needed once channels merged several conversations into one transcript:
   * a single `dateLabel` on the thread would have stamped one day over messages
   * spanning three. Omit it and the message inherits the day above it.
   */
  day?: string;
  /** The ✓ production draws under an outbound bubble. `me` messages only. */
  delivered?: boolean;
}

export interface ChatThread {
  id: string;
  surface: ChatSurface;
  channel: ChatChannelId;
  /** Who the driver sees they are talking to. */
  title: string;
  /** The row's second line. Ignored when `draft` is set. */
  preview: string;
  /** Unsent text. Production renders a green `Draft:` prefix and shows this. */
  draft?: string;
  /** The date pill above the first message, unless that message names its own. */
  dateLabel: string;
  unread: number;
  messages: ChatMessage[];
  /** Does Market Ops need an answer here? */
  kind: ChatKind;
  /** What happens if the driver does not reply. Empty when nothing does. */
  consequence?: string;
}

export const MOCK_THREADS: ChatThread[] = [
  {
    id: "trip-offers-dispatch",
    surface: "in-app",
    channel: "trip-offers-dispatch",
    kind: "two-way",
    title: "Trip Offers and Dispatch",
    preview: "Need an answer in the next 20 minutes or it goes to the next driver.",
    consequence:
      "Offers and routed trips run on a clock — unanswered, they go to another driver.",
    dateLabel: "Today",
    unread: 2,
    messages: [
      {
        id: "tod-1",
        from: "them",
        day: "Sep 9",
        body: "Weekend bonus for Dayton: complete 12 trips between Friday and Sunday and you'll earn an extra $60. Nothing to sign up for — it's counted automatically.",
        timestamp: "8:00 AM",
      },
      {
        id: "tod-2",
        from: "them",
        day: "Yesterday",
        body: "We've routed 4 trips to your Thursday manifest — 7:00 AM through 1:30 PM, all Franklin County. Reply to accept and we'll keep them on you.",
        timestamp: "3:40 PM",
      },
      {
        id: "tod-3",
        from: "them",
        body: "No reply by 6 PM tonight and these come off your manifest.",
        timestamp: "4:18 PM",
      },
      {
        id: "tod-4",
        from: "them",
        day: "Today",
        body: "Confirming tomorrow — you have 3 legs starting 6:15 AM out of Riverside Dialysis. Are you still good for all of them?",
        timestamp: "8:55 AM",
      },
      { id: "tod-5", from: "me", body: "Yes, all three.", timestamp: "9:01 AM", delivered: true },
      {
        id: "tod-6",
        from: "them",
        body: "You're confirmed. If anything changes tonight, message here — we'd rather line up a recovery driver early than take the reliability hit with the client.",
        timestamp: "9:04 AM",
      },
      {
        id: "tod-7",
        from: "them",
        body: "One-off leg on Thursday the 14th — 9:40 AM pickup in Dayton, drop in Kettering, ambulatory. You're on the short list for these, so it's yours if you want it.",
        timestamp: "11:02 AM",
      },
      {
        id: "tod-8",
        from: "them",
        body: "PAR has a same-day pickup that still needs a driver — 2:40 PM, Grandview Heights to OSU East, 1 leg, $42.15. Can you take it?",
        timestamp: "11:44 AM",
      },
      {
        id: "tod-9",
        from: "them",
        body: "Need an answer in the next 20 minutes or it goes to the next driver.",
        timestamp: "11:52 AM",
      },
    ],
  },
  {
    id: "compliance-requirements",
    surface: "in-app",
    channel: "compliance-requirements",
    kind: "two-way",
    title: "Compliance Requirements",
    preview: "Send the new declaration page here when the carrier issues it.",
    consequence: "An expired requirement makes you ineligible for trips until it is renewed.",
    dateLabel: "Yesterday",
    unread: 1,
    messages: [
      {
        id: "cmp-1",
        from: "them",
        day: "Sep 8",
        body: "From Oct 1, the wait at pickup before you can file a Member No-Show goes from 10 minutes to 15. Same rule in every Ohio market. Nothing for you to do — the app will hold you to the new time on its own.",
        timestamp: "10:00 AM",
      },
      {
        id: "cmp-2",
        from: "them",
        day: "Yesterday",
        body: "The auto insurance we have on file expires Sep 24. Send the new declaration page here when the carrier issues it and we'll get it on your record.",
        timestamp: "2:11 PM",
      },
      {
        id: "cmp-3",
        from: "them",
        body: "No rush today — just don't want it to lapse.",
        timestamp: "2:14 PM",
      },
    ],
  },
  {
    id: "safety-reliability",
    surface: "in-app",
    channel: "safety-reliability",
    kind: "two-way",
    title: "Safety and Reliability",
    preview: "Following up on this morning's pickup — what happened at the door?",
    draft: "I waited 11 minutes and called twice",
    consequence: "An unanswered incident is closed on the member's account alone.",
    dateLabel: "Today",
    unread: 1,
    messages: [
      {
        id: "saf-1",
        from: "them",
        body: "The member on your 8:15 says nobody came to the door. Your GPS has you on site for 11 minutes, so I want your side before I close this out.",
        timestamp: "9:48 AM",
      },
    ],
  },

  /* ── Zendesk. Five conversations, per c-05a. ─────────────────────────── */
  { id: "zd-1", surface: "support", channel: "support", kind: "two-way", title: "Wingz",
    preview: "Sorry I couldn't answer your question. Would you like to chat with an agent?",
    dateLabel: "6/11/26", unread: 1, messages: [] },
  { id: "zd-2", surface: "support", channel: "support", kind: "two-way", title: "Wingz",
    preview: "Sorry I couldn't answer your question. Would you like to chat with an agent?",
    dateLabel: "6/11/26", unread: 1, messages: [] },
  { id: "zd-3", surface: "support", channel: "support", kind: "two-way", title: "Wingz",
    preview: "Sorry I couldn't answer your question. Would you like to chat with an agent?",
    dateLabel: "6/11/26", unread: 1, messages: [] },
  { id: "zd-4", surface: "support", channel: "support", kind: "two-way", title: "Wingz",
    preview: "Sorry I couldn't answer your question. Would you like to chat with an agent?",
    dateLabel: "6/10/26", unread: 0, messages: [] },
  { id: "zd-5", surface: "support", channel: "support", kind: "two-way", title: "Wingz",
    preview: "Sorry I couldn't answer your question. Would you like to chat with an agent?",
    dateLabel: "6/10/26", unread: 0, messages: [] },
];

/**
 * The unread counts, split by surface.
 *
 * ⚠️ Seeded literals, not a `reduce` — the repo convention, and it keeps a
 * screenshot stable. NOTHING ENFORCES that they agree with the per-thread
 * `unread` fields above, and tsc cannot see a disagreement, so change them in
 * the same edit and re-add by hand. Today: Ops 2 + 1 + 1 = 4, Support 1 + 1 + 1 = 3.
 */
export const UNREAD_SUPPORT = 3;
export const UNREAD_IN_APP = 4;
export const UNREAD_TOTAL = UNREAD_SUPPORT + UNREAD_IN_APP;

/** Back-compat alias for the header badge. */
export const MOCK_UNREAD_TOTAL = UNREAD_TOTAL;

export function getThread(id: string): ChatThread | undefined {
  return MOCK_THREADS.find((thread) => thread.id === id);
}

/** How many of the Ops channels are waiting on the driver to answer. */
export const TWO_WAY_COUNT = MOCK_THREADS.filter(
  (t) => t.surface === "in-app" && t.kind === "two-way"
).length;

/** The Wingz (in-app) channels. Zendesk always has its own surface. */
export function inAppThreads(): ChatThread[] {
  return MOCK_THREADS.filter((thread) => thread.surface === "in-app");
}

/** The Zendesk conversations, as `c-05a` shows them. */
export function supportThreads(): ChatThread[] {
  return MOCK_THREADS.filter((thread) => thread.surface === "support");
}
