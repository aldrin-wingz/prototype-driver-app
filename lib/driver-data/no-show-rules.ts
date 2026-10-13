import { showsProposal, type DemoFocus } from "@/lib/solutions/demo-mode";
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
 * ⚠️ The no-show TYPE enters this ladder at exactly one rung: `Cancel At Door`
 * waives the ten-minute `timer`, because production already makes that driver
 * name who refused them at the door. It waives nothing else — not the presence
 * requirement, not the pick-up-time gate. See `NO_SHOW_TYPE_FORMS`.
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
export function postPickupThresholdMinutes(trip: Trip, focus: DemoFocus): number | null {
  // Indiana's fifteen minutes is production today and always applies.
  if (trip.client === "WellTrans" && trip.market === "IN") {
    return NO_SHOW_POST_PICKUP_MINUTES;
  }
  // ⚠️ `null` means NO GATE, which is production for every other market — and it
  // has to remain reachable, because the matrix's as-is row for this rule is a
  // driver who files BEFORE the pick-up and succeeds. If the gate were
  // unconditional in code, that row could not demonstrate the before.
  return treatmentFor(trip, focus).pickupTimeGate
    ? NO_SHOW_PICKUP_TIME_MINUTES
    : null;
}

/** ⚠️ Kept only to name the Indiana case; the rule itself is universal now. */
export function requiresExtendedPostPickupDelay(trip: Trip, focus: DemoFocus): boolean {
  return (postPickupThresholdMinutes(trip, focus) ?? 0) > NO_SHOW_PICKUP_TIME_MINUTES;
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
  /**
   * `presenceWaitWaived` is how a caller tells the two ways of getting here
   * apart: ten unbroken minutes at the pick-up, or a Cancel At Door that was
   * short of them. The copy differs, so the flag has to travel with the outcome
   * rather than be re-derived from the type at each call site.
   */
  | { kind: "files"; qualifyingMinutes: number; presenceWaitWaived: boolean }
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
  /**
   * ⛔ Third and REQUIRED, ahead of the two optional tails. Making it optional
   * would let a call site compile while silently asking about the proposal on a
   * screen that is meant to be showing production.
   */
  focus: DemoFocus,
  elapsedMinutes = 0,
  /**
   * ⚠️ Defaults to `null`, which means "no type chosen yet" and takes the
   * unwaived path. Callers that know the type MUST pass it — the Member No-Show
   * screen does, at Submit, which is the only moment both the type and the
   * location walk exist.
   */
  noShowType: string | null = null
): NoShowOutcome {
  if (isAwaitingMemberConfirmation(trip)) return { kind: "confirm-first" };
  if (!leg || !isInSwipeWindow(leg)) return { kind: "dead-end" };

  const walk = walkLocationRecords(leg.locationRecords ?? [], elapsedMinutes);

  /**
   * Set only on the waived path, and only ever to a near-run age — so a filing
   * that skipped the wait still reports how long the app DID see the driver
   * there, rather than claiming ten minutes it never observed.
   */
  let waivedQualifyingMinutes: number | null = null;

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
      /**
       * ⚠️ **The one place the type changes the outcome.** The near-run is what
       * proves the driver is AT the pick-up; the only thing missing is duration,
       * and duration is exactly what a member refusing at the door makes moot.
       *
       * Note where this sits: after the no-location and bogus-fix branches, and
       * before the not-at-pick-up branch — so a Cancel At Door driver who is not
       * actually there still falls through to the form, as they must.
       */
      if (waivesPresenceWait(noShowType, focus)) {
        waivedQualifyingMinutes = walk.nearRunOldestAge;
      } else {
        return {
          kind: "timer",
          reason: "presence",
          minutesRemaining: Math.max(
            0,
            NO_SHOW_WAIT_MINUTES - walk.nearRunOldestAge
          ),
        };
      }
    } else {
      // Latest record is outside the radius: they have left, or never arrived,
      // or the pickup is bigger than the radius. Waiting cannot fix any of
      // those — and neither can a no-show type.
      return {
        kind: "form",
        gap: "not_at_pickup",
        detail:
          walk.reason === "blocked_far"
            ? `We last had you ${walk.blockedDistanceMiles.toFixed(1)} miles from the pick-up, outside the ${NO_SHOW_RADIUS_MILES}-mile range.`
            : "We couldn't place you at the pick-up, so we can't confirm the wait ourselves.",
      };
    }
  }

  const threshold = postPickupThresholdMinutes(trip, focus);
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

  // ⚠️ Reached on BOTH paths, which is the point: the pick-up-time gate is not
  // waived by any type. A Cancel At Door on a ride that is not due yet is still
  // a timer, exactly as it is for the other two.
  return walk.ok
    ? {
        kind: "files",
        qualifyingMinutes: walk.qualifyingMinutes,
        presenceWaitWaived: false,
      }
    : {
        kind: "files",
        qualifyingMinutes: waivedQualifyingMinutes ?? 0,
        presenceWaitWaived: true,
      };
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
/**
 * ⭐ Catalogue rows **01** (Rider no-show) and **02** (Cancel at Door) are ONE
 * build: the same screen, the same matrix, the same refusals. Declared here
 * where the rule reads it, so the two cannot drift into disagreeing about which
 * prototype they are part of.
 */
