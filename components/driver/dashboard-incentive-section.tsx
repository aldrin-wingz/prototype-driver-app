"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronRight,
  Hourglass,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";
import {
  formatEndsIn,
  getAllIncentiveProgress,
  getQualifyingTripsCount,
  type IncentiveProgressInfo,
} from "@/lib/data/incentive-utils";
import { incentiveDefinitions, type IncentiveType } from "@/lib/data/incentives";

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
  /** App-I-4 (v6): goal mode discriminator. "total" preserves the existing
   *  "X done · Y to go" caption. "rolling-window" renders the sliding-window
   *  caption: "Current <Y>-day window: X done · Y needed" (corrected 2026-05-12). */
  mode?: "total" | "rolling-window";
  /** App-I-4: only used when `mode === "rolling-window"`. */
  windowDays?: number;
}

function ProgressMeter({ currentCount, goal, mode = "total", windowDays }: ProgressMeterProps) {
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
      <div className="text-xs">
        {mode === "rolling-window" && windowDays != null ? (
          // App-I-6.2 (review fix 2026-05-12): tightened to plain English.
          // "Current 7-day window: 4 done · 1 needed" → "4 of 5 in last 7 days".
          <span className="font-medium text-gray-700">
            {currentCount} of {goal} in last {windowDays} days
          </span>
        ) : (
          <span>
            <span className="font-medium text-gray-700">{currentCount} done</span>
            {remainingCount > 0 && (
              <span className="text-gray-400"> · {remainingCount} to go</span>
            )}
          </span>
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
  /**
   * App-I-6.2 (2026-05-12): when true, the campaign window has closed.
   * The "Available trips · Tap to filter" CTA hides (no new trips can
   * count), and the tap handler is suppressed (card is read-only — only
   * "View rides" remains a live link to the frozen end-state view).
   */
  isEnded?: boolean;
  /**
   * App-I-6.2 (2026-05-12): outcome at campaign close. App-MVP-2 strip
   * (2026-05-14) — `missed-criterion` is no longer reachable (per-criterion
   * eligibility subsystem retired); kept in the type union for now to
   * preserve the card prop API. Forces the frozen end-state opacity styling
   * and hides the "Available Rides" button.
   */
  endedOutcome?: "earned" | "missed-goal" | "missed-criterion";
}

function IncentiveCard({
  progress,
  onTap,
  isEnded = false,
}: IncentiveCardProps) {
  const availableCount = getQualifyingTripsCount(progress.incentiveType);

  const incentiveDef = incentiveDefinitions.find(
    (d) => d.id === progress.incentiveId,
  );

  // App-I-5 (2026-05-12): Dynamic ends-in indicator. Reads `endDate` only;
  // returns urgent (≤7 days, amber) / neutral (>7 days, muted) / ended.
  // Independent of rolling-window mode — total-mode cards show it too.
  // Renders as a single muted subtitle line (amber when urgent) under the
  // progress meter — the bordered chip treatment was dropped in the
  // App-I-6.2 review simplification.
  const endsIn = formatEndsIn(progress.endDate);

  // App-I-6.2 (2026-05-12 review fix): card body is no longer a tap target —
  // two explicit footer buttons replace the whole-card tap + mid-card "Tap to
  // filter" chip + bottom "View rides" link. Available Rides → request filter
  // (primary green; hidden on ended campaigns); Your Rides → per-incentive
  // rides view (secondary outline). Card surface is read-only summary.

  return (
    <div
      className={cn(
        "w-full rounded-xl border bg-white p-4 text-left shadow-sm",
        (progress.isComplete || isEnded) && "opacity-80"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {/* App-I-6.2 (layout v4 2026-05-12): title pill + ends-in always
              share the same row. Calm ends-in renders as plain muted text;
              urgent ends-in promotes to an amber pill with Hourglass icon
              so the urgency visibly demands attention while staying in the
              same slot. App-MVP-2 (2026-05-14): the per-card status pill
              (formerly rendered below the progress meter) was retired
              alongside the per-criterion eligibility subsystem. */}
          <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <Badge
              variant="outline"
              className="text-xs font-medium"
              style={
                incentiveDef
                  ? {
                      backgroundColor: `${incentiveDef.color}1a`,
                      color: incentiveDef.color,
                      borderColor: `${incentiveDef.color}40`,
                    }
                  : undefined
              }
            >
              {progress.name}
            </Badge>
            {endsIn.tone === "urgent" ? (
              <span
                className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800"
                aria-label={endsIn.copy}
              >
                <Hourglass className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{endsIn.copy}</span>
              </span>
            ) : (
              <span
                className="text-xs font-medium text-gray-500"
                aria-label={endsIn.copy}
              >
                {endsIn.copy}
              </span>
            )}
          </div>
          <p className="mb-3 text-sm text-gray-600">{progress.description}</p>

          <ProgressMeter
            currentCount={progress.currentCount}
            goal={progress.goal}
            mode={progress.goalMode}
            windowDays={progress.goalDays}
          />
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
        </div>
      </div>

      {/* App-MVP-2 (2026-05-14): per-criterion eligibility stripped —
          Completed Rides is a plain outline button (no status-tone tinting
          or status-icon prefix). Two-button footer: Completed Rides (left,
          per-incentive frozen rides view) + Available Rides (right,
          request filter; hidden on ended campaigns). */}
      <div className="mt-3 flex items-center gap-2 border-t border-gray-100 pt-3">
        <Button
          asChild
          type="button"
          size="sm"
          variant="outline"
          className="flex-1 border-gray-300 text-gray-800 hover:bg-gray-50"
        >
          <Link
            href={`/incentives/${progress.incentiveId}/rides`}
            aria-label={`Completed Rides for ${progress.name}`}
          >
            <span>Completed Rides</span>
          </Link>
        </Button>
        {!isEnded ? (
          <Button
            type="button"
            size="sm"
            className="flex-1 bg-[#10B981] text-white hover:bg-[#0F9F76]"
            onClick={() => onTap(progress.incentiveType)}
            aria-label={`Available Rides for ${progress.name}${availableCount > 0 ? ` (${availableCount})` : ""}`}
          >
            <span>Available Rides</span>
            {availableCount > 0 ? (
              <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-xs font-bold text-[#10B981]">
                {availableCount}
              </span>
            ) : null}
          </Button>
        ) : null}
      </div>
    </div>
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
  // App-I-6.2 (2026-05-12): filter ended incentives out of the dashboard
  // carousel — past campaigns surface only on the `/incentives` Past tab.
  const now = Date.now();
  const progressItems = getAllIncentiveProgress().filter((item) => {
    const end = new Date(item.endDate).getTime();
    if (!Number.isFinite(end)) return true;
    return end >= now;
  });

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
