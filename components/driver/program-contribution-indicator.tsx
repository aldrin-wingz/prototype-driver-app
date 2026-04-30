"use client";

import { useState } from "react";
import { useVariants } from "@/lib/variants-context";
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
import {
  PillRowVariant,
  BannerHeroVariant,
  AchievementBannerVariant,
} from "./incentive-badge-renderer";

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

interface ProgramContributionIndicatorProps {
  /** Single incentive type this trip qualifies for (null/undefined = render nothing) */
  incentiveType: IncentiveType | null | undefined;
  /** Whether this is a completed trip (use muted colors) */
  isCompleted?: boolean;
  /** Position context - affects Popover vs Tooltip behavior */
  context?: "card" | "detail";
}

// -----------------------------------------------------------------------------
// POPOVER CONTENT (single program)
// -----------------------------------------------------------------------------

interface PopoverInnerContentProps {
  incentiveType: IncentiveType;
}

function PopoverInnerContent({ incentiveType }: PopoverInnerContentProps) {
  const progress = getIncentiveProgressInfo(incentiveType);
  if (!progress) return null;

  return (
    <p className="text-sm text-gray-700">
      <span>Counts toward </span>
      <span className="font-semibold text-gray-900">{progress.name}</span>
      <span> — </span>
      <span className="font-medium text-gray-900">
        {formatProgressString(progress.currentCount, progress.targetCount)}
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
  const { variants, isLoaded } = useVariants();
  const [popoverOpen, setPopoverOpen] = useState(false);

  // Don't render if no incentive or null
  if (!incentiveType) {
    return null;
  }

  // Don't render until variants are loaded
  if (!isLoaded) {
    return null;
  }

  const activeVariant = variants.pill;

  // Render the badge based on variant
  const renderBadge = () => {
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
  };

  // All variants use Popover for detailed progress on tap
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
          {renderBadge()}
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
