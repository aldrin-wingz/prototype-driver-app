import type { Trip } from "./mock-trips";

/**
 * What production does when a driver taps **Send Back Trip** on the More
 * Options grid.
 *
 * ⛔⛔ **The interesting half is that it can REFUSE.** On a Standing Order trip
 * the flow cannot succeed: the driver answers production's own confirmation,
 * and then the app tells them the trip cannot be sent back from the app at all
 * and to telephone support. Until this landed, the base's Send Back tile raised
 * the same "not wired" toast as every other tile, which read as *we have not
 * built this yet* rather than *production says no*.
 *
 * ⚠️ Named here rather than worked out inside the screen because two surfaces
 * read it — the grid's handler and `scripts/verify-base.ts`. A rule spelled out
 * in JSX is a rule no check can reach.
 */

/**
 * Where each piece of copy below was actually seen.
 *
 * ⚠️ Beside the copy rather than in a comment, so the next fold-in audit can
 * read it mechanically. The base carries only what has shipped, and "shipped"
 * is a claim about evidence — so the evidence travels with the words.
 */
export const SEND_BACK_PROVENANCE = {
  /**
   * ⚠️ A production screenshot the user supplied in conversation on
   * 2026-10-13. It never went through the capture pipeline, so
   * `verify:captures` does not know about it and there is no `CAP-###` to cite.
   * Worth shooting properly before anyone treats this screen as audited.
   */
  confirm: "user-supplied screenshot, 2026-10-13 — NOT in the capture index",
  /** `CAP-330`, `04-01 - More Options - Standing Order Send-Back Denial.png`. */
  denied: "CAP-330",
} as const;

// ---------------------------------------------------------------------------
// Step 1 — production's confirmation, raised on every send-back
// ---------------------------------------------------------------------------

/**
 * ⭐ Production's own copy, verbatim. The whole message is one bold centred
 * block in the capture — there is no separate body line.
 */
export const SEND_BACK_CONFIRM_BODY =
  "Trip sendbacks are strongly discouraged and may result in penalties. Do you want to proceed in sending back the trip?";

/**
 * ⛔⛔ **`No` and `Yes` — NOT `Cancel` and `Continue`.** Production's two
 * send-back popups disagree with each other about what their buttons are
 * called: this one says No/Yes, and the short-notice penalty popup that follows
 * on an ordinary trip says Cancel/Continue. Reproduced exactly as they are.
 * Harmonising them would be this mirror quietly redesigning production and then
 * presenting the result as a replica.
 */
export const SEND_BACK_CONFIRM_NO = "No";
export const SEND_BACK_CONFIRM_YES = "Yes";

// ---------------------------------------------------------------------------
// Step 2 — the refusal
// ---------------------------------------------------------------------------

/**
 * ⭐⭐ `CAP-330`, verbatim — a native alert raised over the More Options grid.
 *
 * ⛔ **Terminal.** One button, nothing is sent back, the trip stays on the
 * manifest, and the sentence ends at *call into support*. Every word is
 * production's: nothing softened, nothing added, and deliberately no "we can
 * help" line, because production does not offer one.
 *
 * ⚠️ It arrives AFTER the confirmation above, not instead of it — so the driver
 * is two taps in before the app says no.
 */
export const SEND_BACK_DENIED_TITLE = "Send-back request failed";
export const SEND_BACK_DENIED_BODY =
  "Standing Order Trips cannot be sent back via the Driver App. To send back this trip, please call into support for assistance.";
export const SEND_BACK_DENIED_DISMISS = "OK";

// ---------------------------------------------------------------------------
// The rule
// ---------------------------------------------------------------------------

/**
 * Whether this trip belongs to a standing order.
 *
 * ⚠️ Presence of the id, nothing more. The base does not resolve the order,
 * know its pattern or list its other trips — that is `Project - Standing Order
 * Offers`, and it is not this.
 */
export function isStandingOrder(trip: Trip): boolean {
  return Boolean(trip.standingOrderId);
}

/** What happens after the driver answers `Yes`. */
export type SendBackOutcome =
  /** `CAP-330`. The app refuses and the trip stays. */
  | "denied"
  /**
   * Production carries on — a short-notice trip gets a penalty warning, and
   * then the trip is sent back.
   *
   * ⛔⛔ **That continuation is NOT replicated here, on purpose.** No screenshot
   * of the penalty popup exists anywhere in the vault; its wording comes from a
   * written copy-update story, so the WORDS would be production's and the
   * LAYOUT would be invented — which is exactly the kind of guess the build
   * stamps exist to keep out of the base. The tile falls back to the grid's
   * standard "not wired" toast, which is true.
   *
   * ⚠️ So the base deliberately demonstrates the refusal in full and the
   * success not at all. That asymmetry is evidence-shaped, not an oversight.
   */
  | "proceeds";

export function sendBackOutcome(trip: Trip): SendBackOutcome {
  return isStandingOrder(trip) ? "denied" : "proceeds";
}
