import { showsProposal, type DemoFocus } from "@/lib/solutions/demo-mode";
import type { Trip } from "./mock-trips";

/**
 * Catalogue row 19 — a ride Wingz cancelled, and whether the driver can find it.
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

// ---- Who cancelled it ---------------------------------------------------

/**
 * ⛔⛔ **Declared as a union, so a third source is a compile error at every
 * site that switches on it** — not a string that renders as an empty pill.
 *
 * ⚠️ **Only these two have evidence, and that is the whole list today.**
 * `wingz` is `CAP-342`'s banner, photographed. `client` is the pill driver-app
 * PR #175 shipped on 2026-04-17. Any further source — a facility, a member —
 * is an open question for Eng, not something to invent here: a variant with no
 * fixture is an unfalsifiable spec (D160), and a fixture invented from a guess
 * is worse than no fixture.
 *
 * ⛔ A DRIVER's own send-back is NOT one of these and must never be added.
 * That is `rider-declined.ts`, it travels the other way, and this module's
 * header says why the two can never merge.
 */
export type CancellationSource = "wingz" | "client";

/** ⛔ Declared, so a sweep over the sources has a denominator. */
export const CANCELLATION_SOURCES: readonly CancellationSource[] = ["wingz", "client"];

/**
 * ⛔⛔ **Production's own words for each, and they are NOT ours to tidy.**
 * `CAP-342` says "Cancelled by Wingz"; PR #175 shipped "Cancelled by Client".
 * One label reading "Cancelled" for both would be the prototype deciding the
 * driver does not need to know who, which is the question they rang about.
 *
 * ⚠️ **The pill in a LIST has never been captured** — production had no list to
 * put one in when `CAP-341`/`CAP-342` were shot. These strings are production's
 * for the banner and the shipped pill; using them here is the closest thing to
 * evidence available, and it is still an open question for Phase 0.
 */
export const CANCELLED_PILL_FOR: Record<CancellationSource, string> = {
  wingz: "Cancelled by Wingz",
  client: "Cancelled by Client",
};

/**
 * Who cancelled it, with the pre-2026-10-17 seeds reading as Wingz.
 *
 * ⛔ The default is not a guess: every cancellation seeded before the source
 * existed was `CAP-342`'s Wingz cancellation, and all three carried its banner.
 */
export function cancellationSourceOf(trip: Trip): CancellationSource {
  return trip.cancelledBy ?? "wingz";
}

/** The pill this ride's card carries. */
export function cancelledPillFor(trip: Trip): string {
  return CANCELLED_PILL_FOR[cancellationSourceOf(trip)];
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

// ---- The toggle --------------------------------------------------------
//
// ⛔⛔ **SUPERSEDED 2026-10-17 (D162). This was an All / Active / Cancelled
// filter, and the filter was the whole of `lib/driver-data/ride-filters.ts` —
// seven keys, a chip row and a sheet.** The approved solution is one default-on
// toggle instead, so the registry, the bar, the sheet and the icon map are
// retired with their only caller.
//
// The old reasoning is kept here because it is the argument the new checks have
// to beat: the filter fell back rather than refusing, so a `cancelled`
// selection surviving a mode flip landed on the full list instead of an empty
// one. ⭐ **That shape is preserved below** — `applicableShowCancelled` is the
// same "strip, never refuse" rule with a boolean in place of three keys. The
// thing that changed is the control, not the gate.

/**
 * ⛔ **Declared, never derived.** A check asserts this literal, not whatever the
 * component happens to initialise its state to — a default read off the thing it
 * checks cannot fail.
 */
export const SHOW_CANCELLED_DEFAULT = true;

/** ⛔ Ours, not production's — see `CLIENT_CANCELLATION_PROVENANCE`. */
export const SHOW_CANCELLED_LABEL = "Show cancelled trips";

/**
 * What Upcoming says when the toggle is the only reason it is empty.
 *
 * ⛔⛔ **An empty tab and a hidden list are different answers, and saying the
 * wrong one sends the driver looking for a ride that is there.** "No rides in
 * this tab" over a manifest the driver has just hidden the cancellations from
 * reads as the day being empty. Inherited from the filter this replaces, where
 * the same trap existed with seven ways to spring it.
 */
export const HIDDEN_EMPTY_TITLE = "Cancelled trips are hidden";
export const HIDDEN_EMPTY_BODY =
  "Every ride on this tab is cancelled, and the toggle is off.";

/**
 * Whether the toggle is offered at all.
 *
 * ⛔ One name, one rule. The old build wrote the gate twice — once for the
 * header icon and once for the chip row — and a check had to assert they were
 * read from one expression. One control means one reader, so that whole class
 * of drift is gone rather than guarded.
 */
export function showsCancelledToggle(focus: DemoFocus): boolean {
  return showsCancelledRides(focus);
}

/**
 * The setting that actually applies, once a proposed one is taken back out.
 *
 * ⛔⛔ **This is row 10's lesson, carried over verbatim from the filter it
 * replaces.** Production has no such control, so in `"now"` there is nothing to
 * show and nothing to undo — and a driver whose `off` survived a mode flip must
 * not land on a manifest narrowed by a control they can no longer see. It falls
 * back to the default rather than refusing.
 */
export function applicableShowCancelled(
  showCancelled: boolean,
  focus: DemoFocus,
): boolean {
  return showsCancelledToggle(focus) ? showCancelled : SHOW_CANCELLED_DEFAULT;
}

/**
 * What the Upcoming tab finally renders.
 *
 * ⛔⛔ **The order is load-bearing and there is exactly one correct sequence**,
 * because a wrong one still renders a plausible list:
 *
 *     upcomingRides(…, focus)  →  applicableShowCancelled  →  this filter
 *
 * The Now-strip runs FIRST. Applying the toggle first would let it act on rides
 * that `"now"` says do not exist, so the control would populate a list the mode
 * had just emptied. The two steps are composed here, in `lib/`, so no screen can
 * get the order wrong by writing them in the other sequence.
 */
export function visibleUpcoming(
  trips: readonly Trip[],
  focus: DemoFocus,
  showCancelled: boolean,
): Trip[] {
  const listed = upcomingRides(trips, focus);
  if (applicableShowCancelled(showCancelled, focus)) return listed;
  return listed.filter((trip) => !isClientCancelled(trip));
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

/**
 * The same banner, per source.
 *
 * ⛔⛔ **The Wingz pair is `CAP-342` verbatim and must stay byte-identical to
 * the constants above** — a check asserts it. The client pair is the same
 * sentence with the party changed, which is the smallest honest extension: the
 * capture shows the shape, and only the name of who acted differs.
 *
 * ⚠️ Production's alert spells it "canceled" and its banner "Cancelled"; that
 * inconsistency is replicated, not tidied, and is checked. Do not normalise the
 * one L into the two here.
 */
export const CANCELLED_BANNER_FOR: Record<
  CancellationSource,
  { title: string; body: string }
> = {
  wingz: { title: CANCELLED_BANNER_TITLE, body: CANCELLED_BANNER_BODY },
  client: {
    title: "Cancelled by Client",
    body: "This ride was cancelled by the client. No action is required.",
  },
};

/** The banner this ride's screen carries. */
export function cancelledBannerFor(trip: Trip): { title: string; body: string } {
  return CANCELLED_BANNER_FOR[cancellationSourceOf(trip)];
}
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
