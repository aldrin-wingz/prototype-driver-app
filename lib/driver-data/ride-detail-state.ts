import { isClientCancelled } from "./client-cancellation";
import type { Trip } from "./mock-trips";

/**
 * Which phase of Ride Details a trip renders in.
 *
 * ⛔⛔ **Extracted from `app/my-rides/[id]/page.tsx` on 2026-10-15, unchanged.**
 * It had always been an `if`/`else` chain inside a page component, which is a
 * rule no check can reach — and §28's whole job is driving rules over every
 * seeded ride on both sides of the toggle. A screen that decides its own phase
 * in JSX is a screen whose phase is only ever verified by looking at it.
 *
 * ⛔ The last branch is an `else`, and that is the trap worth naming: any
 * status this chain does not recognise lands in `needs-action` and renders the
 * unconfirmed screen with its orange "I Reached Out to Confirm" button. Nothing
 * errors, nothing logs, and the ride simply asks the driver to do something
 * that makes no sense for it. A new phase therefore goes at the TOP of the
 * chain, never on the end.
 */
export type DetailState =
  /**
   * Wingz cancelled it. Read-only, no footer, a banner saying so.
   *
   * ⛔⛔ **Not gated on the demo focus.** Production already has this screen —
   * `CAP-342` is a photograph of it, reached from the alert's `Go to ride` —
   * so gating it would make the prototype claim production has no cancelled
   * view, which the capture disproves. What row 18 proposes is a way to reach
   * it other than the alert, and an acknowledgement; both live elsewhere.
   */
  | "cancelled"
  /** Sent back, or a finished ride; read-only, no footer. */
  | "completed"
  /** An offer the driver has not accepted. */
  | "before-taken"
  /** Accepted; the swipe sequence drives the rest. */
  | "in-progress"
  /** Accepted but unconfirmed. */
  | "needs-action";

/**
 * The phase a trip is in.
 *
 * ⚠️ `isSentBack` is passed in rather than read here: it comes from a query
 * parameter the payout portal sets, which is a property of how the screen was
 * REACHED and not of the trip. A rule that read it would need the router.
 */
export function detailStateFor(
  trip: Trip,
  { isSentBack }: { isSentBack: boolean },
): DetailState {
  // ⛔ FIRST in the chain, deliberately. A cancelled ride's `status` is still
  // `"upcoming"`, so anything lower would hand it the accept/decline swipe —
  // and a branch on the END would meet the `else` fallthrough instead.
  if (isClientCancelled(trip)) return "cancelled";
  if (isSentBack || trip.status === "completed") return "completed";
  if (trip.status === "upcoming") return "before-taken";
  if (trip.status === "in-progress") return "in-progress";
  return "needs-action";
}
