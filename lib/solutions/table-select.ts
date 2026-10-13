import type { DemoMode } from "./demo-mode";

/**
 * What a click on a table cell means.
 *
 * ⭐ B6: the table stops *describing* the comparison and starts *being* it.
 * Clicking a row's **Use Case** shows what happens today; clicking its
 * **Proposed Feature** shows the fix. The two columns are the two sides, so the
 * selector and the thing it selects are the same object.
 *
 * ⛔⛔ **This did not replace the toggle, it replaced one MOUNT of it.** Below
 * 1280px there is no table at all, so the strip still carries `DemoModeToggle`
 * and it is still the only control there. The mode has one owner — the provider
 * — and now two shapes of control, which is the shape it already had.
 *
 * ⚠️ Named here rather than written as a ternary in the table's `onClick`,
 * because `"nothing"` is a real outcome with a real reason and a branch that
 * only ever appears inside JSX is a branch no check can reach.
 */

/** Every column the table draws. Four of them are inert — see `INERT_COLUMNS`. */
export type TableColumn =
  | "subject-area"
  | "calls"
  | "share"
  | "problem"
  | "use-case"
  | "proposed-feature";

/**
 * The two columns that select, and the side each one means.
 *
 * ⛔ A `Record` over a narrowed union rather than a lookup with a fallback, so
 * adding a third mode or a seventh column fails `typecheck` instead of silently
 * selecting `"now"`.
 */
export const SELECTING_COLUMNS = ["use-case", "proposed-feature"] as const;
export type SelectingColumn = (typeof SELECTING_COLUMNS)[number];

export const COLUMN_MODE: Record<SelectingColumn, DemoMode> = {
  "use-case": "now",
  "proposed-feature": "fixed",
};

/**
 * ⛔ The four that do nothing on click (user, 2026-10-14).
 *
 * Declared rather than left implicit, because "this cell is not a control" is
 * a claim a check can only make against a list. The consequence to keep in
 * view: the Use Case column MERGES, so a row covered by another row's use-case
 * cell can be focused only through its own Proposed Feature cell — which never
 * merges, and is why all 26 rows stay reachable.
 */
export const INERT_COLUMNS = ["subject-area", "calls", "share", "problem"] as const;

export type SelectAction =
  /** Not the focused row: take the focus, and land on the column's side. */
  | "focus"
  /** The focused row, the other side: flip in place, WITHOUT navigating. */
  | "set-mode"
  /** The focused row, the side already showing: do not disturb it. */
  | "nothing";

export interface SelectInput {
  /** The row whose cell was clicked. For a merged cell, the row it belongs to. */
  clickedId: string;
  column: SelectingColumn;
  activeId: string | null;
  activeMode: DemoMode;
}

export function selectAction(input: SelectInput): SelectAction {
  const wanted = COLUMN_MODE[input.column];
  // A different row — or none at all. `focus()` moves the app to the row's
  // entry point and sets the side in one go.
  if (input.clickedId !== input.activeId) return "focus";
  /**
   * ⛔⛔ The same row, the other side: `setMode`, never `focus`. This is the
   * rule the toggle already enforced and the cells inherit — flipping sides on
   * a ride detail has to leave you on that ride, or there is nothing to
   * compare. A `focus()` here would push back to the entry route and remount
   * the screen the comparison is being made against.
   */
  if (wanted !== input.activeMode) return "set-mode";
  /**
   * ⛔ The same row, the same side: nothing. Re-focusing would look harmless
   * and would not be — three screens into a demo, clicking the cell that is
   * already lit would yank you back to the entry point, with no state change
   * to show for it.
   */
  return "nothing";
}

/**
 * Whether a cell is the one currently selected, and so highlighted.
 *
 * ⚠️ Takes the ids the cell COVERS, not one id. The Use Case column merges
 * twice — rows 09+10 and rows 11+12 — and a merged cell is selected when any
 * row of its run is focused, because that cell is that run's use case. Passing
 * `[solution.id]` for an unmerged cell is the same rule with a run of one.
 */
export function cellSelected(input: {
  runIds: readonly string[];
  column: SelectingColumn;
  activeId: string | null;
  activeMode: DemoMode;
}): boolean {
  if (input.activeId === null) return false;
  if (!input.runIds.includes(input.activeId)) return false;
  return COLUMN_MODE[input.column] === input.activeMode;
}
