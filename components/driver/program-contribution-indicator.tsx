"use client";

import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { IncentiveType } from "@/lib/data/incentives";
import {
  getIncentiveProgressInfo,
  formatProgressString,
  formatBonusString,
} from "@/lib/data/incentive-utils";
import { IncentivePillRenderer } from "./incentive-pill-renderer";

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

interface ProgramContributionIndicatorProps {
  /** Single incentive type this trip qualifies for (null/undefined = render nothing) */
  incentiveType: IncentiveType | null | undefined;
  /** Whether this is a completed trip (use muted colors) */
  isCompleted?: boolean;
  /** Position context — kept for API parity; behavior identical in v1. */
  context?: "card" | "detail";
}

// -----------------------------------------------------------------------------
// POPOVER CONTENT
// -----------------------------------------------------------------------------

function PopoverInnerContent({ incentiveType }: { incentiveType: IncentiveType }) {
  const progress = getIncentiveProgressInfo(incentiveType);
  if (!progress) return null;

  // App-I-4 (2026-05-12): fix pre-existing stale ref (`progress.targetCount`
  // — left over from the I-1 rename `targetCount` → `goal` which missed this
  // file's grep sweep). Now reads `progress.goal` correctly. Also makes the
  // popover mode-aware: rolling-window incentives show "Current Y-day window: X
  // done · N needed" instead of "X/Y trips" to match the IncentiveCard
  // semantics.
  const isRollingWindow = progress.goalMode === "rolling-window" && progress.goalDays != null;

  return (
    <p className="text-sm text-gray-700">
      <span>Counts toward </span>
      <span className="font-semibold text-gray-900">{progress.name}</span>
      <span> — </span>
      <span className="font-medium text-gray-900">
        {isRollingWindow ? (
          <>
            {/* App-I-4 (corrected 2026-05-12): "Current" not "Best" — see
                ProgressMeter docblock in dashboard-incentive-section.tsx. */}
            Current {progress.goalDays}-day window: {progress.currentCount} done
            {progress.remainingCount > 0 ? ` · ${progress.remainingCount} needed` : ""}
          </>
        ) : (
          formatProgressString(progress.currentCount, progress.goal)
        )}
      </span>
      <span> · </span>
      <span className="font-semibold text-[#10B981]">
        Earn {formatBonusString(progress.bonusAmount)}
      </span>
    </p>
  );
}

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------

export function ProgramContributionIndicator({
  incentiveType,
  isCompleted = false,
}: ProgramContributionIndicatorProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);

  if (!incentiveType) {
    return null;
  }

  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <div
          className="cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            setPopoverOpen(true);
          }}
        >
          <IncentivePillRenderer
            incentiveType={incentiveType}
            isCompleted={isCompleted}
          />
        </div>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        className="w-80"
        onClick={(e) => e.stopPropagation()}
      >
        <PopoverInnerContent incentiveType={incentiveType} />
      </PopoverContent>
    </Popover>
  );
}
