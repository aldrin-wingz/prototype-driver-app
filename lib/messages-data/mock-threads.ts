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
 * `Onboarding Support` is the one that exists today; the Market Ops threads are
 * the non-support cases this study is proposing, mirrored from the CS Tool.
 *
 * ⚠️ Seeded, never computed — timestamps are fixed strings so a screenshot taken
 * next month matches one taken today.
 */

export type ChatChannel = "in-app" | "support";

/**
 * The Market Ops conversations a driver can hold.
 *
 * ⭐ THE CS TOOL IS THE SOURCE OF TRUTH. These ids and labels mirror
 * `lib/comms-conversation-topics.ts` in the comms-chat worktree, because Ops
 * defines a topic there and the driver only ever receives one. Two prototypes
 * disagreeing about what a conversation is called is the fastest way to review
 * the wrong thing.
 *
 * ⚠️ Ids are kept through renames on both sides: `on-demand-offers` now reads
 * "Same-Day Trips & Urgent Dispatch", and `compliance` reads "Compliance &
 * Document Renewals".
 *
 * ⚠️ SUSPENDED OUTREACH IS DELIBERATELY ABSENT. It exists in the CS Tool
 * scoped to Status = Suspended, and this driver is Active — so they are not in
 * it. That gap is the membership rule made visible, not a missing thread.
 */
export type ChatTopic =
  | "on-demand-offers"
  | "single-leg-offers"
  | "driver-trip-confirmation"
  | "routed-trips-confirmation"
  | "urgent-app-issues"
  | "incident-escalations"
  | "compliance"
  | "earnings-pay-disputes"
  | "driver-incentives"
  | "policy-updates"
  | "support";

/**
 * Whether a thread expects the driver to answer.
 *
 * ⚠️ Load-bearing for the `roles` option. Eight of the ten threads are
 * `two-way` and several are time-boxed — an unanswered Routed Trips
 * Confirmation costs the driver the manifest, and a same-day offer expires.
 * Calling that surface a "notification tray" undersells what it does.
 */
export type ChatKind = "two-way" | "broadcast";

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
  /** Does Market Ops need an answer here? */
  kind: ChatKind;
  /** What happens if the driver does not reply. Empty when nothing does. */
  consequence?: string;
}

