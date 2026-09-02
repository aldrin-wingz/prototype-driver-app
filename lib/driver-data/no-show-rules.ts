import { getLegStage, type TripLeg } from "./mock-trips";

/**
 * Rider No-Show — the two guardrails, and what happens when they are not met.
 *
 * ## Guardrail 1: the trip has to be en-route
 *
 * You cannot no-show a ride you never started, and you cannot no-show a member
 * already in the car. So the tile is not offered at all outside that window —
 * hidden rather than disabled, because a control that appears and then refuses
 * teaches a driver to distrust the screen.
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
 * Whether a no-show can be filed against this leg at all — guardrail 1.
 *
 * `started` exactly: en-route, not yet picked up.
 */
export function canFileNoShow(leg: TripLeg): boolean {
  return getLegStage(leg) === "started";
}

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
