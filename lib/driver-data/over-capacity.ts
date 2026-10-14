import { clockMinutes } from "./ride-date";
import { ID_BADGE } from "./id-badge";
import { showsProposal, type DemoFocus } from "@/lib/solutions/demo-mode";
import type { SeatBlockConfig } from "@/types/support";
import type { Trip } from "./mock-trips";

/**
 * Catalogue rows **11 and 12** — over-capacity trips, and what production does
 * with one today.
 *
 * ⭐⭐ **It is not a block. It is a phone number.** D7 and the capture list both
 * described this as *"trying to accept a trip that exceeds vehicle capacity —
 * the over-capacity block"*, i.e. an attempt met with a refusal. `CAP-340`
 * shows there is no attempt: the Request Details screen simply **has no accept
 * control**. Where `SWIPE TO ACCEPT` would be there is a pink swipe reading
 * `Over Capacity Trip # …` / `SWIPE TO CALL DISPATCH`, and completing it dials
 * (user-confirmed, 2026-10-14).
 *
 * That is a stronger finding than a block would have been. A block at least
 * says what went wrong; this says only *over capacity* and a reference number,
 * and hands the driver a telephone. It IS the support call rows 11 and 12 exist
 * to remove.
 *
 * ⛔⛔ **Now-only, and there is no Proposed side.** Both rows are
 * `klass: "no-app-surface"` — a one-off data cleanse and a backend path, with
 * nothing to build in the driver app. So this surface is reached through
 * `nowEntry`, never `entry`, and the mode toggle does not render for either
 * row. A switch offering a proposal that does not exist is the "toggle that
 * does nothing" this project has already shipped twice.
 *
 * ⚠️ **`CAP-340` is a TEST-DATA capture**, and the plan's open question is
 * answered by reading it: `Rider: RiderFirst RiderLast`, `4567 Test Dr`,
 * `1234 Test Dr`, `8552.7 mi away`. No production trip carries those. The
 * macOS window chrome says desktop build; no footer version is in frame. So
 * the STRING TEMPLATE below is capture-backed and the BEHAVIOUR is
 * user-confirmed, but the environment is not established — see
 * `OVER_CAPACITY_PROVENANCE`.
 */

/**
 * The catalogue rows this surface belongs to.
 *
 * ⚠️ Both, because rows 11 and 12 are one dead end: the same screen serves the
 * stale-capacity case and the changed-vehicle case, and the driver cannot tell
 * which they are in. Declared once so the two cannot drift.
 */
export const OVER_CAPACITY_SOLUTIONS: readonly string[] = [
  "vehicle-capacity-cleanse",
  "vehicle-capacity-backend",
  /**
   * ⭐ Row 13, added 2026-10-15 — the in-app request that replaces the phone
   * number. It stands on the SAME screen as the two above, so it claims the
   * same scenario ride: focusing it has to land on the request whose accept
   * control is missing, or there is nothing to propose a fix for.
   */
  "over-capacity-exception",
];

/**
 * The catalogue row the EXCEPTION REQUEST belongs to.
 *
 * ⛔⛔ **One row, not three.** `OVER_CAPACITY_SOLUTIONS` above is the rows the
 * SCREEN serves and all three share it; this is the row whose PROPOSAL is
 * built. Gating on all three would light the request form while a reviewer was
 * standing on row 11, which proposes a data cleanse — the "two proposals in one
 * flow read as one feature" trap `showsProposal` exists to prevent.
 */
export const OVER_CAPACITY_EXCEPTION_SOLUTIONS: readonly string[] = [
  "over-capacity-exception",
];

/**
 * Whether the driver is offered the request instead of the telephone.
 *
 * ⛔⛔ **This gates the FOOTER and nothing else.** The request screen itself,
 * its missing accept control and the `Over Capacity Trip #` line are all
 * production's, captured in `CAP-340`, and they stay on both sides. What the
 * proposal replaces is the one control at the bottom: a number to ring becomes
 * a request to file.
 */
export function showsCapacityException(focus: DemoFocus): boolean {
  return showsProposal(focus, OVER_CAPACITY_EXCEPTION_SOLUTIONS);
}

/** The swipe's first line, before the trip number. `CAP-340`, verbatim. */
export const OVER_CAPACITY_PREFIX = "Over Capacity Trip #";

