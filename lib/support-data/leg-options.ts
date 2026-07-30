import {
  mockInProgressTrips,
  mockNeedsActionTrips,
  mockUpcomingTrips,
  mockCompletedTrips,
  getLegStatusLabel,
  type Trip,
  type TripLeg,
} from "@/lib/driver-data/mock-trips";
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
 * cannot be the subject of a missed-swipe report.
 *
 * By default this spans in-progress, needs-action, upcoming AND completed rides,
 * because a driver most often notices a missed swipe after the fact. Issues that
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
      .map((leg) => ({
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
      }))
  );
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
