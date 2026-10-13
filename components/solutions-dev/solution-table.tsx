"use client";

import { Check, CornerDownRight, X } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  CLASS_LABEL,
  CLEAR_FOCUS_LABEL,
  COVERED_CALLS,
  SOLUTIONS,
  buildStateLabel,
  formatShare,
  subjectAreaGroups,
  type Solution,
} from "@/lib/solutions/catalogue";
import {
  DEMO_MODE_DESCRIPTION,
  DEMO_MODE_LABEL,
  type DemoMode,
} from "@/lib/solutions/demo-mode";
import { tableRows } from "@/lib/solutions/table-shape";
import {
  COLUMN_MODE,
  cellSelected,
  selectAction,
  type SelectingColumn,
} from "@/lib/solutions/table-select";
import { solutionHref, useSolution } from "@/lib/solutions/solution-context";
import { cn } from "@/lib/utils";
import { UseCaseFlow } from "./use-case-flow";

/**
 * The call analysis as its own table, beside the app it is proposing to change.
 *
 * ⭐ Deliberately the SPREADSHEET's shape, not a list of 26 cards: Subject Area
 * spans its Problems, a Problem spans its Use Cases, and the rightmost column
 * never merges. That shape is the argument — it shows at a glance that one
 * problem can need several features, that several problems share one call
 * total, and which rows have no proposal at all.
 *
 * ⭐⭐ **B6: the two right-hand columns ARE the switch.** Clicking a row's Use
 * Case shows what happens today; clicking its Proposed Feature shows the fix;
 * the one you are looking at is lit. The table stops describing the comparison
 * and starts being it, and the segmented toggle is no longer mounted here.
 *
 * ⛔⛔ The toggle did not disappear — below 1280px there is no table at all, so
 * the strip still carries it and it is still the only control there. The mode
 * has one owner, the provider, and two shapes of control.
 *
 * ⛔ The other four columns do nothing on click (user, 2026-10-14). The rule,
 * including the `"nothing"` outcome, lives in `lib/solutions/table-select.ts`
 * — a branch written only inside an `onClick` is a branch no check can reach.
 *
 * ⚠️ Desktop only; `.solution-table-col` is `hidden` below the breakpoint,
 * where the picker drawer remains the way in. Nothing here is responsive,
 * because at phone width it is not rendered at all.
 *
 * ⚠️ Colours are literal strings, never interpolated into a class name — a
 * Tailwind utility built by interpolation compiles to nothing with no build
 * error, and `verify-base` §4 guards it.
 */

/** Shared by every cell, so the merged ones line up with the unmerged ones. */
const CELL = "border-b border-[#E5E7EB] px-3 py-2.5 align-top text-left";

/**
 * ⛔ Literal class strings in a declared map, never built by interpolation.
 * A Tailwind utility assembled from a variable compiles to nothing, with no
 * build error and no visible difference until someone looks for the colour.
 */
const SELECT_TONE = {
  /** The side you are looking at. */
  on: "bg-[#D8EDE4] shadow-[inset_3px_0_0_0_#00B090]",
  /** The focused row's other side — present, but not what is on screen. */
  offInFocusedRow: "bg-[#F1F9F6] hover:bg-[#E6F4EF]",
  /** Any other row. */
  idle: "hover:bg-gray-50",
} as const;

function ClassBadge({ solution }: { solution: Solution }) {
  const unbuildable = solution.klass === "no-app-surface";
  return (
    <span
      className={cn(
        "inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold",
        unbuildable
          ? "bg-[#FEF3C7] text-[#92400E]"
          : solution.klass === "form"
            ? "bg-[#D8EDE4] text-[#0F3A33]"
            : "bg-gray-100 text-gray-600",
      )}
    >
      {CLASS_LABEL[solution.klass]}
    </span>
  );
}

/** A column header that names the side its column selects. */
function SideHeader({ title, column }: { title: string; column: SelectingColumn }) {
  return (
    <th className="px-3 py-2 text-left font-semibold">
      {title}
      {/* ⭐ Read from DEMO_MODE_LABEL, the same names the strip's toggle uses,
          so the two controls can never call the two sides different things. */}
      <span className="ml-1.5 rounded-full bg-[#1B2C28] px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-[#9FC3B8]">
        {DEMO_MODE_LABEL[COLUMN_MODE[column]]}
      </span>
    </th>
  );
}

/**
 * The two cells that select.
 *
 * ⛔⛔ **Module scope, not nested inside `SolutionTable`.** A component
 * declared inside another is a NEW component type on every render, so React
 * unmounts and remounts its whole subtree each time — which here would throw
 * away keyboard focus on the cell you just pressed, on every state change the
 * press causes. It renders identically either way, which is why this is worth
 * writing down rather than discovering.
 *
 * ⚠️ A `<td>` with `role="button"` rather than a `<button>` wrapping the
 * content: `UseCaseFlow` renders `<p>` elements and the Proposed Feature cell
 * holds the focused row's own buttons, and a button inside a button is invalid
 * markup React will not render as written. The keyboard handler is here so
 * both cells get it from one place.
 */
