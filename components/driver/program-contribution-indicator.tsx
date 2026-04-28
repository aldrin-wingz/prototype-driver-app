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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { IncentiveType } from "@/lib/data/incentives";
import {
  getMultipleIncentiveProgressInfo,
  formatProgressString,
  formatBonusString,
  type IncentiveProgressInfo,
} from "@/lib/data/incentive-utils";
import {
  IncentiveBadgeRenderer,
  PillRowVariant,
  CornerFlagVariant,
  BannerHeroVariant,
  StreakFlameVariant,
  ProgressRingVariant,
  BonusPreviewVariant,
  AchievementBadgeVariant,
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
// TOOLTIP CONTENT (for badge-corner-flag)
// -----------------------------------------------------------------------------

interface TooltipInnerContentProps {
  progressItems: IncentiveProgressInfo[];
}

function TooltipInnerContent({ progressItems }: TooltipInnerContentProps) {
  if (progressItems.length === 0) return null;

  // Single incentive: "Counts toward Early Bird — 6/10 trips · Earn $75 when complete"
  // Multi incentive: List each on its own line
  if (progressItems.length === 1) {
    const item = progressItems[0];
    if (item.isComplete) {
      return (
        <span>
          {item.name} — {formatProgressString(item.currentCount, item.targetCount)} · Earned {formatBonusString(item.bonusAmount)}
        </span>
      );
    }
    return (
      <span>
        Counts toward {item.name} — {formatProgressString(item.currentCount, item.targetCount)} · Earn {formatBonusString(item.bonusAmount)} when complete
      </span>
    );
  }

  // Multi-incentive
  return (
    <div className="space-y-1">
      {progressItems.map((item) => (
        <div key={item.incentiveType}>
          {item.isComplete ? (
            <span>
              {item.name} — {formatProgressString(item.currentCount, item.targetCount)} · Earned {formatBonusString(item.bonusAmount)}
            </span>
          ) : (
            <span>
              {item.name} — {formatProgressString(item.currentCount, item.targetCount)} · Earn {formatBonusString(item.bonusAmount)}
            </span>
          )}
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

  // For absolute-positioned variants (badge, flame, ring, bonus, achievement), use Tooltip (hover) on desktop
  const absoluteVariants = ["badge-corner-flag", "streak-flame", "progress-ring", "bonus-preview", "achievement-badge"] as const;
  
  if (absoluteVariants.includes(activeVariant as typeof absoluteVariants[number])) {
    const renderAbsoluteBadge = () => {
      switch (activeVariant) {
        case "badge-corner-flag":
          return <CornerFlagVariant incentiveTypes={incentiveTypes} isCompleted={isCompleted} />;
        case "streak-flame":
          return <StreakFlameVariant incentiveTypes={incentiveTypes} isCompleted={isCompleted} />;
        case "progress-ring":
          return <ProgressRingVariant incentiveTypes={incentiveTypes} isCompleted={isCompleted} />;
        case "bonus-preview":
          return <BonusPreviewVariant incentiveTypes={incentiveTypes} isCompleted={isCompleted} />;
        case "achievement-badge":
          return <AchievementBadgeVariant incentiveTypes={incentiveTypes} isCompleted={isCompleted} />;
        default:
          return null;
      }
    };

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="cursor-pointer">
              {renderAbsoluteBadge()}
            </div>
          </TooltipTrigger>
          <TooltipContent
            side="left"
            className="max-w-xs bg-gray-900 text-white"
          >
            <TooltipInnerContent progressItems={progressItems} />
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // For pill-named-bottom and banner-wingz-hero, use Popover (tap/click)
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
      default:
        return null;
    }
  };

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
