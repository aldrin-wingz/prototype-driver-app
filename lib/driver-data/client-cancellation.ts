import { showsProposal, type DemoFocus } from "@/lib/solutions/demo-mode";
import type { Trip } from "./mock-trips";

/**
 * Catalogue row 18 — a ride Wingz cancelled, and whether the driver can find it.
 *
 * ## What production does (`CAP-341`, `CAP-342`)
 *
 * A native alert appears over My Rides:
 *
 * > **Wingz Driver**
 * > Trip: 20261013134622G scheduled for 2026-10-18 at 01:46 PM was canceled.
 * > `OK`  `Go to ride`
 *
 * `Go to ride` opens the ride, which carries a pink banner reading *"Cancelled
 * by Wingz / This ride was cancelled by Wingz. No action is required."* over a
 * greyed-out leg timeline.
 *
 * ⛔⛔ **`Go to ride` is the only door, and `OK` closes it.** The ride is in no
 * tab. A driver who dismisses the alert mid-drive has lost the trip id, and
 * with a day of rides cannot work out which one went — so they ring Support to
 * confirm the rest are still on. That call is this row.
 *
 * ## ⛔⛔ This is NOT `rider-declined.ts`, and the two must never merge
 *
 * | | direction | tracked? |
 * | --- | --- | --- |
 * | `rider-declined.ts` / `cancellationRequests` | the DRIVER asks for a trip to come off | `CANCELLATION_TRACKED_BY_APP = false` |
 * | this module | WINGZ already cancelled it | `CLIENT_CANCELLATION_TRACKED_BY_APP = true` |
 *
 * The file is named `client-cancellation.ts` rather than `trip-cancellation.ts`
 * for that reason alone: a file by the second name, sitting beside
 * `rider-declined.ts`, guarantees somebody opens the wrong one.
 *
 * ⚠️ **`rider-declined.ts` forbids the word "cancelled" in its own copy**,
 * because there the client has not acted and the app must not claim they have.
 * That ban does not reach here — Wingz has acted, and production's own screen
 * says so twice. Do not cargo-cult it into a screen that then cannot say what
 * happened.
 */

// ---- The gate -----------------------------------------------------------

/**
 * ⛔ One owner. The rule is named here, beside the copy it governs, so
 * `verify-solutions` can build the real lists for each focus rather than grep a
 * component for a line.
 */
export const CLIENT_CANCELLATION_SOLUTIONS: readonly string[] = [
  "my-rides-cancelled",
];

/**
 * Whether cancelled rides appear in the driver's lists at all.
 *
 * ⛔⛔ **This gates the LISTS, not the ride's own screen.** Production already
 * has the cancelled ride detail — `CAP-342` is a photograph of it — so gating
 * that screen would make the prototype claim production has no cancelled view,
 * which the capture disproves. What the proposal adds is a way to reach it
 * other than the alert.
 */
export function showsCancelledRides(focus: DemoFocus): boolean {
  return showsProposal(focus, CLIENT_CANCELLATION_SOLUTIONS);
}

// ---- The rides ----------------------------------------------------------

/** Presence of the notice is the whole predicate. */
export function isClientCancelled(trip: Trip): boolean {
  return Boolean(trip.clientCancelNoticeAt);
}

/**
 * What the Upcoming tab lists.
 *
 * ⛔⛔ **No `acknowledged` parameter, deliberately — and the signature is the
 * guarantee.** Acknowledging a cancellation clears it from Needs Action and
 * leaves it in the manifest, because the manifest's job is to say what the day
 * holds and a cancelled ride is part of that answer. This function cannot
 * implement the other behaviour by accident: it is never given the list.
 *
 * ⭐ In `"now"` the cancellations are STRIPPED from the list, not from the app.
 * `/my-rides/<id>` still resolves, which is what lets `Go to ride` work — the
 * same "strip, never refuse" shape as `applicableFilters`.
 */
export function upcomingRides(trips: readonly Trip[], focus: DemoFocus): Trip[] {
  if (showsCancelledRides(focus)) return [...trips];
  return trips.filter((trip) => !isClientCancelled(trip));
}

/** Every cancelled ride the driver can see — none in `"now"`, where they are gone. */
export function cancelledRides(trips: readonly Trip[], focus: DemoFocus): Trip[] {
  if (!showsCancelledRides(focus)) return [];
  return trips.filter(isClientCancelled);
}

/**
 * Whether this cancellation is still a task.
 *
 * ⚠️ Needs Action here means *you have not seen this yet*, not *the ride needs
 * work* — production's own banner says no action is required and the proposal
 * does not contradict it. Acknowledging is a read receipt, which is why it
 * drains this list and leaves the manifest alone.
 */
export function needsAcknowledgement(
  trip: Trip,
  acknowledged: readonly string[],
  focus: DemoFocus,
): boolean {
  if (!showsCancelledRides(focus)) return false;
  return isClientCancelled(trip) && !acknowledged.includes(trip.id);
}

