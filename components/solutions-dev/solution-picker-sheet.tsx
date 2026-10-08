"use client";

import { Check } from "lucide-react";

import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import {
  CLASS_LABEL,
  COVERED_CALLS,
  SOLUTIONS,
  buildStateLabel,
  formatShare,
  subjectAreaGroups,
  type Solution,
} from "@/lib/solutions/catalogue";
import { useSolution } from "@/lib/solutions/solution-context";
import { cn } from "@/lib/utils";

/**
 * The prototype selector's menu half — every proposed feature from the support
 * call analysis, grouped by subject area in call order.
 *
 * All 26 rows are listed, including the three there is nothing to build in the
 * app for. Dropping them would make the menu tidier and the call totals wrong.
 */

function Row({ solution, onPick }: { solution: Solution; onPick: (s: Solution) => void }) {
  const { active } = useSolution();
  const isActive = active?.id === solution.id;
  const unbuildable = solution.klass === "no-app-surface";

  return (
    <button
      type="button"
      onClick={() => onPick(solution)}
      className={cn(
        "flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left",
        isActive ? "bg-[#E6F4EF]" : "hover:bg-gray-50",
      )}
    >
      <span
        className={cn(
          "mt-0.5 shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] font-bold",
          isActive ? "bg-[#00B090] text-white" : "bg-gray-100 text-gray-500",
        )}
      >
        {String(solution.order).padStart(2, "0")}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-sm leading-snug text-gray-900">
          {solution.proposedFeature}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-semibold",
              unbuildable
                ? "bg-[#FEF3C7] text-[#92400E]"
                : solution.klass === "form"
                  ? "bg-[#D8EDE4] text-[#0F3A33]"
                  : "bg-gray-100 text-gray-600",
            )}
          >
            {CLASS_LABEL[solution.klass]}
          </span>
          <span className="text-[10px] font-medium text-gray-500">
            {buildStateLabel(solution.buildState)}
          </span>
          {solution.sharedBuildWith && (
            <span className="text-[10px] text-gray-400">· same build as 17</span>
          )}
        </span>
      </span>

      {isActive && <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#00B090]" />}
    </button>
  );
}

export function SolutionPickerSheet() {
  const { pickerOpen, setPickerOpen, focus } = useSolution();
  const groups = subjectAreaGroups();

  /**
   * ⚠️ The navigation is deferred by a tick.
   *
   * vaul reports `onOpenChange(false)` BEFORE the handler that caused it, so
   * closing the sheet and pushing a route in the same turn races the drawer's
   * own exit. Deferring lets the close settle first.
   */
  function pick(solution: Solution) {
    setPickerOpen(false);
    setTimeout(() => focus(solution), 0);
  }

  return (
    <Drawer open={pickerOpen} onOpenChange={setPickerOpen}>
      <DrawerContent className="flex max-h-[88vh] flex-col rounded-t-3xl border-0 px-4 pb-6">
        <div className="pb-3 pt-5">
          <DrawerTitle className="text-xl font-bold text-gray-900">
            Proposed features
          </DrawerTitle>
          <p className="mt-1 text-xs text-gray-500">
            {SOLUTIONS.length} features across {groups.length} subject areas,
            covering {COVERED_CALLS.toLocaleString()} support calls. Ordered by
            call volume.
          </p>
        </div>

        <div className="-mx-1 flex-1 overflow-y-auto px-1">
          {groups.map((group) => (
            <section key={group.subjectArea} className="mb-4">
              <header className="sticky top-0 z-10 flex items-baseline gap-2 bg-white px-3 py-1.5">
                <h3 className="text-xs font-bold uppercase tracking-wide text-gray-900">
                  {group.subjectArea}
                </h3>
                <span className="text-[11px] text-gray-500">
                  {group.calls.toLocaleString()} ·{" "}
                  {formatShare(group.solutions[0])}
                </span>
              </header>
              <div className="space-y-0.5">
                {group.solutions.map((solution) => (
                  <Row key={solution.id} solution={solution} onPick={pick} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
