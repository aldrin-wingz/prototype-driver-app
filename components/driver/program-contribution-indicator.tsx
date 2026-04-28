"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useVariants } from "@/lib/variants-context";
import { Progress } from "@/components/ui/progress";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { IncentiveType } from "@/lib/data/incentives";
import {
  getMultipleIncentiveProgressInfo,
  formatProgressString,
  formatBonusString,
  type IncentiveProgressInfo,
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
  /** Array of incentive types this trip qualifies for */
  incentiveTypes: IncentiveType[];
  /** Whether this is a completed trip (use muted colors) */
  isCompleted?: boolean;
  /** Position context - affects Popover vs Tooltip behavior */
  context?: "card" | "detail";
}

// -----------------------------------------------------------------------------
// POPOVER CONTENT
// -----------------------------------------------------------------------------

interface PopoverInnerContentProps {
  progressItems: IncentiveProgressInfo[];
}

function PopoverInnerContent({ progressItems }: PopoverInnerContentProps) {
  if (progressItems.length === 0) return null;

  return (
    <div className="space-y-4">
      {progressItems.map((item) => (
        <div key={item.incentiveType} className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-gray-900">{item.name}</span>
            {item.isComplete ? (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                Complete!
              </span>
            ) : (
              <span className="text-sm text-gray-600">
                {formatProgressString(item.currentCount, item.targetCount)}
              </span>
            )}
          </div>
          
          <Progress
            value={(item.currentCount / item.targetCount) * 100}
            className="h-2"
          />
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">{item.description}</span>
            <span className="font-semibold text-[#10B981]">
              {item.isComplete ? "Earned" : "Earn"} {formatBonusString(item.bonusAmount)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------

export function ProgramContributionIndicator({
  incentiveTypes,
  isCompleted = false,
  context = "card",
}: ProgramContributionIndicatorProps) {
  const { variants, isLoaded } = useVariants();
  const [popoverOpen, setPopoverOpen] = useState(false);

  // Don't render if no incentives
  if (incentiveTypes.length === 0) {
    return null;
  }

  // Don't render until variants are loaded
  if (!isLoaded) {
    return null;
  }

  // Get progress info for all incentive types
  const progressItems = getMultipleIncentiveProgressInfo(incentiveTypes);

  const activeVariant = variants.pill;

  // Render the badge based on variant
  const renderBadge = () => {
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
        <PopoverInnerContent progressItems={progressItems} />
      </PopoverContent>
    </Popover>
  );
}
