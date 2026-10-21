import type { DemoFocus } from "@/lib/solutions/demo-mode";
import type { Trip } from "./mock-trips";
import {
  isShortNoticeSendBack,
  showsShortNoticeAtTake,
} from "./sendback-penalty";

/**
 * What a driver meets between tapping "Swipe to Accept" and holding the trip.
 *
 * ⛔⛔ **Production's own screens come FIRST and the short-notice warning is
 * appended, never substituted.** User direction 2026-10-22. Row 16 adds one
 * screen to an existing sequence; it does not define the sequence. Modelled as
 * an ordered list for the same reason `sendBackSteps` is — the order is the
 * rule, and an order decided inside a component is a rule no check can reach.
 *
 * ⚠️ **The same shape as `sendBackSteps`, deliberately.** Send-back solved this
 * exact problem: production's step 1 was known to exist and its copy was not in
 * any artifact, so the step was declared, gated on a constant, and lit when the
 * user supplied the words. `ACCEPT_CONFIRM_BUILT` is that constant here.
 */
export type AcceptStep =
  /**
   * Production's own acceptance confirmation.
   *
   * ⛔⛔ **NOT BUILT, and the gap is evidence-based rather than an oversight.**
   * Nothing in this vault records what production shows after a swipe-to-accept:
   * `CAP-081` and `08-01` are both photographs of the swipe BAR, the base
   * prototype's bible says the footer is "visually rendered, NOT functional",
   * and the Trip Completion Flow begins at Stage 01 on an already-accepted
   * ride. ⚠️ What IS established is the house pattern — `SWIPE TO START` raises
   * a Pre-Check popup, `PICK UP MEMBER` raises Seatbelt Check then Odometer —
   * so a confirm popup here is near-certain and its COPY is the unknown.
   *
   * ⛔ Declaring it with invented copy would be the failure this project names
   * most often: a declared screen nobody can check is an unfalsifiable spec.
   */
  | "confirm"
  /** Row 16's warning — what sending this trip back will cost. */
  | "short-notice";

/**
 * Whether production's acceptance confirmation is built.
 *
 * ⛔ `false` until someone supplies the copy. Flipping it to `true` is the whole
 * change — `acceptSteps` already puts it first, and a check asserts it does.
 * Exactly how `SEND_BACK_CONFIRM_BUILT` went from a gap to a screen.
 */
export const ACCEPT_CONFIRM_BUILT = false;

/**
 * The sequence, as DATA rather than as control flow.
 *
 * ⛔⛔ **Written this way so the ordering is assertable while the first step is
 * unbuilt.** As an `if`/`push` chain the order lived in statement order, and
 * with `ACCEPT_CONFIRM_BUILT` false no caller could ever observe it — a check
 * would have had to regex this file and hope. Here the claim "production's
 * confirmation comes before row 16's warning" is a value a test can read, and
 * it stays true the moment the constant flips.
 *
 * ⛔ Appending a step appends it to the END. Anything that must come before the
 * short-notice warning goes above it in this list, and the check below fails
 * if the two ever swap.
 */
export const ACCEPT_STEP_ORDER: readonly AcceptStep[] = [
  "confirm",
  "short-notice",
];

/**
 * The steps an acceptance runs through, in order.
 *
 * ```
 * Now        (nothing — the swipe is a replica with no handler)
 *
 * Proposed   confirm  →  short-notice   (a trip that costs something to hand back)
 *            confirm                    (everything else)
 * ```
 *
 * ⛔ The short-notice step is gated on BOTH the focus and the price. Ungated on
 * the focus it would claim production already warns; ungated on the price it
 * would fire on every request, and a warning a driver meets every time is a
 * warning they learn to dismiss.
 */
export function acceptSteps(trip: Trip, focus: DemoFocus): AcceptStep[] {
  return ACCEPT_STEP_ORDER.filter((step) =>
    step === "confirm"
      ? ACCEPT_CONFIRM_BUILT
      : showsShortNoticeAtTake(focus) && isShortNoticeSendBack(trip),
  );
}

/**
 * Whether tapping the swipe does anything at all on this trip.
 *
 * ⚠️ An empty list means the control stays as inert as it is on every other
 * request screen in this app — which is most of them, and is correct.
 */
export function acceptIntercepts(trip: Trip, focus: DemoFocus): boolean {
  return acceptSteps(trip, focus).length > 0;
}