function SelectCell({
  solution,
  column,
  runIds,
  rowSpan,
  className,
  activeId,
  activeMode,
  onSelect,
  children,
}: {
  solution: Solution;
  column: SelectingColumn;
  runIds: readonly string[];
  rowSpan?: number;
  className?: string;
  activeId: string | null;
  activeMode: DemoMode;
  onSelect: (
    solution: Solution,
    column: SelectingColumn,
    runIds: readonly string[],
  ) => void;
  children: React.ReactNode;
}) {
  const on = cellSelected({ runIds, column, activeId, activeMode });
  const inFocusedRow = activeId !== null && runIds.includes(activeId);
  return (
    <td
      rowSpan={rowSpan}
      role="button"
      tabIndex={0}
      aria-pressed={on}
      aria-label={DEMO_MODE_DESCRIPTION[COLUMN_MODE[column]]}
      onClick={() => onSelect(solution, column, runIds)}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        onSelect(solution, column, runIds);
      }}
      className={cn(
        CELL,
        "cursor-pointer transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#00B090]",
        on
          ? SELECT_TONE.on
          : inFocusedRow
            ? SELECT_TONE.offInFocusedRow
            : SELECT_TONE.idle,
        className,
      )}
    >
      {children}
    </td>
  );
}

export function SolutionTable() {
  const { active, mode, focus, setMode, clear } = useSolution();
  const router = useRouter();
  const rows = tableRows();
  const groups = subjectAreaGroups();
  const activeId = active?.id ?? null;

  /**
   * ⛔ Three outcomes, decided in `lib/`. `"nothing"` is a real one: three
   * screens into a demo, clicking the cell that is already lit must not yank
   * the app back to the entry route for no change of state.
   */
  function select(solution: Solution, column: SelectingColumn, runIds: readonly string[]) {
    const action = selectAction({
      runIds,
      clickedId: solution.id,
      column,
      activeId,
      activeMode: mode,
    });
    if (action === "focus") focus(solution, COLUMN_MODE[column]);
    else if (action === "set-mode") setMode(COLUMN_MODE[column]);
  }

  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm">
      <div className="border-b border-[#E5E7EB] px-4 py-3">
        <h2 className="text-sm font-bold text-gray-900">
          Driver Inbound Call Volume — Problems and Proposed Features
        </h2>
        <p className="mt-0.5 text-[11px] text-gray-500">
          {SOLUTIONS.length} proposed features across {groups.length} subject
          areas, covering {COVERED_CALLS.toLocaleString()} support calls.
          Percentages are a share of the 7,483 calls that carry a subject area.
          Click a <strong className="font-semibold text-gray-700">Use Case</strong> to
          see what happens today, or its{" "}
          <strong className="font-semibold text-gray-700">Proposed Feature</strong> to
          see what we propose instead.
        </p>
      </div>

      {/*
        ⛔ The SCROLLER, and the reason the header sticks rather than the body
        scrolling. A `<tbody>` given its own `overflow-y` has to become a block
        box, and the moment it does it stops sharing the table's column widths
        — the header and the body line up by coincidence and drift the instant
        any cell's content changes. `position: sticky` on the `<th>`s inside a
        scrolling wrapper keeps one table layout and gets the same result.
      */}
      <div className="solution-table-scroll overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-[#0F3A33] text-[#E6EFEC]">
              <th className="px-3 py-2 text-left font-semibold">Subject Area</th>
              <th className="px-3 py-2 text-right font-semibold">Calls</th>
              <th className="px-3 py-2 text-right font-semibold">% of Categorised</th>
              <th className="px-3 py-2 text-left font-semibold">Problem</th>
              <SideHeader title="Use Case" column="use-case" />
              <SideHeader title="Proposed Feature" column="proposed-feature" />
            </tr>
          </thead>
          <tbody>
            {rows.map(({ solution, areaSpan, problemSpan, useCaseSpan, useCaseRunIds }) => {
              const isActive = activeId === solution.id;
              return (
                /*
                  ⛔ No `onClick` on the row. Subject Area, Calls, % and Problem
                  are inert (user, 2026-10-14), and a row handler would make all
                  four select by inheritance — the exact thing that was removed.
                */
                <tr key={solution.id} className={cn(isActive && "bg-[#F8FCFB]")}>
                  {/* ⛔ A span of 0 renders NOTHING — the row above already
                      covers this cell. That is what a merged cell is, and
                      emitting an empty <td> instead would silently add a
                      seventh column to every covered row. */}
                  {areaSpan > 0 && (
                    <td rowSpan={areaSpan} className={cn(CELL, "border-r font-semibold text-gray-900")}>
                      {solution.subjectArea}
                    </td>
                  )}
                  {areaSpan > 0 && (
                    <td rowSpan={areaSpan} className={cn(CELL, "border-r text-right tabular-nums text-gray-700")}>
                      {solution.calls.toLocaleString()}
                    </td>
                  )}
                  {areaSpan > 0 && (
                    <td rowSpan={areaSpan} className={cn(CELL, "border-r text-right tabular-nums text-gray-700")}>
                      {formatShare(solution)}
                    </td>
                  )}

                  {problemSpan > 0 && (
                    <td rowSpan={problemSpan} className={cn(CELL, "border-r text-gray-800")}>
                      {solution.problem}
                    </td>
                  )}

                  {/* ⚠️ A merged Use Case cell speaks for its whole run — rows
                      09+10 and 11+12 share one — so clicking it focuses the row
                      it belongs to, which is the first of that run, and it
                      lights when ANY row of the run is focused on this side. */}
                  {useCaseSpan > 0 && (
                    <SelectCell
                      solution={solution}
                      column="use-case"
                      runIds={useCaseRunIds}
                      rowSpan={useCaseSpan}
                      className="border-r"
                      activeId={activeId}
                      activeMode={mode}
                      onSelect={select}
                    >
                      <div className="flex items-start gap-2">
                        <UseCaseFlow text={solution.useCase} tone="light" className="min-w-0 flex-1" />
                        {cellSelected({
                          runIds: useCaseRunIds,
                          column: "use-case",
                          activeId,
                          activeMode: mode,
                        }) && <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#00B090]" />}
                      </div>
                    </SelectCell>
                  )}

                  <SelectCell
                    solution={solution}
                    column="proposed-feature"
                    runIds={[solution.id]}
                    className="text-gray-900"
                    activeId={activeId}
                    activeMode={mode}
                    onSelect={select}
                  >
                    <span className="flex items-start gap-2">
                      <span className="mt-0.5 shrink-0 rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-gray-500">
                        {String(solution.order).padStart(2, "0")}
                      </span>
                      <span className="min-w-0 flex-1">
                        {/*
                          ⛔ `tableSummary`, NOT `proposedFeature`. The second is
                          the spreadsheet's own column, mirrored 1:1 and asserted
                          against the source — it runs to 535 characters on row
                          03. The prototype is standing right beside this table
                          saying the same thing better, so the cell says it once.
                        */}
                        <span className="block leading-snug">{solution.tableSummary}</span>
                        <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                          <ClassBadge solution={solution} />
                          <span className="text-[10px] font-medium text-gray-500">
                            {buildStateLabel(solution.buildState)}
                          </span>
                        </span>
                      </span>
                      {isActive && mode === "fixed" && (
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#00B090]" />
                      )}
                    </span>

                    {/*
                      ⛔⛔ The focused row's controls live INSIDE this cell, not
                      in a detail row of their own. An extra <tr> would sit
                      inside a rowspan run and silently break every span above
                      it — the table would still render, with cells against the
                      wrong rows. This is the one column that never merges, so
                      it is the only safe place to grow.

                      ⚠️ B6 removed two things from this block: the segmented
                      toggle, which the two columns above replaced, and
                      `entry.label`, which explained and controlled nothing. The
                      alternates stayed, because each one is a BUTTON and the
                      only route to a state of this slice — eleven of them
                      across nine rows. They lost their paragraphs, not their
                      navigation.
                    */}
                    {isActive && (
                      <span className="mt-2 block border-t border-[#E5E7EB] pt-2">
                        {solution.noSurfaceReason && (
                          <span className="block text-[11px] leading-snug text-[#92400E]">
                            {solution.noSurfaceReason}
                          </span>
                        )}
                        {/* A slice can have more than one state worth seeing —
                            11 of these across 9 rows, and they are the only way
                            to reach a slice's second and third states. */}
                        {solution.entry?.alternates?.map((alternate) => (
                          <button
                            key={alternate.route}
                            type="button"
                            onClick={(event) => {
                              // ⛔ The cell itself selects. Without this the tap
                              // would also re-decide the side, and the
                              // alternate's navigation would race it.
                              event.stopPropagation();
                              router.push(solutionHref(alternate.route, solution.id));
                            }}
                            className="mt-1 flex w-full items-start gap-1.5 rounded text-left text-[11px] leading-snug text-gray-500 hover:text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00B090]"
                          >
                            <CornerDownRight className="mt-0.5 h-3 w-3 shrink-0 text-[#00B090]" />
                            {/* ⛔ `short`, hand-written. The full `label` is a
                                paragraph and still reaches the strip; here it
                                was the "description and notes" B6 removed. */}
                            <span>{alternate.short}</span>
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            clear();
                          }}
                          className="mt-1.5 inline-flex items-center gap-1 rounded text-[11px] font-medium text-gray-500 hover:text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00B090]"
                        >
                          <X className="h-3 w-3" />
                          {CLEAR_FOCUS_LABEL}
                        </button>
                      </span>
                    )}
                  </SelectCell>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
