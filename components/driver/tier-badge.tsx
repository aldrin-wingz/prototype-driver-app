"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

export type Tier = "bronze" | "silver" | "gold" | "platinum";

export type TierBadgeSize = "sm" | "md" | "lg";

interface TierBadgeProps {
  tier: Tier;
  size?: TierBadgeSize;
  showLabel?: boolean;
  className?: string;
}

// Tier color tokens (per I-6 spec; bg is the only thing that varies between tiers in I-6.1).
export const TIER_COLORS: Record<Tier, { bg: string; fg: string; ring: string; soft: string; label: string }> = {
  bronze: {
    bg: "#B45309",
    fg: "#FFFFFF",
    ring: "#92400E",
    soft: "#FEF3C7",
    label: "Bronze",
  },
  silver: {
    bg: "#94A3B8",
    fg: "#FFFFFF",
    ring: "#64748B",
    soft: "#F1F5F9",
    label: "Silver",
  },
  gold: {
    bg: "#EAB308",
    fg: "#FFFFFF",
    ring: "#A16207",
    soft: "#FEF9C3",
    label: "Gold",
  },
  platinum: {
    bg: "#7C3AED",
    fg: "#FFFFFF",
    ring: "#5B21B6",
    soft: "#EDE9FE",
    label: "Platinum",
  },
};

const SIZE_DIMENSIONS: Record<
  TierBadgeSize,
  { container: string; image: number; text: string }
> = {
  sm: { container: "h-6 w-6", image: 14, text: "text-xs" },
  md: { container: "h-8 w-8", image: 18, text: "text-sm" },
  lg: { container: "h-12 w-12", image: 28, text: "text-base" },
};

/**
 * Shared TierBadge composite (I-6 → redesigned in I-6.1).
 * Renders the green Wingz brand mark on a tier-colored circular background.
 * Same Wingz mark across all 4 tiers — only the bg color changes.
 * Used in: TierProgressSection (Incentives tab top), LeaderboardTab (rows + podium),
 * YourPlacementCard, Dashboard tier surface.
 */
export function TierBadge({ tier, size = "md", showLabel = false, className }: TierBadgeProps) {
  const colors = TIER_COLORS[tier];
  const dims = SIZE_DIMENSIONS[size];

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <div
        className={cn(
          "flex items-center justify-center rounded-full",
          dims.container
        )}
        style={{ backgroundColor: colors.bg }}
        aria-label={`${colors.label} tier`}
      >
        <Image
          src="/WINGZLOGO2.png"
          alt=""
          width={dims.image}
          height={dims.image}
          className="object-contain"
        />
      </div>
      {showLabel && (
        <span className={cn("font-semibold text-gray-900", dims.text)}>
          {colors.label}
        </span>
      )}
    </div>
  );
}
