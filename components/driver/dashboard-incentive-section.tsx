"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";
import {
  getAllIncentiveProgress,
  getQualifyingTripsCount,
  INCENTIVE_PILL_COLORS,
  type IncentiveProgressInfo,
} from "@/lib/data/incentive-utils";
import type { IncentiveType } from "@/lib/data/incentives";

// -----------------------------------------------------------------------------
// SHARED: View All Link
// -----------------------------------------------------------------------------

interface ViewAllLinkProps {
  onTap: () => void;
}

function ViewAllLink({ onTap }: ViewAllLinkProps) {
  return (
    <button
      onClick={onTap}
      className="flex items-center gap-0.5 text-sm font-medium text-[#10B981] transition-opacity hover:opacity-80"
    >
      View All
      <ChevronRight className="h-4 w-4" />
    </button>
  );
}

// -----------------------------------------------------------------------------
// SHARED: Progress Meter
// -----------------------------------------------------------------------------

interface ProgressMeterProps {
  currentCount: number;
  goal: number;
}

function ProgressMeter({ currentCount, goal }: ProgressMeterProps) {
  const completedPercent = (currentCount / goal) * 100;
  const remainingCount = Math.max(0, goal - currentCount);

  return (
    <div className="w-full space-y-1.5">
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className="absolute inset-y-0 left-0 bg-[#10B981] transition-all"
          style={{ width: `${Math.min(completedPercent, 100)}%` }}
        />
      </div>
      <div className="flex items-center gap-1 text-xs">
        <span className="font-medium text-gray-700">{currentCount} done</span>
        {remainingCount > 0 && (
          <span className="text-gray-400">· {remainingCount} to go</span>
        )}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// SHARED: Incentive Card  (always white card body in v1; per-incentive color
// reattaches in I-1 via `incentive.color`)
// -----------------------------------------------------------------------------

interface IncentiveCardProps {
  progress: IncentiveProgressInfo;
  onTap: (type: IncentiveType) => void;
  /** Kept for API parity; v1 only renders the full body. */
  variant?: "full";
}

function IncentiveCard({ progress, onTap }: IncentiveCardProps) {
  const colors = INCENTIVE_PILL_COLORS[progress.incentiveType];
  const availableCount = getQualifyingTripsCount(progress.incentiveType);

  return (
    <button
      onClick={() => onTap(progress.incentiveType)}
      className={cn(
        "w-full rounded-xl border bg-white p-4 text-left shadow-sm transition-all hover:shadow-md active:scale-[0.99]",
        progress.isComplete && "opacity-80"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn("text-xs font-medium", colors.bg, colors.text, colors.border)}
            >
              {progress.name}
            </Badge>
            {progress.isComplete && (
              <span className="text-xs font-medium text-[#10B981]">Completed</span>
            )}
          </div>
          <p className="mb-3 text-sm text-gray-600">{progress.description}</p>

          <ProgressMeter
            currentCount={progress.currentCount}
            goal={progress.goal}
          />

          <div
            className={cn(
              "mt-3 inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium",
              availableCount > 0
                ? "bg-[#10B981]/10 text-[#10B981]"
                : "bg-gray-100 text-gray-500"
            )}
            aria-label={
              availableCount > 0
                ? `${availableCount} qualifying trips available — tap to filter`
                : "No qualifying trips right now — tap to refresh"
            }
          >
            {availableCount > 0 ? (
              <>
                <span className="font-semibold">{availableCount}</span>
                <span>{availableCount === 1 ? "trip" : "trips"} available</span>
                <span aria-hidden="true">·</span>
                <span>Tap to filter</span>
              </>
            ) : (
              <>
                <span>No trips available right now</span>
                <span aria-hidden="true">·</span>
                <span>Tap to refresh</span>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end justify-between self-stretch">
          <span
            className={cn(
              "text-lg font-bold",
              progress.isComplete ? "text-[#10B981]" : "text-gray-900"
            )}
          >
            ${progress.bonusAmount}
          </span>
          <ChevronRight className="h-5 w-5 text-gray-400" />
        </div>
      </div>
    </button>
  );
}

// -----------------------------------------------------------------------------
// CAROUSEL
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

      {/* Page indicator dots — visual only */}
      {count > 1 && (
        <div
          className="mt-3 flex items-center justify-center gap-1.5"
          role="tablist"
          aria-label="Incentive carousel position"
        >
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

// -----------------------------------------------------------------------------
// LOCKED VARIANT: Dashboard Card Section
// -----------------------------------------------------------------------------

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
    <div className="mb-4 px-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900">Driver Incentives</h3>
        <ViewAllLink onTap={handleViewAll} />
      </div>
      <IncentiveCarousel items={progressItems} onTap={handleTap} />
    </div>
  );
}

// -----------------------------------------------------------------------------
// MAIN EXPORT
// -----------------------------------------------------------------------------

interface DashboardIncentiveSectionProps {
  /**
   * Placement is kept for API parity with the v3 baseline. v1 only supports
   * "middle" — passing any other value renders nothing.
   */
  placement?: "top" | "middle" | "widget";
}

/**
 * v1 locked variant: `dashboard-card-section` — single carousel of full
 * IncentiveCards in the middle of the home screen. The dashboard-banner +
 * dashboard-widget-integrated variants and the variant-switch were stripped
 * in I-0.
 */
export function DashboardIncentiveSection({
  placement = "middle",
}: DashboardIncentiveSectionProps) {
  if (placement && placement !== "middle") return null;
  return <DashboardCardSectionVariant />;
}

export { ProgressMeter, IncentiveCard, IncentiveCarousel, DashboardCardSectionVariant };
