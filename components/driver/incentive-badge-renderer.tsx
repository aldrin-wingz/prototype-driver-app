"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { useVariants } from "@/lib/variants-context";
import type { PillVariant } from "@/lib/variants";
import type { IncentiveType } from "@/lib/data/incentives";
import {
  getIncentiveTripLabel,
  getMultipleIncentiveProgressInfo,
  INCENTIVE_PILL_COLORS,
  INCENTIVE_PILL_COLORS_MUTED,
} from "@/lib/data/incentive-utils";

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

interface IncentiveBadgeRendererProps {
  /** Array of incentive types this trip qualifies for */
  incentiveTypes: IncentiveType[];
  /** Whether this is a completed trip (use muted colors) */
  isCompleted?: boolean;
  /** Whether to show (renders nothing if false or empty incentiveTypes) */
  show?: boolean;
  /** Override variant (for testing) */
  variantOverride?: PillVariant;
}

// -----------------------------------------------------------------------------
// SUB-COMPONENTS: Pill Row Variant
// -----------------------------------------------------------------------------

interface PillRowVariantProps {
  incentiveTypes: IncentiveType[];
  isCompleted: boolean;
}

function PillRowVariant({ incentiveTypes, isCompleted }: PillRowVariantProps) {
  const colorMap = isCompleted ? INCENTIVE_PILL_COLORS_MUTED : INCENTIVE_PILL_COLORS;

  return (
    <div className="flex flex-wrap gap-2">
      {incentiveTypes.map((type) => {
        const colors = colorMap[type];
        const label = getIncentiveTripLabel(type);

        return (
          <span
            key={type}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
              colors.bg,
              colors.text
            )}
          >
            {/* Wingz mark - small black/green logo */}
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
        );
      })}
    </div>
  );
}

// -----------------------------------------------------------------------------
// SUB-COMPONENTS: Banner Hero Variant (with progress bar + earnings)
// -----------------------------------------------------------------------------

interface BannerHeroVariantProps {
  incentiveTypes: IncentiveType[];
  isCompleted: boolean;
}

