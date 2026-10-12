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
 * reason  →  standing-order  →  confirm  →  penalty
 *            (standing orders)   (always)   (short-notice)
 * ```
 *
 * ⛔⛔ **The reason comes FIRST, and production's own first popup comes
 * THIRD.** That is a deliberate deviation from production ordering, set by the
 * user on 2026-10-13, and it is worth saying plainly: in the real app the
 * "strongly discouraged" popup is step 1 and nothing precedes it. Here it does
 * not open the flow, it closes in on it.
 *
 * The sequence escalates. Ask why first, while the driver still has something
 * to say and nothing has been argued at them. Then the consequence specific to
 * THIS trip — a standing order risks the whole order and the account. Then
 * production's general discouragement. Then production's money warning, which
 * is the last gate because it is the one with a number in it.
 *
 * ⛔ Asking why AFTER three warnings would collect an answer from a driver who
 * has already been talked at twice and is tapping through; asking it first is
 * the only point in the sequence where the answer is theirs rather than a
 * reaction.
 *
 * ⚠️ **Only `penalty` and `standing-order` are conditional.** `confirm` is
 * production's and is raised on every send-back; the penalty warning appears
 * only for a short-notice trip, per the copy-update story's AC. The user's
 * ordering note marked "(if applicable)" against the standing-order step only,
 * and did not change either of those rules.
 *
 * ⛔⛔ **Standing-order before penalty.** A standing order's cost is the ORDER —
 * every future trip, and the account — while the penalty is money. Showing the
 * money warning first and the severe one second would read as an escalation the
 * driver has already tapped past.
 *
 * ⚠️ **All four combinations are real and the rule handles each**; the seed
 * demonstrates three (`13a` short-notice, `13b` plain, `13c` standing order). A
 * standing order that is ALSO short-notice raises both warnings — four screens
 * in all — which is correct and is asserted rather than seeded, because a ride
 * raising both would let a reviewer read them as one screen.
 *
 * ⚠️ **Four screens is a lot to put in front of a driver.** Each says something
 * the others do not, but the length is worth flagging to whoever owns this flow.
 */
export type SendBackStep =
  | "reason"
  | "standing-order"
  | "confirm"
  | "penalty";

/** Production's own popup is built — see `SendBackConfirmDialog`. */
export const SEND_BACK_CONFIRM_BUILT = true;

export function sendBackSteps(trip: Trip): SendBackStep[] {
  const steps: SendBackStep[] = ["reason"];
  if (isStandingOrder(trip)) steps.push("standing-order");
  if (SEND_BACK_CONFIRM_BUILT) steps.push("confirm");
  if (isShortNoticeSendBack(trip)) steps.push("penalty");
  return steps;
}
