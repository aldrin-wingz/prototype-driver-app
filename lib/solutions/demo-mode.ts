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

/**
 * The query param the mode is mirrored into.
 *
 * ⛔⛔ **Only ever `"fixed"`.** `"now"` is the default, so writing it would put
 * a param on the URL that says what its own absence already says — and every
 * link shared before B2 existed would then mean something different from a link
 * shared after it. Absence means `"now"`, in both directions.
 */
export const DEMO_MODE_PARAM = "mode";

/**
 * The mode a URL is asking for.
 *
 * ⛔ Anything that is not exactly `"fixed"` or `"now"` is `DEFAULT_DEMO_MODE` —
 * a missing param, an empty one, a typo, a casing slip. The proposal side has
 * to be asked for explicitly, because the failure directions are not
 * symmetrical: falling back to `"now"` shows production, which is merely early;
 * falling back to `"fixed"` would show the proposal and quietly answer "what
 * happens now?" with the thing we are proposing.
 */
export function modeFromParam(raw: string | null): DemoMode {
  return raw !== null && (DEMO_MODES as readonly string[]).includes(raw)
    ? (raw as DemoMode)
    : DEFAULT_DEMO_MODE;
}

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

/** What the toggle's two segments say. ⚠️ Tooling copy, not driver-facing. */
export const DEMO_MODE_LABEL: Record<DemoMode, string> = {
  now: "Now",
  fixed: "Proposed",
};

/** The longer form, for the control's accessible name. */
export const DEMO_MODE_DESCRIPTION: Record<DemoMode, string> = {
  now: "Show what a driver hits today",
  fixed: "Show the proposed feature",
};

/**
 * Built rows whose production side is **not built yet**.
 *
 * ⛔⛔ Declared as the SHRINKING list rather than the growing one, deliberately.
 * A list of "rows that work" grows with every commit and is wrong by omission —
 * forget to add a row and the app silently claims it has no Now. This list is
 * wrong by COMMISSION: a row stays on it until someone deletes the line, and
 * deleting a line is the thing you cannot forget to do when the note is still
 * on screen in front of you.
 *
 * ⚠️ Row 10 is here for a reason worth stating. Focusing it in `"now"` does
 * hide the More Options tile it shares with row 09 — so something changes — but
 * its headline feature, the Request Feed member filter, is not gated yet. A
 * toggle that moves a tile while the filter it is really about stays put is the
 * kind of half-truth that is worse than an empty state.
 *
 * ⭐ B5's check 12 measures the running app and asserts this list is exactly
 * right, in both directions.
 */
export const ROWS_AWAITING_NOW: readonly string[] = [
  "missed-swipe",                   // 03 — ⛔ the pick-up refusal is uncaptured
  "request-feed-member-filter",     // 10 — the filter itself is not gated
];

/** Whether the focused row can actually show production today. */
export function hasNowState(solutionId: string | null): boolean {
  return solutionId !== null && !ROWS_AWAITING_NOW.includes(solutionId);
}

/**
 * ⛔ No default for `mode`. A default would let a converted call site compile
 * while silently answering the wrong question, which is the one failure
 * `typecheck` is being used to prevent here.
 */
export function demoFocus(solutionId: string | null, mode: DemoMode): DemoFocus {
  return { solutionId, mode };
}
