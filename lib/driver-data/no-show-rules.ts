import { getNextSwipe, type Trip, type TripLeg } from "./mock-trips";

/**
 * Rider No-Show — the two guardrails, and what happens when they are not met.
 *
 * ## Guardrail 1: the ride has to be ready to start, or en-route
 *
 * You cannot no-show a member who is already in the car. But you CAN no-show one
 * before swiping start — a driver who arrives to an empty doorstep never gets to
 * begin the ride, which is the commonest shape of the whole problem.
 *
 * So the window opens once the trip is CONFIRMED and the swipe CTA reads
 * **SWIPE TO START** or **PICK UP MEMBER**, and closes once it reads DROP OFF
 * MEMBER.
 *
 * ⚠️ **The unconfirmed trip is the case this rule exists for**, and it is easy to
 * get wrong: a trip awaiting member confirmation has no swipe marks either, so
 * anything reading swipe state alone concludes "ready to start" and wrongly
 * allows it. Its CTA is the orange **I REACHED OUT TO CONFIRM**, not a swipe —
 * nothing is ready to start until the member is confirmed. Hence the trip-level
 * check below, which cannot be derived from the leg.
 *
 * ⚠️ **The tile is ALWAYS shown**, and refuses with a dialog outside that window —
 * production's behaviour, and the reason it is not hidden: a tile that vanishes
 * leaves a driver hunting for a control they know exists, whereas a dialog naming
 * the rule teaches it.
 *
 * ## Guardrail 2: the wait has to be provable
 *
 * At least **ten minutes**, within **one mile** of the pick-up, counted from the
 * **scheduled pick-up time** onward.
 *
 * ⚠️ **And failing it is not an error.** Production hard-refuses here, which is
 * the whole reason this case exists: a driver waits the full ten minutes, gives
 * up, drives off, and only then remembers the process — at which point the app
 * says no and the only way forward is Zendesk. What the app actually knows is
 * that it *cannot confirm* the wait, which is not the same as knowing the driver
 * did not wait. So we ask them instead.
 */

/**
 * The `No-Show Type:` options on the Member No-Show screen.
 *
 * All three captured from the production picker. The list is complete: the
 * capture shows the same options-then-gap-then-Cancel shape as the app's other
 * action sheets, and nothing sits in the gap.
 *
 * ⚠️ **`Cancel At Door` is not a no-show**, and it is worth noticing that the
 * production screen files it as one. A member who came to the door and cancelled
 * did show up — the driver's problem is the same (a trip that earned nothing) but
 * the claim is different, and Support may well want to treat it differently.
 * Modelled as captured rather than corrected; flagged as an open question.
 *
 * ⚠️ Production renders these in a native action sheet. This prototype uses the
 * app's own `Select`, because a native sheet is not something a web prototype
 * can borrow — the values and the order are faithful, the control is a stand-in.
 */
export const NO_SHOW_TYPES: readonly string[] = [
  "Member Not Home",
  "Cancel At Door",
  "Member Not Ready",
] as const;

/** How long a driver must wait at the pick-up before a no-show is valid. */
export const NO_SHOW_WAIT_MINUTES = 10;

/** How close to the pick-up that wait has to happen. */
export const NO_SHOW_RADIUS_MILES = 1;

/**
 * Why the app could not confirm the wait.
 *
 * Three, because the rule has three parts and a driver told only "we couldn't
 * confirm it" has no idea what to put in the form. Each one names a different
 * thing the app saw.
 */
export type NoShowGap =
  /** Never located within the radius — or never located at all. */
  | "never_near_pickup"
  /** Within the radius, but for less than the required time. */
  | "wait_too_short"
  /** A long enough wait, but it ended before the scheduled pick-up. */
  | "wait_before_pickup_time";

export type NoShowGate =
  | { ok: true; qualifyingMinutes: number }
  | { ok: false; gap: NoShowGap; detail: string };

/**
 * The refusal copy, in the production register.
 *
 * ⚠️ `wait_too_short` is **production's exact wording**, taken from the reference
 * capture — the driver has seen this dialog before and recognising it is the
 * point. The other two are written to match its register, because production has
 * no message for them: it only ever checks the one condition.
 *
 * Kept apart from a gap's `detail`, which is explanatory and belongs on the form
 * that follows. The dialog is a refusal a driver already knows; the form is where
 * we explain ourselves.
 */
export const NO_SHOW_REFUSAL_COPY: Record<NoShowGap, string> = {
  wait_too_short: `Please wait at least ${NO_SHOW_WAIT_MINUTES} minutes at the pick up location before requesting a Member no-show.`,
  never_near_pickup:
    "We could not confirm you were at the pick up location. Please request a Member no-show from the pick up location.",
  wait_before_pickup_time: `Please wait at least ${NO_SHOW_WAIT_MINUTES} minutes at the pick up location after the scheduled pick up time before requesting a Member no-show.`,
};

/** "3:26 PM" → minutes since midnight. `null` when it cannot be read. */
export function toMinutesOfDay(clock: string | null | undefined): number | null {
  if (!clock) return null;
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(clock.trim());
  if (!match) return null;

  const [, rawHour, minute, meridiem] = match;
  const hour = Number(rawHour) % 12;
  const offset = meridiem.toUpperCase() === "PM" ? 12 * 60 : 0;
  return hour * 60 + Number(minute) + offset;
}

