"use client";

import { Check, CornerDownRight, X } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  CLASS_LABEL,
  COVERED_CALLS,
  SOLUTIONS,
  buildStateLabel,
  formatShare,
  subjectAreaGroups,
  type Solution,
} from "@/lib/solutions/catalogue";
import { tableRows } from "@/lib/solutions/table-shape";
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

export function SolutionTable() {
  const { active, focus, clear } = useSolution();
  const router = useRouter();
  const rows = tableRows();
  const groups = subjectAreaGroups();

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
          Pick a row to focus the app on it.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-[#0F3A33] text-[#E6EFEC]">
              <th className="px-3 py-2 text-left font-semibold">Subject Area</th>
              <th className="px-3 py-2 text-right font-semibold">Calls</th>
              <th className="px-3 py-2 text-right font-semibold">% of Categorised</th>
              <th className="px-3 py-2 text-left font-semibold">Problem</th>
              <th className="px-3 py-2 text-left font-semibold">Use Case</th>
              <th className="px-3 py-2 text-left font-semibold">Proposed Feature</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ solution, areaSpan, problemSpan, useCaseSpan }) => {
              const isActive = active?.id === solution.id;
              return (
                <tr
                  key={solution.id}
                  onClick={() => focus(solution)}
                  className={cn(
                    "cursor-pointer",
                    isActive ? "bg-[#E6F4EF]" : "hover:bg-gray-50",
                  )}
                >
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

                  {useCaseSpan > 0 && (
                    <td rowSpan={useCaseSpan} className={cn(CELL, "border-r")}>
                      <UseCaseFlow text={solution.useCase} tone="light" />
                    </td>
                  )}

                  <td className={cn(CELL, "text-gray-900")}>
                    <span className="flex items-start gap-2">
                      <span className="mt-0.5 shrink-0 rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-gray-500">
                        {String(solution.order).padStart(2, "0")}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block leading-snug">{solution.proposedFeature}</span>
                        <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                          <ClassBadge solution={solution} />
                          <span className="text-[10px] font-medium text-gray-500">
                            {buildStateLabel(solution.buildState)}
                          </span>
                        </span>
                      </span>
                      {isActive && <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#00B090]" />}
                    </span>

                    {/*
                      ⛔⛔ The focused row's controls live INSIDE this cell, not
                      in a detail row of their own. An extra <tr> would sit
                      inside a rowspan run and silently break every span above
                      it — the table would still render, with cells against the
                      wrong rows. This is the one column that never merges, so
                      it is the only safe place to grow.

                      These moved off the strip, which is hidden at this width
                      because the table already says everything it said. ⚠️ The
                      strip still carries them below the breakpoint, where it is
                      the only way in.
                    */}
                    {isActive && (
                      <span className="mt-2 block border-t border-[#E5E7EB] pt-2">
                        {solution.noSurfaceReason && (
                          <span className="block text-[11px] leading-snug text-[#92400E]">
                            {solution.noSurfaceReason}
                          </span>
                        )}
                        {solution.entry && (
                          <span className="block text-[11px] leading-snug text-gray-500">
                            {solution.entry.label}
                          </span>
                        )}
                        {/* A slice can have more than one state worth seeing —
                            10 of these across 8 rows, and they are the only way
                            to reach a slice's second and third states. */}
                        {solution.entry?.alternates?.map((alternate) => (
                          <button
                            key={alternate.route}
                            type="button"
                            onClick={(event) => {
                              // ⛔ The row itself is clickable. Without this the
                              // tap re-focuses the row and the alternate's
                              // navigation is thrown away.
                              event.stopPropagation();
                              router.push(solutionHref(alternate.route, solution.id));
                            }}
                            className="mt-1 flex w-full items-start gap-1.5 rounded text-left text-[11px] leading-snug text-gray-500 hover:text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00B090]"
                          >
                            <CornerDownRight className="mt-0.5 h-3 w-3 shrink-0 text-[#00B090]" />
                            <span>{alternate.label}</span>
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
                          Clear the focus
                        </button>
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
