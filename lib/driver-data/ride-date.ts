import { MOCK_TODAY } from "./mock-trips";

/**
 * Parsing and ordering the seed's own human-readable ride dates.
 *
 * ⛔⛔ **One parser, and it used to be private.** `parseRideDate` lived inside
 * `lib/support-data/member-options.ts`, where the Trip Request member window
 * needed it. Sorting the Upcoming tab needs the same thing, and the two obvious
 * answers were both wrong: importing `support-data` into `driver-data` inverts
 * the dependency (the driver app does not know the support layer exists), and
 * writing a second parser gives two rules that agree until the seed grows a
 * date one of them cannot read. Moved here instead; `member-options` now reads
 * this one.
 *
 * ⚠️ `new Date("Jul 27, 2026")` is a host-dependent parse and this project has
 * already recorded that trade-off once, beside `incentive-utils.ts`'s own date
 * handling. It is accepted here for the same reason: the seed writes dates for
 * people to read, and the alternative is a second date field on every ride that
 * nothing renders and nobody keeps in step with the first.
 */

/**
 * A seeded ride date (`"Mon, Jul 27, 2026"`) as a comparable timestamp.
 *
 * ⚠️ The leading weekday is STRIPPED, not parsed. The seed's weekdays are its
 * own fiction — it calls 2026-07-31 a Thursday where the real date is a Friday
 * — so reading them would make the order disagree with the dates printed on the
 * cards. `NaN` for anything unreadable; every caller checks.
 */
export function parseRideDate(rideDate: string): number {
  return new Date(rideDate.replace(/^\w{3},\s*/, "")).getTime();
}

/** The app's today, as a timestamp, for comparing against a ride date. */
export function mockTodayTime(): number {
  return new Date(`${MOCK_TODAY}T00:00:00`).getTime();
}

/**
 * Rides in the order a day runs — date first, then pick-up time.
 *
 * ⛔⛔ **Total and stable, and both halves matter.** Date alone leaves several
 * rides on the same day in seed order, which is how a manifest ends up showing
 * a 4 PM pick-up above a 7 AM one. A ride whose date cannot be parsed sorts
 * LAST rather than throwing or vanishing — the same choice `groupLegs` makes
 * for a leg with no readable clock.
 *
 * ⚠️ Returns a new array. The seed arrays are module-level constants that half
 * a dozen screens read; sorting one in place would reorder every one of them.
 */
export function sortByRideDate<T extends { date: string; legs: Array<{ time: string }> }>(
  trips: readonly T[],
): T[] {
  return [...trips].sort((a, b) => {
    const left = parseRideDate(a.date);
    const right = parseRideDate(b.date);
    if (Number.isNaN(left)) return Number.isNaN(right) ? 0 : 1;
    if (Number.isNaN(right)) return -1;
    if (left !== right) return left - right;
    return clockMinutes(a.legs[0]?.time) - clockMinutes(b.legs[0]?.time);
  });
}

/**
 * `"2:46 PM"` → minutes past midnight, or **`-1`** when there is no readable
 * clock.
 *
 * ⚠️ Not imported from `add-leg-request.ts`, which has its own `clockToMinutes`
 * returning `null`. That one's null is load-bearing — a will-call leg has no
 * clock and must not be ordered against one. Here an unreadable time sorts to
 * the top of its own day, which is the same "it has no claim on a position"
 * answer in a context that cannot express null.
 *
 * ⛔⛔ **`-1` is not a time, and a caller that forgets is wrong quietly.** It
 * is smaller than midnight, so a band test written as `minutes < 720` puts
 * every unreadable clock in the morning. `ride-filters.ts` checks for it
 * before asking which half of the day a ride falls in; exported rather than
 * copied so there is one parser and one sentinel.
 */
export function clockMinutes(clock: string | undefined): number {
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec((clock ?? "").trim());
  if (!match) return -1;
  const hour = Number(match[1]) % 12;
  const minute = Number(match[2]);
  return (match[3].toUpperCase() === "PM" ? hour + 12 : hour) * 60 + minute;
}

/** The day a ride belongs to, as the heading above it reads. */
export function rideDayKey(trip: { date: string }): string {
  return trip.date;
}

export interface RideDay<T> {
  /** The seed's own date string, which is also the heading. */
  label: string;
  trips: T[];
}

/**
 * Rides grouped under one heading per day, in running order.
 *
 * ⛔ Sorts FIRST, then groups on adjacency. `groupByPickupDay` in
 * `map-view.ts` groups without sorting — it preserves insertion order, which is
 * correct for the Request Feed (already ordered) and wrong here. The two are
 * not interchangeable and this comment exists so nobody swaps them.
 */
export function groupByRideDay<T extends { date: string; legs: Array<{ time: string }> }>(
  trips: readonly T[],
): Array<RideDay<T>> {
  const days: Array<RideDay<T>> = [];
  for (const trip of sortByRideDate(trips)) {
    const last = days[days.length - 1];
    if (last && last.label === rideDayKey(trip)) last.trips.push(trip);
    else days.push({ label: rideDayKey(trip), trips: [trip] });
  }
  return days;
}
