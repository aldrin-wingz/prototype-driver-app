import {
  getNextSwipe,
  type LocationRecord,
  type Trip,
  type TripLeg,
} from "./mock-trips";

/**
 * Rider No-Show — the guardrails, ported from the production `canNoshow` check.
 *
 * ## What the server actually enforces
 *
 * The real check walks the driver's location records **newest to oldest**,
 * rejects the moment one is further than the radius, and **stops at the first
 * record ten minutes old**. Which resolves to one sentence:
 *
 * > The driver must have been within 0.5 miles of the pickup, continuously, for
 * > the last ten minutes.
 *
 * The `break` is the whole subtlety and it is why the driver-facing copy is
 * honest. A driver who arrives at `T` is blocked by their own approach records
 * until the arrival record turns ten minutes old — at which point the walk breaks
 * there and never reaches the drive in.
 *
 * ## What this branch changes
 *
 * Production has ONE message for four different situations. Two of them clear on
 * their own if the driver stays put, one never will, and one needs a different
 * action entirely. `resolveNoShow` splits them:
 *
 *   files         every condition met — submit, as production does
 *   timer         will clear by waiting — countdown, and NO form
 *   form          will never clear — only the driver knows, so ask them
 *   confirm-first clears by a different action available now
 *   dead-end      nothing to do, and correctly so
 *
 * ⚠️ **A form must never appear on a `timer`.** The driver is standing at the
 * pickup and simply has not waited long enough; offering a form there turns it
 * into a way to skip the wait.
 */

/** Radius the driver has to be inside. ⚠️ Production compares `0.5` bare — unit unconfirmed. */
export const NO_SHOW_RADIUS_MILES = 0.5;

/** How long that has to have been continuously true. */
export const NO_SHOW_WAIT_MINUTES = 10;

/** How far back the server looks for records. */
export const NO_SHOW_LOOKBACK_MINUTES = 20;

/** WellTrans Indiana only: minutes after the scheduled pickup before filing is allowed. */
export const NO_SHOW_POST_PICKUP_MINUTES = 15;

/**
 * ⚠️ **OURS, not production's.** A fix this far from the pickup on a live trip is
 * not a position, it is a phone with no usable location — a null island, a stale
 * cell-tower guess.
 *
 * Production has a message for exactly this ("No location data has been
 * detected from your phone…") and can never show it, because `canNoshow` inserts
 * a row from the incoming lat/lng before it queries, so its empty-set branch is
 * unreachable. The driver gets "please wait at least 10 minutes" instead — told
 * to wait when the fix is a permissions toggle. This threshold is how we say the
 * right thing.
 */
export const IMPLAUSIBLE_FIX_MILES = 50;

/** ⚠️ Ordered by `-id_location` in production — by PRIMARY KEY, not `created_at`. */
type WalkResult =
  | { ok: true; qualifyingMinutes: number }
  /** No records in the lookback window at all. Unreachable in production — see `IMPLAUSIBLE_FIX_MILES`. */
  | { ok: false; reason: "no_records"; nearRunOldestAge: null }
  /** Hit a record outside the radius. `nearRunOldestAge` is `null` when the LATEST record is the far one. */
  | { ok: false; reason: "blocked_far"; blockedDistanceMiles: number; nearRunOldestAge: number | null }
  /** Every inspected record was inside the radius, but none was old enough. */
  | { ok: false; reason: "no_ten_minute_record"; nearRunOldestAge: number };

/**
 * The production loop, ported line for line so it stays auditable.
 *
 * `nearRunOldestAge` is the piece production throws away and we need: the age of
 * the oldest record in the unbroken near-run from newest. Once that record turns
 * ten minutes old the walk will break on it, so it *is* the countdown target —
 * and its existence is also what proves the driver is at the pickup right now.
 */
