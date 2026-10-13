"use client";

import {
  DEMO_MODES,
  DEMO_MODE_DESCRIPTION,
  DEMO_MODE_LABEL,
  hasNowState,
  type DemoMode,
} from "@/lib/solutions/demo-mode";
import { useSolution } from "@/lib/solutions/solution-context";
import { cn } from "@/lib/utils";

/**
 * The switch between what happens today and what we propose.
 *
 * ⭐ The whole slice reduces to this control. Without it the production side is
 * reachable only by hand-editing a query string, which is not a thing anyone
 * does in front of an audience.
 *
 * ⛔ **Rendered only when a row is focused**, because the mode is scoped to the
 * focus and nothing else. With no focus the app is the plain mirror, showing
 * every proposal at once — there is no side to be on, so a control offering to
 * pick one would be describing a state the app cannot be in.
 *
 * ⛔ Flipping it NEVER navigates. `setMode` sets state and the mirror effect
 * writes the param; a navigation would remount the ride underneath and throw
 * away the state the comparison is being made against. That is also why the
 * control lives in the strip and the table rather than inside the app — the
 * driver app has no opinion about which side it is showing.
 *
 * ⚠️ Two instances exist (strip and focused table row) and that is fine: both
 * read the same `mode` from context and call the same `setMode`, so they cannot
 * disagree. Two COPIES of the markup could, which is why this is a component.
 */
export function DemoModeToggle({ tone }: { tone: "dark" | "light" }) {
  const { active, mode, setMode } = useSolution();

  // ⛔ No focus, no side. See above.
  if (!active) return null;

  const awaiting = !hasNowState(active.id);

  return (
    <span className="inline-flex flex-col gap-1">
      <span
        role="group"
        aria-label="Which side of this feature to show"
        className={cn(
          "inline-flex rounded-full p-0.5",
          tone === "dark" ? "bg-[#1B2C28]" : "bg-gray-100",
        )}
      >
        {DEMO_MODES.map((candidate: DemoMode) => {
          const on = mode === candidate;
          return (
            <button
              key={candidate}
              type="button"
              aria-pressed={on}
              aria-label={DEMO_MODE_DESCRIPTION[candidate]}
              onClick={(event) => {
                // ⛔ Both the strip row and the table row are clickable
                // ancestors. Without this the tap re-focuses the row, which
                // resets the mode to "now" — so "Proposed" would visibly fail
                // to stick, on the one control the demo turns on.
                event.stopPropagation();
                setMode(candidate);
              }}
              className={cn(
                "rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00B090]",
                on
                  ? tone === "dark"
                    ? "bg-[#00B090] text-[#06231D]"
                    : "bg-[#0F3A33] text-[#E6EFEC]"
                  : tone === "dark"
                    ? "text-[#9FC3B8] hover:text-[#E6EFEC]"
                    : "text-gray-500 hover:text-gray-900",
              )}
            >
              {DEMO_MODE_LABEL[candidate]}
            </button>
          );
        })}
      </span>

      {/*
        ⚠️ Said out loud rather than by disabling the control. A greyed-out
        segment reads as "this row has no production behaviour", which is false
        for all four — they have one, it is just not built here yet. Naming the
        gap keeps it from being demonstrated as an answer.
      */}
      {awaiting && (
        <span
          className={cn(
            "text-[10px] leading-snug",
            tone === "dark" ? "text-[#C9A227]" : "text-[#92400E]",
          )}
        >
          ⚠️ Not in prototype yet — this row&rsquo;s production screen is still
          to be built, so Now and Proposed look the same here.
        </span>
      )}
    </span>
  );
}
