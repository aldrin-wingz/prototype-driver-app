"use client";

import { useState } from "react";
import { ChevronDown, ChevronsUpDown, CornerDownRight, X } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  CLASS_LABEL,
  CLEAR_FOCUS_LABEL,
  buildStateLabel,
  formatShare,
  SOLUTIONS,
} from "@/lib/solutions/catalogue";
import { useSolution, solutionHref } from "@/lib/solutions/solution-context";
import { UseCaseFlow } from "./use-case-flow";
import { cn } from "@/lib/utils";
import { DemoModeToggle } from "./demo-mode-toggle";

/**
 * The prototype selector's always-visible half.
 *
 * ⚠️ Deliberately a flat strip in normal flow, NOT a floating pill. Every
 * floating position collides with something in this app: bottom-left sits on
 * the Home tab, bottom-right lands on Ride Details' fixed z-30 action row and
 * the No-Show sticky Submit bar, top-right hits the header. And the real
 * reason — a strip appears in every screenshot, so a capture says for itself
 * which solution produced it.
 *
 * Dark chrome so it reads as tooling. It is not the app.
 *
 * ⚠️ HIDDEN at the desktop breakpoint. The feature table says everything this
 * strip said — subject area, calls, share, problem, use case, proposed feature
 * — against the row it belongs to, so keeping both was duplication. The four
 * things the table had no equivalent for (clear-focus, the alternates, the
 * no-surface reason and the entry label) moved into the focused row's last
 * cell; see `solution-table.tsx`. ⛔ Below the breakpoint this strip is still
 * the ONLY way in, so nothing here may be deleted — only hidden.
 *
 * ⚠️ Colours are literal strings, never interpolated into a class name. A
 * Tailwind utility built by interpolation compiles to nothing, with no build
 * error — `verify-base` §4 guards this.
 */

function Column({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 border-l border-[#2A3B37] px-3 py-2 first:border-l-0 first:pl-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#7D9A92]">
        {heading}
      </p>
      <div className="mt-1 whitespace-pre-line text-xs leading-snug text-[#E6EFEC]">
        {children}
      </div>
    </div>
  );
}

export function SolutionStrip() {
  const { active, clear, setPickerOpen } = useSolution();
  const router = useRouter();
  /**
   * ⚠️ Collapsible because of narrow viewports, not as decoration. Side by
   * side needs ~640px; below that the three columns stack and the briefing
   * runs to ~360px, which is more than a phone screen can spare above the
   * app it is describing. Open by default — the briefing is the point.
   */
  const [briefingOpen, setBriefingOpen] = useState(true);

  return (
    <div className="solution-strip bg-[#0F1A18] text-[#E6EFEC]">
      <div className="mx-auto w-full max-w-3xl px-4 py-2.5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            aria-label="Choose a solution to focus"
            className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1 text-left hover:bg-[#1B2C28] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4FD1AE]"
          >
            <span className="shrink-0 rounded bg-[#1B2C28] px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#4FD1AE]">
              {active ? String(active.order).padStart(2, "0") : "--"}
            </span>
            <span className="truncate text-sm font-semibold">
              {active ? active.subjectArea : "Prototype selector"}
            </span>
            <span className="shrink-0 text-xs text-[#7D9A92]">
              {active
                ? `${active.calls.toLocaleString()} calls · ${formatShare(active)}`
                : `${SOLUTIONS.length} proposed features`}
            </span>
            {/*
              ⛔⛔ Always an affordance, in BOTH states.
              Previously the chevron rendered only when nothing was focused —
              so on a deep link, which is the commonest way anyone arrives, the
              picker became a full-width invisible button sitting directly above
              the app, with the only visible chevron next to it belonging to a
              different control (the briefing collapse). Two near-miss taps on
              the ride below opened the picker and then selected a row from it,
              navigating out of the demo.

              A switcher glyph rather than a second ChevronDown, so the two
              adjacent controls cannot be mistaken for each other: this one
              changes the selection, that one folds the briefing.
            */}
            <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 text-[#7D9A92]" />
          </button>

          {active && (
            <button
              type="button"
              onClick={() => setBriefingOpen((open) => !open)}
              aria-expanded={briefingOpen}
              aria-label={briefingOpen ? "Collapse the briefing" : "Expand the briefing"}
              className="shrink-0 rounded-md p-1 text-[#7D9A92] hover:bg-[#1B2C28] hover:text-[#E6EFEC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4FD1AE]"
            >
              <ChevronDown
                className={cn("h-4 w-4 transition-transform", !briefingOpen && "-rotate-90")}
              />
            </button>
          )}

          {active && (
            <button
              type="button"
              onClick={clear}
              aria-label={CLEAR_FOCUS_LABEL}
              className="shrink-0 rounded-md p-1 text-[#7D9A92] hover:bg-[#1B2C28] hover:text-[#E6EFEC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4FD1AE]"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {active ? (
          <>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 px-2">
              {/* ⭐ First, because it is the control the demo turns on — and in
                  the strip rather than inside the phone, because the driver app
                  has no opinion about which side it is showing. */}
              <DemoModeToggle tone="dark" />
              <span className="rounded-full bg-[#1B2C28] px-2 py-0.5 text-[10px] font-semibold text-[#9FC3B8]">
                {CLASS_LABEL[active.klass]}
              </span>
              <span className="text-[10px] font-semibold text-[#9FC3B8]">
                {buildStateLabel(active.buildState)}
              </span>
            </div>

            {/* Side by side on anything wider than a phone; stacked below it,
                where the whole briefing is capped and scrolls on its own so it
                can never push the app it describes off the screen. */}
            <div
              className={cn(
                "mt-1.5 grid grid-cols-1 gap-y-1 px-2 sm:grid-cols-3 sm:gap-y-0",
                "max-h-[38vh] overflow-y-auto sm:max-h-none sm:overflow-visible",
                !briefingOpen && "hidden",
              )}
            >
              <Column heading="Problem">{active.problem}</Column>
              <Column heading="Use case">
                <UseCaseFlow text={active.useCase} tone="dark" />
              </Column>
              <Column heading="Proposed feature">{active.proposedFeature}</Column>
            </div>

            {active.noSurfaceReason && (
              <p className={cn("mt-1 px-2 text-[11px] leading-snug text-[#D8A657]", !briefingOpen && "hidden")}>
                {active.noSurfaceReason}
              </p>
            )}
            {active.entry && (
              <div className={cn("mt-1 px-2", !briefingOpen && "hidden")}>
                <p className="text-[11px] leading-snug text-[#7D9A92]">
                  {active.entry.label}
                </p>
                {/* A slice can have more than one state worth seeing. Rider
                    No-Show has two branches of one check, and showing only the
                    form branch demonstrates half the case. */}
                {active.entry.alternates?.map((alternate) => (
                  <button
                    key={alternate.route}
                    type="button"
                    onClick={() => router.push(solutionHref(alternate.route, active.id))}
                    className="mt-1 flex w-full items-start gap-1.5 rounded text-left text-[11px] leading-snug text-[#7D9A92] hover:text-[#E6EFEC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4FD1AE]"
                  >
                    <CornerDownRight className="mt-0.5 h-3 w-3 shrink-0 text-[#4FD1AE]" />
                    <span>{alternate.label}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="mt-0.5 px-2 text-[11px] text-[#7D9A92]">
            Choose one to focus the app on it and read its problem, use case and
            proposed feature together.
          </p>
        )}
      </div>
    </div>
  );
}