export function walkLocationRecords(
  records: readonly LocationRecord[],
  elapsedMinutes = 0
): WalkResult {
  const inWindow = records
    .map((record) => ({ ...record, age: record.ageMinutes + elapsedMinutes }))
    // Newest first, which is what `-id_location` approximates.
    .sort((a, b) => a.age - b.age)
    .filter((record) => record.age <= NO_SHOW_LOOKBACK_MINUTES);

  if (inWindow.length === 0) {
    return { ok: false, reason: "no_records", nearRunOldestAge: null };
  }

  let nearRunOldestAge: number | null = null;
  for (const record of inWindow) {
    if (record.distanceMiles > NO_SHOW_RADIUS_MILES) {
      return {
        ok: false,
        reason: "blocked_far",
        blockedDistanceMiles: record.distanceMiles,
        nearRunOldestAge,
      };
    }
    if (record.age >= NO_SHOW_WAIT_MINUTES) {
      return { ok: true, qualifyingMinutes: record.age };
    }
    nearRunOldestAge = record.age;
  }

  // Ran out of records before finding one ten minutes old.
  return {
    ok: false,
    reason: "no_ten_minute_record",
    nearRunOldestAge: nearRunOldestAge ?? inWindow[inWindow.length - 1].age,
  };
}

/**
 * ⚠️ Not derivable from the leg. An unconfirmed trip's swipe marks are all empty,
 * exactly like a confirmed ride nobody has started — the difference lives on the
 * trip. The driver sees it as the orange I REACHED OUT TO CONFIRM action standing
 * where a swipe would be.
 */
export function isAwaitingMemberConfirmation(trip: Trip): boolean {
  return trip.status === "needs-action";
}

/**
 * The swipe window: SWIPE TO START or PICK UP MEMBER.
 *
 * Production gates on ride status `[ACCEPTED, CHECKED, EN_ROUTE]` and raises a
 * bare `invalid trip status`; the friendly copy is mapped client-side. ⚠️ What
 * `CHECKED` means is unconfirmed, so whether an unconfirmed trip would pass the
 * SERVER check is unknown — here the confirmation gate is enforced above.
 */
export function isInSwipeWindow(leg: TripLeg): boolean {
  const next = getNextSwipe(leg);
  return next === "start" || next === "pick-up";
}

/** ⚠️ The only client-specific rule, and the first in this branch. */
export function requiresPostPickupDelay(trip: Trip): boolean {
  return trip.client === "WellTrans" && trip.market === "IN";
}

export type NoShowFormGap = "not_at_pickup" | "no_location_data";
export type NoShowTimerReason = "presence" | "post-pickup";

export type NoShowOutcome =
  | { kind: "files"; qualifyingMinutes: number }
  | { kind: "timer"; reason: NoShowTimerReason; minutesRemaining: number }
  | { kind: "form"; gap: NoShowFormGap; detail: string }
  | { kind: "confirm-first" }
  | { kind: "dead-end" };

/**
 * The whole ladder, first rung wins.
 *
 * Order matters: confirmation before stage, stage before location, location
 * before the client rule. A driver blocked on two things is told about the one
 * they can act on first.
 */
export function resolveNoShow(
  trip: Trip,
  leg: TripLeg | undefined,
  elapsedMinutes = 0
): NoShowOutcome {
  if (isAwaitingMemberConfirmation(trip)) return { kind: "confirm-first" };
  if (!leg || !isInSwipeWindow(leg)) return { kind: "dead-end" };

  const walk = walkLocationRecords(leg.locationRecords ?? [], elapsedMinutes);

  if (!walk.ok) {
    // No usable position at all — or a fix so far out it cannot be one.
    const bogusFix =
      walk.reason === "blocked_far" &&
      walk.nearRunOldestAge === null &&
      walk.blockedDistanceMiles > IMPLAUSIBLE_FIX_MILES;

    if (walk.reason === "no_records" || bogusFix) {
      return {
        kind: "form",
        gap: "no_location_data",
        detail:
          "We're not getting a location from your phone, so we can't confirm the wait ourselves.",
      };
    }

    // The discriminator production throws away: is the driver here RIGHT NOW.
    // A near-run means the newest records are inside the radius, so staying put
    // will clear this on its own — a form here would skip the wait.
    if (walk.nearRunOldestAge !== null) {
      return {
        kind: "timer",
        reason: "presence",
        minutesRemaining: Math.max(
          0,
          NO_SHOW_WAIT_MINUTES - walk.nearRunOldestAge
        ),
      };
    }

    // Latest record is outside the radius: they have left, or never arrived, or
    // the pickup is bigger than the radius. Waiting cannot fix any of those.
    return {
      kind: "form",
      gap: "not_at_pickup",
      detail:
        walk.reason === "blocked_far"
          ? `We last had you ${walk.blockedDistanceMiles.toFixed(1)} miles from the pick-up, outside the ${NO_SHOW_RADIUS_MILES}-mile range.`
          : "We couldn't place you at the pick-up, so we can't confirm the wait ourselves.",
    };
  }

  if (requiresPostPickupDelay(trip)) {
    const since = (leg.minutesSinceScheduledPickup ?? 0) + elapsedMinutes;
    if (since < NO_SHOW_POST_PICKUP_MINUTES) {
      return {
        kind: "timer",
        reason: "post-pickup",
        minutesRemaining: NO_SHOW_POST_PICKUP_MINUTES - since,
      };
    }
  }

  return { kind: "files", qualifyingMinutes: walk.qualifyingMinutes };
}

