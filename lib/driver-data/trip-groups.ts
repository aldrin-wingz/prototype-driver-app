import {
  mockCompletedTrips,
  mockInProgressTrips,
  mockNeedsActionTrips,
  mockUpcomingTrips,
  type Trip,
} from "./mock-trips";

/**
 * The legs of one trip — where "leg" means **a separate `Trip` sharing a
 * `tripGroup`**, which is what the driver sees as separate ride cards.
 *
 * ⛔⛔ **"Leg" means two incompatible things in this app and the seed contains
 * both.** `1049800398` / `1049800399` are two `Trip`s tied by `tripGroup`,
 * carrying legCodes A and B — the model row 17 established and the one row 21
 * extends. But `RECENT-COMP-001` carries legCodes **A and B on two anchors of
 * the SAME `Trip`**. That one is history-list decoration; it is named here so
 * the next slice does not read it as the model. Only the group model gives a leg
 * its own id, revenue and swipe state, all of which "add a leg" has to produce.
 *
 * ⛔⛔ **The POOL is the whole reason this module exists.** Row 17 asks which
 * legs should come off a manifest and must never offer a leg the member has
 * already ridden; row 21's commonest case is a leg that just FINISHED and a
 * member who now needs one more. Two cases, two pools, and one function serving
 * both would be wrong for one of them. So the matching rule lives here once and
 * each caller passes the pool it has declared.
 */
export function groupMembers(trip: Trip, pool: Trip[]): Trip[] {
  /**
   * ⚠️ Read from an EXPLICIT `tripGroup`, never inferred from rider name and
   * date. Two members can share a name and one member can have two unrelated
   * rides in a day; an inferred group would put a stranger's leg into someone
   * else's request. Declared, never derived.
   */
  if (!trip.tripGroup) return [trip];
  const group = pool.filter((other) => other.tripGroup === trip.tripGroup);
  /**
   * The trip itself when the pool does not hold it — the honest answer for a
   * ride whose group members are all in a pool this caller excluded, and the
   * reason `legsInGroup` kept working when the pools were split.
   */
  return group.length > 0 ? group : [trip];
}

/**
 * Legs that are still the driver's to act on — row 17's pool.
 *
 * ⛔ **No completed trips, deliberately.** You cannot report that a member
 * declined a leg they have already ridden, so widening this would make row 17's
 * checklist offer a finished leg for cancellation.
 */
export const LIVE_POOLS: Trip[] = [
  ...mockNeedsActionTrips,
  ...mockUpcomingTrips,
  ...mockInProgressTrips,
];

/**
 * Every leg of a trip, finished or not — row 21's pool.
 *
 * ⭐ The completed half is the POINT: the commonest add-a-leg case is a driver
 * who has just swiped drop-off and is told the member also needs the pharmacy.
 */
export const ALL_POOLS: Trip[] = [...LIVE_POOLS, ...mockCompletedTrips];
