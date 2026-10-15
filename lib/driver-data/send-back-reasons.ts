import { showsProposal, type DemoFocus } from "@/lib/solutions/demo-mode";
import type { SupportFieldOption } from "@/types/support";
import type { Trip } from "./mock-trips";

/**
 * Catalogue row **14** — `Send-back`, 609 calls. The reason a driver gives when
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
 * `Project - Standing Order Offers`, and row 14 is not it.
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
 * demonstrates three (`14a` short-notice, `14b` plain, `14c` standing order). A
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
  | "standing-order-chat"
  | "penalty"
  | "denied";

/**
 * ⛔⛔ **The steps that END the flow.** A path containing one of these files
 * nothing — the trip stays on the manifest.
 *
 * ⚠️ Declared as a list rather than hard-coded into `sendBackCompletes`, because
 * there are now TWO terminals for two different reasons: production refuses
 * (`denied`), and the proposal hands the driver to Support (`standing-order-chat`).
 * A reader asking "can this path finish?" should find one list, not a boolean
 * expression that grew an `&&`.
 */
export const SEND_BACK_TERMINAL_STEPS: readonly SendBackStep[] = [
  "denied",
  "standing-order-chat",
];

/** Catalogue row **14**, which owns the reason form. */
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
 * the sentence ends at *call into support* — which is the support call row 14
 * exists to absorb.
 *
 * ⚠️ Per the user, it arrives **after** an earlier pop-up, so the driver is at
 * least two taps in before the app says no.
 */
export const SEND_BACK_DENIED_TITLE = "Send-back request failed";
export const SEND_BACK_DENIED_BODY =
  "Standing Order Trips cannot be sent back via the Driver App. To send back this trip, please call into support for assistance.";
export const SEND_BACK_DENIED_DISMISS = "OK";

/**
 * ⛔⛔ **OURS, not production's** — and the difference IS the proposal.
 * Production's refusal above ends at *call into support for assistance*: a phone
 * number, reached two taps in, after a confirmation that was never going to
 * matter. This says the same no on the FIRST tap, and hands the driver to chat.
 *
 * ⚠️ Treat a screenshot of this as a proposal to review, never as a replicated
 * screen. Nothing in the vault captures an app that offers it.
 *
 * ⛔ The consequence sentence is kept from the warning this replaced. It is why
 * Support is in the loop at all — a driver who learns what a send-back costs the
 * whole schedule may decide not to send it back, and that is the better outcome
 * for everyone including them.
 */
export const STANDING_ORDER_BLOCK_TITLE = "This is a standing order";
export const STANDING_ORDER_BLOCK_WHY =
  "This member rides with you on a set schedule, so this trip cannot be sent back from the app.";
export const STANDING_ORDER_BLOCK_COST =
  "Sending back one trip can cost you the whole standing order — the client can reassign every future trip to another driver.";
/**
 * ⚠️ Kept from the warning this replaced (`140b9e7`). It is still true after
 * the block — Support sending the trip back is still a send-back — and dropping
 * it would be a copy change nobody asked for, smuggled in under a flow change.
 */
export const STANDING_ORDER_BLOCK_RISK =
  "Standing orders are the trips clients depend on most. Sending them back can also put your account at risk of suspension.";
export const STANDING_ORDER_BLOCK_ROUTE =
  "Support can send it back for you. Start a chat and tell them why.";
export const STANDING_ORDER_BLOCK_CHAT = "Contact Support";
export const STANDING_ORDER_BLOCK_DISMISS = "Keep the trip";

/**
 * What the chat opens with, auto-sent the way row 17's is.
 *
 * ⛔ **No reason line.** The block arrives before any form, so the driver has
 * not given one — and prefilling a field they never filled would be the form
 * this flow deliberately does not have. They type it into the chat.
 *
 * ⚠️ Pure and exported so a check can build the real message rather than grep a
 * component for a line, the same reason `zendeskDeclineMessage` is.
 */
export const ZENDESK_STANDING_ORDER_INTRO =
  "I need help sending back a standing order trip. The Driver App cannot send it back for me.";

export function zendeskStandingOrderMessage(
  trip: Trip
): { intro: string; lines: Array<{ label: string; value: string }> } {
  return {
    intro: ZENDESK_STANDING_ORDER_INTRO,
    lines: [
      { label: "Member Name", value: trip.rider },
      { label: "Trip Date", value: trip.date },
      { label: "Trip ID", value: trip.id },
      { label: "Standing Order", value: trip.standingOrderId ?? "—" },
    ],
  };
}

/** Production's own popup is built — see `SendBackConfirmDialog`. */
export const SEND_BACK_CONFIRM_BUILT = true;

export function sendBackSteps(trip: Trip, focus: DemoFocus): SendBackStep[] {
  /**
   * ⛔⛔ **Production's path, and it is shorter in both directions.**
   *
   * It has no reason form — that is the whole of row 14's proposal — and for a
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
   * ⛔⛔ **A standing order never reaches the reason form.** It is blocked on
   * the first tap and handed to Support chat — user direction, 2026-10-16.
   *
   * ⚠️ **This SUPERSEDES the decision of 2026-10-14**, under which the proposal
   * collected a reason and then let the standing order be sent back: *"leave it,
   * the proposal is about reasons not permissions."* That reading is kept here
   * because it is the argument the current rule had to beat — it held that
   * lifting production's block would be arguing for a change nobody asked for.
   * The new direction agrees, and goes further: the block is not lifted at all.
   * What changes is that the driver is given somewhere to go.
   *
   * ⛔ So the proposal is now a SHORTER path than production's, not a longer
   * one. Production makes the driver confirm before refusing (`CAP-330`, two
   * taps in); the proposal says no on the first tap, and says where to go.
   *
   * ⛔ No `penalty` either. Nothing is being sent back, so there is nothing to
   * be penalised for — the same reasoning production's own `denied` path uses.
   * A standing order that is ALSO short-notice is one screen here, not four.
   */
  if (isStandingOrder(trip)) return ["standing-order-chat"];

  const steps: SendBackStep[] = ["reason"];
  if (SEND_BACK_CONFIRM_BUILT) steps.push("confirm");
  if (isShortNoticeSendBack(trip)) steps.push("penalty");
  return steps;
}

/** Whether this path can finish at all. ⛔ A terminal path never files anything. */
export function sendBackCompletes(steps: readonly SendBackStep[]): boolean {
  return !steps.some((step) => SEND_BACK_TERMINAL_STEPS.includes(step));
}
