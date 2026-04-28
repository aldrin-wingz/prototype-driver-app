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
  
  // Calculate segment widths for segmented progress bar
  const completedPercent = primaryProgress 
    ? (primaryProgress.currentCount / primaryProgress.targetCount) * 100 
    : 0;
  const scheduledPercent = primaryProgress 
    ? (primaryProgress.scheduledCount / primaryProgress.targetCount) * 100 
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

      {/* Segmented progress bar row */}
      {primaryProgress && (
        <div className="flex items-center gap-2">
          {/* Progress bar with 3 segments: completed | scheduled | remaining */}
          <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-gray-700">
            {/* Completed segment (solid green) */}
            <div
              className={cn(
                "absolute inset-y-0 left-0 transition-all",
                isCompleted ? "bg-gray-500" : "bg-[#10B981]"
              )}
              style={{ width: `${Math.min(completedPercent, 100)}%` }}
            />
            {/* Scheduled segment (striped/lighter green) */}
            {primaryProgress.scheduledCount > 0 && (
              <div
                className={cn(
                  "absolute inset-y-0 transition-all",
                  isCompleted ? "bg-gray-400" : "bg-[#10B981]/40"
                )}
                style={{ 
                  left: `${completedPercent}%`,
                  width: `${Math.min(scheduledPercent, 100 - completedPercent)}%`,
                  backgroundImage: isCompleted ? 'none' : 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.3) 2px, rgba(255,255,255,0.3) 4px)'
                }}
              />
            )}
          </div>
          {/* Progress text showing breakdown */}
          <span
            className={cn(
              "text-xs font-medium tabular-nums whitespace-nowrap",
              isCompleted ? "text-gray-400" : "text-gray-300"
            )}
          >
            {primaryProgress.currentCount} done
            {primaryProgress.scheduledCount > 0 && (
              <span className="text-[#10B981]/70"> +{primaryProgress.scheduledCount} taken</span>
            )}
            {primaryProgress.remainingCount > 0 && (
              <span className="text-gray-500"> · {primaryProgress.remainingCount} to go</span>
            )}
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
  
  // Calculate segment widths for segmented progress bar
  const completedPercent = primaryProgress 
    ? (primaryProgress.currentCount / primaryProgress.targetCount) * 100 
    : 0;
  const scheduledPercent = primaryProgress 
    ? (primaryProgress.scheduledCount / primaryProgress.targetCount) * 100 
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
        scheduledFill: "bg-gray-200",
        bonusText: "text-gray-200",
        takenText: "text-gray-300",
        toGoText: "text-gray-400",
      };
    }
    if (totalBonus >= 100) {
      // Gold tier
      return {
        bg: "bg-gradient-to-r from-amber-500 to-yellow-500",
        text: "text-amber-950",
        subtext: "text-amber-900",
        progressBg: "bg-amber-200",
        progressFill: "bg-amber-700",
        scheduledFill: "bg-amber-500",
        bonusText: "text-amber-950",
        takenText: "text-amber-800",
        toGoText: "text-amber-700",
      };
    }
    if (totalBonus >= 75) {
      // Silver tier
      return {
        bg: "bg-gradient-to-r from-gray-300 to-slate-400",
        text: "text-gray-900",
        subtext: "text-gray-700",
        progressBg: "bg-white/50",
        progressFill: "bg-gray-700",
        scheduledFill: "bg-gray-500",
        bonusText: "text-gray-900",
        takenText: "text-gray-600",
        toGoText: "text-gray-500",
      };
    }
    // Bronze tier
    return {
      bg: "bg-gradient-to-r from-orange-400 to-amber-500",
      text: "text-orange-950",
      subtext: "text-orange-900",
      progressBg: "bg-orange-200",
      progressFill: "bg-orange-800",
      scheduledFill: "bg-orange-600",
      bonusText: "text-orange-950",
      takenText: "text-orange-800",
      toGoText: "text-orange-700",
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

      {/* Segmented progress bar row */}
      {primaryProgress && (
        <div className="flex items-center gap-2">
          {/* Progress bar with 3 segments: completed | scheduled | remaining */}
          <div className={cn("relative h-2 flex-1 overflow-hidden rounded-full", styles.progressBg)}>
            {/* Completed segment (solid fill) */}
            <div
              className={cn("absolute inset-y-0 left-0 transition-all", styles.progressFill)}
              style={{ width: `${Math.min(completedPercent, 100)}%` }}
            />
            {/* Scheduled segment (striped) */}
            {primaryProgress.scheduledCount > 0 && (
              <div
                className={cn("absolute inset-y-0 transition-all", styles.scheduledFill)}
                style={{ 
                  left: `${completedPercent}%`,
                  width: `${Math.min(scheduledPercent, 100 - completedPercent)}%`,
                  backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.4) 2px, rgba(255,255,255,0.4) 4px)'
                }}
              />
            )}
          </div>
          {/* Progress text showing breakdown */}
          <span className={cn("text-xs font-medium tabular-nums whitespace-nowrap", styles.subtext)}>
            {primaryProgress.currentCount} done
            {primaryProgress.scheduledCount > 0 && (
              <span className={styles.takenText}> +{primaryProgress.scheduledCount} taken</span>
            )}
            {primaryProgress.remainingCount > 0 && (
              <span className={styles.toGoText}> · {primaryProgress.remainingCount} to go</span>
            )}
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
