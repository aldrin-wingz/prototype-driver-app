import { getLegStage, type Trip, type TripLeg } from "./mock-trips";

/** How long a driver must wait at the pick-up before a no-show is valid. */
export const NO_SHOW_WAIT_MINUTES = 10;

/**
 * Clients that still require a no-show to be filed FROM the pick-up location.
 *
 * ⚠️ Hard-coded for the prototype. A real app reads this off client config —
 * this is a per-client, per-market policy, not a property of the code.
 */
export function requiresOnSiteNoShow(trip: Trip): boolean {
  return trip.client === "Verida" && trip.market === "TN";
}

/**
 * Whether the app can prove the driver waited long enough.
 *
 * A missing `presence` and a `null` dwell mean the same thing — no proof found.
 * That is not the same as "the driver did not wait"; it is the case where we have
 * to ask them, which is the whole reason the support form exists.
 */
export function hasProvenWait(leg: TripLeg): boolean {
  return (leg.presence?.dwellMinutes ?? 0) >= NO_SHOW_WAIT_MINUTES;
}

/**
 * What tapping Member No-Show should do.
 *
 *  - `submit`          — the wait is proven, so send it. No form, no questions.
 *  - `form`            — no proof, so ask the driver what the app couldn't observe.
 *  - `blocked-left`    — on-site client and the driver has gone. Error, plus a
 *                        form as the way out.
 *  - `blocked-waiting` — on-site client, driver still at the pick-up, wait not
 *                        finished. Error with NO form: they can simply wait, and
 *                        a form must not become a way to skip the wait.
 */
export type NoShowOutcome = "submit" | "form" | "blocked-left" | "blocked-waiting";

export function resolveNoShowOutcome(trip: Trip, leg: TripLeg): NoShowOutcome {
  const proven = hasProvenWait(leg);

  if (requiresOnSiteNoShow(trip)) {
    if (!leg.presence?.atPickup) return "blocked-left";
    return proven ? "submit" : "blocked-waiting";
  }

  // Everywhere else, whether the driver is still standing there is irrelevant.
  // If we can prove they waited, there is no reason to make them drive back.
  return proven ? "submit" : "form";
}

/**
 * Whether a no-show can be filed against this leg at all.
 *
 * Only a leg that is under way but not yet picked up: you cannot no-show a ride
 * you never started, and you cannot no-show a member already in the car.
 */
export function canFileNoShow(leg: TripLeg): boolean {
  return getLegStage(leg) === "started";
}
