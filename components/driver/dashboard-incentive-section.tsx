"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useVariants } from "@/lib/variants-context";
import { cn } from "@/lib/utils";
import {
  getAllIncentiveProgress,
  getProjectedTotalBonus,
  INCENTIVE_PILL_COLORS,
  type IncentiveProgressInfo,
} from "@/lib/data/incentive-utils";
import type { IncentiveType } from "@/lib/data/incentives";

// -----------------------------------------------------------------------------
// SHARED: Progress Meter Component
// -----------------------------------------------------------------------------

interface ProgressMeterProps {
  currentCount: number;
  scheduledCount: number;
  targetCount: number;
  isComplete: boolean;
  compact?: boolean;
}

function ProgressMeter({ 
  currentCount, 
  scheduledCount, 
  targetCount, 
  isComplete,
  compact = false,
}: ProgressMeterProps) {
  const completedPercent = (currentCount / targetCount) * 100;
  const scheduledPercent = (scheduledCount / targetCount) * 100;
  const remainingCount = Math.max(0, targetCount - currentCount - scheduledCount);

  return (
    <div className={cn("w-full", compact ? "space-y-1" : "space-y-1.5")}>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className="absolute inset-y-0 left-0 transition-all bg-[#10B981]"
          style={{ width: `${Math.min(completedPercent, 100)}%` }}
        />
        {scheduledCount > 0 && (
          <div
            className="absolute inset-y-0 bg-[#10B981]/40"
            style={{ 
              left: `${completedPercent}%`,
              width: `${Math.min(scheduledPercent, 100 - completedPercent)}%`,
              backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.4) 2px, rgba(255,255,255,0.4) 4px)'
            }}
          />
        )}
      </div>
      <div className={cn("flex items-center gap-1", compact ? "text-[10px]" : "text-xs")}>
        <span className="font-medium text-gray-700">{currentCount} done</span>
        {scheduledCount > 0 && (
          <span className="text-[#10B981]">+{scheduledCount} taken</span>
        )}
        {remainingCount > 0 && (
          <span className="text-gray-400">· {remainingCount} to go</span>
        )}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// SHARED: Incentive Card
// -----------------------------------------------------------------------------

interface IncentiveCardProps {
  progress: IncentiveProgressInfo;
  onTap: (type: IncentiveType) => void;
  variant?: "mini" | "full";
}

