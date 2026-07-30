import {
  MOCK_TODAY,
  mockCompletedTrips,
  type Trip,
} from "@/lib/driver-data/mock-trips";

/** How far back a member counts as one the driver has recently driven. */
export const MEMBER_WINDOW_DAYS = 30;

/** One selectable member, rolled up from the driver's completed rides. */
export interface MemberOption {
  name: string;
  client: string;
  /** Display date of their most recent completed ride, e.g. "Mon, Jul 27, 2026". */
  lastTripDate: string;
  /** Completed rides with this member inside the window. */
  tripCount: number;
  /** Everything a search should match on, lowercased. */
  searchText: string;
}

/** Parse a seeded ride date ("Mon, Jul 27, 2026") to a comparable timestamp. */
function parseRideDate(rideDate: string): number {
  const parsed = new Date(rideDate.replace(/^\w{3},\s*/, ""));
  return parsed.getTime();
}

function isInsideWindow(trip: Trip): boolean {
  const when = parseRideDate(trip.date);
  if (Number.isNaN(when)) return false;

  const today = new Date(`${MOCK_TODAY}T00:00:00`).getTime();
  const cutoff = today - MEMBER_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  return when >= cutoff && when <= today;
}

/**
 * Members the driver has driven recently, newest ride first.
 *
 * Scoped to the last 30 days of completed rides because of what the selector is
 * for: a Trip Request names upcoming rides that are NOT in the app yet, told to
 * the driver by a member they already know. A member they last drove in 2023 is
 * not that, so offering them would invite a request nobody can act on.
 */
export function getMemberOptions(): MemberOption[] {
  const recent = mockCompletedTrips.filter(isInsideWindow);

  const byName = new Map<string, { trips: Trip[]; latest: number }>();
  for (const trip of recent) {
    const entry = byName.get(trip.rider) ?? { trips: [], latest: 0 };
    entry.trips.push(trip);
    entry.latest = Math.max(entry.latest, parseRideDate(trip.date));
    byName.set(trip.rider, entry);
  }

  return [...byName.entries()]
    .sort((a, b) => b[1].latest - a[1].latest)
    .map(([name, entry]) => {
      const newest =
        entry.trips.find((trip) => parseRideDate(trip.date) === entry.latest) ??
        entry.trips[0];

      return {
        name,
        client: newest.client,
        lastTripDate: newest.date,
        tripCount: entry.trips.length,
        searchText: [name, newest.client, newest.date]
          .join(" ")
          .toLowerCase(),
      };
    });
}

/**
 * Look a member up regardless of the window.
 *
 * Unwindowed for the same reason `findLegOption` is: a saved draft must still
 * display the member it names once their last ride ages past the cutoff.
 */
export function findMemberOption(name: string): MemberOption | undefined {
  const windowed = getMemberOptions().find((option) => option.name === name);
  if (windowed) return windowed;

  const anyTrip = mockCompletedTrips.find((trip) => trip.rider === name);
  if (!anyTrip) return undefined;
  return {
    name,
    client: anyTrip.client,
    lastTripDate: anyTrip.date,
    tripCount: 0,
    searchText: name.toLowerCase(),
  };
}

export function searchMemberOptions(query: string): MemberOption[] {
  const needle = query.trim().toLowerCase();
  const options = getMemberOptions();
  if (!needle) return options;
  return options.filter((option) => option.searchText.includes(needle));
}