export const NO_SHOW_SOLUTIONS: readonly string[] = [
  "rider-no-show",
  "cancel-at-door",
];

/**
 * Row **02**'s own proposal, and ONLY row 02's: *let Cancel at Door skip the
 * ten-minute wait*.
 *
 * ⛔⛔ A narrower owner list than `NO_SHOW_SOLUTIONS` on purpose. The two rows
 * share a screen and a refusal matrix, which is why `treatmentFor` is gated on
 * both — but the waiver is one row's feature, and a proposal belongs to its own
 * build. Focus row 01 and a Cancel At Door still waits, because waiving the
 * wait is not row 01's argument.
 */
export const CANCEL_AT_DOOR_SOLUTIONS: readonly string[] = ["cancel-at-door"];

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

/**
 * An ordinary ride in the SHIPPED app — the finalised behaviour, which is what
 * an untagged ride has always meant here.
 *
 * ⚠️ It is a hybrid, and that is deliberate rather than sloppy: production's
 * wording and production's dead end, but the pick-up-time guardrail, which is
 * ours. Only the last of the three is finalised; the other two are simply what
 * we have not changed.
 */
export const FINALISED_TREATMENT: NoShowTreatment = {
  copy: "production",
  showTimer: false,
  offerForm: false,
  pickupTimeGate: true,
};

/**
 * An ordinary ride in PRODUCTION, today.
 *
 * ⛔⛔ One flag apart from `FINALISED_TREATMENT`, and it is the flag that
 * changes the OUTCOME rather than the wording: **production has no
 * pick-up-time rule outside Indiana**, so a driver who arrived early, waited
 * their ten minutes and files before the ride is due gets through. Matrix row
 * `"6"` is the standing evidence for that, and this is the same fact applied to
 * every untagged ride.
 *
 * ⚠️ So "Now" is not simply "the proposal with the new copy removed". For this
 * slice it is also a ride that SUCCEEDS where the shipped app refuses.
 */
export const PRODUCTION_TREATMENT: NoShowTreatment = {
  copy: "production",
  showTimer: false,
  offerForm: false,
  pickupTimeGate: false,
};

/**
 * Which row of the matrix shows what production does today, for each row.
 *
 * ⛔⛔ **Declared, never parsed from the id.** Stripping `".1"` off a row name
 * would work for four of the nine and quietly invent an answer for the rest —
 * `"5"` has no as-is row at all, and `"WV1.1"` is not `"WV1"` by any string rule
 * that does not also claim `"WV1"` has a proposal called `"WV"`. A map is nine
 * lines and cannot be wrong by accident.
 *
 * ⚠️ As-is rows map to themselves: asking "what does production do on a ride
 * that already shows production" has to be answerable, and the answer is the
 * ride itself.
 */
export const NO_SHOW_AS_IS_PAIR: Record<NoShowDemoRow, NoShowDemoRow> = {
  "3": "3",
  "3.1": "3",
  "4": "4",
  "4.1": "4",
  /**
   * ⛔ Row 5 is its OWN as-is row, and that is not a shortcut. Production's
   * message for "no location points at all" is unreachable — the app inserts a
   * location row before it queries — so a driver with no fix is told to wait ten
   * minutes today. There is no production screen to show, so the honest Now for
   * this row is the row itself, flagged as the one place the comparison cannot
   * be made.
   */
  "5": "5",
  "6": "6",
  "6.1": "6",
  WV1: "WV1",
  "WV1.1": "WV1",
};

/**
 * The treatment for a ride, on the side of the comparison being shown.
 *
 * ⭐ The whole of catalogue rows 01 and 02 in one function. `"fixed"` is what
 * the app has always done: the ride's own matrix row, or the finalised default.
 * `"now"` walks to that row's as-is twin, or — for a ride with no tag — to
 * `PRODUCTION_TREATMENT`.
 *
 * ⛔ The focus gate is `showsProposal`, so a ride visited while ANOTHER row is
 * focused also shows production. A reviewer walking row 19 who wanders into
 * Member No-Show must not meet rows 01/02's proposal on the way past — the same
 * rule the More Options grid and the Reach Rider modal follow.
 */
