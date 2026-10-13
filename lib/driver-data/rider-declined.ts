import type { Trip } from "./mock-trips";

/**
 * "The rider declined the trip" — what production does when a driver answers
 * the Reach Rider question that way.
 *
 * ⛔⛔ **Filing this does NOT cancel anything.** The client owns the
 * cancellation and a driver's report is evidence for one. Nothing in this
 * module may grow a function that removes a ride.
 *
 * ⭐⭐ **The whole point is where it ENDS.** The driver taps `Chat with
 * Support`, a Zendesk chat opens, a pre-filled ticket is auto-sent on their
 * behalf, and they wait. They typed nothing and the ride is unchanged — the app
 * never learns the outcome. That is the dead end, replicated rather than
 * described.
 *
 * ⚠️ Zendesk chat is NOT the in-app chat. Different surface, different product.
 */

/**
 * Where each piece of copy below was actually seen, beside the copy rather than
 * in prose so a fold-in audit can read it mechanically.
 */
export const RIDER_DECLINED_PROVENANCE = {
  /** The sheet: `CAP-323` (`04-04`), corroborated by `CAP-325` and `CAP-224`. */
  sheet: "CAP-323",
  /** The auto-sent ticket and the chat around it: `CAP-327`, `CAP-225`. */
  zendesk: "CAP-327",
} as const;

// ---------------------------------------------------------------------------
// The declined sheet
// ---------------------------------------------------------------------------

/** Headline, identical across every capture of this sheet. */
export const DECLINED_TITLE = "Rider declined the trip";

/**
 * ⚠️ **The 2026 body, and there is an older one that is NOT this.** `CAP-090`
 * (iOS, a 2021 ride) reads *"This is NOT a confirmation for the trip
 * cancellation. Please contact support for further instructions."* and offers
 * one button, `Call Support`. The current build — `CAP-323` / `CAP-325` /
 * `CAP-224`, Android, Aug–Oct 2026 — is a bottom sheet with the body below and
 * TWO buttons. Only the current one is replicated; the 2021 wording is recorded
 * here so nobody reintroduces it from an old screenshot.
 */
export const DECLINED_BODY =
  "Please chat with support to remove it from your manifest.";

/**
 * ⛔⛔ **`Chat with Support`, not `Contact Support`.** `Contact Support` is a
 * row on the Options menu — a different screen and a different string. The
 * capture says `Chat with Support`, and it means Zendesk.
 */
export const DECLINED_CHAT_SUPPORT = "Chat with Support";

/**
 * The walk-back, verbatim.
 *
 * ⛔ It files NOTHING and changes nothing — it returns the driver to the option
 * list. A driver who tapped the wrong option must be able to leave without
 * having reported that a member said something they did not.
 */
export const DECLINED_WALK_BACK = "Rider Needs Transportation";

/**
 * ⛔⛔ **How long to wait before opening the next sheet.**
 *
 * Two vaul drawers open in one frame do not hand over: the first stays on
 * screen with the second peeking out underneath, so the driver sees two stacked
 * sheets and neither is usable.
 *
 * ⛔ **500, read off vaul rather than guessed.** `node_modules/vaul/dist/index.mjs`
 * sets `TRANSITIONS.DURATION = 0.5`, so a sheet is on screen for half a second
 * after it is told to close. A delay tuned by eye is a delay that works on one
 * machine — 250 was tried on the sibling clone and the sheets still stacked.
 */
export const SHEET_SWAP_MS = 500;

// ---------------------------------------------------------------------------
// What production files, on the driver's behalf
// ---------------------------------------------------------------------------

/**
 * ⭐⭐ **The driver types nothing.** Tapping `Chat with Support` opens the chat
 * and auto-sends this, which `CAP-327` shows sitting above `Sent · Just now`
 * with an empty composer beneath it.
 */
export const ZENDESK_DECLINE_INTRO =
  "My member no longer needs transportation. I need help in removing the following rides from my manifest.";

/** The label on each detail line, in the captured order. */
export const ZENDESK_DECLINE_LABELS = [
  "Member Name",
  "Trip Date",
  "Trip ID",
  "Leg IDs",
] as const;

/**
 * The legs the ticket asks to have removed.
 *
 * ⛔ **The Appointment Time row is a destination, not a leg** — the same rule
 * `ride-detail-layout` applies when it decides which legs take part in the
 * swipe sequence. Listing it would put an id in front of Support that does not
 * name a ride.
 *
 * ⚠️ **The base's unconfirmed ride is one-way, so this prints ONE id where
 * `CAP-225` prints two.** The captured template lists both legs of a round trip
 * because a member who is not going has usually dropped the return as well. The
 * rule below handles any number; the seed simply has one to show. Not worth
 * reshaping a capture-backed ride to make a fold-in look better.
 */
export function declinableLegIds(trip: Trip): string[] {
  return trip.legs.filter((leg) => leg.type !== "appointment").map((leg) => leg.id);
}

/**
 * The auto-sent template for a trip, as `label: value` pairs.
 *
 * ⚠️ Pure and exported so a check can build the real message rather than grep
 * the component for a line.
 *
 * ⛔ `CAP-327` carries a REAL member's name and an agent's photograph. The
 * SHAPE is replicated here; the name comes from the seed, which `verify-base`
 * §5 keeps invented, and there is no avatar at all.
 */
export function zendeskDeclineMessage(trip: Trip): {
  intro: string;
  lines: Array<{ label: string; value: string }>;
} {
  return {
    intro: ZENDESK_DECLINE_INTRO,
    lines: [
      { label: "Member Name", value: trip.rider },
      { label: "Trip Date", value: trip.date },
      { label: "Trip ID", value: trip.id },
      { label: "Leg IDs", value: declinableLegIds(trip).join(", ") },
    ],
  };
}

/** What the chat says under the auto-sent bubble, verbatim from `CAP-327`. */
export const ZENDESK_SENT_STATUS = "Sent · Just now";
/** The dead composer's placeholder, verbatim. */
export const ZENDESK_COMPOSER_PLACEHOLDER = "Type a message";

/**
 * ⛔⛔ **Nothing appears on the ride afterwards, and that is the finding.**
 * The app files a ticket and then cannot read back what becomes of it — no
 * banner, no pill, no status. A driver who declines a trip is left looking at
 * an unconfirmed ride that still says *Confirmation required*.
 */
export const DECLINE_TRACKED_BY_APP = false;
