/**
 * Whether the app is showing what production does TODAY, or what we propose.
 *
 * ⭐ The point of the whole slice: when this is presented and someone asks
 * *"so what happens now?"*, the answer has to be on the same screen as the fix.
 * `"now"` is the production dead end that generates the support call; `"fixed"`
 * is the proposal. One ride, one screen, a switch between them.
 *
 * ⛔⛔ **The mode is scoped to the FOCUS, never global.** With nothing focused
 * the app is the plain mirror and every proposal is visible — which is how it
 * has behaved since Phase 1 and what every capture-fidelity check assumes. A
 * global `"now"` would silently empty the plain mirror and read as the
 * prototype having lost its features.
 *
 * ⚠️ `showsProposal` takes the focus as ONE positional argument, deliberately
 * not an optional extra parameter: a guard that forgot to be converted must
 * fail `typecheck`, not quietly keep answering the pre-mode question.
 *
 * ⚠️ This module is pure and knows nothing about React. The focus is assembled
 * once, in `solution-context.tsx`, and passed down — so a check can run the
 * truth table without a renderer.
 */

/** Production today, or the proposal. */
export type DemoMode = "now" | "fixed";

/**
 * ⛔ Declared as a literal so a check has a denominator. A sweep over a mode
 * list derived from the type would be empty at runtime and pass vacuously.
 */
export const DEMO_MODES = ["now", "fixed"] as const;

/**
 * ⭐ Picking a row lands on **`"now"`** — the dead end first, the fix second.
 * That order is the argument; landing on the fix and offering to show the
 * problem reverses it.
 *
 * ⚠️ Not yet reachable: until B2 lands mode state the context pins the mode to
 * `"fixed"`, so the app behaves exactly as it did before this module existed.
 */
export const DEFAULT_DEMO_MODE: DemoMode = "now";

/** The query param the mode is mirrored into. ⛔ Only ever `"fixed"` — see B2. */
export const DEMO_MODE_PARAM = "mode";

/** What the app is being asked to show. */
export interface DemoFocus {
  /** The catalogue row in focus, or `null` for the plain mirror. */
  solutionId: string | null;
  /** Which side of that row — production today, or the proposal. */
  mode: DemoMode;
}

/**
 * Whether a proposed surface is drawn.
 *
 * `owners` is the catalogue rows the surface belongs to — usually one, two
 * where a single build covers two rows (09/10 are one feature; 04/05 are one
 * modal option).
 *
 * ⛔ The `null` branch is FIRST and unconditional. Four of the five guards this
 * replaces read `null` as *"no filtering"*, and one — the account slice, which
 * is capture-locked to an eleven-row Options menu — reads it as *"show
 * nothing"*. That exception is now a named flag rather than a hand-rolled
 * predicate that happened to be spelled differently.
 */
export function showsProposal(
  focus: DemoFocus,
  owners: readonly string[],
  options?: { readonly inPlainMirror?: boolean },
): boolean {
  // ⛔⛔ FIRST, and before the mode is consulted at all. The plain mirror has no
  // focus, so it has no side to be on — asking it for a mode would make every
  // proposal in the app vanish the moment `DEFAULT_DEMO_MODE` became reachable.
  if (focus.solutionId === null) return options?.inPlainMirror ?? true;
  // A proposal belongs to its own build: a reviewer walking row 16 must not
  // meet row 05's option on the way past, because two proposals in one flow
  // read as one feature.
  if (!owners.includes(focus.solutionId)) return false;
  return focus.mode === "fixed";
}

/**
 * ⛔ No default for `mode`. A default would let a converted call site compile
 * while silently answering the wrong question, which is the one failure
 * `typecheck` is being used to prevent here.
 */
export function demoFocus(solutionId: string | null, mode: DemoMode): DemoFocus {
  return { solutionId, mode };
}
