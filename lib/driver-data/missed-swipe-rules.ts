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
    // 1a — the member is in the car, so the leg is still live. The drop-off is
    // still the right next action and gets swiped properly, odometer and
    // signature and all; only the pick-up is left to reconstruct.
    if (memberAboard === true) return { kind: "postpone" };
    // 1b — the member is gone. Nothing was swiped live, so both ends are
    // unknown and the rider signature was never taken.
    return { kind: "form", asks: ["pickup", "dropoff"] };
  }

  // Ride 2 — the pick-up was swiped properly and only the drop-off is missing,
  // so the pick-up time and odometer are facts and stay read-only.
  return { kind: "form", asks: ["dropoff"] };
}

/**
 * Does this path leave the MEMBER's signature untaken?
 *
 * ⛔⛔ **Only the member's.** `CAP-098` shows production's Ride Signature screen
 * taking TWO — `Driver Signature` and `Member Signature`, one green Submit — and
 * that distinction is the whole rule. The driver is present whenever this form
 * is filled, so their signature can always be collected; the member has gone, so
 * theirs cannot be collected ever. An earlier version read the capture as one
 * "member signature" pad and therefore recorded BOTH as lost, which threw away a
 * signature that was there for the taking.
 *
 * Only 1a escapes it entirely: there the member is still in the car and the
 * drop-off runs the real Stage 04→05 steps, so both panels are signed.
 */
export function leavesMemberSignatureMissing(asks: SwipeAnchor[]): boolean {
  return asks.includes("dropoff");
}

/** Does this leg need the "is the member still with you?" question? */
export function asksMemberAboard(leg: TripLeg): boolean {
  return getMissingAnchors(leg).includes("pickup");
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
 * Is the driver inside the geofence for this end of the leg, right now?
 *
 * ⛔⛔ **This is the trigger, and the SWIPE is what fires it.** An earlier
 * version had the app raise the question when the RIDE WAS OPENED, off a
 * "been and gone" reading of the trail. That was wrong twice over: it
 * interrupted a driver who had asked for nothing, and it needed elaborate
 * machinery — a recede margin, a departure basis — purely to avoid firing on
 * every leg merely en route to a pick-up.
 *
 * Tapping PICK UP MEMBER is the driver saying they have the member. If they are
 * not at the pick-up when they say it, the swipe cannot be recorded where it
 * happened — and that, not a background guess, is the moment to ask. All that
 * machinery went with it.
 *
 * `null` when no fix can speak to this anchor: the app cannot say someone is
 * outside a fence it cannot see.
 */
export function insideGeofence(
  leg: TripLeg,
  anchor: SwipeAnchor
): boolean | null {
  const fixes = measurableFixes(leg, anchor);
  if (fixes.length === 0) return null;
  const latest = fixes.reduce((newest, fix) =>
    fix.age < newest.age ? fix : newest
  );
  return latest.miles <= MISSED_SWIPE_RADIUS_MILES;
}

/**
 * Should this swipe open the missed-swipe flow instead of simply recording?
 *
 * ⚠️ `false` when the app has no fix at all. With no location there is nothing
 * to contradict the driver, and interrogating them anyway would be the app
 * asserting a suspicion it cannot support.
 */
export function swipeNeedsConfirming(
  leg: TripLeg,
  anchor: SwipeAnchor
): boolean {
  return insideGeofence(leg, anchor) === false;
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

/**
 * Where tapping DROP OFF MEMBER goes.
 *
 * `"steps"` is the production sequence — odometer (Stage 04 Step 2), then both
 * signatures (Stage 05). `"missed-swipe-form"` reconstructs a leg whose
 * drop-off was never marked live.
 *
 * ⛔⛔ **The member's signature is the whole reason this is a rule and not an
 * `if`.** Stage 05 takes a signature FROM THE MEMBER, so it can only run while
 * they are still in the car. A drop-off the location trail cannot place is a
 * drop-off that already happened somewhere else — the member is long gone — and
 * sending that swipe to the signature pad would ask the driver to produce a
 * signature from someone who is not there. The honest outcome there is that the
 * member's signature is missing for good, which is what the form records.
 *
 * ⚠️ `pickupPostponed` wins over everything, and that is not an oversight: the
 * driver has just told us in so many words that the member is in the car. It is
 * the one case where the trail disagreeing with the swipe does not matter,
 * because a human answered the question the trail was guessing at.
 *
 * ⛔ Extracted from `handleSwipeTap` on 2026-10-12, when an ordinary drop-off
 * started running the steps too. Before that the rule was "only the postponed
 * path opens them" and a check asserted it by counting call sites in the
 * source. Counting call sites was always a proxy; what matters is that no path
 * reaches Stage 05 with the member gone, and that is a truth table.
 */
export type DropOffRoute = "steps" | "missed-swipe-form";

export function routeDropOffSwipe({
  pickupPostponed,
  trailChallengesDropOff,
}: {
  pickupPostponed: boolean;
  /** `swipeNeedsConfirming(leg, "dropoff")` — the trail cannot place them there. */
  trailChallengesDropOff: boolean;
}): DropOffRoute {
  if (pickupPostponed) return "steps";
  return trailChallengesDropOff ? "missed-swipe-form" : "steps";
}
