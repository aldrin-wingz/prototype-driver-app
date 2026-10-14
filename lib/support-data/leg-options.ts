import {
  mockInProgressTrips,
  mockNeedsActionTrips,
  mockUpcomingTrips,
  mockCompletedTrips,
  getLegStatusLabel,
  type Trip,
  type TripLeg,
} from "@/lib/driver-data/mock-trips";
import { withSessionSwipes } from "@/lib/driver-data/session-swipes";
import type { LegScope } from "@/types/support";

/** One selectable leg, flattened out of the driver's rides. */
export interface LegOption {
  legId: string;
  trip: Trip;
  leg: TripLeg;
  /** Everything a search should match on, lowercased. */
  searchText: string;
}

/**
 * Every leg the driver could file a support request against.
 *
 * Only legs that take part in the swipe sequence (those carrying `progress`) are
 * offered — an Appointment Time row is a destination, not a leg you swipe, so it
 * cannot be the subject of a no-show report.
 *
 * By default this spans in-progress, needs-action, upcoming AND completed rides,
 * because a driver most often files after the fact, not at the kerb. Issues that
 * only make sense on a live trip pass `"in-progress"` to narrow it.
 */
export function getLegOptions(scope: LegScope = "all"): LegOption[] {
  const allRides =
    scope === "in-progress"
      ? mockInProgressTrips
      : [
          ...mockInProgressTrips,
          ...mockNeedsActionTrips,
          ...mockUpcomingTrips,
          ...mockCompletedTrips,
        ];

  return allRides.flatMap((trip) =>
    trip.legs
      .filter((leg) => leg.progress)
      // ⛔ Through the session overlay, always. This registry is the SECOND
      // reader of the seed, and a swipe the driver just made has to be visible
      // here or the form's re-derive silently undoes it. See `session-swipes`.
      .map(withSessionSwipes)
      .map((leg) => toLegOption(trip, leg))
  );
}

/**
 * One leg, as an option.
 *
 * ⛔⛔ **The ONLY place a `LegOption` is built.** `getLegOptions` maps through
 * it and so does `legOptionFor`, so the picker and a form's own context block
 * cannot describe the same leg differently. An inline object literal in either
 * place is a second constructor, and the first thing it would drop is
 * `withSessionSwipes` — leaving a block that still shows a swipe the driver
 * has just made as missing.
 */
function toLegOption(trip: Trip, leg: TripLeg): LegOption {
  return {
    legId: leg.id,
    trip,
    leg,
    searchText: [
      leg.id,
      leg.legCode,
      trip.id,
      trip.rider,
      trip.client,
      trip.date,
      leg.time,
      getLegStatusLabel(leg),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase(),
  };
}

/**
 * The leg a form's context block is drawn for.
 *
 * ⛔⛔ **Not `findLegOption`, and the difference is the whole reason this
 * exists.** That one searches `getLegOptions`, which offers only legs carrying
 * `progress` — a leg you can swipe. A form can perfectly well be filed against
 * a leg that has none: an upcoming ride, or a Request Feed trip the driver has
 * not accepted. Looking those up returns `undefined`, and the form then renders
 * with no Trip details and no Current leg details at all. That is exactly the
 * defect this fixed, found by walking Update Trip Details.
 *
 * ⚠️ **A trip-scoped form falls back to the trip's first leg**, preferring one
 * that has progress. Send-Back and Auto-Assign are about a whole trip and carry
 * no leg of their own, and the block is leg-anchored — so the `Legs` row marks
 * leg A as current where nothing else has a better claim. Named rather than
 * silently defaulted: the alternative is those two forms being the only ones
 * with no context at all, which is what the driver reported.
 */
export function legOptionFor(trip: Trip, leg?: TripLeg): LegOption {
  const chosen =
    leg ?? trip.legs.find((candidate) => candidate.progress) ?? trip.legs[0];
  return toLegOption(trip, withSessionSwipes(chosen));
}

/**
 * Look a leg up regardless of scope.
 *
 * Unscoped on purpose: a saved draft can reference a leg that has since moved on,
 * and the form still has to be able to show what it was filed against.
 */
export function findLegOption(legId: string): LegOption | undefined {
  return getLegOptions().find((option) => option.legId === legId);
}

export function searchLegOptions(
  query: string,
  scope: LegScope = "all"
): LegOption[] {
  const needle = query.trim().toLowerCase();
  const options = getLegOptions(scope);
  if (!needle) return options;
  return options.filter((option) => option.searchText.includes(needle));
}

/** Whether the driver has a live trip — gates the in-progress-only issue types. */
export function hasInProgressLegs(): boolean {
  return getLegOptions("in-progress").length > 0;
}
