"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { useVariants } from "@/lib/variants-context";
import { cn } from "@/lib/utils";
import {
  getAllIncentiveProgress,
  getProjectedTotalBonus,
  INCENTIVE_PILL_COLORS,
  INCENTIVE_TIER_COLORS,
  type IncentiveProgressInfo,
} from "@/lib/data/incentive-utils";
import type { IncentiveType } from "@/lib/data/incentives";
import type { PillVariant } from "@/lib/variants";

// -----------------------------------------------------------------------------
// SHARED: View All Link
// -----------------------------------------------------------------------------

interface ViewAllLinkProps {
  onTap: () => void;
  /** When true, renders white text for use on dark backgrounds (banner variant). */
  light?: boolean;
}

function ViewAllLink({ onTap, light = false }: ViewAllLinkProps) {
  return (
    <button
      onClick={onTap}
      className={cn(
        "flex items-center gap-0.5 text-sm font-medium transition-opacity hover:opacity-80",
        light ? "text-[#10B981]" : "text-[#10B981]"
      )}
    >
      View All
      <ChevronRight className="h-4 w-4" />
    </button>
  );
}

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
              backgroundImage:
                "repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.4) 2px, rgba(255,255,255,0.4) 4px)",
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

/**
 * Compute themed classes for the full IncentiveCard based on the active pill variant.
 * - pill-named-bottom: white card (existing default)
 * - banner-wingz-hero: black card with tier-tinted Wingz mark backdrop
 * - achievement-banner: card body = program's tierLevel color
 */
function getCardTheme(progress: IncentiveProgressInfo, pillVariant: PillVariant) {
  const tier = INCENTIVE_TIER_COLORS[progress.tierLevel];

  if (pillVariant === "banner-wingz-hero") {
    return {
      cardBg: "bg-[#1F2937] border-[#1F2937]",
      titleText: "text-white",
      descText: "text-gray-300",
      bonusText: progress.isComplete ? "text-[#10B981]" : "text-[#10B981]",
      chevronText: "text-gray-400",
      completedLabel: "text-[#10B981]",
      progressTrack: "bg-gray-700",
      progressFill: "bg-[#10B981]",
      progressScheduled: "bg-[#10B981]/40",
      progressDoneText: "text-gray-300",
      progressTakenText: "text-[#10B981]/80",
      progressToGoText: "text-gray-500",
      stripeRgba: "rgba(255,255,255,0.3)",
      markBackdrop: tier.bgClass, // tier-tinted backdrop on dark bg
      showWingz: true,
      useTierBadge: false,
    };
  }

  if (pillVariant === "achievement-banner") {
    return {
      cardBg: cn(tier.bgClass, "border-transparent"),
      titleText: tier.textClass,
      descText: tier.mutedTextClass,
      bonusText: tier.textClass,
      chevronText: tier.mutedTextClass,
      completedLabel: tier.textClass,
      progressTrack: tier.progressTrackClass,
      progressFill: tier.progressFillClass,
      progressScheduled: tier.progressFillClass,
      progressDoneText: tier.mutedTextClass,
      progressTakenText: tier.mutedTextClass,
      progressToGoText: tier.mutedTextClass,
      stripeRgba: "rgba(255,255,255,0.4)",
      markBackdrop: tier.markBackdropClass,
      showWingz: true,
      useTierBadge: false,
    };
  }

  // pill-named-bottom (default): white card with named pill
  return {
    cardBg: "bg-white border",
    titleText: "text-gray-900",
    descText: "text-gray-600",
    bonusText: progress.isComplete ? "text-[#10B981]" : "text-gray-900",
    chevronText: "text-gray-400",
    completedLabel: "text-[#10B981]",
    progressTrack: "bg-gray-200",
    progressFill: "bg-[#10B981]",
    progressScheduled: "bg-[#10B981]/40",
    progressDoneText: "text-gray-700",
    progressTakenText: "text-[#10B981]",
    progressToGoText: "text-gray-400",
    stripeRgba: "rgba(255,255,255,0.4)",
    markBackdrop: "",
    showWingz: false,
    useTierBadge: true,
  };
}

