"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { useVariants } from "@/lib/variants-context";
import type { PillVariant } from "@/lib/variants";
import type { IncentiveType } from "@/lib/data/incentives";
import {
  getIncentiveTripLabel,
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
        "absolute right-10 top-4 z-10 flex h-7 w-7 items-center justify-center rounded",
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

    default:
      return null;
  }
}

// Export sub-components for direct use if needed
export { PillRowVariant, CornerFlagVariant, BannerHeroVariant };