/** Its second line. `CAP-340`, verbatim. */
export const OVER_CAPACITY_SWIPE_LABEL = "SWIPE TO CALL DISPATCH";

/**
 * The number the swipe dials.
 *
 * ⛔⛔ **OURS, and it has to be.** `CAP-340` shows the swipe and not the dial —
 * the number is nowhere on screen. The user confirmed the behaviour, not a
 * number. So this is seeded fiction in the reserved **555-01xx** range, like
 * every other number in this repo, and it must never be presented as
 * production's dispatch line.
 *
 * ⛔⛔ And it is DISPATCH's, not the driver's. The first version of this line
 * was `(555) 0142`, copied from `ACCOUNT_ON_FILE.phone` — the driver's own
 * number on the Account screen. The swipe would have dialled the person
 * holding the phone, and nothing about the screen would have looked wrong.
 * Checked against every seeded number in `lib/driver-data`.
 */
export const OVER_CAPACITY_DISPATCH_PHONE = "(470) 555-0188";

/**
 * Which parts of this surface have actually been seen.
 *
 * ⚠️ Beside the copy rather than in a comment, so the fold-in audit can read it.
 * The same shape `SWIPE_TOO_FAR_PROVENANCE` uses for row 03's inferred half.
 *
 * ⛔ `environment: "unestablished"` is why none of this folds into
 * `driver-app-base` yet. D2 admits capture-backed or user-confirmed PRODUCTION
 * only, and a capture full of `Test Dr` with no footer version establishes the
 * SHAPE of the screen, not the build it came from. One production capture later
 * and this becomes foldable.
 */
export const OVER_CAPACITY_PROVENANCE = {
  copy: "captured",
  behaviour: "user-confirmed",
  environment: "unestablished",
  dispatchNumber: "ours",
} as const;

/**
 * Is this request over the vehicle's capacity?
 *
 * ⛔ Presence of the dispatch number is the predicate, not a separate boolean.
 * The screen cannot render the swipe without the number — it is in the first
 * line — so a trip flagged over-capacity with no number would be a trip whose
 * CTA has a blank where its reference should be. One field, and it carries the
 * thing the driver reads down the phone.
 */
export function isOverCapacity(trip: Trip): boolean {
  return Boolean(trip.overCapacityTripNumber);
}

/**
 * The swipe's first line, for this trip.
 *
 * ⚠️ `CAP-340` shows a THIRD identifier here: the header reads
 * `#202610131450161`, `Leg:` repeats it, and the swipe says `Trip # 2156877`.
 * The one number the driver reads down the phone appears nowhere else on the
 * screen — which is its own small finding about the call, and why this is a
 * stored field rather than the trip's own id.
 */
export function overCapacityHeadline(trip: Trip): string {
  return `${OVER_CAPACITY_PREFIX} ${trip.overCapacityTripNumber ?? ""}`.trim();
}

/**
 * Where the completed swipe goes.
 *
 * ⚠️ A real `tel:` href rather than a handler, because that is what dialling
 * is — and because a prototype that only *says* it would dial cannot be told
 * apart from one that does nothing. Harmless on a desktop browser, which is
 * where this is demonstrated.
 */
export function dispatchDialHref(): string {
  return `tel:${OVER_CAPACITY_DISPATCH_PHONE.replace(/[^0-9]/g, "")}`;
}

// ---------------------------------------------------------------------------
// Catalogue row 13 — the exception request that replaces the phone number
// ---------------------------------------------------------------------------
/**
 * ⭐⭐ **The user's answer to the question rows 11 and 12 left open**, given
 * 2026-10-15: *"instead of swipe and then it will call make it a submit form
 * where it will show the trips that are blocking them from taking it and then
 * them to give a reason why they can take another"*.
 *
 * That settles a question that had been open since 2026-10-14 — whether the
 * over-capacity case is an exception for ONE trip, a correction to the stored
 * vehicle capacity, or a form that branches on which. It is **the one-trip
 * exception**, and the correction falls out of it: a driver whose answer is
 * *"my van seats seven, the record says five"* has just reported the data
 * error row 11 proposes to clean, without having to know that is what they
 * did.
 *
 * ⛔⛔ **Submitting changes NOTHING about the request.** It stays unacceptable
 * until Support acts, exactly as Update Trip Details leaves the ride's times
 * alone and Add Leg adds nothing to the manifest. What it removes is the phone
 * call, not the block.
 */

