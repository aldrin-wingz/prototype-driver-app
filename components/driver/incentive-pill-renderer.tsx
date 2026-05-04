"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import type { IncentiveType } from "@/lib/data/incentives";
import {
  getIncentiveTripLabel,
  INCENTIVE_PILL_COLORS,
  INCENTIVE_PILL_COLORS_MUTED,
} from "@/lib/data/incentive-utils";

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

interface IncentivePillRendererProps {
  /** Single incentive type this trip qualifies for (null = render nothing) */
  incentiveType: IncentiveType | null;
  /** Whether this is a completed trip (use muted colors) */
  isCompleted?: boolean;
  /** Whether to show (renders nothing if false or incentiveType is null) */
  show?: boolean;
}

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------

/**
 * Renders the locked v1 incentive pill: `pill-named-bottom`.
 *
 * Variant switching, banner-wingz-hero, and achievement-banner were removed in
 * I-0; this component is now a single-path renderer. Per-incentive color
 * theming will be reattached in I-1 via `incentive.color`.
 */
export function IncentivePillRenderer({
  incentiveType,
  isCompleted = false,
  show = true,
}: IncentivePillRendererProps) {
  if (!show || incentiveType === null) {
    return null;
  }

  const colorMap = isCompleted ? INCENTIVE_PILL_COLORS_MUTED : INCENTIVE_PILL_COLORS;
  const colors = colorMap[incentiveType];
  const label = getIncentiveTripLabel(incentiveType);

  return (
    <div className="flex flex-wrap gap-2">
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
          colors.bg,
          colors.text
        )}
      >
        {/* Wingz mark — small dark logo backdrop */}
        <span className="relative flex h-3.5 w-3.5 items-center justify-center rounded-sm bg-gray-900">
          <Image
            src="/WINGZLOGO2.png"
            alt=""
            width={10}
            height={10}
            className="object-contain"
          />
        </span>
        {label}
      </span>
    </div>
  );
}
