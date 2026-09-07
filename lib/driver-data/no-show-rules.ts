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

/**
 * Minutes after the scheduled pickup before a no-show may be filed.
 *
 * ⚠️ **Every market has this rule now, not just Indiana.** WellTrans IN keeps its
 * fifteen minutes; everywhere else the boundary is the pickup time itself — you
 * cannot no-show a ride that is not due yet.
 *
 * `0` is a real threshold, not "no rule": the check is `since < threshold`, so at
 * `0` it refuses exactly while `since` is negative, which is the whole point.
 *
 * ⚠️ Combined with the ten-minute presence rule this makes the earliest possible
 * filing **`max(arrival + 10, scheduled pickup + threshold)`**. A driver who
 * arrives 10:45 for an 11:00 pickup satisfies presence at 10:55 and still waits
 * until 11:00.
 */
export const NO_SHOW_POST_PICKUP_MINUTES = 15;
export const NO_SHOW_PICKUP_TIME_MINUTES = 0;

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

/**
 * How long after the scheduled pickup this trip has to wait.
 *
 * ⚠️ **This is a tightening, and the only one in this project.** Every other
 * proposal here opens a path that production closes; this one closes a path
 * production leaves open. Today a Verida GA driver who arrives early and waits
 * ten minutes CAN file before the pickup time. After this they cannot. That is a
 * real behaviour change for early arrivals, deliberately made.
 *
 * Returns a threshold rather than a boolean so there is one code path and one
 * comparison. A boolean would have meant "Indiana does this, others do not",
 * which is exactly the shape that stops being true — and did.
 */
export function postPickupThresholdMinutes(trip: Trip): number | null {
  // Indiana's fifteen minutes is production today and always applies.
  if (trip.client === "WellTrans" && trip.market === "IN") {
    return NO_SHOW_POST_PICKUP_MINUTES;
  }
  // ⚠️ `null` means NO GATE, which is production for every other market — and it
  // has to remain reachable, because the matrix's as-is row for this rule is a
  // driver who files BEFORE the pick-up and succeeds. If the gate were
  // unconditional in code, that row could not demonstrate the before.
  return treatmentFor(trip).pickupTimeGate
    ? NO_SHOW_PICKUP_TIME_MINUTES
    : null;
}

/** ⚠️ Kept only to name the Indiana case; the rule itself is universal now. */
export function requiresExtendedPostPickupDelay(trip: Trip): boolean {
  return (postPickupThresholdMinutes(trip) ?? 0) > NO_SHOW_PICKUP_TIME_MINUTES;
}

/** "11:40 AM" → minutes since midnight, or `null` if it cannot be read. */
function clockToMinutes(clock: string): number | null {
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(clock.trim());
  if (!match) return null;
  const [, rawHour, minute, meridiem] = match;
  const hour = Number(rawHour) % 12;
  return hour * 60 + Number(minute) + (meridiem.toUpperCase() === "PM" ? 720 : 0);
}

