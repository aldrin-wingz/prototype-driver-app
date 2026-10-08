import type { Trip, TripPill } from "@/lib/driver-data/mock-trips";

/**
 * Which rides belong to which solution, and how a scenario ride names itself.
 *
 * ⚠️ **Demo scaffolding, named in `lib/` rather than worked out in a list
 * screen.** Two surfaces read it — the ride card's pill and the My Rides filter
 * — and a ride that filtered into a tab while labelling itself as something else
 * would be worse than no labelling at all.
 */

/** The pill a scenario ride shows IN PLACE OF its production pills. */
export function scenarioPill(trip: Trip): TripPill | null {
  if (!trip.scenario) return null;
  return {
    label: `${trip.scenario.code} · ${trip.scenario.label}`,
    // One variant for every scenario pill, deliberately. These are scaffolding,
    // not product state, so colour-coding them would compete with the real
    // pills' meanings on the same row.
    variant: "warning",
  };
}

/**
 * The pills to render on a card.
 *
 * ⛔ A scenario ride shows ONLY its identifier. Production pills are kept on the
 * seed where they exist, so stripping this scaffolding restores a faithful ride
 * — but showing both would put "Wheelchair" beside "03a · Missed pick-up" and
 * make the demo label read as product state.
 */
export function pillsFor(trip: Trip): TripPill[] {
  const scenario = scenarioPill(trip);
  // ⚠️ `statusPills` survive the swap — they are what a screen is SAYING about
  // the ride right now, not seed decoration.
  return [...(trip.statusPills ?? []), ...(scenario ? [scenario] : trip.pills)];
}

/** Does this ride demonstrate that solution? */
export function isScenarioFor(trip: Trip, solutionId: string): boolean {
  return Boolean(trip.scenario?.solutions.includes(solutionId));
}

/**
 * The rides to list while a solution is focused.
 *
 * ⚠️ `null` means nothing is focused, and then NOTHING is filtered — the app
 * runs as the plain mirror, which is the state every screen was replicated in.
 * Filtering by default would quietly hide the base's own state demos from
 * anyone who opened My Rides without picking a solution first.
 */
export function ridesForSolution(
  trips: Trip[],
  solutionId: string | null
): Trip[] {
  if (!solutionId) return trips;
  return trips.filter((trip) => isScenarioFor(trip, solutionId));
}

/** Every scenario ride, for checks and for counting. */
export function scenarioRides(trips: Trip[]): Trip[] {
  return trips.filter((trip) => trip.scenario);
}
