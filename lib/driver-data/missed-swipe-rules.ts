import type { LocationRecord, TripLeg } from "./mock-trips";

/**
 * Missed Swipe — the rules, named here so nothing in JSX can disagree with them.
 *
 * A missed swipe is a leg the driver DROVE but did not mark. Production has no
 * way to record one, so the driver calls Support: 805 calls, the third-largest
 * subject area in the catalogue.
 *
 * ⛔⛔ **Missing the pick-up swipe strands the whole rest of the leg.** The swipe
 * marks fill left to right and the app will not offer DROP OFF MEMBER until
 * PICK UP MEMBER is recorded, so a forgotten pick-up costs the drop-off too.
 * Measured over 30 days of `silver.ride_silver`, on 56,649 legs the driver had
 * swiped en-route:
 *
 * | state at the end of the leg | legs | share |
 * | --- | ---: | ---: |
 * | both marks present | 53,866 | 95.09% |
 * | **neither mark** | 2,521 | **4.45%** |
 * | drop-off missing only | 248 | 0.44% |
 * | **pick-up missing only** | **14** | **0.02%** |
 *
 * Fourteen legs in a month missed only the pick-up, because that state barely
 * exists — miss the pick-up and you miss everything after it. That is the whole
 * reason this slice does not simply open a form: the driver who can still fix it
 * is the one with the member in the car, and a form is what stops them.
 *
 * Of the 2,521, 1,384 are member no-shows and are already explained. The other
 * **1,137 — roughly 38 a day —** are legs the driver started and the record
 * never finished.
 */

/** The three marks a driver makes to move a leg forward. */
export type SwipeMark = "startedAt" | "pickedUpAt" | "droppedOffAt";

/** The two marks this case can reconstruct. En-route is never the missing one. */
export type SwipeAnchor = "pickup" | "dropoff";

/**
 * How near a location fix has to be for the app to say it places the driver
 * at an address.
 *
 * ⚠️ Measured, not assumed. Against a control of 135 normally-swiped legs, a
 * 0.25-mile radius over the driver's background trace placed the driver at the
 * pick-up on 89.6% of them and at the drop-off on 92.6%. Widening to 0.5 miles
 * moved the missed-swipe population by three legs out of 107 — the radius is not
 * what limits the match, so the tighter, more defensible one is kept.
 */
export const MISSED_SWIPE_RADIUS_MILES = 0.25;

/** The marks in the order they are made. */
const MARK_ORDER: SwipeMark[] = ["startedAt", "pickedUpAt", "droppedOffAt"];

/** Which mark each anchor is. */
export const MARK_FOR_ANCHOR: Record<SwipeAnchor, SwipeMark> = {
  pickup: "pickedUpAt",
  dropoff: "droppedOffAt",
};

/**
 * Marks the app has no time for, in order.
 *
 * A leg with no `progress` at all has not been accepted into the swipe sequence,
 * so it has no missing marks — it has no marks.
 */
export function getUnrecordedSwipes(leg: TripLeg): SwipeMark[] {
  const progress = leg.progress;
  if (!progress) return [];
  return MARK_ORDER.filter((mark) => !progress[mark]);
}

/** The anchors this leg is missing, in the order they happened. */
export function getMissingAnchors(leg: TripLeg): SwipeAnchor[] {
  const missing = new Set(getUnrecordedSwipes(leg));
  return (["pickup", "dropoff"] as SwipeAnchor[]).filter((anchor) =>
    missing.has(MARK_FOR_ANCHOR[anchor])
  );
}

/** That fix's distance from this anchor, or `null` when it cannot say. */
function distanceTo(
  record: LocationRecord,
  anchor: SwipeAnchor
): number | null {
  if (anchor === "pickup") return record.distanceMiles;
  return record.dropoffDistanceMiles ?? null;
}

/** Records this anchor can be measured against, newest last. */
function measurableFixes(
  leg: TripLeg,
  anchor: SwipeAnchor
): Array<{ age: number; miles: number; at: string | null }> {
  return (leg.locationRecords ?? [])
    .map((record) => ({
      age: record.ageMinutes,
      miles: distanceTo(record, anchor),
      at: record.at ?? null,
    }))
    .filter(
      (record): record is { age: number; miles: number; at: string | null } =>
        record.miles !== null
    );
}