/**
 * How many seats the driver's record says they have.
 *
 * ⛔⛔ **Ours, and the first seat count this prototype has ever held.** The
 * driver app has no vehicle record — `ID_BADGE` is the only screen that names
 * the vehicle at all, and a badge carries no capacity. So the number is seeded
 * fiction, and it is seeded LOW on purpose: five against a request for four
 * plus three already aboard is the shape of the call, and it is also the shape
 * of row 11's data error, which is what makes one form serve both.
 *
 * ⚠️ The vehicle DESCRIPTION is deliberately not duplicated here — it is read
 * off `ID_BADGE.vehicle`, the app's only statement about what the driver
 * drives. Two screens disagreeing about the vehicle is the exact failure a
 * second copy invites.
 */
export const VEHICLE_SEATS_ON_RECORD = 5;

/** One accepted trip holding seats while the request would be running. */
export interface SeatBlock {
  trip: Trip;
  /** Passengers this trip has aboard. */
  seats: number;
  /** Minutes past midnight, for the overlap arithmetic. */
  from: number;
  to: number;
  /** The seed's own clock faces, for the screen. */
  fromLabel: string;
  toLabel: string;
}

/**
 * The window a trip occupies, in minutes past midnight.
 *
 * ⛔ First leg's time to LAST leg's time, not first to second. A three-leg
 * trip's middle leg is inside the window by construction, and a window that
 * stopped at leg two would under-report every multi-leg ride — which here
 * means under-reporting the seats it holds.
 *
 * ⚠️ `null` when either end has no readable clock. `clockMinutes` returns -1
 * for `Will-Call` and for a blank, and a will-call trip genuinely has no
 * window: it starts when the member rings. Treating -1 as midnight would put
 * every will-call ride on top of every early-morning request.
 */
export function tripWindow(trip: Trip): { from: number; to: number } | null {
  const first = clockMinutes(trip.legs[0]?.time);
  const last = clockMinutes(trip.legs[trip.legs.length - 1]?.time);
  if (first < 0 || last < 0) return null;
  return { from: Math.min(first, last), to: Math.max(first, last) };
}

/**
 * The accepted trips whose window overlaps this request's, same day.
 *
 * ⛔⛔ **Touching ends do NOT overlap.** A trip that drops off at 9:05 and a
 * request that picks up at 9:05 share a boundary, not a passenger — the seat
 * is free the moment the first one ends. Using `<=` here would invent a
 * blocking trip the driver can see is finished, which is the one thing a
 * screen like this must never do.
 *
 * ⚠️ Same `date` STRING, not a parsed day. The seed's dates are the headings
 * the app prints, and two rides on one day always carry the identical string;
 * parsing would add a failure mode without adding an answer.
 */
export function blockingTrips(request: Trip, accepted: readonly Trip[]): SeatBlock[] {
  const window = tripWindow(request);
  if (!window) return [];
  return accepted
    .filter((trip) => trip.id !== request.id && trip.date === request.date)
    .flatMap((trip) => {
      const other = tripWindow(trip);
      if (!other) return [];
      if (other.to <= window.from || other.from >= window.to) return [];
      return [
        {
          trip,
          seats: trip.passengerCount,
          from: other.from,
          to: other.to,
          fromLabel: trip.legs[0]?.time ?? "",
          toLabel: trip.legs[trip.legs.length - 1]?.time ?? "",
        },
      ];
    })
    .sort((a, b) => a.from - b.from);
}

/**
 * The most seats held at any one moment inside the request's own window.
 *
 * ⛔⛔ **A peak, never a sum.** Two blocking trips that do not overlap EACH
 * OTHER never share the vehicle, so adding their passengers would report seats
 * that are never occupied at once — and the request would be refused for a
 * conflict that does not exist. Walked minute by minute over the boundaries
 * inside the window, which is exact for intervals and needs no clock.
 *
 * ⚠️ Boundaries only, not every minute. Occupancy changes only where a trip
 * starts, so sampling each block's `from` (clamped into the window) visits
 * every distinct level there is.
 */