/**
 * The stretch the app DID see the driver at the pick-up, if any.
 *
 * Ages in minutes, oldest and newest sighting of the contiguous near-run
 * measured from the oldest end of the record stream.
 *
 * This exists for the form. On the commonest failure — waited, gave up, drove
 * off — the app can see the whole wait; it just is not in the last ten minutes.
 * Prefilling from it turns the form into "we saw you here from X to Y, is that
 * right?" rather than a blank interrogation. Returns `null` when there is no
 * near sighting at all, which is the honest answer for a driver who never
 * arrived or whose phone had no fix — those forms open empty.
 */
export function inferNearWindow(
  leg: TripLeg
): { arrivedAgoMinutes: number; lastSeenAgoMinutes: number } | null {
  const near = (leg.locationRecords ?? [])
    .filter((record) => record.distanceMiles <= NO_SHOW_RADIUS_MILES)
    .map((record) => record.ageMinutes)
    .sort((a, b) => a - b);
  if (near.length === 0) return null;
  return {
    arrivedAgoMinutes: near[near.length - 1],
    lastSeenAgoMinutes: near[0],
  };
}

/**
 * ⚠️ **DEMO SCAFFOLDING. Not a product concept.**
 *
 * Which row of the comparison matrix a ride demonstrates. The rows come in
 * pairs: a plain number is **production as it behaves today**, kept so a reviewer
 * can see the before; a decimal is a **proposal**.
 *
 * This exists because 3, 3.1 and 3.2 are the same guardrail state — the driver
 * has not been at the pick-up long enough — and differ only in how the app says
 * so. No amount of seeded location data can distinguish them, so the treatment
 * has to be declared per ride.
 */
export type NoShowDemoRow =
  | "3" | "3.1" | "3.2"
  | "4" | "4.1" | "4.2"
  | "5"
  | "WV1" | "WV1.1";

export interface NoShowTreatment {
  /** Where the refusal appears — after the driver has invested effort, or before. */
  refuseAt: "submit" | "more";
  /** Production's exact wording, or the revised copy. */
  copy: "production" | "revised";
  /** Put the live countdown in the refusal. */
  showTimer: boolean;
  /** Offer the support form as a way forward. */
  offerForm: boolean;
}

/**
 * The matrix, as config.
 *
 * ⚠️ Note what the `as-is` rows have in common: **`offerForm: false`**. Production
 * refuses and stops — the "Submit support form" button is the proposal, not the
 * status quo, and an as-is ride that offered it would misrepresent today.
 */
