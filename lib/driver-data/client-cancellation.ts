import type { Trip } from "./mock-trips";

/**
 * A ride Wingz cancelled — the alert, and the screen behind it.
 *
 * Replicated from `CAP-341` and `CAP-342` (shoot `DAB-2026-10-14`, production
 * macOS build, same window as `04-01`–`04-03`).
 *
 * ## The alert
 *
 * A native OS alert over **My Rides → Upcoming**, titled with the app's own
 * name because the OS raises it rather than the app:
 *
 * > **Wingz Driver**
 * > Trip: 20261013134622G scheduled for 2026-10-18 at 01:46 PM was canceled.
 * > `OK`  `Go to ride`
 *
 * ⛔⛔ **`Go to ride` is the only route to the ride, and `OK` closes it.** The
 * cancelled ride is in no tab — not Upcoming, not Needs Action, nowhere. A
 * driver who dismisses this mid-drive has lost the trip id and cannot work out
 * which of the day's rides went.
 *
 * ## The ride
 *
 * Title `#202610131346181 - Ride`, route map, then a pink banner reading
 * *"Cancelled by Wingz / This ride was cancelled by Wingz. No action is
 * required."* over a greyed-out leg timeline. No More row. No action bar.
 *
 * ## ⛔⛔ Production spells it BOTH ways, and both are replicated
 *
 * The alert says "was **canceled**" (one L); the banner says "**Cancelled** by
 * Wingz" (two). Normalising either would be the mirror quietly disagreeing with
 * the photograph. `verify-base` asserts both survive.
 *
 * ## ⛔⛔ This is NOT `rider-declined.ts`
 *
 * That module is the driver reporting that a MEMBER declined — a report nobody
 * has acted on, which is why its copy is forbidden from saying "cancelled".
 * This is Wingz having already cancelled, and production says so twice. The ban
 * does not reach here, and the two must never be read as one thing.
 */

/**
 * When the driver was told. Presence is the whole predicate.
 *
 * ⚠️ Named for the NOTICE, not the decision: the app knows when it was told and
 * never when the cancellation was made. A field called `cancelledAt` would
 * invite a later reader to treat it as the client's own timestamp.
 */
export function isClientCancelled(trip: Trip): boolean {
  return Boolean(trip.clientCancelNoticeAt);
}

/**
 * ⛔ Production lists a cancelled ride NOWHERE. This is the whole of what the
 * app does with one, and it is why the alert's second button matters.
 */
export function listableRides(trips: readonly Trip[]): Trip[] {
  return trips.filter((trip) => !isClientCancelled(trip));
}

// ---- The alert, `CAP-341` ----------------------------------------------

/** The app's own name — the OS raises this, so that is what the title is. */
export const CANCEL_ALERT_TITLE = "Wingz Driver";
export const CANCEL_ALERT_DISMISS = "OK";
export const CANCEL_ALERT_GO = "Go to ride";

/**
 * `CAP-341`'s sentence, with this trip's details in it.
 *
 * ⚠️ An ISO-ish date and a zero-padded 12-hour clock, neither of which matches
 * how the rest of the app writes a date. Replicated as shot: the string comes
 * from the push payload, not from the app's own formatters.
 */
export function cancelAlertBody(trip: Trip): string {
  return `Trip: ${trip.id} scheduled for ${isoDate(trip.date)} at ${padClock(trip.legs[0]?.time ?? "")} was canceled.`;
}

/** `"Fri, Aug 1, 2026"` → `"2026-08-01"`, the shape the alert prints. */
function isoDate(rideDate: string): string {
  const parsed = new Date(rideDate.replace(/^\w{3},\s*/, ""));
  if (Number.isNaN(parsed.getTime())) return rideDate;
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${parsed.getFullYear()}-${month}-${day}`;
}

/** `"1:46 PM"` → `"01:46 PM"`. The capture zero-pads; the app elsewhere does not. */
function padClock(clock: string): string {
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(clock.trim());
  if (!match) return clock;
  return `${match[1].padStart(2, "0")}:${match[2]} ${match[3].toUpperCase()}`;
}

// ---- The ride, `CAP-342` -----------------------------------------------

export const CANCELLED_BANNER_TITLE = "Cancelled by Wingz";
export const CANCELLED_BANNER_BODY =
  "This ride was cancelled by Wingz. No action is required.";

/**
 * ⛔ `Ride`, bare.
 *
 * Not `Cancelled Ride`, which the capture does not say — the banner says that
 * instead — and not the `Will-Call Ride` this app hardcodes for an unstarted
 * ride. ⚠️ That hardcoding is a separate, recorded fidelity gap: `CAP-340`
 * shows Request Details reading `- New Request` where this app says
 * `- Will-Call Ride`, and this is the second sighting of the same thing.
 */
export const CANCELLED_SUBTITLE = "Ride";

export const CLIENT_CANCELLATION_PROVENANCE = {
  alert: "CAP-341",
  screen: "CAP-342",
  /**
   * ⛔ What is NOT here, and must not arrive: the sibling prototype's filter
   * bar, its Needs Action entry and its Acknowledge button. Those are catalogue
   * row 18's proposal, flagged `"ours"` there. Production lists a cancelled
   * ride nowhere and offers nothing to do about it.
   */
  proposals: "none — see prototype/support-solutions row 18",
} as const;