export function peakSeatsHeld(request: Trip, blocks: readonly SeatBlock[]): number {
  const window = tripWindow(request);
  if (!window || blocks.length === 0) return 0;
  const samples = [window.from, ...blocks.map((b) => Math.max(b.from, window.from))];
  return Math.max(
    ...samples.map((at) =>
      blocks
        .filter((b) => b.from <= at && b.to > at)
        .reduce((total, b) => total + b.seats, 0),
    ),
  );
}

/** Seats the vehicle would need to carry this request on top of what it holds. */
export function seatsNeeded(request: Trip, blocks: readonly SeatBlock[]): number {
  return request.passengerCount + peakSeatsHeld(request, blocks);
}

/** How many seats short the record is. Zero or less means it is not short. */
export function seatsOver(request: Trip, blocks: readonly SeatBlock[]): number {
  return seatsNeeded(request, blocks) - VEHICLE_SEATS_ON_RECORD;
}

/**
 * Does the ARITHMETIC agree that this request is over capacity?
 *
 * ⛔⛔ **Not a replacement for `isOverCapacity`, and must never become one.**
 * Production decides over-capacity server-side against rules this prototype
 * does not have — wheelchair positions, ambulatory seats, client policy — and
 * the app is simply told. `isOverCapacity` stays seeded because that is the
 * shape of the real thing. This exists so a check can assert the seed and the
 * story the FORM tells agree: a screen that says "three seats held, four
 * needed, five on record" while the server's flag came from somewhere else
 * would be a screen explaining a refusal that had a different reason.
 */
export function arithmeticSaysOver(request: Trip, accepted: readonly Trip[]): boolean {
  return seatsOver(request, blockingTrips(request, accepted)) > 0;
}

/**
 * When the vehicle is fullest inside the request's window, and how full.
 *
 * ⚠️ The screen needs the MOMENT as well as the number. "3 seats held" beside
 * two rides that between them carry three is arithmetic the driver has to do;
 * "3 seats between 9:20 and 9:30 AM" is the fact, and it is also the sentence
 * that explains why two non-overlapping rides would NOT have added up.
 *
 * ⛔ Returns the first peak when several moments tie. There is nothing to
 * choose between them and picking the last would read as arbitrary; a check
 * asserts the window it names really does hold the number it claims.
 */
export function peakSeatWindow(
  request: Trip,
  blocks: readonly SeatBlock[],
): { from: number; to: number; seats: number } | null {
  const window = tripWindow(request);
  if (!window || blocks.length === 0) return null;
  const edges = [
    ...new Set([window.from, ...blocks.map((b) => Math.max(b.from, window.from))]),
  ].sort((a, b) => a - b);
  let best: { from: number; to: number; seats: number } | null = null;
  for (const [i, at] of edges.entries()) {
    const covering = blocks.filter((b) => b.from <= at && b.to > at);
    const seats = covering.reduce((total, b) => total + b.seats, 0);
    if (seats === 0 || (best && seats <= best.seats)) continue;
    const until = Math.min(
      window.to,
      edges[i + 1] ?? window.to,
      ...covering.map((b) => b.to),
    );
    best = { from: at, to: until, seats };
  }
  return best;
}

// ---- Driver-facing copy ---------------------------------------------------
/**
 * ⛔⛔ **Every string below is OURS.** `CAP-340` photographs production's dead
 * end and nothing else — there is no captured screen for a form production
 * does not have. Kept together so the fold-in audit can see in one place that
 * none of it is a replication claim.
 */
/**
 * The proposal's replacement for the ACCEPT half of production's pill.
 *
 * ⛔⛔ **It replaces the accept half and nothing else.** The reject half stays,
 * reading production's own `REQUEST_SWIPE_REJECT` — user direction 2026-10-15:
 * *"I think we should still allow them to reject"*. ⭐ That is a finding about
 * production as much as a design choice: the over-capacity screen removes the
 * WHOLE pill, so today a driver who cannot take the trip cannot decline it
 * either. It sits on their feed until it expires, and the only control on the
 * screen is a telephone.
 *
 * ⚠️ Deliberately parallel in shape to the two strings it sits beside —
 * `Swipe to …` — because it occupies the same half of the same control. An
 * earlier version read "Request a capacity exception" on a full-width button,
 * which said the same thing while throwing away the control production has
 * trained the driver on.
 */
