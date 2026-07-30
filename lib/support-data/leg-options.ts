import {
  mockInProgressTrips,
  mockNeedsActionTrips,
  mockUpcomingTrips,
  mockCompletedTrips,
  getLegStatusLabel,
  type Trip,
  type TripLeg,
} from "@/lib/driver-data/mock-trips";

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
 * Spans in-progress, needs-action, upcoming AND completed rides, because a driver
 * most often notices a missed swipe after the fact.
 */
export function getLegOptions(): LegOption[] {
  const allRides = [
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

export function findLegOption(legId: string): LegOption | undefined {
  return getLegOptions().find((option) => option.legId === legId);
}

export function searchLegOptions(query: string): LegOption[] {
  const needle = query.trim().toLowerCase();
  const options = getLegOptions();
  if (!needle) return options;
  return options.filter((option) => option.searchText.includes(needle));
}
