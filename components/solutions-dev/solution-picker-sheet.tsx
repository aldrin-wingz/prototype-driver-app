"use client";

import { Check } from "lucide-react";

import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import {
  CLASS_LABEL,
  COVERED_CALLS,
  SOLUTIONS,
  findSolution,
  buildStateLabel,
  isDemonstrable,
  formatShare,
  subjectAreaGroups,
  type Solution,
} from "@/lib/solutions/catalogue";
import { useSolution } from "@/lib/solutions/solution-context";
import { cn } from "@/lib/utils";
import { UseCaseFlow } from "./use-case-flow";

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
  /**
   * ⛔⛔ **The same rule the desktop table greys on**, or the two surfaces
   * disagree about which rows are pickable at 1279px and 1280px. Twelve rows
   * have nothing to show — see `demonstrableSides`. User direction 2026-10-14.
   *
   * ⚠️ `isDemonstrable`, never `buildState`: rows 11 and 12 are `not-yet` and
   * DO have a production screen, so greying them here would hide it on exactly
   * the widths where this drawer is the only way in.
   */
  const live = isDemonstrable(solution);
  // Resolved from the row it names, never written as a literal. `undefined`
  // when the id does not resolve, so a dangling reference prints nothing rather
  // than a wrong number — and `verify-solutions` already fails on one.
  const sharedWith = findSolution(solution.sharedBuildWith ?? null);

  return (
    <button
      type="button"
      disabled={!live}
      onClick={() => onPick(solution)}
      className={cn(
        "flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left",
        !live
          ? "cursor-default bg-[#FAFAFA] text-gray-400"
          : isActive
            ? "bg-[#E6F4EF]"
            : "hover:bg-gray-50",
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

        {/* The call as it actually unfolds. Each arrow is a step where the
            driver could have been helped and was not — which is what the
            proposed feature above is trying to remove. */}
        <span className="mt-1.5 block text-[11px] leading-snug">
          <UseCaseFlow text={solution.useCase} tone="light" />
        </span>

        <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
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
          {/* ⛔⛔ This number was HARDCODED to 17. It was written when rows 17
              and 18 were the only shared pair, so it read correctly by
              accident — and when rows 04 and 05 became a shared build it told
              you row 05 shared one with the requests tray. A fact about one row
              written as a literal in another row's JSX is a fact nothing can
              check; it now comes off the row it names. */}
          {sharedWith && (
            <span className="text-[10px] text-gray-400">
              · same build as {String(sharedWith.order).padStart(2, "0")}
            </span>
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
    /**
     * ⛔ The ONE drawer in the repo that stays on the page.
     *
     * Every other drawer is the driver's and belongs inside the phone frame.
     * This one is the prototype selector — tooling, listing all 26 proposed
     * features. Containing it would shrink the catalogue to 390px and park it
     * on top of the app it exists to navigate. A check asserts there is exactly
     * one of these and that it lives in `components/solutions-dev/`.
     */
    <Drawer open={pickerOpen} onOpenChange={setPickerOpen} portalTarget="viewport">
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