/**
 * What the driver's location history can say about one end of the leg.
 *
 * Three answers, and the difference between the last two is the point. "We have
 * your trail and you were never there" and "we have no trail" are the same blank
 * field to a driver and completely different claims to Support.
 */
export type AnchorEvidence =
  /**
   * A fix inside the radius. `arrivedAgoMinutes` is the OLDEST such fix.
   *
   * `arrivedAt` is that fix's seeded clock face, or `null` for a record stored
   * without one — see `LocationRecord.at`. The rule decides on the age; the
   * clock is only how the answer is shown.
   */
  | {
      kind: "matched";
      arrivedAgoMinutes: number;
      arrivedAt: string | null;
      closestMiles: number;
    }
  /** Fixes exist for this leg; none of them is near this anchor. */
  | { kind: "no_fix_near"; closestMiles: number }
  /** No fixes at all, or none that can speak to this anchor. */
  | { kind: "no_trace" };

/**
 * Match one end of the leg against the driver's location history.
 *
 * ⛔⛔ **Anchored on the trail, never on the schedule.** The obvious rule — look
 * for a fix "around the scheduled pick-up time" — fails on most real legs. Over
 * 56,731 legs, the gap between the scheduled pick-up and the actual pick-up
 * swipe ran p05 −174 min · p25 −40 · **median −10** · p75 +4 · p95 +52, and only
 * **42.2%** landed within ±15 minutes of schedule. A schedule-anchored window
 * would miss the majority of legs and would miss them WORST on the long trips
 * where reconstruction is hardest. Where the driver was is evidence; when they
 * were due is not.
 *
 * ⚠️ `arrivedAgoMinutes` is the oldest near fix, i.e. when they GOT there — not
 * when the member boarded. The form says so and leaves the field editable: this
 * is a proposal from the trail, not a recorded swipe.
 */
export function matchAnchor(
  leg: TripLeg,
  anchor: SwipeAnchor
): AnchorEvidence {
  const measurable = measurableFixes(leg, anchor);

  if (measurable.length === 0) return { kind: "no_trace" };

  const near = measurable.filter(
    (record) => record.miles <= MISSED_SWIPE_RADIUS_MILES
  );
  const closestMiles = Math.min(...measurable.map((record) => record.miles));

  if (near.length === 0) return { kind: "no_fix_near", closestMiles };

  // The OLDEST near fix: when they got there, not when they left.
  const arrival = near.reduce((oldest, record) =>
    record.age > oldest.age ? record : oldest
  );

  return {
    kind: "matched",
    arrivedAgoMinutes: arrival.age,
    arrivedAt: arrival.at,
    closestMiles,
  };
}

/** Did the trail place the driver at this end of the leg? */
export function anchorMatched(evidence: AnchorEvidence): boolean {
  return evidence.kind === "matched";
}

/**
 * Where a missed swipe goes next.
 *
 * ⛔ The branch is NOT "which swipe was missed" on its own. A missed pick-up
 * with the member still in the car is a leg that can still be driven to its end;
 * the same missed pick-up an hour later is an archaeology problem. Same missing
 * mark, two different products.
 */
export type MissedSwipeRoute =
  /**
   * Don't ask anything yet. Unblock the drop-off, let the driver finish the
   * leg, and collect the pick-up afterwards.
   */
  | { kind: "postpone" }
  /** Open the form, asking about exactly these ends of the leg. */
  | { kind: "form"; asks: SwipeAnchor[] }
  /** Nothing is missing — there is no missed swipe to file. */
  | { kind: "nothing-missing" };

/**
 * Route a missed swipe.
 *
 * `memberAboard` is `null` until the driver has been asked, and is only ever
 * asked when the pick-up is the missing mark — a missed DROP-OFF cannot have the
 * member still in the car, so asking would be asking a question whose answer is
 * already known and whose wrong answer makes no sense.
 */