/** 715 → "11:55 AM". */
function minutesToClock(minutes: number): string {
  const wrapped = ((Math.round(minutes) % 1440) + 1440) % 1440;
  const hour24 = Math.floor(wrapped / 60);
  const hour = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour}:${String(wrapped % 60).padStart(2, "0")} ${hour24 < 12 ? "AM" : "PM"}`;
}

/**
 * The clock time a WellTrans Indiana filing becomes available.
 *
 * ⚠️ Derived from the leg's **scheduled pick-up**, never from `Date.now()`, and
 * that matters twice. It is what production would do — the boundary is a fixed
 * moment, `scheduled_pickup + 15`, not a rolling target. And it keeps the
 * prototype coherent: ride times here are seeded, so adding minutes to the real
 * clock produced things like "2:29 AM" on a ride whose pick-up reads 1:50 PM.
 *
 * `null` when the leg's time cannot be read — then say nothing rather than guess.
 */
export function postPickupAvailableAt(
  leg: TripLeg,
  thresholdMinutes = NO_SHOW_POST_PICKUP_MINUTES
): string | null {
  const pickup = clockToMinutes(leg.time);
  return pickup === null ? null : minutesToClock(pickup + thresholdMinutes);
}

export type NoShowFormGap = "not_at_pickup" | "no_location_data";

/**
 * Why the driver is being asked to wait.
 *
 * `presence`    — not yet ten unbroken minutes at the pick-up.
 * `post-pickup` — the ride is not due yet (or, in Indiana, not due long enough).
 */
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

  const threshold = postPickupThresholdMinutes(trip);
  if (threshold !== null) {
    const since = (leg.minutesSinceScheduledPickup ?? 0) + elapsedMinutes;
    if (since < threshold) {
      return {
        kind: "timer",
        reason: "post-pickup",
        minutesRemaining: threshold - since,
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
  | "3" | "3.1"
  | "4" | "4.1"
  | "5"
  | "WV1" | "WV1.1"
  | "6" | "6.1";

export interface NoShowTreatment {
  /** Production's exact wording, or the revised copy. */
  copy: "production" | "revised";
  /** Put the live countdown in the refusal. */
  showTimer: boolean;
  /** Offer the support form as a way forward. */
  offerForm: boolean;
  /**
   * Whether the universal pick-up-time boundary is enforced for this ride.
   *
   * ⚠️ Unlike every other flag here, this one changes the OUTCOME rather than the
   * wording — it is the difference between the as-is row filing successfully
   * before the pick-up and the proposal row refusing. It exists because that
   * refusal is new: production has no pick-up-time rule outside Indiana, so
   * "before" is a ride that goes through, and there is no way to seed that except
   * to declare it.
   *
   * Indiana's fifteen-minute rule ignores this — it is production today.
   */
  pickupTimeGate: boolean;
}

/**
 * The matrix, as config.
 *
 * ⚠️ **Everything is refused at Submit.** Rows that refused from the More tile
 * were scrapped once it was confirmed the production lookback runs only on
 * Submit: before that the app has performed no location check at all, so it
 * cannot honestly say anything — not in a dialog, and not on a tile pill.
 *
 * ⚠️ Note what the `as-is` rows have in common: **`offerForm: false`**. Production
 * refuses and stops — the "Submit support form" button is the proposal, not the
 * status quo, and an as-is ride that offered it would misrepresent today.
 */
export const NO_SHOW_TREATMENTS: Record<NoShowDemoRow, NoShowTreatment> = {
  // ── Scenario 3 — no 10 consecutive minutes at the pick-up ──
  /** Today. Refused at Submit, production's wording, no timer, dead end. */
  "3": {
    copy: "production",
    showTimer: false,
    offerForm: false,
    pickupTimeGate: true,
  },
  /**
   * Proposal: the same refusal, now carrying the live countdown.
   *
   * ⚠️ It used to also branch on the no-show type — `Cancel At Door` skipped the
   * wait entirely. That type is out of scope, so this row is now the one thing it
   * always was underneath: tell the driver how much longer.
   */
  "3.1": {
    copy: "production",
    showTimer: true,
    offerForm: false,
    pickupTimeGate: true,
  },

  // ── Scenario 4 — latest location outside the radius ──
  /** Today. ⚠️ Production tells a driver who has LEFT to wait where they are. */
  "4": {
    copy: "production",
    showTimer: false,
    offerForm: false,
    pickupTimeGate: true,
  },
  /** Proposal: copy that is true for this driver, and a way forward. */
  "4.1": {
    copy: "revised",
    showTimer: false,
    offerForm: true,
    pickupTimeGate: true,
  },

  // ── Scenario 5 — no location points at all in the window ──
  /**
   * No as-is/proposal split, because there is nothing to compare against:
   * production's own message for this case is **unreachable** (it inserts a
   * location row before it queries), so a driver with no fix gets "wait 10
   * minutes" today. This row is the corrected behaviour.
   */
  "5": {
    copy: "revised",
    showTimer: false,
    offerForm: true,
    pickupTimeGate: true,
  },

  // ── Scenario 6 — not yet the scheduled pick-up time, outside Indiana ──
  /**
   * Today, and it is the one row where "today" means **it goes through**.
   *
   * ⚠️ Every other as-is row in this matrix is a refusal. This one is a driver
   * who arrived early, waited their ten minutes and files BEFORE the ride is
   * due — which production allows outside Indiana, because the post-pickup rule
   * is client-specific there. Seeded so the tightening below has a visible before.
   */
  "6": {
    copy: "production",
    showTimer: false,
    offerForm: false,
    // The row's entire point: no pick-up-time gate, so it files.
    pickupTimeGate: false,
  },
  /**
   * The finalised behaviour: refused until the pick-up time, everywhere.
   *
   * ⚠️ A NEW guardrail, not revised copy for an old one — so `copy: "revised"` is
   * the only option; production has no message for it. It gets the countdown
   * because this is a wait that clears on its own, which is the same reason 3.1
   * has one.
   */
  "6.1": {
    copy: "revised",
    showTimer: true,
    offerForm: false,
    pickupTimeGate: true,
  },

  // ── WellTrans Indiana — not yet 15 minutes past the pick-up ──
  /** Today. */
  WV1: {
    copy: "production",
    showTimer: false,
    offerForm: false,
    pickupTimeGate: true,
  },
  /** Proposal: countdown, and both rules named rather than just the window. */
  "WV1.1": {
    copy: "revised",
    showTimer: true,
    offerForm: false,
    pickupTimeGate: true,
  },
};

/** The treatment for a ride, defaulting to today's behaviour. */
export function treatmentFor(trip: Trip): NoShowTreatment {
  return (
    (trip.noShowDemo && NO_SHOW_TREATMENTS[trip.noShowDemo]) || {
      copy: "production",
      showTimer: false,
      offerForm: false,
      // ⚠️ The default is the FINALISED behaviour, not production's. An untagged
      // ride is an ordinary ride in the shipped app; only the tagged as-is rows
      // reproduce what production does today.
      pickupTimeGate: true,
    }
  );
}

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
    "You are not at the pick-up location. A Member no-show can only be reported from the pick-up. If you were there earlier and have already left, use the support form below.",
  no_location_data:
    "No location data has been detected from your phone. Please verify that your phone has the correct location settings before you request a Member no-show from the app.",
} as const;

/**
 * WellTrans Indiana's refusal, which production already parameterises.
 *
 * ⚠️ **This corrects an earlier assumption of mine.** "Production never tells a
 * driver how long to wait" is true of the presence check and **false here** — the
 * real string carries `({remaining} minute(s) remaining)`. So the as-is row is
 * not silent about time; it states a number, computed once at the moment of
 * refusal and stale the instant it is read.
 *
 * `production` is that string verbatim — plural parentheses, and "marking"
 * rather than "requesting" — because those are the words a driver recognises.
 *
 * `revised` keeps the opening and then does the thing a number cannot: names the
 * **clock time** it becomes available, so the driver can plan instead of
 * re-tapping to watch a smaller number. It also names the location requirement,
 * which production omits — a driver told only about the pick-up window wanders
 * off and resets the ten minutes they had banked.
 */
export function postPickupRefusalCopy({
  copy,
  remainingMinutes,
  availableAt,
  thresholdMinutes,
}: {
  copy: "production" | "revised";
  remainingMinutes: number;
  availableAt: string | null;
  /** 15 in WellTrans Indiana, 0 everywhere else. */
  thresholdMinutes: number;
}): string {
  const locationLine =
    `You also need to be at the pick-up when you submit, and to have been within ` +
    `${NO_SHOW_RADIUS_MILES} miles of it for ${NO_SHOW_WAIT_MINUTES} minutes without leaving.`;

  /**
   * ⚠️ The pick-up-time boundary needs its own sentence, not the Indiana string
   * with a `0` in it. "Please wait at least 0 minutes after the scheduled pickup
   * time" is not a sentence, and a driver reading it would reasonably conclude
   * the app is broken. It also has no production counterpart to quote — this rule
   * does not exist outside Indiana today — so there is only the revised register.
   */
  if (thresholdMinutes <= 0) {
    return (
      `A Member no-show can only be reported from the scheduled pick-up time ` +
      `onwards${availableAt ? ` — that is ${availableAt}` : ""}. ${locationLine}`
    );
  }

  const opening =
    `Please wait at least ${thresholdMinutes} minutes after the scheduled ` +
    `pickup time before marking a Member no-show`;

  if (copy === "production") {
    // `Math.max(1, ...)`: production counts whole minutes remaining, and a
    // refusal that says "0 minute(s) remaining" reads as a bug rather than a wait.
    const remaining = Math.max(1, Math.ceil(remainingMinutes));
    return `${opening} (${remaining} minute(s) remaining).`;
  }

  return (
    `${opening}${availableAt ? ` — this will be available at ${availableAt}` : ""}. ` +
    locationLine
  );
}

/** Guardrail 1's refusal — production's exact wording, and a deliberate dead end. */
export const NO_SHOW_STAGE_REFUSAL =
  "Member No-Show is only allowed for rides that are ready to start or en-route.";

/**
 * The `No-Show Type:` options.
 *
 * ⚠️ Production's picker offers a third, `Cancel At Door`, and this release
 * deliberately does not: that claim is established by a person rather than by a
 * wait, so it needs its own questions and its own guardrail. Out of scope here,
 * and left out of the list rather than hidden in the UI — a value the form can
 * still produce is a value Support has to handle.
 */
export const NO_SHOW_TYPES: readonly string[] = [
  "Member Not Home",
  "Member Not Ready",
] as const;