export const NO_SHOW_TREATMENTS: Record<NoShowDemoRow, NoShowTreatment> = {
  // ── Scenario 3 — no 10 consecutive minutes at the pick-up ──
  /** Today. Refused at Submit, production's wording, no timer, dead end. */
  "3": { refuseAt: "submit", copy: "production", showTimer: false, offerForm: false },
  /** Proposal: the same refusal, now carrying the countdown. */
  "3.1": { refuseAt: "submit", copy: "production", showTimer: true, offerForm: false },
  /** Proposal: the countdown moves to the tile tap, before any effort is spent. */
  "3.2": { refuseAt: "more", copy: "production", showTimer: true, offerForm: false },

  // ── Scenario 4 — latest location outside the radius ──
  /** Today. ⚠️ Production tells a driver who has LEFT to wait where they are. */
  "4": { refuseAt: "submit", copy: "production", showTimer: false, offerForm: false },
  /** Proposal: copy that is true for this driver, and a way forward. */
  "4.1": { refuseAt: "submit", copy: "revised", showTimer: false, offerForm: true },
  /** Proposal: the same, on the tile tap — they never enter a screen that cannot help. */
  "4.2": { refuseAt: "more", copy: "revised", showTimer: false, offerForm: true },

  // ── Scenario 5 — no location points at all in the window ──
  /**
   * No as-is/proposal split, because there is nothing to compare against:
   * production's own message for this case is **unreachable** (it inserts a
   * location row before it queries), so a driver with no fix gets "wait 10
   * minutes" today. This row is the corrected behaviour, and the form is the way
   * forward because nothing they do at the pick-up will produce a fix.
   */
  "5": { refuseAt: "submit", copy: "revised", showTimer: false, offerForm: true },

  // ── WellTrans Indiana — not yet 15 minutes past the pick-up ──
  /** Today. */
  WV1: { refuseAt: "submit", copy: "production", showTimer: false, offerForm: false },
  /** Proposal: countdown, and explicit that BOTH rules have to hold. */
  "WV1.1": { refuseAt: "submit", copy: "revised", showTimer: true, offerForm: false },
};

/** The treatment for a ride, defaulting to today's behaviour. */
export function treatmentFor(trip: Trip): NoShowTreatment {
  return trip.noShowDemo
    ? NO_SHOW_TREATMENTS[trip.noShowDemo]
    : { refuseAt: "submit", copy: "production", showTimer: false, offerForm: false };
}

/**
 * WV 1.1 spells out that the location rule still applies.
 *
 * Without it a WellTrans driver watching the pick-up clock would reasonably think
 * it is the only thing between them and filing — and wander off the pick-up while
 * it runs, resetting the ten minutes they had already banked.
 */
export const NO_SHOW_BOTH_RULES_COPY =
  `You also need to stay within ${NO_SHOW_RADIUS_MILES} miles of the pick-up for ${NO_SHOW_WAIT_MINUTES} minutes without leaving — both have to be true.`;

/** Whether Member No-Show is offered without a refusal. Kept for the tile's own check. */
export function canFileNoShow(trip: Trip, leg: TripLeg): boolean {
  return !isAwaitingMemberConfirmation(trip) && isInSwipeWindow(leg);
}

/**
 * The refusal copy, in the production register.
 *
 * ⚠️ The presence line is production's **exact wording** — the driver has seen
 * this dialog before and recognising it is the point. The others match its
 * register, because production has no message for them.
 */
export const NO_SHOW_REFUSAL_COPY = {
  presence: `Please wait at least ${NO_SHOW_WAIT_MINUTES} minutes at the pick up location before requesting a Member no-show.`,
  "post-pickup": `Please wait at least ${NO_SHOW_POST_PICKUP_MINUTES} minutes after the scheduled pick up time before requesting a Member no-show.`,
  /**
   * ⚠️ **OURS, and a correction — not production's wording.**
   *
   * Production says "please wait at least 10 minutes at the pick up location",
   * which is **actively wrong advice** for the driver this fires on: their latest
   * fix is outside the radius, so they have left or never arrived, and waiting
   * where they are now can never clear it. The one thing that would help is
   * either going back, or telling us what happened — so the message says that.
   */
  not_at_pickup:
    "You must be at the pick-up location to report a Member no-show. If you were there earlier and have already left, use the support form below.",
  no_location_data:
    "No location data has been detected from your phone. Please verify that your phone has the correct location settings before you request a Member no-show from the app.",
} as const;

/** Guardrail 1's refusal — production's exact wording, and a deliberate dead end. */
export const NO_SHOW_STAGE_REFUSAL =
  "Member No-Show is only allowed for rides that are ready to start or en-route.";

/** The `No-Show Type:` options, all three captured from the production picker. */
export const NO_SHOW_TYPES: readonly string[] = [
  "Member Not Home",
  "Cancel At Door",
  "Member Not Ready",
] as const;