export function routeMissedSwipe({
  missing,
  memberAboard,
}: {
  missing: SwipeAnchor[];
  memberAboard: boolean | null;
}): MissedSwipeRoute {
  if (missing.length === 0) return { kind: "nothing-missing" };

  if (missing.includes("pickup")) {
    // The member is in the car: the leg is still live, so the drop-off swipe is
    // still the right next action and the pick-up can be reconstructed after it.
    if (memberAboard === true) return { kind: "postpone" };
    // Not aboard, or not yet asked — the leg is over and both ends need filing.
    // ⚠️ `asks` is both anchors even when the drop-off mark happens to exist,
    // because a leg whose pick-up was never recorded cannot have a trustworthy
    // drop-off: production would not have offered that swipe.
    return { kind: "form", asks: ["pickup", "dropoff"] };
  }

  return { kind: "form", asks: ["dropoff"] };
}

/** Does this leg need the "is the member still with you?" question? */
export function asksMemberAboard(leg: TripLeg): boolean {
  return getMissingAnchors(leg).includes("pickup");
}

/**
 * Whether the trail alone could fill every answer the form needs.
 *
 * This is the claim the slice is really making — "if everything is there all
 * they need to do is click submit" — so it is a named rule with its own check
 * rather than something the form works out while rendering.
 */
export function canSubmitUnedited(
  leg: TripLeg,
  asks: SwipeAnchor[]
): boolean {
  return asks.every((anchor) => anchorMatched(matchAnchor(leg, anchor)));
}

/**
 * The swipe to offer, once a postponed pick-up is taken into account.
 *
 * ⛔⛔ **This is the unblock, and it is the whole slice in one function.**
 * Production fills the marks left to right and will not offer DROP OFF MEMBER
 * until PICK UP MEMBER exists — which is why 2,521 legs in a month end at
 * en-route and only 14 end with the pick-up alone missing. A driver who says the
 * member is in the car has told us the leg is still real, so the drop-off is
 * still the right next action and withholding it only guarantees a second
 * missing mark.
 *
 * ⚠️ It moves the BUTTON, never the record. No pick-up time is invented — the
 * mark stays empty and is collected afterwards, from the driver, against a trail
 * that by then has a drop-off in it.
 */
export function offeredSwipe(
  nextSwipe: "start" | "pick-up" | "drop-off" | null,
  pickupPostponed: boolean
): "start" | "pick-up" | "drop-off" | null {
  if (pickupPostponed && nextSwipe === "pick-up") return "drop-off";
  return nextSwipe;
}

/**
 * How far past its closest approach the trail has to recede before the app will
 * say the driver has moved on WITHOUT ever having been inside the radius.
 *
 * ⚠️ This margin is the entire difference between "been and gone" and "still on
 * the way". A driver driving TO a pick-up gets steadily closer, so their latest
 * fix IS their closest one and no margin is cleared. A driver who got near and
 * then drove off recedes past it. Without the margin, every en-route leg in the
 * app would raise a missed-swipe notice.
 */
export const DEPARTURE_MARGIN_MILES = 1;

/**
 * Whether the driver has left one end of the leg.
 *
 * ⛔ `basis` is not decoration. **confirmed** means a fix actually landed inside
 * the radius and a later one did not — the app saw them there and saw them go.
 * **inferred** means the trail never got inside the radius but approached and
 * then receded, which is a weaker claim and has to be WORDED as one. Measured on
 * real missed-swipe legs, the trail confirms the pick-up on 53.3% and the
 * drop-off on 33.6%, so the inferred case is not an edge — it is most of the
 * drop-offs.
 */
export type AnchorDeparture =
  | {
      kind: "left";
      basis: "confirmed" | "inferred";
      closestMiles: number;
      /** Age of the fix the departure is read from. */
      lastSeenAgoMinutes: number;
    }
  /** The newest fix is inside the radius — they are there right now. */
  | { kind: "still_there"; closestMiles: number }
  /** Never got near, still approaching, or no trail to read. */
  | { kind: "never_there"; closestMiles: number | null };

/**
 * Read a departure off the trail.
 *
 * ⚠️ Order matters and is explicit: inside-now beats been-and-gone beats
 * approached-and-receded. A driver sitting at the pick-up must never be told
 * they have left it, however far they wandered earlier in the leg.
 */
