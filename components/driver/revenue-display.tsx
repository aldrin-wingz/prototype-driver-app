"use client";

import { cn } from "@/lib/utils";

interface RevenueDisplayProps {
  totalRevenue: number;
  revenueColor?: "green" | "blue";
  /** Layout slot kept for API compatibility; no behavior difference in v1. */
  layout?: "vertical" | "inline";
}

/**
 * Renders the trip revenue cell.
 *
 * v1: base $ only. The v3 baseline supported add-on rows + a tap-popover
 * breakdown via `Trip.revenueAddons`; that field is stripped in I-0 and the
 * cell now renders a single `${totalRevenue}` value.
 */
export function RevenueDisplay({
  totalRevenue,
  revenueColor = "green",
}: RevenueDisplayProps) {
  return (
    <p
      className={cn(
        "font-semibold",
        revenueColor === "blue" ? "text-blue-600" : "text-[#10B981]"
      )}
    >
      ${totalRevenue.toFixed(2)}
    </p>
  );
}
