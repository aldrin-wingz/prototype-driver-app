import { showsProposal, type DemoFocus } from "@/lib/solutions/demo-mode";
import type { SupportFieldOption } from "@/types/support";
import type { Trip } from "./mock-trips";

/**
 * Catalogue row **13** — `Send-back`, 609 calls. The reason a driver gives when
 * they send a trip back.
 *
 * ⛔⛔ **"Send-back reason" ALREADY MEANS SOMETHING ELSE, and the two will be
 * joined by someone eventually.** `sendback_calculation_reason` in the warehouse
 * is the PENALTY RULE — `calc_weekend`, `calc_same_day`, `calc_after_pickup`,
 * `calc_lead_time`, `calc_before_cutoff` — computed by the system, and it is
 * what the Balance Dashboard's send-back panel prints as "the send-back reason"
 * (`BAL-10`). No driver ever typed it.
 *
 * So the field here is `returnReason`, NOT `sendBackReason`. A driver-supplied
 * reason does not exist anywhere today — not in the app, not in the warehouse,
 * not in any story in the vault. This is the first place one is collected.
 */

/**
 * ⭐ **Production's own list, verbatim**, from the CS Tool's `Cancellation
 * Reason` dropdown with `Cancellation Category = DRIVER INITIATED` — which is
 * the category the **Send Back to Client** modal defaults to and, per the
 * capture notes, the only one it allows.
 *
 * Source: `Project - CS Tool React Migration/Phase 1/References/Screenshot
 * Context Log.md`, documented from screenshots on 2026-05-18.
 *
 * ⚠️ **Including the five `OTHER`s.** The duplication is real and is already a
 * logged open question on this project ("`OTHER` ~6×, `MEMBER CANCELLED` 3×,
 * and not filtered by category"). Seeding the list as captured — duplicates and
 * all — is what makes it evidence; de-duplicating it here would quietly assert
 * the duplication is not there.
 *
 * ⚠️ Entry 22's text was partially obscured in the screenshot and is recorded
 * as read.
 */
export const CS_TOOL_DRIVER_INITIATED_REASONS: readonly string[] = [
  "CONFLICT WITH ANOTHER TRIP",
  "TRANSFER TO ANOTHER DRIVER",
  "OTHER",
  "REQUESTED BY VERIDA",
  "DRIVER NO SHOW",
  "MEDIFAM ER",
  "TRAFFIC/CAR ISSUES",
  "DRIVER CANCELLED",
  "OTHER",
  "OTHER",
  "OTHER",
  "vehicle shortage",
  "driver shortage",
  "too many trips",
  "weather",
  "not in service area",
  "wrong level of service assigned",
  "too much volume with same time period",
  "issue with member or facility",
  "outside operational hours",
  "member no longer attends",
  "RidesCanceledbyTP",
];

/** The captured list with its duplicates collapsed, order preserved. */
export function dedupedDriverInitiatedReasons(): string[] {
  return [...new Set(CS_TOOL_DRIVER_INITIATED_REASONS)];
}

export const SEND_BACK_REASON_OTHER = "OTHER";

/**
 * ⛔⛔ **The ones a DRIVER can truthfully answer.**
 *
 * The captured list is an AGENT's. Most of it is written about a driver rather
 * than by one (`DRIVER NO SHOW`, `DRIVER CANCELLED`, `TRANSFER TO ANOTHER
 * DRIVER`), or is a dispatch fact about the fleet (`vehicle shortage`, `driver
 * shortage`, `too many trips`, `too much volume with same time period`), or is
 * a client code the driver cannot know (`REQUESTED BY VERIDA`, `MEDIFAM ER`,
 * `RidesCanceledbyTP`), or is an ops finding made after the fact (`wrong level
 * of service assigned`, `outside operational hours`, `member no longer
 * attends`).
 *
 * Offering all of them would make a driver pick the nearest wrong answer —
 * exactly what the Cancel-at-Door picker did before it was fixed, and what
 * production's free-text `Spoke with` still does.
 *
 * ⚠️ **This is a reading, not an ops decision.** It is an allow-list of EXACT
 * strings from the array above, so a check can prove nothing invented reaches a
 * driver, and widening it is a one-line edit. Flagged as open question 4 in the
 * Phase 7 spec.
 */
