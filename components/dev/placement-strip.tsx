"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  absentReasonFor,
  CHAT_PLACEMENTS,
  PLACEMENT_META,
  ROUTE_COVERAGE,
  routeKeyFor,
} from "@/lib/messages-data/chat-placement";
import { useChatPlacement } from "@/lib/messages-data/chat-placement-context";

/**
 * The study switcher.
 *
 * Deliberately a flat strip in normal flow, not a floating pill. Every floating
 * position collides with something: bottom-left sits on the Home tab,
 * bottom-right lands on the ride detail's fixed z-30 action row and the
 * No-Show sticky Submit bar, top-right hits every refresh button. In normal
 * flow there is no z-index contest at all — and, the real reason, it appears in
 * every screenshot, so a capture says for itself which option produced it.
 *
 * Dark chrome so it reads as tooling. It is not the app.
 */
export function PlacementStrip() {
  const pathname = usePathname();
  const { placement, setPlacement, showAbsences, setShowAbsences } = useChatPlacement();

  const routeKey = routeKeyFor(pathname);
  const coverage = routeKey ? ROUTE_COVERAGE[routeKey] : null;
  const absent = showAbsences ? absentReasonFor(pathname, placement) : undefined;

  return (
    <div className="w-full border-b border-[#374151] bg-[#111827] text-gray-300">
      <div className="mx-auto flex max-w-md flex-col gap-1 px-2 py-1">
        <div className="flex items-center gap-1">
          <span className="shrink-0 text-[8px] font-bold uppercase tracking-wider text-gray-500">
            Option
          </span>
          {CHAT_PLACEMENTS.map((option) => (
            <button
              key={option}
              onClick={() => setPlacement(option)}
              title={PLACEMENT_META[option].tradeoff}
              className={cn(
                "rounded px-1.5 py-0.5 text-[9px] font-medium transition-colors",
                placement === option
                  ? "bg-[#10B981] text-[#062B22]"
                  : "bg-[#1F2937] text-gray-400 hover:text-gray-200"
              )}
            >
              {PLACEMENT_META[option].label}
            </button>
          ))}
          <button
            onClick={() => setShowAbsences(!showAbsences)}
            title="Draw a dashed ghost where the icon would have gone but doesn't"
            className={cn(
              "ml-auto shrink-0 rounded px-1.5 py-0.5 text-[9px] font-medium transition-colors",
              showAbsences
                ? "bg-[#FBBF24] text-[#3A2A05]"
                : "bg-[#1F2937] text-gray-400 hover:text-gray-200"
            )}
          >
            Gaps
          </button>
        </div>

        {/* What this option costs — always visible, so a screenshot carries it. */}
        <p className="text-[8px] leading-tight text-gray-500">
          <span className="font-semibold text-gray-300">{PLACEMENT_META[placement].label}:</span>{" "}
          {PLACEMENT_META[placement].blurb}
        </p>

        {absent ? (
          <p className="text-[8px] leading-tight text-[#FBBF24]">
            <span className="font-semibold">No icon here:</span> {absent}
          </p>
        ) : (
          coverage?.caveat && (
            <p className="text-[8px] leading-tight text-gray-500">
              <span className="font-semibold text-gray-400">{coverage.label}:</span>{" "}
              {coverage.caveat}
            </p>
          )
        )}
      </div>
    </div>
  );
}