export const OVER_CAPACITY_SWIPE_REQUEST = "Swipe to Request";
export const OVER_CAPACITY_FORM_SUBMIT = "Send Request";
export const OVER_CAPACITY_SEATS_TITLE = "What is holding the seats";
export const OVER_CAPACITY_SEATS_HELP =
  "These are the trips you have already accepted that overlap this one.";
/** The vehicle line's label. The vehicle itself comes from `ID_BADGE`. */
export const OVER_CAPACITY_VEHICLE_LABEL = "On your record";
export const OVER_CAPACITY_REASON_LABEL = "Why can you still take this trip?";
export const OVER_CAPACITY_SUCCESS =
  "Nothing is accepted yet. Support will check the seats against your answer and come back to you — the trip stays in Requests until they do.";

/** The reason options, and the one that reports a data error. */
export const OC_REASON_MORE_SEATS = "more-seats";
export const OC_REASON_FINISHES_FIRST = "finishes-first";
export const OC_REASON_TRAVELLING_TOGETHER = "travelling-together";
export const OC_REASON_COVERED = "covered";
export const OC_REASON_OTHER = "other";

/**
 * ⭐⭐ **`OC_REASON_MORE_SEATS` is catalogue row 11, asked as a question.**
 *
 * Row 11 proposes a one-off cleanse of stored vehicle capacity. A driver who
 * picks this option has just reported exactly the record row 11 would clean,
 * and the seat count they give is the value to clean it to — without ever
 * having to know that is what they did. One form, two rows served.
 *
 * ⛔ The others are genuine one-trip exceptions and must NOT be read as data
 * errors. A driver whose first ride finishes before this one starts has a
 * correct record and a scheduling answer; treating that as a capacity
 * correction would overwrite a right number with a wrong one.
 */
export const OVER_CAPACITY_REASONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: OC_REASON_MORE_SEATS, label: "My vehicle has more seats than the record shows" },
  { value: OC_REASON_FINISHES_FIRST, label: "One of these trips will be done before this pick-up" },
  { value: OC_REASON_TRAVELLING_TOGETHER, label: "These members are travelling together" },
  { value: OC_REASON_COVERED, label: "Another driver is covering one of these trips" },
  { value: OC_REASON_OTHER, label: "Other" },
];

/**
 * The rules above, assembled into the one object the panel draws.
 *
 * ⛔⛔ **The only constructor.** `SeatBlocksField` computes nothing and the
 * form component computes nothing; both read this. A second assembly site is
 * how the panel and the check start agreeing with each other while disagreeing
 * with the arithmetic — the failure this repo has already shipped once, with
 * one rule copied into six renderers that all agreed and were all wrong.
 *
 * ⚠️ `vehicle` comes from `ID_BADGE`, the app's only statement about what the
 * driver drives. Not retyped here, and not a parameter: a caller that could
 * pass a different vehicle is a caller that eventually will.
 */
export function buildSeatBlocks(
  request: Trip,
  accepted: readonly Trip[],
): SeatBlockConfig {
  const blocks = blockingTrips(request, accepted);
  const peak = peakSeatWindow(request, blocks);
  return {
    vehicle: ID_BADGE.vehicle,
    seatsOnRecord: VEHICLE_SEATS_ON_RECORD,
    seatsRequested: request.passengerCount,
    seatsNeeded: seatsNeeded(request, blocks),
    peakLabel: peak
      ? `${peak.seats} ${peak.seats === 1 ? "seat" : "seats"}, ` +
        `${clockLabelOf(peak.from)} - ${clockLabelOf(peak.to)}`
      : "",
    rows: blocks.map((block) => ({
      rideId: block.trip.id,
      rider: block.trip.rider,
      client: block.trip.client,
      fromLabel: block.fromLabel,
      toLabel: block.toLabel,
      seats: block.seats,
    })),
  };
}

/**
 * Minutes past midnight, back to the clock face the seed writes.
 *
 * ⚠️ Its own function rather than `clockLabel` from `ride-filters.ts`: that one
 * is the ride FILTER's, it has an `Any` edge case the filter needs, and reusing
 * it would make a filter's vocabulary load-bearing for a support form.
 */
function clockLabelOf(minutes: number): string {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const suffix = hour < 12 ? "AM" : "PM";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}:${String(minute).padStart(2, "0")} ${suffix}`;
}