interface ThemedProgressMeterProps {
  currentCount: number;
  scheduledCount: number;
  targetCount: number;
  trackClass: string;
  fillClass: string;
  scheduledClass: string;
  doneTextClass: string;
  takenTextClass: string;
  toGoTextClass: string;
  stripeRgba: string;
}

function ThemedProgressMeter({
  currentCount,
  scheduledCount,
  targetCount,
  trackClass,
  fillClass,
  scheduledClass,
  doneTextClass,
  takenTextClass,
  toGoTextClass,
  stripeRgba,
}: ThemedProgressMeterProps) {
  const completedPercent = (currentCount / targetCount) * 100;
  const scheduledPercent = (scheduledCount / targetCount) * 100;
  const remainingCount = Math.max(0, targetCount - currentCount - scheduledCount);

  return (
    <div className="w-full space-y-1.5">
      <div className={cn("relative h-2 w-full overflow-hidden rounded-full", trackClass)}>
        <div
          className={cn("absolute inset-y-0 left-0 transition-all", fillClass)}
          style={{ width: `${Math.min(completedPercent, 100)}%` }}
        />
        {scheduledCount > 0 && (
          <div
            className={cn("absolute inset-y-0", scheduledClass)}
            style={{
              left: `${completedPercent}%`,
              width: `${Math.min(scheduledPercent, 100 - completedPercent)}%`,
              backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 2px, ${stripeRgba} 2px, ${stripeRgba} 4px)`,
            }}
          />
        )}
      </div>
      <div className="flex items-center gap-1 text-xs">
        <span className={cn("font-medium", doneTextClass)}>{currentCount} done</span>
        {scheduledCount > 0 && (
          <span className={takenTextClass}>+{scheduledCount} taken</span>
        )}
        {remainingCount > 0 && (
          <span className={toGoTextClass}>· {remainingCount} to go</span>
        )}
      </div>
    </div>
  );
}

function IncentiveCard({ progress, onTap, variant = "full" }: IncentiveCardProps) {
  const { variants, isLoaded } = useVariants();
  const colors = INCENTIVE_PILL_COLORS[progress.incentiveType];

  // mini variant always uses the white card (used inside dashboard-banner horizontal scroll)
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

  // Full variant — themed by active pill variant
  const pillVariant: PillVariant = isLoaded ? variants.pill : "pill-named-bottom";
  const theme = getCardTheme(progress, pillVariant);

  return (
    <button
      onClick={() => onTap(progress.incentiveType)}
      className={cn(
        "w-full rounded-xl p-4 text-left shadow-sm transition-all hover:shadow-md active:scale-[0.99]",
        theme.cardBg,
        progress.isComplete && "opacity-80"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {/* Wingz mark backdrop on banner/achievement variants */}
            {theme.showWingz && (
              <span
                className={cn(
                  "flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md",
                  theme.markBackdrop
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
              </span>
            )}
            {/* Named pill on pill-named-bottom (existing) */}
            {theme.useTierBadge ? (
              <Badge
                variant="outline"
                className={cn("text-xs font-medium", colors.bg, colors.text, colors.border)}
              >
                {progress.name}
              </Badge>
            ) : (
              <span className={cn("text-sm font-semibold", theme.titleText)}>
                {progress.name}
              </span>
            )}
            {progress.isComplete && (
              <span className={cn("text-xs font-medium", theme.completedLabel)}>Completed</span>
            )}
          </div>
          <p className={cn("text-sm mb-3", theme.descText)}>{progress.description}</p>
          <ThemedProgressMeter
            currentCount={progress.currentCount}
            scheduledCount={progress.scheduledCount}
            targetCount={progress.targetCount}
            trackClass={theme.progressTrack}
            fillClass={theme.progressFill}
            scheduledClass={theme.progressScheduled}
            doneTextClass={theme.progressDoneText}
            takenTextClass={theme.progressTakenText}
            toGoTextClass={theme.progressToGoText}
            stripeRgba={theme.stripeRgba}
          />
        </div>
        <div className="flex flex-col items-end justify-between self-stretch">
          <span className={cn("text-lg font-bold", theme.bonusText)}>
            ${progress.bonusAmount}
          </span>
          <ChevronRight className={cn("h-5 w-5", theme.chevronText)} />
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
    router.push(`/requests?incentive=${type}`);
  };

  const handleViewAll = () => {
    router.push("/incentives");
  };

  return (
    <Card className="mx-4 mb-4 overflow-hidden rounded-xl bg-gray-900 shadow-sm">
      <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-2">
        <div className="flex items-center gap-2 min-w-0">
          <Image src="/WINGZLOGO2.png" alt="" width={20} height={20} className="object-contain flex-shrink-0" />
          <span className="text-sm font-semibold text-white truncate">Driver Incentives</span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-sm font-bold text-[#10B981]">${projectedTotal} projected</span>
          <ViewAllLink onTap={handleViewAll} light />
        </div>
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
// VARIANT 2: Dashboard Card Section (now IncentiveCarousel)
// -----------------------------------------------------------------------------

function IncentiveCarousel({
  items,
  onTap,
}: {
  items: IncentiveProgressInfo[];
  onTap: (type: IncentiveType) => void;
}) {
  const [api, setApi] = React.useState<CarouselApi>();
  const [current, setCurrent] = React.useState(0);
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    if (!api) return;
    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap());

    const onSelect = () => setCurrent(api.selectedScrollSnap());
    api.on("select", onSelect);
    api.on("reInit", onSelect);

    return () => {
      api.off("select", onSelect);
      api.off("reInit", onSelect);
    };
  }, [api]);

  return (
    <div className="w-full">
      <Carousel setApi={setApi} opts={{ align: "start", loop: false }} className="w-full">
        <CarouselContent>
          {items.map((item) => (
            <CarouselItem key={item.incentiveType} className="basis-full">
              <IncentiveCard progress={item} onTap={onTap} variant="full" />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      {/* Page indicator dots — visual only, non-interactive */}
      {count > 1 && (
        <div className="mt-3 flex items-center justify-center gap-1.5" role="tablist" aria-label="Incentive carousel position">
          {Array.from({ length: count }).map((_, i) => (
            <span
              key={i}
              aria-hidden="true"
              className={cn(
                "h-2 w-2 rounded-full transition-colors",
                i === current ? "bg-[#10B981]" : "bg-[#E5E7EB]"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DashboardCardSectionVariant() {
  const router = useRouter();
  const progressItems = getAllIncentiveProgress();

  const handleTap = (type: IncentiveType) => {
    router.push(`/requests?incentive=${type}`);
  };

  const handleViewAll = () => {
    router.push("/incentives");
  };

  return (
    <div className="px-4 mb-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900">Driver Incentives</h3>
        <ViewAllLink onTap={handleViewAll} />
      </div>
      <IncentiveCarousel items={progressItems} onTap={handleTap} />
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
  const completedBonuses = progressItems.filter((p) => p.isComplete).reduce((sum, p) => sum + p.bonusAmount, 0);
  const projectedTotal = getProjectedTotalBonus();
  const inProgressItems = progressItems.filter((p) => !p.isComplete);

  const handleTap = (type: IncentiveType) => {
    router.push(`/requests?incentive=${type}`);
  };

  const handleViewAll = () => {
    router.push("/incentives");
  };

  return (
    <div className="border-t border-gray-100 pt-3 mt-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-gray-500">Projected with Bonuses</span>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-gray-900">
            ${(earnings + projectedTotal).toFixed(2)}
            {completedBonuses > 0 && <span className="text-[#10B981] ml-1">(+${completedBonuses} earned)</span>}
          </span>
          <ViewAllLink onTap={handleViewAll} />
        </div>
      </div>
      {inProgressItems.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {inProgressItems.map((item) => {
            const colors = INCENTIVE_PILL_COLORS[item.incentiveType];
            return (
              <button
                key={item.incentiveType}
                onClick={() => handleTap(item.incentiveType)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all hover:opacity-80 active:scale-95",
                  colors.bg,
                  colors.text
                )}
              >
                <span>{item.name}</span>
                <span className="text-[10px] opacity-70">
                  {item.currentCount}/{item.targetCount}
                </span>
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

export {
  ProgressMeter,
  IncentiveCard,
  IncentiveCarousel,
  DashboardBannerVariant,
  DashboardCardSectionVariant,
  DashboardWidgetIntegratedVariant,
};
