import type { TripLeg } from "./mock-trips";

/**
 * What production does when a driver swipes from the wrong place.
 *
 * ⛔⛔ **It is a BLOCK, not a warning.** The body says *"Trip payment may be
 * denied"*, which reads at a glance like a caution you can swipe through — and
 * that reading is wrong three ways:
 *
 *   1. the TITLE is *Unable to complete action*. The action did not happen;
 *   2. the swipe is what captures the odometer reading, and a reading cannot be
 *      taken somewhere the driver is not;
 *   3. measured on the sibling project's own data: of 56,649 legs where the
 *      driver swiped en-route, **2,521 (4.45%) end with NEITHER mark**. If the
 *      swipe went through behind a warning, those marks would exist.
 *
 * "Trip payment may be denied" is about having driven to the wrong place, not
 * about the tap succeeding.
 *
 * ⛔ **Terminal.** One button, and the way forward is the telephone number in
 * the sentence — which is not a button.
 */

/**
 * ⛔⛔ **The DROP-OFF half only, and that is the whole of what has been seen.**
 *
 * `CAP-326` shows this alert for a drop-off, word for word. The PICK-UP variant
 * has never been photographed. The sibling branch carries an inferred one —
 * the same sentence with *drop-off* swapped for *pick-up*, on the strength of
 * "you can assume it will be the same error" — and that inference deliberately
 * does NOT come here: this mirror admits capture-backed or user-confirmed
 * production, and an assumption about wording is neither.
 *
 * ⚠️ So this is a flat constant rather than a `Record<SwipeAnchor, string>`
 * with one key filled in. A half-empty map is an invitation to fill it; a
 * single literal has to be deliberately generalised, which is exactly the
 * moment someone should go and shoot the pick-up screen.
 */
export const SWIPE_TOO_FAR_PROVENANCE = "CAP-326 — drop-off only; pick-up unshot";

export const SWIPE_TOO_FAR_TITLE = "Unable to complete action";

/** ⚠️ Production's own number, from the capture. */
export const SWIPE_TOO_FAR_PHONE = "+1 (888) 545-4309";

/** The single dismissal. There is no second button and no way forward. */
export const SWIPE_TOO_FAR_DISMISS = "OK";

/** `CAP-326`, verbatim. */
export const SWIPE_TOO_FAR_BODY =
  "You are too far away from the scheduled drop-off location. " +
  "Trip payment may be denied. Please contact support if assistance is required. " +
  SWIPE_TOO_FAR_PHONE;

/**
 * Whether production would refuse the drop-off swipe on this leg.
 *
 * ⚠️ Reads a ⚠️ SEEDED flag rather than a distance. This mirror has no
 * location at all — production evaluates a geofence at the moment of the swipe,
 * and there is nothing here to evaluate. The flag is how the seed says "the
 * driver is not where they would have to be".
 *
 * ⛔ Drop-off only. A leg awaiting its pick-up mark never reaches here, because
 * the pick-up refusal has not been captured — see `SWIPE_TOO_FAR_PROVENANCE`.
 */
export function refusesDropOffSwipe(leg: TripLeg): boolean {
  return leg.outsideDropOffGeofence === true;
}
