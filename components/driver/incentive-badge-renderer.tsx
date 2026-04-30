"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { useVariants } from "@/lib/variants-context";
import type { PillVariant } from "@/lib/variants";
import type { IncentiveType } from "@/lib/data/incentives";
import {
  getIncentiveTripLabel,
  getIncentiveProgressInfo,
  INCENTIVE_PILL_COLORS,
  INCENTIVE_PILL_COLORS_MUTED,
  INCENTIVE_TIER_COLORS,
  type IncentiveProgressInfo,
} from "@/lib/data/incentive-utils";

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

interface IncentiveBadgeRendererProps {
  /** Single incentive type this trip qualifies for (null = no banner) */
  incentiveType: IncentiveType | null;
  /** Whether this is a completed trip (use muted colors) */
  isCompleted?: boolean;
  /** Whether to show (renders nothing if false or incentiveType is null) */
  show?: boolean;
  /** Override variant (for testing) */
  variantOverride?: PillVariant;
}

// -----------------------------------------------------------------------------
// SUB-COMPONENTS: Pill Row Variant (single program)
// -----------------------------------------------------------------------------

interface PillRowVariantProps {
  incentiveType: IncentiveType;
  isCompleted: boolean;
}

function PillRowVariant({ incentiveType, isCompleted }: PillRowVariantProps) {
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
        {/* Wingz mark - small dark logo backdrop */}
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

// -----------------------------------------------------------------------------
// SHARED: Verbose progress labels under banners
// -----------------------------------------------------------------------------

interface VerboseProgressProps {
  progress: IncentiveProgressInfo;
  /** classes for the track (background bar) */
  trackClass: string;
  /** classes for the completed segment fill */
  fillClass: string;
  /** classes for the scheduled (striped) segment */
  scheduledFillClass: string;
  /** color of "X done" text */
  doneTextClass: string;
  /** color of "+N taken" text */
  takenTextClass: string;
  /** color of "· N to go" text */
  toGoTextClass: string;
  /** stripe overlay color rgba — should contrast with scheduledFill */
  stripeRgba: string;
}

function VerboseProgress({
  progress,
  trackClass,
  fillClass,
  scheduledFillClass,
  doneTextClass,
  takenTextClass,
  toGoTextClass,
  stripeRgba,
}: VerboseProgressProps) {
  const completedPercent = (progress.currentCount / progress.targetCount) * 100;
  const scheduledPercent = (progress.scheduledCount / progress.targetCount) * 100;

  return (
    <div className="flex items-center gap-2">
      <div className={cn("relative h-2 flex-1 overflow-hidden rounded-full", trackClass)}>
        <div
          className={cn("absolute inset-y-0 left-0 transition-all", fillClass)}
          style={{ width: `${Math.min(completedPercent, 100)}%` }}
        />
        {progress.scheduledCount > 0 && (
          <div
            className={cn("absolute inset-y-0 transition-all", scheduledFillClass)}
            style={{
              left: `${completedPercent}%`,
              width: `${Math.min(scheduledPercent, 100 - completedPercent)}%`,
              backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 2px, ${stripeRgba} 2px, ${stripeRgba} 4px)`,
            }}
          />
        )}
      </div>
      <span className={cn("text-xs font-medium tabular-nums whitespace-nowrap", doneTextClass)}>
        {progress.currentCount} done
        {progress.scheduledCount > 0 && (
          <span className={takenTextClass}> +{progress.scheduledCount} taken</span>
        )}
        {progress.remainingCount > 0 && (
          <span className={toGoTextClass}> · {progress.remainingCount} to go</span>
        )}
      </span>
    </div>
  );
}

// -----------------------------------------------------------------------------
// SUB-COMPONENTS: Banner Hero Variant — black banner, tier-tinted Wingz backdrop
// -----------------------------------------------------------------------------

interface BannerHeroVariantProps {
  incentiveType: IncentiveType;
  isCompleted: boolean;
}

function BannerHeroVariant({ incentiveType, isCompleted }: BannerHeroVariantProps) {
  const progress = getIncentiveProgressInfo(incentiveType);
  if (!progress) return null;

  const tier = INCENTIVE_TIER_COLORS[progress.tierLevel];
  const label = getIncentiveTripLabel(incentiveType);

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-t-xl px-4 py-3",
        // Black background; muted shade for completed
        isCompleted ? "bg-gray-700" : "bg-[#1F2937]"
      )}
    >
      {/* Top row: tier-tinted Wingz backdrop + Label + Bonus */}
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md",
            isCompleted ? "bg-gray-600" : tier.bgClass
          )}
          aria-hidden="true"
        >
          <Image
            src="/WINGZLOGO2.png"
            alt=""
            width={14}
            height={14}
            className={cn("object-contain", isCompleted && "opacity-60")}
          />
        </div>

        <span
          className={cn(
            "flex-1 text-sm font-medium",
            isCompleted ? "text-gray-300" : "text-white"
          )}
        >
          {label}
        </span>

        <span
          className={cn(
            "text-sm font-bold",
            isCompleted ? "text-gray-400" : "text-[#10B981]"
          )}
        >
          {isCompleted ? "Earned" : "Earn"} ${progress.bonusAmount}
        </span>
      </div>

      <VerboseProgress
        progress={progress}
        trackClass={isCompleted ? "bg-gray-600" : "bg-gray-700"}
        fillClass={isCompleted ? "bg-gray-500" : "bg-[#10B981]"}
        scheduledFillClass={isCompleted ? "bg-gray-400" : "bg-[#10B981]/40"}
        doneTextClass={isCompleted ? "text-gray-400" : "text-gray-300"}
        takenTextClass={isCompleted ? "text-gray-300" : "text-[#10B981]/70"}
        toGoTextClass="text-gray-500"
        stripeRgba="rgba(255,255,255,0.3)"
      />
    </div>
  );
}

// -----------------------------------------------------------------------------
// SUB-COMPONENTS: Achievement Banner Variant — full-width tier-colored banner
// -----------------------------------------------------------------------------

interface AchievementBannerVariantProps {
  incentiveType: IncentiveType;
  isCompleted: boolean;
}

function AchievementBannerVariant({ incentiveType, isCompleted }: AchievementBannerVariantProps) {
  const progress = getIncentiveProgressInfo(incentiveType);
  if (!progress) return null;

  const tier = INCENTIVE_TIER_COLORS[progress.tierLevel];
  const label = getIncentiveTripLabel(incentiveType);

  // For completed trips, use muted gray bg
  const bgClass = isCompleted ? "bg-gray-500" : tier.bgClass;
  const textClass = isCompleted ? "text-white" : tier.textClass;
  const mutedTextClass = isCompleted ? "text-gray-200" : tier.mutedTextClass;
  const markBackdropClass = isCompleted ? "bg-white/30" : tier.markBackdropClass;
  const trackClass = isCompleted ? "bg-gray-400" : tier.progressTrackClass;
  const fillClass = isCompleted ? "bg-gray-200" : tier.progressFillClass;

  return (
    <div className={cn("flex flex-col gap-2 rounded-t-xl px-4 py-3", bgClass)}>
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md",
            markBackdropClass
          )}
          aria-hidden="true"
        >
          <Image
            src="/WINGZLOGO2.png"
            alt=""
            width={14}
            height={14}
            className="object-contain"
          />
        </div>

        <span className={cn("flex-1 text-sm font-semibold", textClass)}>{label}</span>

        <span className={cn("text-sm font-bold", textClass)}>
          {isCompleted ? "Earned" : "Earn"} ${progress.bonusAmount}
        </span>
      </div>

      <VerboseProgress
        progress={progress}
        trackClass={trackClass}
        fillClass={fillClass}
        scheduledFillClass={fillClass}
        doneTextClass={mutedTextClass}
        takenTextClass={mutedTextClass}
        toGoTextClass={mutedTextClass}
        stripeRgba="rgba(255,255,255,0.4)"
      />
    </div>
  );
}

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------

export function IncentiveBadgeRenderer({
  incentiveType,
  isCompleted = false,
  show = true,
  variantOverride,
}: IncentiveBadgeRendererProps) {
  const { variants, isLoaded } = useVariants();

  // Don't render if no incentive or show is false
  if (!show || incentiveType === null) {
    return null;
  }

  // Don't render until variants are loaded (avoid hydration mismatch)
  if (!isLoaded) {
    return null;
  }

  const activeVariant = variantOverride ?? variants.pill;

  switch (activeVariant) {
    case "pill-named-bottom":
      return <PillRowVariant incentiveType={incentiveType} isCompleted={isCompleted} />;

    case "banner-wingz-hero":
      return <BannerHeroVariant incentiveType={incentiveType} isCompleted={isCompleted} />;

    case "achievement-banner":
      return <AchievementBannerVariant incentiveType={incentiveType} isCompleted={isCompleted} />;

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
