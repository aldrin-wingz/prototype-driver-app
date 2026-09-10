"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  absentReasonFor,
  CHAT_COEXISTENCE,
  CHAT_PLACEMENTS,
  COEXISTENCE_META,
  PLACEMENT_META,
  ROUTE_COVERAGE,
  routeKeyFor,
} from "@/lib/messages-data/chat-placement";
import { useChatPlacement } from "@/lib/messages-data/chat-placement-context";

const SHORT_LABEL: Record<string, string> = {
  off: "Off",
  "header-left": "Left",
  "header-right": "Right",
  "nav-tab": "Tab",
  "options-row": "Options",
};

/**
 * The study switcher.
 *
 * Deliberately a flat strip in normal flow, not a floating pill. Every floating
 * position collides with something: bottom-left sits on the Home tab, bottom-right
 * lands on the ride detail's fixed z-30 action row and the No-Show sticky Submit
 * bar, top-right hits every refresh button. In normal flow there is no z-index
 * contest at all — and, the real reason, it appears in every screenshot, so a
 * capture says for itself which combination produced it.
 *
 * Dark chrome so it reads as tooling. It is not the app.
 */
export function PlacementStrip() {
  const pathname = usePathname();
  const { placement, setPlacement, coexistence, setCoexistence, showAbsences, setShowAbsences } =
    useChatPlacement();

  const routeKey = routeKeyFor(pathname);
  const coverage = routeKey ? ROUTE_COVERAGE[routeKey] : null;
  // Why the icon is missing here, shown only while Gaps is on — the ghost in the
  // slot says "declined", this says why, and a screenshot captures both.
  const absent = showAbsences ? absentReasonFor(pathname, placement) : undefined;

  return (
    <div className="w-full border-b border-[#374151] bg-[#111827] text-gray-300">
      <div className="mx-auto flex max-w-md flex-col gap-1 px-2 py-1">
        {/* Row 1 — placement */}
        <div className="flex items-center gap-1">
          <span className="shrink-0 text-[8px] font-bold uppercase tracking-wider text-gray-500">
            Icon
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
              {SHORT_LABEL[option]}
            </button>
          ))}
        </div>

        {/* Row 2 — coexistence + absences */}
        <div className="flex items-center gap-1">
          <span className="shrink-0 text-[8px] font-bold uppercase tracking-wider text-gray-500">
            Zendesk
          </span>
          {CHAT_COEXISTENCE.map((option) => (
            <button
              key={option}
              onClick={() => setCoexistence(option)}
              title={COEXISTENCE_META[option].blurb}
              className={cn(
                "rounded px-1.5 py-0.5 text-[9px] font-medium transition-colors",
                coexistence === option
                  ? "bg-[#60A5FA] text-[#0B1F3A]"
                  : "bg-[#1F2937] text-gray-400 hover:text-gray-200"
              )}
            >
              {COEXISTENCE_META[option].label}
            </button>
          ))}
          <button
            onClick={() => setShowAbsences(!showAbsences)}
            title="Draw a dashed ghost where the icon would have gone but doesn't"
            className={cn(
              "ml-auto rounded px-1.5 py-0.5 text-[9px] font-medium transition-colors",
              showAbsences
                ? "bg-[#FBBF24] text-[#3A2A05]"
                : "bg-[#1F2937] text-gray-400 hover:text-gray-200"
            )}
          >
            Gaps
          </button>
        </div>

        {/* Row 3 — what this screen contributes, only when there is something to say */}
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
