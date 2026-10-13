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
 * The side a click on this column selects, **for this row**.
 *
 * ⛔⛔ **A row with no proposal has ONE side, and both columns select it.**
 * Rows 11, 12 and 25 are `no-app-surface`; rows 11 and 12 still have a
 * production screen worth landing on. If their Proposed Feature cell selected
 * `"fixed"` the table would offer a side that does not exist — and if it
 * selected NOTHING, row 12 would become unreachable, because its Use Case cell
 * is merged into row 11's. That is the B3d bug again, from the other end.
 *
 * ⚠️ Only the SELECTION is overridden, never the highlight: `cellSelected`
 * goes on reading `COLUMN_MODE`, so the Use Case cell is the one that lights
 * and the Proposed Feature cell focuses without ever claiming to be the side
 * on screen.
 */
export function columnModeFor(
  column: SelectingColumn,
  sides: readonly DemoMode[],
): DemoMode {
  const wanted = COLUMN_MODE[column];
  if (sides.includes(wanted)) return wanted;
  /**
   * ⛔⛔ A row with ONE demonstrable side: both columns select it. That is
   * what keeps row 12 reachable — its Use Case cell is merged into row 11's, so
   * its own Proposed Feature cell is the only way in, and a cell that selected
   * a side the row does not have would be a control pointing at nothing.
   *
   * ⚠️ A row with NO sides never reaches here: the table renders it as plain
   * cells with no handler at all.
   */
  return sides[0] ?? wanted;
}

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
  /**
   * The ids this cell COVERS — `[solution.id]` for an unmerged cell, the whole
   * run for a merged one.
   *
   * ⛔⛔ **The run, not the single id, and that is a bug fix.** B6 compared the
   * clicked row against `activeId` while `cellSelected` compared the whole run
   * — so the two disagreed about which cell belongs to the focused row.
   * Measured 2026-10-14 with row 10 focused: the merged Use Case cell above it
   * LIT, because the highlight counted it as row 10's, and clicking it jumped
   * the focus to row 09, because the click did not. Row 10's production side
   * was unreachable from the table, and the highlight was pointing straight at
   * the control that could not get there.
   *
   * ⚠️ Only the two merged runs are affected — rows 09+10 and 11+12. For the
   * other 22 the run is one row and this is the comparison it always was.
   */
  runIds: readonly string[];
  /** The row to focus, when this is a focus. A merged cell focuses its first. */
  clickedId: string;
  column: SelectingColumn;
  activeId: string | null;
  activeMode: DemoMode;
  /**
   * The sides the clicked row can demonstrate — `demonstrableSides`.
   *
   * ⚠️ Passed in rather than read from the catalogue here, so this module
   * stays a rule about clicks and does not have to know what a `Solution` is.
   *
   * ⛔ `[]` never reaches `selectAction`: the table gives a row with nothing to
   * show no handler at all. Were it to, every column would ask for a side the
   * row has not got, and `columnModeFor` would fall back to the column's own —
   * harmless, and still not something to rely on.
   */
  sides: readonly DemoMode[];
}

export function selectAction(input: SelectInput): SelectAction {
  const wanted = columnModeFor(input.column, input.sides);
  // Not the focused row's cell — or nothing is focused at all. `focus()` moves
  // the app to the row's entry point and sets the side in one go.
  if (!coversFocus(input.runIds, input.activeId)) return "focus";
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
  if (!coversFocus(input.runIds, input.activeId)) return false;
  return COLUMN_MODE[input.column] === input.activeMode;
}

/**
 * Whether this cell speaks for the focused row.
 *
 * ⛔⛔ **Named once, and read by BOTH the click and the highlight.** They each
 * had their own answer until 2026-10-14, and the two disagreed on exactly the
 * rows where it matters — the merged runs. A highlight that lights a cell the
 * click will not act on is worse than no highlight: it points at a control and
 * then does something else.
 */
function coversFocus(runIds: readonly string[], activeId: string | null): boolean {
  return activeId !== null && runIds.includes(activeId);
}