export const DRIVER_ANSWERABLE_REASONS: readonly string[] = [
  "CONFLICT WITH ANOTHER TRIP",
  "TRAFFIC/CAR ISSUES",
  "weather",
  "not in service area",
  "issue with member or facility",
  SEND_BACK_REASON_OTHER,
];

/**
 * The options the form offers.
 *
 * ⚠️ Sentence-cased for the driver, with the production string kept as the
 * VALUE. The captured list is SHOUTING in places and lowercase in others
 * (`CONFLICT WITH ANOTHER TRIP` beside `vehicle shortage`) because it is two
 * lists concatenated; a driver should not have to read that seam. What is
 * stored and sent is still production's exact string.
 */
export function sendBackReasonOptions(): SupportFieldOption[] {
  return DRIVER_ANSWERABLE_REASONS.map((value) => ({
    value,
    label: DRIVER_FACING_LABELS[value] ?? value,
  }));
}

const DRIVER_FACING_LABELS: Record<string, string> = {
  "CONFLICT WITH ANOTHER TRIP": "It clashes with another trip",
  "TRAFFIC/CAR ISSUES": "Traffic or a problem with my car",
  weather: "Weather",
  "not in service area": "It's outside the area I drive",
  "issue with member or facility": "An issue with the member or facility",
  OTHER: "Something else",
};

/**
 * ⚠️ The shared `select` primitive does not wrap and does not ellipsize — a long
 * option is cut mid-word. Learned on Can't Reach Member; re-asserted for every
 * list since.
 */
export const MAX_SEND_BACK_LABEL_CHARS = 36;

/**
 * The penalty a short-notice send-back attracts, in whole dollars.
 *
 * ⚠️ **Seeded, and market-configured in production.** TCI TN charges `$25` at or
 * after 10:00 AM on the day before pickup and `$0` before it, with a separate
 * weekend window; Verida TN and WellTrans Indiana each have their own. The
 * prototype carries one number because it demonstrates one trip — it must not
 * be read as the rule.
 *
 * ⛔ What actually decides the charge is `sendback_calculation_reason`, and the
 * measured charge rates are nothing like a flat threshold: `calc_before_cutoff`
 * charges 1.2% of the time, `calc_lead_time` 21.3%, and the three same-day-ish
 * rules 100%. Never explain the amount by "how close to pickup".
 */
export const SEND_BACK_PENALTY_USD = 25;

/**
 * Whether this send-back is short-notice — i.e. whether step 2 appears at all.
 *
 * ⚠️ Reads the seeded `sameDay` flag rather than comparing clocks. The prototype
 * has no clock; a derived version would flip on exactly one real-world day and
 * read as a bug on every other. Same reasoning as `Trip.sameDay` itself.
 */
export function isShortNoticeSendBack(trip: Trip): boolean {
  return trip.sameDay === true;
}

/**
 * Whether this trip belongs to a standing order.
 *
 * ⚠️ Presence of the id, nothing more. The prototype does not resolve the
 * order, know its pattern or list its other trips — that is
 * `Project - Standing Order Offers`, and row 13 is not it.
 */
export function isStandingOrder(trip: Trip): boolean {
  return Boolean(trip.standingOrderId);
}

/**
 * The steps a send-back runs through, in order.
 *
 * ```
 * reason  →  confirm  →  standing-order  →  penalty
 * (always)   (always)    (standing orders)  (short-notice)
 * ```
 *
 * ⛔⛔ **The reason comes FIRST, and that is the one ordering decision with a
 * reason behind it rather than a preference.** An answer collected after a
 * warning comes from a driver who has just been argued at and is tapping
 * through; first is the only point in the sequence where the answer is theirs
 * rather than a reaction.
 *
 * After that the sequence runs **general before specific**: production's own
 * "are you sure" — which it raises on every send-back — and then only the
 * consequences that actually apply to THIS trip. A driver sending back an
 * ordinary advance trip sees two screens; the extra ones are earned by
 * something true about the trip.
 *
 * ⚠️ **Production raises `confirm` FIRST, before anything.** Here it is second,
 * after the reason. That is still a deviation from production ordering — a
 * smaller one than before, but a reader who knows the real app will notice it,
 * so it is said plainly rather than left to be discovered.
 *
 * ⚠️ **Only `standing-order` and `penalty` are conditional.** `confirm` is
 * production's and is raised on every send-back; the penalty warning appears
 * only for a short-notice trip, per the copy-update story's AC.
 *
 * ⛔ **The penalty is last wherever it appears.** It is the screen with a number
 * in it, and production puts it at the end of its own sequence; nothing here
 * moves it.
 *
 * ⚠️ **All four combinations are real and the rule handles each**; the seed
 * demonstrates three (`13a` short-notice, `13b` plain, `13c` standing order). A
 * standing order that is ALSO short-notice raises both conditional warnings —
 * four screens — which is correct and is asserted rather than seeded, because a
 * ride raising both would let a reviewer read them as one screen.
 *
 * ⚠️ **Four screens is a lot to put in front of a driver.** Each says something
 * the others do not, but the length is worth flagging to whoever owns this flow.
 */
