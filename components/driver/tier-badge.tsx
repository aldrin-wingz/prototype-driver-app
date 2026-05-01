"use client";

import { Medal, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

export type Tier = "bronze" | "silver" | "gold" | "platinum";

export type TierBadgeSize = "sm" | "md" | "lg";

interface TierBadgeProps {
  tier: Tier;
  size?: TierBadgeSize;
  showLabel?: boolean;
  className?: string;
}

// Tier color tokens (per I-6 spec)
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

// Icon family: Medal for ranking tiers (Bronze/Silver/Gold), Trophy for top tier (Platinum).
const TIER_ICONS: Record<Tier, typeof Medal> = {
  bronze: Medal,
  silver: Medal,
  gold: Medal,
  platinum: Trophy,
};

const SIZE_DIMENSIONS: Record<TierBadgeSize, { container: string; icon: string; text: string }> = {
  sm: { container: "h-6 w-6", icon: "h-3.5 w-3.5", text: "text-xs" },
  md: { container: "h-8 w-8", icon: "h-4 w-4", text: "text-sm" },
  lg: { container: "h-12 w-12", icon: "h-6 w-6", text: "text-base" },
};

/**
 * Shared TierBadge composite (I-6).
 * Renders a tier-colored circular icon, optionally with the tier label beside it.
 * Used in: TierProgressTab (both variants), LeaderboardTab (both variants), Dashboard tier surfaces.
 */
export function TierBadge({ tier, size = "md", showLabel = false, className }: TierBadgeProps) {
  const Icon = TIER_ICONS[tier];
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
        <Icon className={dims.icon} style={{ color: colors.fg }} />
      </div>
      {showLabel && (
        <span className={cn("font-semibold text-gray-900", dims.text)}>
          {colors.label}
        </span>
      )}
    </div>
  );
}
