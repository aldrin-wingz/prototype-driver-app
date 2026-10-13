import type { Trip } from "./mock-trips";

/**
 * Catalogue rows **11 and 12** — over-capacity trips, and what production does
 * with one today.
 *
 * ⭐⭐ **It is not a block. It is a phone number.** D7 and the capture list both
 * described this as *"trying to accept a trip that exceeds vehicle capacity —
 * the over-capacity block"*, i.e. an attempt met with a refusal. `CAP-340`
 * shows there is no attempt: the Request Details screen simply **has no accept
 * control**. Where `SWIPE TO ACCEPT` would be there is a pink swipe reading
 * `Over Capacity Trip # …` / `SWIPE TO CALL DISPATCH`, and completing it dials
 * (user-confirmed, 2026-10-14).
 *
 * That is a stronger finding than a block would have been. A block at least
 * says what went wrong; this says only *over capacity* and a reference number,
 * and hands the driver a telephone. It IS the support call rows 11 and 12 exist
 * to remove.
 *
 * ⛔⛔ **Now-only, and there is no Proposed side.** Both rows are
 * `klass: "no-app-surface"` — a one-off data cleanse and a backend path, with
 * nothing to build in the driver app. So this surface is reached through
 * `nowEntry`, never `entry`, and the mode toggle does not render for either
 * row. A switch offering a proposal that does not exist is the "toggle that
 * does nothing" this project has already shipped twice.
 *
 * ⚠️ **`CAP-340` is a TEST-DATA capture**, and the plan's open question is
 * answered by reading it: `Rider: RiderFirst RiderLast`, `4567 Test Dr`,
 * `1234 Test Dr`, `8552.7 mi away`. No production trip carries those. The
 * macOS window chrome says desktop build; no footer version is in frame. So
 * the STRING TEMPLATE below is capture-backed and the BEHAVIOUR is
 * user-confirmed, but the environment is not established — see
 * `OVER_CAPACITY_PROVENANCE`.
 */

/**
 * The catalogue rows this surface belongs to.
 *
 * ⚠️ Both, because rows 11 and 12 are one dead end: the same screen serves the
 * stale-capacity case and the changed-vehicle case, and the driver cannot tell
 * which they are in. Declared once so the two cannot drift.
 */
export const OVER_CAPACITY_SOLUTIONS: readonly string[] = [
  "vehicle-capacity-cleanse",
  "vehicle-capacity-backend",
];

/** The swipe's first line, before the trip number. `CAP-340`, verbatim. */
export const OVER_CAPACITY_PREFIX = "Over Capacity Trip #";

/** Its second line. `CAP-340`, verbatim. */
export const OVER_CAPACITY_SWIPE_LABEL = "SWIPE TO CALL DISPATCH";

/**
 * The number the swipe dials.
 *
 * ⛔⛔ **OURS, and it has to be.** `CAP-340` shows the swipe and not the dial —
 * the number is nowhere on screen. The user confirmed the behaviour, not a
 * number. So this is seeded fiction in the reserved **555-01xx** range, like
 * every other number in this repo, and it must never be presented as
 * production's dispatch line.
 *
 * ⛔⛔ And it is DISPATCH's, not the driver's. The first version of this line
 * was `(555) 0142`, copied from `ACCOUNT_ON_FILE.phone` — the driver's own
 * number on the Account screen. The swipe would have dialled the person
 * holding the phone, and nothing about the screen would have looked wrong.
 * Checked against every seeded number in `lib/driver-data`.
 */
export const OVER_CAPACITY_DISPATCH_PHONE = "(470) 555-0188";

/**
 * Which parts of this surface have actually been seen.
 *
 * ⚠️ Beside the copy rather than in a comment, so the fold-in audit can read it.
 * The same shape `SWIPE_TOO_FAR_PROVENANCE` uses for row 03's inferred half.
 *
 * ⛔ `environment: "unestablished"` is why none of this folds into
 * `driver-app-base` yet. D2 admits capture-backed or user-confirmed PRODUCTION
 * only, and a capture full of `Test Dr` with no footer version establishes the
 * SHAPE of the screen, not the build it came from. One production capture later
 * and this becomes foldable.
 */
export const OVER_CAPACITY_PROVENANCE = {
  copy: "captured",
  behaviour: "user-confirmed",
  environment: "unestablished",
  dispatchNumber: "ours",
} as const;

/**
 * Is this request over the vehicle's capacity?
 *
 * ⛔ Presence of the dispatch number is the predicate, not a separate boolean.
 * The screen cannot render the swipe without the number — it is in the first
 * line — so a trip flagged over-capacity with no number would be a trip whose
 * CTA has a blank where its reference should be. One field, and it carries the
 * thing the driver reads down the phone.
 */
export function isOverCapacity(trip: Trip): boolean {
  return Boolean(trip.overCapacityTripNumber);
}

/**
 * The swipe's first line, for this trip.
 *
 * ⚠️ `CAP-340` shows a THIRD identifier here: the header reads
 * `#202610131450161`, `Leg:` repeats it, and the swipe says `Trip # 2156877`.
 * The one number the driver reads down the phone appears nowhere else on the
 * screen — which is its own small finding about the call, and why this is a
 * stored field rather than the trip's own id.
 */
export function overCapacityHeadline(trip: Trip): string {
  return `${OVER_CAPACITY_PREFIX} ${trip.overCapacityTripNumber ?? ""}`.trim();
}

/**
 * Where the completed swipe goes.
 *
 * ⚠️ A real `tel:` href rather than a handler, because that is what dialling
 * is — and because a prototype that only *says* it would dial cannot be told
 * apart from one that does nothing. Harmless on a desktop browser, which is
 * where this is demonstrated.
 */
export function dispatchDialHref(): string {
  return `tel:${OVER_CAPACITY_DISPATCH_PHONE.replace(/[^0-9]/g, "")}`;
}
