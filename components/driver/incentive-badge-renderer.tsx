"use client";

import Image from "next/image";
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { useVariants } from "@/lib/variants-context";
import type { PillVariant } from "@/lib/variants";
import type { IncentiveType } from "@/lib/data/incentives";
import {
  getIncentiveTripLabel,
  getIncentiveProgressInfo,
  INCENTIVE_PILL_COLORS,
  INCENTIVE_PILL_COLORS_MUTED,
  INCENTIVE_DISPLAY_NAMES,
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
// SUB-COMPONENTS: Corner Flag Badge Variant
// -----------------------------------------------------------------------------

interface CornerFlagVariantProps {
  incentiveTypes: IncentiveType[];
  isCompleted: boolean;
}

function CornerFlagVariant({ incentiveTypes, isCompleted }: CornerFlagVariantProps) {
  const count = incentiveTypes.length;

  return (
    <div
      className={cn(
        "absolute left-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded",
        isCompleted ? "bg-gray-600" : "bg-gray-900"
      )}
    >
      <Image
        src="/WINGZLOGO2.png"
        alt="Incentive eligible"
        width={16}
        height={16}
        className={cn("object-contain", isCompleted && "opacity-60")}
      />
      {/* Multi-incentive count overlay */}
      {count > 1 && (
        <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#10B981] text-[10px] font-bold text-white">
          {count}
        </span>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// SUB-COMPONENTS: Banner Hero Variant
// -----------------------------------------------------------------------------

interface BannerHeroVariantProps {
  incentiveTypes: IncentiveType[];
  isCompleted: boolean;
}

function BannerHeroVariant({ incentiveTypes, isCompleted }: BannerHeroVariantProps) {
  // Build the label: join names with " · " separator
  const labels = incentiveTypes.map((type) => getIncentiveTripLabel(type));
  const combinedLabel = labels.join(" · ");

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-t-xl px-4 py-2.5",
        isCompleted ? "bg-gray-700" : "bg-gray-900"
      )}
    >
      {/* Wingz logo on left */}
      <div className="flex h-6 w-6 items-center justify-center">
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
    </div>
  );
}

// -----------------------------------------------------------------------------
// SUB-COMPONENTS: Streak Flame Variant
// -----------------------------------------------------------------------------

interface StreakFlameVariantProps {
  incentiveTypes: IncentiveType[];
  isCompleted: boolean;
}

function StreakFlameVariant({ incentiveTypes, isCompleted }: StreakFlameVariantProps) {
  // Get progress of first incentive to determine flame intensity
  const primaryType = incentiveTypes[0];
  const progress = getIncentiveProgressInfo(primaryType);
  const progressPercent = progress ? (progress.currentCount / progress.targetCount) * 100 : 0;
  
  // Flame size increases with progress (from 20px to 32px)
  const flameSize = Math.round(20 + (progressPercent / 100) * 12);
  
  // Color intensity based on progress
  const getFlameColor = () => {
    if (isCompleted) return "text-gray-400";
    if (progressPercent >= 80) return "text-orange-500";
    if (progressPercent >= 50) return "text-amber-500";
    return "text-amber-400";
  };

  return (
    <div
      className={cn(
        "absolute left-3 top-3 z-10 flex items-center justify-center",
        !isCompleted && progressPercent >= 50 && "animate-pulse"
      )}
    >
      <Flame 
        className={cn(getFlameColor(), "drop-shadow-md")}
        style={{ width: flameSize, height: flameSize }}
      />
      {/* Multi-incentive count */}
      {incentiveTypes.length > 1 && (
        <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white">
          {incentiveTypes.length}
        </span>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// SUB-COMPONENTS: Progress Ring Variant
// -----------------------------------------------------------------------------

interface ProgressRingVariantProps {
  incentiveTypes: IncentiveType[];
  isCompleted: boolean;
}

function ProgressRingVariant({ incentiveTypes, isCompleted }: ProgressRingVariantProps) {
  const primaryType = incentiveTypes[0];
  const progress = getIncentiveProgressInfo(primaryType);
  const progressPercent = progress ? (progress.currentCount / progress.targetCount) * 100 : 0;
  
  // SVG circle parameters
  const size = 36;
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  return (
    <div className="absolute left-3 top-3 z-10">
      <svg width={size} height={size} className="rotate-[-90deg]">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="white"
          stroke={isCompleted ? "#D1D5DB" : "#E5E7EB"}
          strokeWidth={strokeWidth}
        />
        {/* Progress circle with gradient */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={isCompleted ? "#9CA3AF" : "#10B981"}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-500"
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={cn(
          "text-[10px] font-bold",
          isCompleted ? "text-gray-500" : "text-[#10B981]"
        )}>
          {progress ? `${progress.currentCount}/${progress.targetCount}` : "0"}
        </span>
      </div>
      {/* Multi-incentive count */}
      {incentiveTypes.length > 1 && (
        <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#10B981] text-[10px] font-bold text-white">
          {incentiveTypes.length}
        </span>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// SUB-COMPONENTS: Bonus Preview Variant
// -----------------------------------------------------------------------------

interface BonusPreviewVariantProps {
  incentiveTypes: IncentiveType[];
  isCompleted: boolean;
}

function BonusPreviewVariant({ incentiveTypes, isCompleted }: BonusPreviewVariantProps) {
  // Get total potential bonus from all incentives
  const progressInfos = incentiveTypes.map(type => getIncentiveProgressInfo(type)).filter(Boolean);
  const totalBonus = progressInfos.reduce((sum, info) => sum + (info?.bonusAmount ?? 0), 0);
  const primaryProgress = progressInfos[0];

  return (
    <div
      className={cn(
        "absolute left-3 top-3 z-10 rounded-lg px-2 py-1 shadow-md",
        isCompleted ? "bg-gray-100" : "bg-gradient-to-r from-emerald-500 to-teal-500"
      )}
    >
      <div className="flex items-center gap-1">
        <span className={cn(
          "text-xs font-bold",
          isCompleted ? "text-gray-500" : "text-white"
        )}>
          +${totalBonus}
        </span>
        {primaryProgress && !primaryProgress.isComplete && (
          <span className={cn(
            "text-[10px]",
            isCompleted ? "text-gray-400" : "text-white/80"
          )}>
            @ {primaryProgress.targetCount} trips
          </span>
        )}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// SUB-COMPONENTS: Achievement Badge Variant
// -----------------------------------------------------------------------------

interface AchievementBadgeVariantProps {
  incentiveTypes: IncentiveType[];
  isCompleted: boolean;
}

function AchievementBadgeVariant({ incentiveTypes, isCompleted }: AchievementBadgeVariantProps) {
  // Get highest bonus to determine badge tier
  const progressInfos = incentiveTypes.map(type => getIncentiveProgressInfo(type)).filter(Boolean);
  const maxBonus = Math.max(...progressInfos.map(info => info?.bonusAmount ?? 0));
  
  // Determine tier based on bonus amount
  const getTierColors = () => {
    if (isCompleted) return { bg: "bg-gray-200", border: "border-gray-400", text: "text-gray-500" };
    if (maxBonus >= 100) return { bg: "bg-gradient-to-br from-yellow-300 to-amber-500", border: "border-yellow-600", text: "text-yellow-900" };
    if (maxBonus >= 75) return { bg: "bg-gradient-to-br from-gray-200 to-gray-400", border: "border-gray-500", text: "text-gray-700" };
    return { bg: "bg-gradient-to-br from-orange-300 to-orange-500", border: "border-orange-600", text: "text-orange-900" };
  };
  
  const tier = getTierColors();
  const primaryName = INCENTIVE_DISPLAY_NAMES[incentiveTypes[0]];

  return (
    <div
      className={cn(
        "absolute left-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 shadow-lg",
        tier.bg,
        tier.border
      )}
    >
      <Image
        src="/WINGZLOGO2.png"
        alt=""
        width={20}
        height={20}
        className={cn("object-contain", isCompleted && "opacity-50")}
      />
      {/* Badge label */}
      <div className={cn(
        "absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[8px] font-bold shadow-sm",
        tier.bg,
        tier.text
      )}>
        {primaryName.split(' ')[0]}
      </div>
      {/* Multi-incentive count */}
      {incentiveTypes.length > 1 && (
        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#10B981] text-[10px] font-bold text-white">
          {incentiveTypes.length}
        </span>
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

    case "badge-corner-flag":
      return (
        <CornerFlagVariant
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

    case "streak-flame":
      return (
        <StreakFlameVariant
          incentiveTypes={incentiveTypes}
          isCompleted={isCompleted}
        />
      );

    case "progress-ring":
      return (
        <ProgressRingVariant
          incentiveTypes={incentiveTypes}
          isCompleted={isCompleted}
        />
      );

    case "bonus-preview":
      return (
        <BonusPreviewVariant
          incentiveTypes={incentiveTypes}
          isCompleted={isCompleted}
        />
      );

    case "achievement-badge":
      return (
        <AchievementBadgeVariant
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
  CornerFlagVariant, 
  BannerHeroVariant,
  StreakFlameVariant,
  ProgressRingVariant,
  BonusPreviewVariant,
  AchievementBadgeVariant,
};