export type SendBackStep =
  | "reason"
  | "confirm"
  | "standing-order"
  | "penalty"
  | "denied";

/** Catalogue row **13**, which owns the reason form. */
export const SEND_BACK_SOLUTIONS: readonly string[] = ["send-back-reason-form"];

/**
 * ⭐⭐ **Production refuses a Standing Order send-back outright** — `CAP-330`,
 * verbatim, a native alert raised over the More Options grid:
 *
 * > **Send-back request failed**
 * > Standing Order Trips cannot be sent back via the Driver App. To send back
 * > this trip, please call into support for assistance.
 *
 * ⛔ It is TERMINAL. Nothing is sent back, the trip stays on the manifest, and
 * the sentence ends at *call into support* — which is the support call row 13
 * exists to absorb.
 *
 * ⚠️ Per the user, it arrives **after** an earlier pop-up, so the driver is at
 * least two taps in before the app says no.
 */
export const SEND_BACK_DENIED_TITLE = "Send-back request failed";
export const SEND_BACK_DENIED_BODY =
  "Standing Order Trips cannot be sent back via the Driver App. To send back this trip, please call into support for assistance.";
export const SEND_BACK_DENIED_DISMISS = "OK";

/** Production's own popup is built — see `SendBackConfirmDialog`. */
export const SEND_BACK_CONFIRM_BUILT = true;

export function sendBackSteps(trip: Trip, focus: DemoFocus): SendBackStep[] {
  /**
   * ⛔⛔ **Production's path, and it is shorter in both directions.**
   *
   * It has no reason form — that is the whole of row 13's proposal — and for a
   * standing order it does not finish at all: `CAP-330` refuses and the trip
   * stays. So Now is not "the proposal minus one screen"; for a standing order
   * it is a flow that cannot succeed.
   *
   * ⚠️ The standing-order WARNING is ours, not production's — see
   * `StandingOrderWarningDialog`. Production warns about nothing; it simply
   * says no, later than it could have.
   */
  if (!showsProposal(focus, SEND_BACK_SOLUTIONS)) {
    const now: SendBackStep[] = [];
    if (SEND_BACK_CONFIRM_BUILT) now.push("confirm");
    if (isStandingOrder(trip)) {
      now.push("denied");
      // ⛔ Terminal. No penalty screen after it, because nothing is being sent
      // back to be penalised for.
      return now;
    }
    if (isShortNoticeSendBack(trip)) now.push("penalty");
    return now;
  }

  /**
   * ⛔⛔ **The proposal still lets a standing order be sent back, and that is a
   * DECISION, not an oversight.** User direction, 2026-10-14: *"leave it, the
   * proposal is about reasons not permissions."*
   *
   * Production refuses outright (`CAP-330`). Row 13 proposes collecting a
   * reason on every send-back; it does not propose lifting the block, and a
   * prototype that quietly lifted it would be arguing for a change nobody
   * asked for — on the row whose whole point is a smaller one.
   *
   * ⚠️ So the comparison on a standing order is deliberately lopsided: Now
   * refuses, Proposed proceeds. Anyone reading that as a bug should read this
   * first. §24 asserts the Proposed path still completes, so the decision
   * cannot be silently "fixed" either way.
   */
  const steps: SendBackStep[] = ["reason"];
  if (SEND_BACK_CONFIRM_BUILT) steps.push("confirm");
  if (isStandingOrder(trip)) steps.push("standing-order");
  if (isShortNoticeSendBack(trip)) steps.push("penalty");
  return steps;
}

/** Whether this path can finish at all. ⛔ A denied path never files anything. */
export function sendBackCompletes(steps: readonly SendBackStep[]): boolean {
  return !steps.includes("denied");
}