export function treatmentFor(trip: Trip, focus: DemoFocus): NoShowTreatment {
  const tagged = trip.noShowDemo ? NO_SHOW_TREATMENTS[trip.noShowDemo] : null;
  if (showsProposal(focus, NO_SHOW_SOLUTIONS)) return tagged ?? FINALISED_TREATMENT;
  if (!trip.noShowDemo) return PRODUCTION_TREATMENT;
  return NO_SHOW_TREATMENTS[NO_SHOW_AS_IS_PAIR[trip.noShowDemo]];
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
 * The `No-Show Type:` options — all three, exactly as production's picker shows
 * them. The picker is a native action sheet: three rows then Cancel (`CAP-230`).
 */
export const NO_SHOW_TYPES = [
  "Member Not Home",
  "Cancel At Door",
  "Member Not Ready",
] as const;

export type NoShowType = (typeof NO_SHOW_TYPES)[number];

/**
 * What the form looks like for a given type.
 *
 * ⛔ **This reverses the finalised 2026-09-07 decision, and the reversal is
 * forced by evidence.** That decision recorded that the no-show type "is a
 * LABEL, not a branch", that all three types "produce the same form", and that
 * nothing in the app reads the value to decide anything. The 2026-10-09
 * production shoot (`CAP-232`/`CAP-233`/`CAP-234`, all three selections from one
 * session 34 seconds apart) disproves every clause: the type changes the field
 * set, the helper copy, and whose signature is being taken.
 *
 * `CAP-233` is the control that makes it attributable — same build, same
 * session, Member Not Home, reading "Driver Signature" with no `Spoke with`
 * field. Without it the Apr-2026 captures and the Oct-2026 one differed by two
 * variables at once and proved nothing.
 *
 * ⚠️ **`*` is production's required marker, and no signature label carries
 * one.** Only `Spoke with` does. The signature is optional in all three states;
 * the name is required, and only on Cancel At Door. That matches the warehouse:
 * `bronze.ride_observation.spoke_with` is ~99% populated for Cancel At Door and
 * carries a `"nothing"` sentinel elsewhere, and no signature column exists
 * anywhere in bronze, silver or gold.
 */
export interface NoShowTypeForm {
  /** An extra field this type adds, or `null`. Production marks it required with `*`. */
  extraField: { id: string; label: string } | null;
  /** A line of guidance under the type select, or `null`. */
  helper: string | null;
  /** Whose signature the pad is taking. */
  signatureLabel: string;
  /**
   * Whether this type's OWN required evidence stands in for the ten-minute
   * presence wait — and which field is that evidence.
   *
   * ⚠️ **This is the proposal; everything else in this record is replication.**
   * Declared per type rather than derived from `extraField`, because "has an
   * extra field" and "has waited long enough" are unrelated facts that happen to
   * coincide on exactly one row today. Deriving one from the other would extend
   * the bypass silently the first time another type gained a field.
   *
   * ⚠️ It waives the DURATION, never the PRESENCE. A driver whose latest fix is
   * outside the radius still cannot file — they cannot have been spoken to at
   * the door from somewhere else — and the pick-up-time gate is untouched.
   */
  presenceWaitWaivedBy: string | null;
}

export const NO_SHOW_TYPE_FORMS: Record<NoShowType, NoShowTypeForm> = {
  "Member Not Home": {
    extraField: null,
    helper: null,
    signatureLabel: "Driver Signature",
    presenceWaitWaivedBy: null,
  },
  "Cancel At Door": {
    extraField: { id: "spokeWith", label: "Spoke with" },
    helper: null,
    signatureLabel: "Member Signature",
    // The driver is at the door being refused in person, and production already
    // makes them name who refused. That name is the proof the wait was for.
    presenceWaitWaivedBy: "spokeWith",
  },
  "Member Not Ready": {
    extraField: null,
    /**
     * ⚠️ Verbatim from `CAP-234`, and note what it anchors to: the **Start
     * Time**, not the driver's arrival. `canNoshow` walks location records
     * instead. Whether the two agree is UNVERIFIED — this is driver-facing
     * guidance copy, not evidence of the server rule.
     */
    helper: "Wait 10 minutes from the Start Time before signing and leaving",
    signatureLabel: "Driver Signature",
    presenceWaitWaivedBy: null,
  },
};

/** The form contract for a type, or the empty one before a type is picked. */
export function noShowFormFor(type: string): NoShowTypeForm {
  return (
    NO_SHOW_TYPE_FORMS[type as NoShowType] ?? {
      extraField: null,
      helper: null,
      // ⚠️ The pre-selection default, captured in `CAP-229`: before any type is
      // chosen the pad already reads "Driver Signature".
      signatureLabel: "Driver Signature",
      presenceWaitWaivedBy: null,
    }
  );
}

/**
 * ⭐ Production's own copy already argues for this.
 *
 * It tells the Member Not Ready driver to wait ten minutes and tells the Cancel
 * At Door driver nothing — then `canNoshow` enforces the wait on both at Submit.
 * The app implies the wait does not apply here, and then applies it.
 *
 * ⛔⛔ **So the waiver is the PROPOSAL, and production refuses both alike.**
 * That sentence above is the production behaviour, written down before there
 * was a Now side to show it on: today a Cancel At Door driver gets the same
 * *"Please wait at least 10 minutes at the pick up location"* as everyone else.
 *
 * Found by the user, 2026-10-14: the waiver was ungated, so Now let a Cancel At
 * Door through to the form — the prototype demonstrating its own proposal as
 * though it were the status quo, which is the exact failure this slice exists
 * to prevent. ⚠️ `resolveNoShow` had been given the focus and this rung had not
 * been told to read it; threading the parameter is not the same as using it.
 */
export function waivesPresenceWait(
  type: string | null | undefined,
  focus: DemoFocus
): boolean {
  if (!showsProposal(focus, CANCEL_AT_DOOR_SOLUTIONS)) return false;
  return Boolean(type && noShowFormFor(type).presenceWaitWaivedBy);
}

// ── Who the driver spoke to at the door ────────────────────────────────────

/**
 * ⛔ **This field is a PROPOSAL, not replication.** Production asks `Spoke with`
 * as free text and gets a NAME. A name tells Support who was there and nothing
 * about whether that person could speak for the member — which is the fact the
 * waiver below actually turns on.
 *
 * ⚠️ These options are **derived from `bronze.ride_observation.spoke_with`,
 * aggregated**, never invented and never copied. Only values frequent enough to
 * be canned options reach this file: every label below is backed by a role word
 * appearing 21+ times across Cancel At Door filings, so **no person's name is
 * reproduced here**. The raw column is PII and must stay aggregated.
 */
export const SPOKE_WITH_MEMBER = "member";
export const SPOKE_WITH_CONTACT = "point-of-contact";
export const SPOKE_WITH_NOBODY = "no-one";

export const SPOKE_WITH_OPTIONS = [
  { value: SPOKE_WITH_MEMBER, label: "The member themselves" },
  { value: SPOKE_WITH_CONTACT, label: "Someone else at the door" },
  /**
   * ⛔⛔ **The option the two-option design did not have, and the reason it
   * needs one.**
   *
   * ~9.1% of Cancel At Door filings record no person at all — `nothing` (1,198)
   * and `no one` (26) — and another 2.9% name Wingz, Support or the client,
   * which is a phone call and not somebody at the door. Without an honest way to
   * say "nobody came out", a required picker makes every one of those drivers
   * claim a conversation that did not happen — and that claim is exactly what
   * would be skipping the ten-minute wait.
   *
   * ⚠️ A Cancel At Door with nobody at the door IS a Member Not Home. This
   * answer earns no waiver; see `answerEarnsWaiver`.
   */
  { value: SPOKE_WITH_NOBODY, label: "No one came to the door" },
] as const;

/**
 * What that person was to the member.
 *
 * ⚠️ Counts are Cancel At Door filings whose `spoke_with` matched the role word,
 * all time. Declared beside each option so the list can be audited against the
 * warehouse rather than taken on trust.
 */
export const CONTACT_RELATION_OPTIONS = [
  { value: "parent", label: "Parent" },                      // mother 238 + mom 163 + father 24 = 425
  { value: "child", label: "Son or daughter" },              // daughter 91 + son 52 = 143
  { value: "spouse", label: "Spouse or partner" },           // wife 51 + husband 48 = 99
  { value: "carer", label: "Caregiver or nurse" },           // nurse 74 + caregiver 60 = 134
  { value: "other-family", label: "Other family member" },   // family member 34 + sister 29 = 63
  { value: "other", label: "Someone else" },                 // roommate 21, and the long tail
] as const;

/**
 * Whether the driver's answer actually earns the waiver.
 *
 * ⚠️ **Two rules, deliberately separate.** `waivesPresenceWait` asks whether the
 * TYPE may skip the wait, and so decides which form opens. This asks whether the
 * ANSWER supports it, and so decides the outcome. Collapsing them into one would
 * mean the route and the verdict could never disagree — and the whole point of
 * asking is that they sometimes must.
 */
export function answerEarnsWaiver(spokeWithWho: string | null | undefined): boolean {
  return spokeWithWho === SPOKE_WITH_MEMBER || spokeWithWho === SPOKE_WITH_CONTACT;
}
