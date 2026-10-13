/**
 * Whether the focus named in the URL should be adopted into React state.
 *
 * ⛔⛔ **`clear()` never worked, and this is why.** `writeParam` removes the
 * query param with `history.replaceState`, which Next's router does not
 * observe — so `useSearchParams()` goes on returning the id that was just
 * removed. The adopt effect read that stale value and put the focus straight
 * back. Measured 2026-10-14: the param disappears at t=0 and is back by t≈100ms,
 * on both the strip's `×` and the table's "Clear the focus". From the outside it
 * looks like a button that does nothing.
 *
 * ⚠️ It went unnoticed because the only way back was an edge affordance nobody
 * leaned on. Hiding the strip at desktop made it the single way out of a focus,
 * which is what surfaced it.
 *
 * ⭐ Named here rather than written inline in the effect so the truth table can
 * be run by a check instead of by a browser — the same reason every other rule
 * in this prototype lives in `lib/`.
 */

export interface AdoptInput {
  /** What the URL currently says — possibly STALE, see above. */
  paramId: string | null;
  /** What React state currently holds. */
  activeId: string | null;
  /** The id `clear()` just removed, or `null`. The stale echo to ignore. */
  clearedId: string | null;
  /** True while a `focus()` navigation is still in flight. */
  navigating: boolean;
}

export type AdoptDecision =
  /** A navigation is mid-flight; the URL still describes the previous screen. */
  | "wait-for-navigation"
  /** The URL is echoing a focus we have just cleared. Ignore it. */
  | "ignore-cleared-echo"
  /** The URL names a focus we are not holding. Take it. */
  | "adopt"
  /** Nothing to do — the URL and state already agree, or there is no param. */
  | "nothing-to-do";

export function adoptDecision(input: AdoptInput): AdoptDecision {
  // ⛔ Order matters. A navigation in flight outranks everything: during one,
  // the param describes where we came FROM, and acting on it reinstates the
  // previous solution on the new screen — half-switched, which looks like it
  // worked.
  if (input.navigating) return "wait-for-navigation";

  // ⛔ The echo of our own clear. Compared to `clearedId`, never to `activeId`:
  // after a clear `activeId` is already null, so an `activeId` test cannot tell
  // "the user cleared this" from "the app has not adopted it yet".
  if (input.clearedId !== null && input.paramId === input.clearedId) {
    return "ignore-cleared-echo";
  }

  if (input.paramId !== null && input.paramId !== input.activeId) return "adopt";
  return "nothing-to-do";
}

/**
 * Whether the memory of a clear is still worth keeping.
 *
 * ⚠️ It must be forgotten as soon as the URL stops echoing it, or a later
 * deep link to the SAME solution would be ignored — a clear that poisoned one
 * id for the life of the page.
 */
export function keepClearedMemory(clearedId: string | null, paramId: string | null): boolean {
  return clearedId !== null && paramId === clearedId;
}