function IncentiveCard({ progress, onTap, variant = "full" }: IncentiveCardProps) {
  const colors = INCENTIVE_PILL_COLORS[progress.incentiveType];
  
  if (variant === "mini") {
    return (
      <button
        onClick={() => onTap(progress.incentiveType)}
        className={cn(
          "flex-shrink-0 w-[160px] rounded-lg border bg-white p-3 text-left shadow-sm transition-all hover:shadow-md active:scale-[0.98]",
          progress.isComplete && "opacity-70"
        )}
      >
        <div className="mb-2 flex items-center justify-between">
          <Badge variant="outline" className={cn("text-[10px] font-medium", colors.bg, colors.text, colors.border)}>
            {progress.name}
          </Badge>
          {progress.isComplete && <span className="text-[10px] text-[#10B981] font-medium">Done</span>}
        </div>
        <ProgressMeter
          currentCount={progress.currentCount}
          scheduledCount={progress.scheduledCount}
          targetCount={progress.targetCount}
          isComplete={progress.isComplete}
          compact
        />
        <div className="mt-2 flex items-center justify-between">
          <span className={cn("text-sm font-bold", progress.isComplete ? "text-[#10B981]" : "text-gray-900")}>
            ${progress.bonusAmount}
          </span>
          <ChevronRight className="h-4 w-4 text-gray-400" />
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={() => onTap(progress.incentiveType)}
      className={cn(
        "w-full rounded-xl border bg-white p-4 text-left shadow-sm transition-all hover:shadow-md active:scale-[0.99]",
        progress.isComplete && "opacity-80"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className={cn("text-xs font-medium", colors.bg, colors.text, colors.border)}>
              {progress.name}
            </Badge>
            {progress.isComplete && <span className="text-xs text-[#10B981] font-medium">Completed</span>}
          </div>
          <p className="text-sm text-gray-600 mb-3">{progress.description}</p>
          <ProgressMeter
            currentCount={progress.currentCount}
            scheduledCount={progress.scheduledCount}
            targetCount={progress.targetCount}
            isComplete={progress.isComplete}
          />
        </div>
        <div className="flex flex-col items-end justify-between self-stretch">
          <span className={cn("text-lg font-bold", progress.isComplete ? "text-[#10B981]" : "text-gray-900")}>
            ${progress.bonusAmount}
          </span>
          <ChevronRight className="h-5 w-5 text-gray-400" />
        </div>
      </div>
    </button>
  );
}

// -----------------------------------------------------------------------------
// VARIANT 1: Dashboard Banner
// -----------------------------------------------------------------------------

function DashboardBannerVariant() {
  const router = useRouter();
  const progressItems = getAllIncentiveProgress();
  const projectedTotal = getProjectedTotalBonus();

  const handleTap = (type: IncentiveType) => {
    console.log(`[v0] Deep-link to /requests?incentive=${type}`);
    router.push(`/requests?incentive=${type}`);
  };

  return (
    <Card className="mx-4 mb-4 overflow-hidden rounded-xl bg-gray-900 shadow-sm">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <Image src="/WINGZLOGO2.png" alt="" width={20} height={20} className="object-contain" />
          <span className="text-sm font-semibold text-white">Driver Incentives</span>
        </div>
        <span className="text-sm font-bold text-[#10B981]">${projectedTotal} projected</span>
      </div>
      <ScrollArea className="w-full pb-4">
        <div className="flex gap-3 px-4 py-2">
          {progressItems.map((item) => (
            <IncentiveCard key={item.incentiveType} progress={item} onTap={handleTap} variant="mini" />
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </Card>
  );
}

// -----------------------------------------------------------------------------
// VARIANT 2: Dashboard Card Section
// -----------------------------------------------------------------------------

function DashboardCardSectionVariant() {
  const router = useRouter();
  const progressItems = getAllIncentiveProgress();

  const handleTap = (type: IncentiveType) => {
    console.log(`[v0] Deep-link to /requests?incentive=${type}`);
    router.push(`/requests?incentive=${type}`);
  };

  return (
    <div className="px-4 mb-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900">Driver Incentives</h3>
      </div>
      <div className="space-y-3">
        {progressItems.map((item) => (
          <IncentiveCard key={item.incentiveType} progress={item} onTap={handleTap} variant="full" />
        ))}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// VARIANT 3: Dashboard Widget Integrated
// -----------------------------------------------------------------------------

interface DashboardWidgetIntegratedVariantProps {
  earnings: number;
}

function DashboardWidgetIntegratedVariant({ earnings }: DashboardWidgetIntegratedVariantProps) {
  const router = useRouter();
  const progressItems = getAllIncentiveProgress();
  const completedBonuses = progressItems.filter(p => p.isComplete).reduce((sum, p) => sum + p.bonusAmount, 0);
  const projectedTotal = getProjectedTotalBonus();
  const inProgressItems = progressItems.filter(p => !p.isComplete);

  const handleTap = (type: IncentiveType) => {
    console.log(`[v0] Deep-link to /requests?incentive=${type}`);
    router.push(`/requests?incentive=${type}`);
  };

  return (
    <div className="border-t border-gray-100 pt-3 mt-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-500">Projected with Bonuses</span>
        <span className="text-sm font-bold text-gray-900">
          ${(earnings + projectedTotal).toFixed(2)}
          {completedBonuses > 0 && <span className="text-[#10B981] ml-1">(+${completedBonuses} earned)</span>}
        </span>
      </div>
      {inProgressItems.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {inProgressItems.map((item) => {
            const colors = INCENTIVE_PILL_COLORS[item.incentiveType];
            return (
              <button
                key={item.incentiveType}
                onClick={() => handleTap(item.incentiveType)}
                className={cn("flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all hover:opacity-80 active:scale-95", colors.bg, colors.text)}
              >
                <span>{item.name}</span>
                <span className="text-[10px] opacity-70">{item.currentCount}/{item.targetCount}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// MAIN EXPORT
// -----------------------------------------------------------------------------

interface DashboardIncentiveSectionProps {
  currentEarnings?: number;
  placement?: "top" | "middle" | "widget";
}

export function DashboardIncentiveSection({ currentEarnings = 0, placement }: DashboardIncentiveSectionProps) {
  const { variants, isLoaded } = useVariants();
  if (!isLoaded) return null;

  switch (variants.dashboard) {
    case "dashboard-banner":
      if (placement && placement !== "top") return null;
      return <DashboardBannerVariant />;
    case "dashboard-card-section":
      if (placement && placement !== "middle") return null;
      return <DashboardCardSectionVariant />;
    case "dashboard-widget-integrated":
      if (placement && placement !== "widget") return null;
      return <DashboardWidgetIntegratedVariant earnings={currentEarnings} />;
    default:
      return null;
  }
}

export { ProgressMeter, IncentiveCard, DashboardBannerVariant, DashboardCardSectionVariant, DashboardWidgetIntegratedVariant };