export const MOCK_THREADS: ChatThread[] = [
  {
    id: "on-demand-offers",
    channel: "in-app",
    topic: "on-demand-offers",
    kind: "two-way",
    title: "Same-Day Trips & Urgent Dispatch",
    preview: "Need an answer in the next 20 minutes or it goes to the next driver.",
    consequence: "The offer expires and PAR routes it to another driver.",
    dateLabel: "Today",
    unread: 2,
    messages: [
      {
        id: "odo-1",
        from: "them",
        body: "PAR has a same-day pickup that still needs a driver — 2:40 PM, Grandview Heights to OSU East, 1 leg, $42.15. Can you take it?",
        timestamp: "11:44 AM",
      },
      {
        id: "odo-2",
        from: "them",
        body: "Need an answer in the next 20 minutes or it goes to the next driver.",
        timestamp: "11:52 AM",
      },
    ],
  },
  {
    id: "single-leg-offers",
    channel: "in-app",
    topic: "single-leg-offers",
    kind: "two-way",
    title: "Single-Leg Offers",
    preview: "One leg, Thu 14th, Dayton → Kettering. Yours if you want it.",
    consequence: "Unanswered offers go to the next driver on the list.",
    dateLabel: "Today",
    unread: 0,
    messages: [
      {
        id: "slo-1",
        from: "them",
        body: "One-off leg on Thursday the 14th — 9:40 AM pickup in Dayton, drop in Kettering, ambulatory. You're on the short list for these, so it's yours if you want it.",
        timestamp: "11:02 AM",
      },
    ],
  },
  {
    id: "driver-trip-confirmation",
    channel: "in-app",
    topic: "driver-trip-confirmation",
    kind: "two-way",
    title: "Driver Trip Confirmation",
    preview: "You're confirmed for tomorrow. Message here if anything changes tonight.",
    consequence: "Unconfirmed legs are pulled and reassigned to a recovery driver.",
    dateLabel: "Today",
    unread: 1,
    messages: [
      {
        id: "dtc-1",
        from: "them",
        body: "Confirming tomorrow — you have 3 legs starting 6:15 AM out of Riverside Dialysis. Are you still good for all of them?",
        timestamp: "8:55 AM",
      },
      { id: "dtc-2", from: "me", body: "Yes, all three.", timestamp: "9:01 AM", delivered: true },
      {
        id: "dtc-3",
        from: "them",
        body: "You're confirmed. If anything changes tonight, message here — we'd rather line up a recovery driver early than take the reliability hit with the client.",
        timestamp: "9:04 AM",
      },
    ],
  },
  {
    id: "routed-trips-confirmation",
    channel: "in-app",
    topic: "routed-trips-confirmation",
    kind: "two-way",
    title: "Routed Trips Confirmation",
    preview: "No reply by 6 PM tonight and these come off your manifest.",
    consequence: "Declining or not replying removes the trips from the manifest.",
    dateLabel: "Yesterday",
    unread: 1,
    messages: [
      {
        id: "rtc-1",
        from: "them",
        body: "We've routed 4 trips to your Thursday manifest — 7:00 AM through 1:30 PM, all Franklin County. Reply to accept and we'll keep them on you.",
        timestamp: "3:40 PM",
      },
      {
        id: "rtc-2",
        from: "them",
        body: "No reply by 6 PM tonight and these come off your manifest.",
        timestamp: "4:18 PM",
      },
    ],
  },
  {
    id: "urgent-app-issues",
    channel: "in-app",
    topic: "urgent-app-issues",
    kind: "two-way",
    title: "Urgent App Issues",
    preview: "Resent. Force-close and reopen the app — the leg should be back.",
    draft: "Still showing the old screen",
    consequence: "An unreported app failure on a live trip can block billing the trip to the client.",
    dateLabel: "Today",
    unread: 0,
    messages: [
      {
        id: "uai-1",
        from: "me",
        body: "The app won't let me swipe drop-off on leg B — it's stuck on PICK UP MEMBER. I'm at the facility now.",
        timestamp: "8:02 AM",
        delivered: true,
      },
      {
        id: "uai-2",
        from: "them",
        body: "Thanks for flagging straight away. Ohio isn't fully API-integrated, so I'm asking PAR to resend the trip. Don't cancel anything on your end — we need it reimported or we can't bill it to the client.",
        timestamp: "8:09 AM",
      },
      {
        id: "uai-3",
        from: "them",
        body: "Resent. Force-close and reopen the app — the leg should be back.",
        timestamp: "8:12 AM",
      },
    ],
  },
  {
    id: "incident-escalations",
    channel: "in-app",
    topic: "incident-escalations",
    kind: "two-way",
    title: "Incident Escalations",
    preview: "Following up on this morning's pickup — what happened at the door?",
    consequence: "An unanswered incident is closed on the member's account alone.",
    dateLabel: "Today",
    unread: 0,
    messages: [
      {
        id: "inc-1",
        from: "them",
        body: "The member on your 8:15 says nobody came to the door. Your GPS has you on site for 11 minutes, so I want your side before I close this out.",
        timestamp: "9:48 AM",
      },
    ],
  },
  {
    id: "compliance",
    channel: "in-app",
    topic: "compliance",
    kind: "two-way",
    title: "Compliance & Document Renewals",
    preview: "Send the new declaration page here when the carrier issues it.",
    consequence: "An expired requirement makes the driver ineligible for trips.",
    dateLabel: "Yesterday",
    unread: 0,
    messages: [
      {
        id: "cmp-1",
        from: "them",
        body: "The auto insurance we have on file expires Sep 24. Send the new declaration page here when the carrier issues it and we'll get it on your record.",
        timestamp: "2:11 PM",
      },
      {
        id: "cmp-2",
        from: "them",
        body: "No rush today — just don't want it to lapse.",
        timestamp: "2:14 PM",
      },
    ],
  },
  {
    id: "earnings-pay-disputes",
    channel: "in-app",
    topic: "earnings-pay-disputes",
    kind: "two-way",
    title: "Earnings & Pay Disputes",
    preview: "Found it — the Sep 2 return leg was short-paid. Correction is on the next deposit.",
    dateLabel: "Yesterday",
    unread: 0,
    messages: [
      {
        id: "pay-1",
        from: "me",
        body: "My Sep 2 pay looks short by about $28. There was a return leg that I don't think got counted.",
        timestamp: "3:20 PM",
        delivered: true,
      },
      {
        id: "pay-2",
        from: "them",
        body: "Found it — the return leg was billed as a cancel. It's been corrected and the difference rides on the next deposit.",
        timestamp: "4:55 PM",
      },
    ],
  },
  {
    id: "driver-incentives",
    channel: "in-app",
    topic: "driver-incentives",
    kind: "broadcast",
    title: "Driver Incentives",
    preview: "Complete 12 trips Fri–Sun and earn an extra $60. Nothing to sign up for.",
    dateLabel: "Sep 9",
    unread: 0,
    messages: [
      {
        id: "inc2-1",
        from: "them",
        body: "Weekend bonus for Dayton: complete 12 trips between Friday and Sunday and you'll earn an extra $60. Nothing to sign up for — it's counted automatically. Questions about a specific payout go in Earnings & Pay Disputes.",
        timestamp: "8:00 AM",
      },
    ],
  },
  {
    id: "policy-updates",
    channel: "in-app",
    topic: "policy-updates",
    kind: "broadcast",
    title: "Policy Updates",
    preview: "From Oct 1, wait time before a Member No-Show goes from 10 to 15 minutes.",
    dateLabel: "Sep 8",
    unread: 0,
    messages: [
      {
        id: "pol-1",
        from: "them",
        body: "From Oct 1, the wait at pickup before you can file a Member No-Show goes from 10 minutes to 15. Same rule in every Ohio market. Nothing for you to do — the app will hold you to the new time on its own.",
        timestamp: "10:00 AM",
      },
    ],
  },

  /* ── Zendesk. Five conversations, per c-05a. ─────────────────────────── */
  { id: "zd-1", channel: "support", topic: "support", kind: "two-way", title: "Wingz",
    preview: "Sorry I couldn't answer your question. Would you like to chat with an agent?",
    dateLabel: "6/11/26", unread: 1, messages: [] },
  { id: "zd-2", channel: "support", topic: "support", kind: "two-way", title: "Wingz",
    preview: "Sorry I couldn't answer your question. Would you like to chat with an agent?",
    dateLabel: "6/11/26", unread: 1, messages: [] },
  { id: "zd-3", channel: "support", topic: "support", kind: "two-way", title: "Wingz",
    preview: "Sorry I couldn't answer your question. Would you like to chat with an agent?",
    dateLabel: "6/11/26", unread: 1, messages: [] },
  { id: "zd-4", channel: "support", topic: "support", kind: "two-way", title: "Wingz",
    preview: "Sorry I couldn't answer your question. Would you like to chat with an agent?",
    dateLabel: "6/10/26", unread: 0, messages: [] },
  { id: "zd-5", channel: "support", topic: "support", kind: "two-way", title: "Wingz",
    preview: "Sorry I couldn't answer your question. Would you like to chat with an agent?",
    dateLabel: "6/10/26", unread: 0, messages: [] },
];