export function departedAnchor(
  leg: TripLeg,
  anchor: SwipeAnchor
): AnchorDeparture {
  // Oldest first, so "later than" is just "further along the array".
  const fixes = measurableFixes(leg, anchor).sort((a, b) => b.age - a.age);
  if (fixes.length === 0) return { kind: "never_there", closestMiles: null };

  const closestMiles = Math.min(...fixes.map((fix) => fix.miles));
  const latest = fixes[fixes.length - 1];

  if (latest.miles <= MISSED_SWIPE_RADIUS_MILES) {
    return { kind: "still_there", closestMiles };
  }

  const near = fixes.filter((fix) => fix.miles <= MISSED_SWIPE_RADIUS_MILES);
  if (near.length > 0) {
    return {
      kind: "left",
      basis: "confirmed",
      closestMiles,
      // The LAST fix inside the radius — when they were last seen there.
      lastSeenAgoMinutes: near[near.length - 1].age,
    };
  }

  const closestIndex = fixes.findIndex((fix) => fix.miles === closestMiles);
  const receded = latest.miles > closestMiles + DEPARTURE_MARGIN_MILES;
  if (closestIndex < fixes.length - 1 && receded) {
    return {
      kind: "left",
      basis: "inferred",
      closestMiles,
      lastSeenAgoMinutes: fixes[closestIndex].age,
    };
  }

  return { kind: "never_there", closestMiles };
}

export interface MissedSwipeDetection {
  anchor: SwipeAnchor;
  basis: "confirmed" | "inferred";
  closestMiles: number;
  lastSeenAgoMinutes: number;
}

/**
 * The app's own notice that a swipe is owed — the entry point for this case.
 *
 * ⛔⛔ **This replaces a driver-initiated "I already made this swipe" link, and
 * the difference is the whole point.** A driver who forgot to swipe is by
 * definition not thinking about swiping; asking them to remember to report
 * forgetting is asking for the thing that already failed. The app has the trail,
 * so the app raises it.
 *
 * ⚠️ Three guards, each load-bearing:
 * - **The leg must have started.** A leg with no en-route mark has no swipe to
 *   have missed, and a notice there would invite a filing about a trip that
 *   never happened.
 * - **Only the FIRST missing mark.** Marks fill left to right, so a leg missing
 *   both is missing the pick-up — asking about the drop-off first would ask the
 *   driver to describe the end of a leg whose beginning is unrecorded.
 * - **A departure is required, not just distance.** "Not at the pick-up" is the
 *   normal state of every leg en route to one.
 */
export function detectMissedSwipe(leg: TripLeg): MissedSwipeDetection | null {
  if (!leg.progress?.startedAt) return null;

  for (const anchor of getMissingAnchors(leg)) {
    const departure = departedAnchor(leg, anchor);
    if (departure.kind === "left") {
      return {
        anchor,
        basis: departure.basis,
        closestMiles: departure.closestMiles,
        lastSeenAgoMinutes: departure.lastSeenAgoMinutes,
      };
    }
    // Marks fill left to right: if the first missing one has not been departed,
    // nothing after it can be the subject either.
    return null;
  }
  return null;
}

/**
 * The clock face to stamp on a swipe the driver makes right now.
 *
 * ⚠️ **A prototype-clock concern, and it has to be.** The seed's marks are
 * fictional times on `MOCK_TODAY` — en-route at 11:08 AM — while the real device
 * clock might read 3:59 AM. Stamping the device clock on a drop-off produced a
 * leg that went en-route at 11:08 AM and finished at 3:59 AM, and the form's own
 * time-order checker duly called it impossible.
 *
 * The newest fix on the leg's own trail is the right answer: it is where the
 * driver is at the end of the leg, in the frame every other mark is written in.
 * `null` where the leg has no trail, so the caller can fall back.
 */
export function swipeClockFor(leg: TripLeg): string | null {
  const records = leg.locationRecords ?? [];
  if (records.length === 0) return null;
  const newest = records.reduce((best, record) =>
    record.ageMinutes < best.ageMinutes ? record : best
  );
  return newest.at ?? null;
}
