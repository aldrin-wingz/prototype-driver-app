import { showsProposal, type DemoFocus } from "@/lib/solutions/demo-mode";
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
  /**
   * The leg is still running. Close, record nothing, change nothing.
   *
   * ⛔⛔ **The drop-off's answer to 1a, and it is NOT `postpone`.** A driver who
   * still has the member in the car has not dropped them anywhere, so there is
   * no mark to reconstruct and nothing to unblock — the drop-off is already the
   * offered swipe. The only honest outcome is to get out of their way.
   */
  | { kind: "not-yet" }
  /** Nothing is missing — there is no missed swipe to file. */
  | { kind: "nothing-missing" };

/**
 * Route a missed swipe.
 *
 * ⛔⛔ **BOTH ends ask now, and the drop-off's version was added because the old
 * reasoning was wrong.** This function used to take `memberAboard: boolean |
 * null` and carried a comment saying the question *"is only ever asked when the
 * pick-up is the missing mark — a missed DROP-OFF cannot have the member still
 * in the car"*. That was written when the app raised the question by itself off
 * the trail. The trigger is now **the swipe**, and a drop-off swiped from
 * outside the fence has two perfectly ordinary causes:
 *
 *   - the drop-off already happened somewhere else and was never marked — the
 *     member is long gone, and the leg needs reconstructing;
 *   - the driver is still DRIVING, member aboard, and tapped early.
 *
 * The old rule sent the second one into a reconstruction form for a leg that
 * had not finished. Asking is the fix, and the answer routes to `not-yet`.
 *
 * ⚠️ `memberAboard` is a plain `boolean` with no `null`: every path into this
 * function now goes through the prompt, so "not asked" is not a state that can
 * exist. A caller converted wrongly fails `typecheck` instead of silently
 * taking the old unasked branch.
 */