function BannerHeroVariant({ incentiveTypes, isCompleted }: BannerHeroVariantProps) {
  // Get progress info for the primary incentive
  const progressItems = getMultipleIncentiveProgressInfo(incentiveTypes);
  const primaryProgress = progressItems[0];
  
  // Calculate combined bonus
  const totalBonus = progressItems.reduce((sum, item) => sum + item.bonusAmount, 0);
  
  // Build the label: join names with " · " separator
  const labels = incentiveTypes.map((type) => getIncentiveTripLabel(type));
  const combinedLabel = labels.join(" · ");
  
  // Progress percentage
  const progressPercent = primaryProgress 
    ? Math.round((primaryProgress.currentCount / primaryProgress.targetCount) * 100) 
    : 0;

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-t-xl px-4 py-3",
        isCompleted ? "bg-gray-700" : "bg-gray-900"
      )}
    >
      {/* Top row: Logo + Label + Bonus */}
      <div className="flex items-center gap-3">
        {/* Wingz logo on left */}
        <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center">
          <Image
            src="/WINGZLOGO2.png"
            alt=""
            width={20}
            height={20}
            className={cn("object-contain", isCompleted && "opacity-60")}
          />
        </div>

        {/* Incentive label */}
        <span
          className={cn(
            "flex-1 text-sm font-medium",
            isCompleted ? "text-gray-300" : "text-white"
          )}
        >
          {combinedLabel}
        </span>

        {/* Bonus amount */}
        <span
          className={cn(
            "text-sm font-bold",
            isCompleted ? "text-gray-400" : "text-[#10B981]"
          )}
        >
          {isCompleted ? "Earned" : "Earn"} ${totalBonus}
        </span>
      </div>

      {/* Progress bar row */}
      {primaryProgress && (
        <div className="flex items-center gap-2">
          {/* Progress bar */}
          <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-gray-700">
            <div
              className={cn(
                "absolute inset-y-0 left-0 rounded-full transition-all",
                isCompleted ? "bg-gray-500" : "bg-[#10B981]"
              )}
              style={{ width: `${Math.min(progressPercent, 100)}%` }}
            />
          </div>
          {/* Progress text */}
          <span
            className={cn(
              "text-xs font-medium tabular-nums",
              isCompleted ? "text-gray-400" : "text-gray-300"
            )}
          >
            {primaryProgress.currentCount}/{primaryProgress.targetCount} trips
          </span>
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// SUB-COMPONENTS: Achievement Banner Variant (tiered colors with progress)
// -----------------------------------------------------------------------------

interface AchievementBannerVariantProps {
  incentiveTypes: IncentiveType[];
  isCompleted: boolean;
}

function AchievementBannerVariant({ incentiveTypes, isCompleted }: AchievementBannerVariantProps) {
  // Get progress info
  const progressItems = getMultipleIncentiveProgressInfo(incentiveTypes);
  const primaryProgress = progressItems[0];
  
  // Calculate combined bonus to determine tier
  const totalBonus = progressItems.reduce((sum, item) => sum + item.bonusAmount, 0);
  
  // Build the label
  const labels = incentiveTypes.map((type) => getIncentiveTripLabel(type));
  const combinedLabel = labels.join(" · ");
  
  // Progress percentage
  const progressPercent = primaryProgress 
    ? Math.round((primaryProgress.currentCount / primaryProgress.targetCount) * 100) 
    : 0;

  // Determine tier colors based on bonus amount
  const getTierStyles = () => {
    if (isCompleted) {
      return {
        bg: "bg-gradient-to-r from-gray-500 to-gray-600",
        text: "text-white",
        subtext: "text-gray-200",
        progressBg: "bg-gray-400",
        progressFill: "bg-gray-300",
        bonusText: "text-gray-200",
      };
    }
    if (totalBonus >= 100) {
      // Gold tier
      return {
        bg: "bg-gradient-to-r from-amber-500 to-yellow-500",
        text: "text-amber-950",
        subtext: "text-amber-900",
        progressBg: "bg-amber-300",
        progressFill: "bg-amber-700",
        bonusText: "text-amber-950",
      };
    }
    if (totalBonus >= 75) {
      // Silver tier
      return {
        bg: "bg-gradient-to-r from-gray-300 to-slate-400",
        text: "text-gray-900",
        subtext: "text-gray-700",
        progressBg: "bg-gray-200",
        progressFill: "bg-gray-600",
        bonusText: "text-gray-900",
      };
    }
    // Bronze tier
    return {
      bg: "bg-gradient-to-r from-orange-400 to-amber-500",
      text: "text-orange-950",
      subtext: "text-orange-900",
      progressBg: "bg-orange-200",
      progressFill: "bg-orange-700",
      bonusText: "text-orange-950",
    };
  };

  const styles = getTierStyles();

  return (
    <div className={cn("flex flex-col gap-2 rounded-t-xl px-4 py-3", styles.bg)}>
      {/* Top row: Logo + Label + Bonus */}
      <div className="flex items-center gap-3">
        {/* Wingz logo on left */}
        <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded bg-white/20">
          <Image
            src="/WINGZLOGO2.png"
            alt=""
            width={16}
            height={16}
            className={cn("object-contain", isCompleted && "opacity-60")}
          />
        </div>

        {/* Incentive label */}
        <span className={cn("flex-1 text-sm font-semibold", styles.text)}>
          {combinedLabel}
        </span>

        {/* Bonus amount */}
        <span className={cn("text-sm font-bold", styles.bonusText)}>
          {isCompleted ? "Earned" : "Earn"} ${totalBonus}
        </span>
      </div>

      {/* Progress bar row */}
      {primaryProgress && (
        <div className="flex items-center gap-2">
          {/* Progress bar */}
          <div className={cn("relative h-1.5 flex-1 overflow-hidden rounded-full", styles.progressBg)}>
            <div
              className={cn("absolute inset-y-0 left-0 rounded-full transition-all", styles.progressFill)}
              style={{ width: `${Math.min(progressPercent, 100)}%` }}
            />
          </div>
          {/* Progress text */}
          <span className={cn("text-xs font-medium tabular-nums", styles.subtext)}>
            {primaryProgress.currentCount}/{primaryProgress.targetCount} trips
          </span>
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------

export function IncentiveBadgeRenderer({
  incentiveTypes,
  isCompleted = false,
  show = true,
  variantOverride,
}: IncentiveBadgeRendererProps) {
  const { variants, isLoaded } = useVariants();

  // Don't render if no incentives or show is false
  if (!show || incentiveTypes.length === 0) {
    return null;
  }

  // Don't render until variants are loaded (avoid hydration mismatch)
  if (!isLoaded) {
    return null;
  }

  const activeVariant = variantOverride ?? variants.pill;

  switch (activeVariant) {
    case "pill-named-bottom":
      return (
        <PillRowVariant
          incentiveTypes={incentiveTypes}
          isCompleted={isCompleted}
        />
      );

    case "banner-wingz-hero":
      return (
        <BannerHeroVariant
          incentiveTypes={incentiveTypes}
          isCompleted={isCompleted}
        />
      );

    case "achievement-banner":
      return (
        <AchievementBannerVariant
          incentiveTypes={incentiveTypes}
          isCompleted={isCompleted}
        />
      );

    default:
      return null;
  }
}

// Export sub-components for direct use if needed
export { 
  PillRowVariant, 
  BannerHeroVariant,
  AchievementBannerVariant,
};