/**
 * The unread counts, split by channel.
 *
 * ⚠️ Seeded literals, not a `reduce` — the repo convention, and it keeps a
 * screenshot stable. The split IS the point of the `merged` option: a driver
 * who sees one badge of 7 cannot tell whether it is Support waiting on them or
 * Ops telling them something, so the chooser has to break it down before it
 * opens anything.
 */
export const UNREAD_SUPPORT = 3;
export const UNREAD_IN_APP = 4;
export const UNREAD_TOTAL = UNREAD_SUPPORT + UNREAD_IN_APP;

/** Back-compat alias for the header badge. */
export const MOCK_UNREAD_TOTAL = UNREAD_TOTAL;

export function getThread(id: string): ChatThread | undefined {
  return MOCK_THREADS.find((thread) => thread.id === id);
}

/** How many of the in-app threads are waiting on the driver to answer. */
export const TWO_WAY_COUNT = MOCK_THREADS.filter(
  (t) => t.channel === "in-app" && t.kind === "two-way"
).length;

/** The Wingz (in-app) threads. Zendesk always has its own surface. */
export function inAppThreads(): ChatThread[] {
  return MOCK_THREADS.filter((thread) => thread.channel === "in-app");
}

/** The Zendesk conversations, as `c-05a` shows them. */
export function supportThreads(): ChatThread[] {
  return MOCK_THREADS.filter((thread) => thread.channel === "support");
}
