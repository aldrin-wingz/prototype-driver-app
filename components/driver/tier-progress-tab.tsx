"use client";

import { Lock, Check, CircleDot } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useVariants } from "@/lib/variants-context";
import { cn } from "@/lib/utils";
import { TierBadge, TIER_COLORS, type Tier } from "./tier-badge";
import { currentDriver, tierConfigs } from "@/lib/data/incentives";

const ALL_TIERS: Tier[] = ["bronze", "silver", "gold", "platinum"];

/** Get the next tier above the current one (or null if already platinum) */
function getNextTier(currentTier: Tier): Tier | null {
  const idx = ALL_TIERS.indexOf(currentTier);
  if (idx < 0 || idx >= ALL_TIERS.length - 1) return null;
  return ALL_TIERS[idx + 1];
}

/** Get tier threshold $ value */
function getThreshold(tier: Tier): number {
  return tierConfigs.find((t) => t.tier === tier)?.threshold ?? 0;
}

// -----------------------------------------------------------------------------
// VARIANT A: tier-linear — Hero $ + 4 tier icons + horizontal progress bar
// -----------------------------------------------------------------------------

function TierLinearVariant() {
  const earned = currentDriver.totalBonusesEarnedThisMonth;
  const currentTier = currentDriver.currentTier;
  const nextTier = getNextTier(currentTier);
  const platinumThreshold = getThreshold("platinum");
  const progressPct = Math.min(100, (earned / platinumThreshold) * 100);

  return (
    <div className="px-4 py-6">
      {/* Hero header */}
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
        Earned this month — May 2026
      </p>
      <p className="mb-8 text-5xl font-bold text-[#10B981]">
        ${earned}
      </p>

      {/* Tier badges row */}
      <div className="mb-3 flex items-center justify-between px-2">
        {ALL_TIERS.map((tier) => (
          <div key={tier} className="flex flex-col items-center gap-1">
            <TierBadge tier={tier} size="sm" />
            <span className="text-[10px] font-medium uppercase tracking-wide text-gray-500">
              {TIER_COLORS[tier].label}
            </span>
          </div>
        ))}
      </div>

      {/* Progress bar with $80 callout above the marker */}
      <div className="relative mx-2 mb-1 mt-7 h-2 rounded-full bg-gray-200">
        {/* Earned-amount callout sitting directly above the marker */}
        <div
          className="pointer-events-none absolute bottom-full left-0 flex -translate-x-1/2 flex-col items-center"
          style={{ left: `${progressPct}%` }}
        >
          <span className="mb-0.5 text-[10px] font-semibold tabular-nums text-gray-600">
            ${earned}
          </span>
          <div className="h-1.5 w-px bg-gray-400" />
        </div>

        {/* Filled bar */}
        <div
          className="h-full rounded-full bg-[#10B981] transition-all"
          style={{ width: `${progressPct}%` }}
        />

        {/* Marker dot */}
        <div
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${progressPct}%` }}
        >
          <div className="h-4 w-4 rounded-full border-2 border-white bg-[#10B981] shadow-md" />
        </div>
      </div>

      {/* Tier $ markers below the bar */}
      <div className="mb-6 flex items-center justify-between px-2 text-[10px] font-medium text-gray-500">
        <span>${getThreshold("bronze")}</span>
        <span>${getThreshold("silver")}</span>
        <span>${getThreshold("gold")}</span>
        <span>${getThreshold("platinum")}</span>
      </div>

      {/* Status copy — inline (no card wrapper) */}
      {nextTier ? (
        <p className="text-center text-sm leading-relaxed text-gray-700">
          You&apos;re in{" "}
          <span className="font-semibold" style={{ color: TIER_COLORS[currentTier].bg }}>
            {TIER_COLORS[currentTier].label}
          </span>
          {" — "}
          <span className="font-semibold text-[#10B981]">
            ${getThreshold(nextTier) - earned}
          </span>
          {" to "}
          <span className="font-semibold" style={{ color: TIER_COLORS[nextTier].bg }}>
            {TIER_COLORS[nextTier].label}
          </span>
        </p>
      ) : (
        <p className="text-center text-sm leading-relaxed text-gray-700">
          You&apos;ve reached the highest tier —{" "}
          <span className="font-semibold" style={{ color: TIER_COLORS.platinum.bg }}>
            Platinum!
          </span>
        </p>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// VARIANT B: tier-stack — Hero $ + vertical stack of 4 tier cards
// -----------------------------------------------------------------------------

function TierStackVariant() {
  const earned = currentDriver.totalBonusesEarnedThisMonth;
  const currentTier = currentDriver.currentTier;
  const nextTier = getNextTier(currentTier);

  // Render order: top-down platinum → gold → silver → bronze (ladder up)
  const renderOrder: Tier[] = ["platinum", "gold", "silver", "bronze"];

  return (
    <div className="px-4 py-6">
      {/* Hero header (same as Variant A) */}
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
        Earned this month — May 2026
      </p>
      <p className="mb-6 text-5xl font-bold text-[#10B981]">
        ${earned}
      </p>

      {/* Tier stack (compressed cards: ~64px tall) */}
      <div className="space-y-2">
        {renderOrder.map((tier) => {
          const threshold = getThreshold(tier);
          const isCurrent = tier === currentTier;
          const isNextTier = tier === nextTier;
          const isAchieved =
            ALL_TIERS.indexOf(tier) < ALL_TIERS.indexOf(currentTier);

          // Status content per row
          let statusContent: React.ReactNode;
          if (isCurrent) {
            statusContent = (
              <div
                className="flex items-center gap-1.5 text-xs font-bold"
                style={{ color: TIER_COLORS[tier].ring }}
              >
                <CircleDot className="h-4 w-4" />
                <span>Current</span>
              </div>
            );
          } else if (isAchieved) {
            statusContent = (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#10B981]">
                <Check className="h-4 w-4" />
                <span>Achieved</span>
              </div>
            );
          } else if (isNextTier) {
            statusContent = (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
                <Lock className="h-4 w-4 text-gray-500" />
                <span>${threshold - earned} to go</span>
              </div>
            );
          } else {
            statusContent = (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400">
                <Lock className="h-4 w-4" />
                <span>Locked</span>
              </div>
            );
          }

          return (
            <Card
              key={tier}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 shadow-sm transition-colors",
                isCurrent ? "border-2" : "border border-gray-200 bg-white"
              )}
              style={
                isCurrent
                  ? {
                      // More saturated bg + 2px tier-color border for active state
                      backgroundColor: TIER_COLORS[tier].soft,
                      borderColor: TIER_COLORS[tier].bg,
                    }
                  : undefined
              }
            >
              <TierBadge tier={tier} size="sm" />
              <div className="flex-1">
                <p
                  className={cn(
                    "text-sm text-gray-900",
                    isCurrent ? "font-bold" : "font-semibold"
                  )}
                >
                  {TIER_COLORS[tier].label}
                </p>
                <p className="text-[11px] text-gray-500">${threshold}+</p>
              </div>
              <div>{statusContent}</div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// EXPORT — picks active variant from context
// -----------------------------------------------------------------------------

export function TierProgressTab() {
  const { variants, isLoaded } = useVariants();

  if (!isLoaded) return null;

  if (variants.tierProgress === "tier-stack") {
    return <TierStackVariant />;
  }
  return <TierLinearVariant />;
}