export function routeMissedSwipe({
  missing,
  memberAboard,
}: {
  missing: SwipeAnchor[];
  memberAboard: boolean;
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

  /**
   * Only the drop-off is missing, so the pick-up time and odometer are facts
   * and stay read-only in anything that follows.
   *
   * ⛔ The member is still in the car: the leg has not ended, so there is
   * nothing to file. ⚠️ Deliberately NOT `postpone` — postponing unblocks a
   * swipe that is already offered, and recording an unasked-for intention
   * about a leg still in motion is how a correct record gets edited.
   */
  if (memberAboard === true) return { kind: "not-yet" };
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

/**
 * Does this leg need the "is the member still with you?" question?
 *
 * ⛔ Any missing anchor does, not just the pick-up — see `routeMissedSwipe`.
 * The question is the same; what differs is the consequence of answering yes.
 */
export function asksMemberAboard(leg: TripLeg): boolean {
  return getMissingAnchors(leg).length > 0;
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
 *
 * ⛔⛔ **And therefore it is GATED (B3e).** Production fills the marks left to
 * right and will not offer DROP OFF MEMBER until PICK UP MEMBER exists — that
 * block is the dead end, and this function is what lifts it. Ungated, a demo
 * that postponed a pick-up on the proposal side and then flipped to `"now"`
 * would keep the unblocked button, showing row 03's own fix as the status quo.
 * The same mistake row 02 shipped and the user found.
 *
 * ⚠️ `focus` is required, with no default: a call site converted wrongly must
 * fail `typecheck` rather than quietly keep the unblock in both modes.
 */
export function offeredSwipe(
  nextSwipe: "start" | "pick-up" | "drop-off" | null,
  pickupPostponed: boolean,
  focus: DemoFocus
): "start" | "pick-up" | "drop-off" | null {
  if (!showsProposal(focus, MISSED_SWIPE_SOLUTIONS)) return nextSwipe;
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
 * signatures (Stage 05). `"not-live"` means this tap is not a drop-off
 * happening now.
 *
 * ⛔⛔ **It was called `"missed-swipe-form"` and the name had started to lie.**
 * It used to be the only thing that happened next, so naming the destination
 * was harmless. Now the drop-off asks the member-aboard question first and the
 * form is only ONE of the two things that can follow — a name pointing straight
 * at the form is an invitation to re-skip the question, which is the exact bug
 * that question was added to fix. This value says what it knows: not live.
 *
 * ⛔⛔ **The member's signature is the whole reason this is a rule and not an
 * `if`.** Stage 05 takes a signature FROM THE MEMBER, so it can only run while
 * they are still in the car. A drop-off the location trail cannot place is a
 * drop-off that may already have happened somewhere else, and sending that
 * swipe to the signature pad would ask the driver to produce a signature from
 * someone who may not be there. ⚠️ **"May" is the correction** — the earlier
 * wording said the member *is* long gone, which is what justified skipping the
 * question. The trail cannot tell that apart from a driver still en route.
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
export type DropOffRoute = "steps" | "not-live";

export function routeDropOffSwipe({
  pickupPostponed,
  trailChallengesDropOff,
}: {
  pickupPostponed: boolean;
  /** `swipeNeedsConfirming(leg, "dropoff")` — the trail cannot place them there. */
  trailChallengesDropOff: boolean;
}): DropOffRoute {
  if (pickupPostponed) return "steps";
  return trailChallengesDropOff ? "not-live" : "steps";
}

/* ===========================================================================
   Catalogue row 03's Now side — what production does with the same tap.
   =========================================================================== */

/**
 * The catalogue row this slice belongs to.
 *
 * ⛔ Row 03 ALONE. Rows 01 and 02 use the same ride list and the same More
 * Options screen, and a shared list would make the no-show rows demonstrate a
 * swipe proposal they have nothing to do with.
 */
export const MISSED_SWIPE_SOLUTIONS: readonly string[] = ["missed-swipe"];

/**
 * ⭐⭐ **`CAP-326`, verbatim — and it is a BLOCK, not a warning.**
 *
 * ⛔⛔ The plan recorded this as *"a warning, not a block — the driver can still
 * swipe and is told the money is at risk"*, read off the body's "Trip payment
 * may be denied". Reading the capture itself says otherwise, three ways:
 *
 * 1. The TITLE is *Unable to complete action*. The action did not happen.
 * 2. This module's own measured data: of 56,649 legs where the driver swiped
 *    en-route, **2,521 (4.45%) end with NEITHER mark**. If the swipe went
 *    through behind a warning those marks would exist.
 * 3. The premise of the whole case — *production has no way to record a missed
 *    swipe, so the driver calls Support* — is only true if the swipe is refused.
 *
 * "Trip payment may be denied" is about having driven to the wrong place, not
 * about the tap succeeding. Corrected 2026-10-14; the user's direction was
 * about the WORDING of the pick-up variant and is unaffected.
 */
export const SWIPE_TOO_FAR_TITLE = "Unable to complete action";

/** The number in the dialog. ⚠️ Production's own, from the capture. */
export const SWIPE_TOO_FAR_PHONE = "+1 (888) 545-4309";

/** The single dismissal. There is no second button and no way forward. */
export const SWIPE_TOO_FAR_DISMISS = "OK";

/**
 * How each end of the leg is named in production's sentence.
 *
 * ⛔⛔ **`dropoff` is CAPTURED; `pickup` is INFERRED.** `CAP-326` shows the
 * drop-off half word for word. The pick-up half has never been shot — user
 * direction 2026-10-14: *"you can assume it will be the same error but says
 * pickup instead of drop off."*
 *
 * ⛔ So it does **not** fold into `driver-app-base`. D2 admits capture-backed or
 * user-confirmed PRODUCTION only, and "the user agreed it is probably the same"
 * is an assumption about wording, not a sighting of it. One capture later and
 * it becomes foldable — until then the flag below is what keeps that honest.
 */
export const SWIPE_TOO_FAR_PLACE: Record<SwipeAnchor, string> = {
  pickup: "pick-up",
  dropoff: "drop-off",
};

/**
 * Which half of this copy has actually been seen.
 *
 * ⚠️ Beside the copy rather than in a comment, so `verify-base` and the fold-in
 * audit can both read it. The same shape `NO_SHOW_REFUSAL_COPY` uses to keep
 * our invented wording out of the base.
 */
export const SWIPE_TOO_FAR_PROVENANCE: Record<SwipeAnchor, "captured" | "inferred"> = {
  pickup: "inferred",
  dropoff: "captured",
};

/**
 * Production's refusal, for one end of the leg.
 *
 * ⚠️ Built from one template rather than two literals, because the two
 * sentences differ by one word and two copies of a sentence are two chances to
 * drift. The word itself is the only thing `SWIPE_TOO_FAR_PLACE` holds.
 */
export function swipeTooFarBody(anchor: SwipeAnchor): string {
  return (
    `You are too far away from the scheduled ${SWIPE_TOO_FAR_PLACE[anchor]} location. ` +
    `Trip payment may be denied. Please contact support if assistance is required. ` +
    SWIPE_TOO_FAR_PHONE
  );
}

/**
 * Where tapping the swipe CTA goes — **both sides of row 03, in one rule**.
 *
 * ⛔⛔ This is the seam. Until B3e the branching lived inside `handleSwipeTap`
 * and production's side did not exist at all: a swipe from outside the geofence
 * opened our prompt in every mode, so row 03 demonstrated its own proposal as
 * the status quo. That is the mistake row 02 shipped and the user found.
 *
 * ⚠️ `routeDropOffSwipe` is CALLED rather than reimplemented. It already owns
 * the member-signature guarantee and has a truth table of its own in
 * `verify-missed-swipe`; B3e adds the mode on top of it instead of beside it.
 */
export type SwipeTapRoute =
  /** Production's alert. One OK, and the mark is not made. */
  | { kind: "production-refusal"; anchor: SwipeAnchor }
  /**
   * The proposal, 1a-or-1b: is the member still in the car?
   *
   * ⛔ `anchor` is the WORDING, not the branch. What happens next is decided by
   * what the leg is missing — `routeMissedSwipe` — so the two cannot disagree
   * about a leg; this only says which end the driver just tapped, so the
   * question can name it.
   */
  | { kind: "ask-member-aboard"; anchor: SwipeAnchor }
  /** The real drop-off sequence — odometer, then both signatures. */
  | { kind: "drop-off-steps" }
  /** Production's own action, which this prototype does not stand in for. */
  | { kind: "production-action" };

export function routeSwipeTap({
  nextSwipe,
  pickupPostponed,
  trailChallengesPickup,
  trailChallengesDropOff,
  focus,
}: {
  /** The OFFERED swipe — `offeredSwipe`, not `getNextSwipe`. */
  nextSwipe: "start" | "pick-up" | "drop-off" | null;
  pickupPostponed: boolean;
  /** `swipeNeedsConfirming(leg, "pickup")` — the trail cannot place them there. */
  trailChallengesPickup: boolean;
  /** `swipeNeedsConfirming(leg, "dropoff")`. */
  trailChallengesDropOff: boolean;
  focus: DemoFocus;
}): SwipeTapRoute {
  const proposing = showsProposal(focus, MISSED_SWIPE_SOLUTIONS);

  if (nextSwipe === "drop-off") {
    const route = routeDropOffSwipe({ pickupPostponed, trailChallengesDropOff });
    if (route === "steps") return { kind: "drop-off-steps" };
    /**
     * ⛔⛔ **This used to go STRAIGHT to the form, and that was the bug.** The
     * trail cannot place this drop-off, which was read as "the member is long
     * gone". It means no such thing on its own: a driver still on the road with
     * the member aboard, tapping early, produces exactly the same reading — and
     * got a reconstruction form for a leg that had not finished. Ask, the same
     * way the pick-up asks; `routeMissedSwipe` turns the answer into either the
     * form or getting out of the way.
     */
    return proposing
      ? { kind: "ask-member-aboard", anchor: "dropoff" }
      : { kind: "production-refusal", anchor: "dropoff" };
  }

  if (nextSwipe === "pick-up" && trailChallengesPickup) {
    return proposing
      ? { kind: "ask-member-aboard", anchor: "pickup" }
      : { kind: "production-refusal", anchor: "pickup" };
  }

  // Inside the geofence, or a mark the trail cannot speak to, or the start.
  return { kind: "production-action" };
}
