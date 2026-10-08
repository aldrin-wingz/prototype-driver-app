import type { LegSwipeProgress, Trip, TripLeg } from "./mock-trips";
import type { SwipeMark } from "./missed-swipe-rules";

/**
 * Swipes the driver made in THIS session, laid over the seed.
 *
 * ⛔⛔ **Module level on purpose, and this is the reason.** The seed is a module
 * constant and more than one thing reads it: the ride detail reads
 * `mockInProgressTrips`, and the support form's leg picker reads
 * `getLegOptions()`, which rebuilds from the same arrays. Holding the overlay in
 * React state gave the two readers different answers — the form's own
 * "re-derive when the leg changes" effect looked the leg up through
 * `findLegOption`, got the PRISTINE leg, and overwrote the drop-off the driver
 * had swiped thirty milliseconds earlier with a blank. The form then showed an
 * empty Drop-off time and a banner reading "Enroute" on a leg that had just been
 * dropped off.
 *
 * One store, applied by everything that reads a leg, is what makes those two
 * readers incapable of disagreeing.
 *
 * ⚠️ Resets on reload, like every other piece of prototype state — each demo
 * starts from the seed. `version` exists so React can be told something changed;
 * a mutable module cannot trigger a render by itself.
 */
const overlay = new Map<string, Partial<LegSwipeProgress>>();
let version = 0;

/** Bumped on every write, so a provider can hang state off it. */
export function swipeVersion(): number {
  return version;
}

/** Record a swipe against a leg. `at` is a clock face, e.g. "2:14 PM". */
export function recordSessionSwipe(
  legId: string,
  mark: SwipeMark,
  at: string
): void {
  overlay.set(legId, { ...overlay.get(legId), [mark]: at });
  version += 1;
}

/** Drop every recorded swipe. Exists so a check can assert a clean start. */
export function resetSessionSwipes(): void {
  overlay.clear();
  version += 1;
}

/** How many legs carry an overlay — the denominator for any check about it. */
export function sessionSwipeCount(): number {
  return overlay.size;
}

/** This leg with its session swipes applied, or the same object if it has none. */
export function withSessionSwipes(leg: TripLeg): TripLeg {
  const recorded = overlay.get(leg.id);
  if (!recorded || !leg.progress) return leg;
  return { ...leg, progress: { ...leg.progress, ...recorded } };
}

/** This trip with its session swipes applied, or the same object if it has none. */
export function applySessionSwipes(trip: Trip): Trip {
  if (!trip.legs.some((leg) => overlay.has(leg.id))) return trip;
  return { ...trip, legs: trip.legs.map(withSessionSwipes) };
}