// ---- The filter ---------------------------------------------------------
//
// Shape borrowed from `lib/driver-data/ride-history.ts`: a declared list of
// options, a default, a label lookup and a pure `apply`. That one is replicated
// from captures `04-02`/`04-03`; this one is ours, and says so below.

export type RidesFilter = "all" | "active" | "cancelled";

/** ⛔ Declared as a literal, so a check has a denominator. */
export const MY_RIDES_FILTERS: Array<{ key: RidesFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "cancelled", label: "Cancelled" },
];

export const DEFAULT_RIDES_FILTER: RidesFilter = "all";

export function ridesFilterLabel(key: RidesFilter): string {
  return MY_RIDES_FILTERS.find((f) => f.key === key)!.label;
}

export function applyRidesFilter(trips: readonly Trip[], key: RidesFilter): Trip[] {
  switch (key) {
    case "all":
      return [...trips];
    case "active":
      return trips.filter((trip) => !isClientCancelled(trip));
    case "cancelled":
      return trips.filter(isClientCancelled);
  }
}

/**
 * The filter that actually applies, once a proposed one is taken back out.
 *
 * ⛔⛔ **One answer, read by everything downstream** — the list, the tab count,
 * the bar's own visibility and the bar's current value. The obvious build gates
 * the bar and stops there, and that ships a list narrowed to `cancelled` by
 * state the driver can no longer see or clear. This is row 10's lesson,
 * applied before it can be relearned: production has no such filter, so in
 * `"now"` there is nothing to show, nothing to count and nothing to undo.
 *
 * ⭐ It falls back rather than refusing, so a `cancelled` selection surviving a
 * mode flip lands on the full list instead of an empty one.
 */
export function applicableRidesFilter(
  key: RidesFilter,
  focus: DemoFocus,
): RidesFilter {
  return showsCancelledRides(focus) ? key : DEFAULT_RIDES_FILTER;
}

// ---- Copy ---------------------------------------------------------------

/**
 * ⛔⛔ **PRODUCTION SPELLS IT BOTH WAYS, and the inconsistency is replicated.**
 * The alert says "was **canceled**" (one L); the banner says "**Cancelled** by
 * Wingz" (two). Tidying either one would be the prototype quietly disagreeing
 * with the photograph it is derived from. A check asserts both survive.
 */
export const CANCEL_ALERT_TITLE = "Wingz Driver";
export const CANCEL_ALERT_DISMISS = "OK";
export const CANCEL_ALERT_GO = "Go to ride";

/**
 * `CAP-341`'s sentence, with the trip's own details in it.
 *
 * ⚠️ The capture reads `Trip: 20261013134622G scheduled for 2026-10-18 at
 * 01:46 PM was canceled.` — an ISO-ish date and a zero-padded 12-hour clock,
 * neither of which matches how the rest of the app writes a date. Replicated as
 * shot: this string is an OS alert raised by the push payload, not something
 * the app's own formatters touch.
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

/** `CAP-342`, verbatim. */
export const CANCELLED_BANNER_TITLE = "Cancelled by Wingz";
export const CANCELLED_BANNER_BODY =
  "This ride was cancelled by Wingz. No action is required.";
/** ⛔ `Ride`, not `Will-Call Ride` — the subtitle the capture shows. */
export const CANCELLED_SUBTITLE = "Ride";

/**
 * ⛔ **Ours, not production's.** Production never lists a cancelled ride, so it
 * has no pill for one and no acknowledgement at all. These four strings are the
 * proposal, and `CLIENT_CANCELLATION_PROVENANCE` is where that is written down
 * so a fold-in audit cannot mistake them for captured copy.
 */
export const CLIENT_CANCELLED_PILL = "Cancelled";
export const ACKNOWLEDGE_CANCELLATION_LABEL = "Acknowledge cancellation";
export const CANCELLATION_ACKNOWLEDGED_PILL = "CANCELLATION ACKNOWLEDGED";
export const CLIENT_CANCELLED_NOTICE_PREFIX = "Wingz told you";

export const CLIENT_CANCELLATION_PROVENANCE = {
  alert: "CAP-341",
  screen: "CAP-342",
  /** ⛔ Not captured, not inferred — proposed. It does not fold into the base. */
  acknowledgement: "ours",
} as const;

/**
 * ⭐ The mirror of `rider-declined.ts`'s `CANCELLATION_TRACKED_BY_APP = false`,
 * and the opposite value.
 *
 * That one is false because the client has not acted and the app cannot see
 * when they do. This one is true because the cancellation has ALREADY
 * happened — the alert is the app being told — so a ride marked cancelled here
 * is not a claim about the future. A check asserts the two differ, which is the
 * cheapest mechanical defence against the two concepts merging.
 */
export const CLIENT_CANCELLATION_TRACKED_BY_APP = true;