/**
 * Minutes of the wait that actually count.
 *
 * The overlap of the window the app observed with everything from the scheduled
 * pick-up onward — which is what makes "after the pick-up time" a real condition
 * rather than a phrase. A driver who waited twenty minutes and drove off before
 * the pick-up time waited twenty minutes for nothing, and this returns 0 for them.
 *
 * ⚠️ Single-day only. Wall-clock with no date, so a pick-up either side of
 * midnight would compute nonsense. Not solved: no leg in the seed spans midnight,
 * and inventing a date here would be guessing.
 */
export function qualifyingWaitMinutes(leg: TripLeg): number | null {
  const evidence = leg.waitEvidence;
  if (!evidence) return null;

  const arrived = toMinutesOfDay(evidence.arrivedAt);
  const left = toMinutesOfDay(evidence.leftAt);
  const pickup = toMinutesOfDay(leg.time);
  if (arrived === null || left === null || pickup === null) return null;

  return Math.max(0, left - Math.max(arrived, pickup));
}

/**
 * Whether the trip is still waiting on the member to confirm.
 *
 * ⚠️ Not derivable from the leg. Its swipe marks are all empty, exactly like a
 * confirmed ride that has not been started — the difference lives on the trip.
 * The driver sees it as the orange I REACHED OUT TO CONFIRM action standing where
 * a swipe would be.
 */
export function isAwaitingMemberConfirmation(trip: Trip): boolean {
  return trip.status === "needs-action";
}

/**
 * Whether a no-show can be filed against this ride at all — guardrail 1.
 *
 * Two conditions, and the first is the one worth stating: **an unconfirmed trip
 * is never ready to start.** Reading swipe state alone would allow it, because an
 * unconfirmed trip and a confirmed-but-unstarted one have identical marks.
 *
 * The second is keyed off the swipe expected NEXT rather than the stage name,
 * because that is how a driver experiences it: the option is live exactly while
 * the button in front of them says SWIPE TO START or PICK UP MEMBER.
 */
export function canFileNoShow(trip: Trip, leg: TripLeg): boolean {
  if (isAwaitingMemberConfirmation(trip)) return false;
  const next = getNextSwipe(leg);
  return next === "start" || next === "pick-up";
}

/**
 * The refusal for a ride outside that window.
 *
 * ⚠️ Production's exact wording, from the reference capture. Shown over the More
 * Options grid, and deliberately a DEAD END with no form behind it: if the member
 * is already in the car there is no no-show to file, so offering to collect one
 * would be collecting a claim that cannot be true.
 */
export const NO_SHOW_STAGE_REFUSAL =
  "Member No-Show is only allowed for rides that are ready to start or en-route.";

/**
 * Guardrail 2, derived from the seeded evidence rather than seeded itself.
 *
 * Deliberately a derivation. Seeding the verdict would make the two constants
 * above decorative and leave the three failing rides differing only by a label —
 * whereas deriving it means each seeded ride genuinely exercises the rule, and
 * changing `NO_SHOW_WAIT_MINUTES` visibly moves which rides pass.
 */
export function resolveNoShowGate(leg: TripLeg): NoShowGate {
  const evidence = leg.waitEvidence;
  const closest = evidence?.closestMiles ?? null;

  // No proof found. NOT "the driver was not there" — the app simply has nothing
  // to say, which is exactly the case worth asking about.
  if (closest === null || closest > NO_SHOW_RADIUS_MILES) {
    return {
      ok: false,
      gap: "never_near_pickup",
      detail:
        closest === null
          ? "We couldn't place you at the pick-up, so we can't confirm the wait ourselves."
          : `The closest we placed you to the pick-up was ${closest} miles, outside the ${NO_SHOW_RADIUS_MILES}-mile range.`,
    };
  }

  const qualifying = qualifyingWaitMinutes(leg);
  if (qualifying === null) {
    return {
      ok: false,
      gap: "never_near_pickup",
      detail: "We couldn't work out how long you waited, so we can't confirm it ourselves.",
    };
  }

  if (qualifying >= NO_SHOW_WAIT_MINUTES) {
    return { ok: true, qualifyingMinutes: qualifying };
  }

  // A wait that ended before the pick-up time is a different story from a short
  // one, and the driver needs to be told which — the answer changes what they
  // write in the form.
  const left = toMinutesOfDay(evidence?.leftAt);
  const pickup = toMinutesOfDay(leg.time);
  if (left !== null && pickup !== null && left <= pickup) {
    return {
      ok: false,
      gap: "wait_before_pickup_time",
      detail: `We saw you at the pick-up from ${evidence?.arrivedAt} to ${evidence?.leftAt}, but that was all before the ${leg.time} pick-up time.`,
    };
  }

  return {
    ok: false,
    gap: "wait_too_short",
    detail: `We could only account for ${qualifying} minute${qualifying === 1 ? "" : "s"} at the pick-up after ${leg.time} — we look for ${NO_SHOW_WAIT_MINUTES}.`,
  };
}
