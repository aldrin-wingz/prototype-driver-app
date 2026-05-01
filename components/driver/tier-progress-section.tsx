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
// VARIANT A: tier-linear — Card-pill with hero $ + 4 tier badges + progress bar
// -----------------------------------------------------------------------------

function TierLinearSection() {
  const earned = currentDriver.totalBonusesEarnedThisMonth;
  const currentTier = currentDriver.currentTier;
  const nextTier = getNextTier(currentTier);
  const platinumThreshold = getThreshold("platinum");
  const progressPct = Math.min(100, (earned / platinumThreshold) * 100);

  return (
    <Card className="border-gray-200 bg-white p-4 shadow-sm">
      {/* Header: small uppercase label + $ hero */}
      <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-gray-500">
        Earned this month — May 2026
      </p>
      <p className="mb-3 text-4xl font-bold leading-none text-[#10B981]">
        ${earned}
      </p>

      {/* Hairline divider */}
      <div className="-mx-4 mb-4 h-px bg-gray-100" />

      {/* Tier badges row */}
      <div className="mb-2 flex items-center justify-between px-1">
        {ALL_TIERS.map((tier) => (
          <div key={tier} className="flex flex-col items-center gap-1">
            <TierBadge tier={tier} size="sm" />
            <span className="text-[9px] font-medium uppercase tracking-wide text-gray-500">
              {TIER_COLORS[tier].label}
            </span>
          </div>
        ))}
      </div>

      {/* Progress bar with $ callout above marker */}
      <div className="relative mx-1 mb-1 mt-5 h-1.5 rounded-full bg-gray-200">
        {/* $ callout sitting directly above the marker */}
        <div
          className="pointer-events-none absolute bottom-full flex -translate-x-1/2 flex-col items-center"
          style={{ left: `${progressPct}%` }}
        >
          <span className="mb-0.5 text-[10px] font-semibold tabular-nums text-gray-600">
            ${earned}
          </span>
          <div className="h-1 w-px bg-gray-400" />
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
          <div className="h-3.5 w-3.5 rounded-full border-2 border-white bg-[#10B981] shadow-md" />
        </div>
      </div>

      {/* $ thresholds below the bar */}
      <div className="mb-3 flex items-center justify-between px-1 text-[9px] font-medium tabular-nums text-gray-500">
        <span>${getThreshold("bronze")}</span>
        <span>${getThreshold("silver")}</span>
        <span>${getThreshold("gold")}</span>
        <span>${getThreshold("platinum")}</span>
      </div>

      {/* Status copy — inline (no nested card) */}
      {nextTier ? (
        <p className="text-center text-xs leading-relaxed text-gray-700">
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
        <p className="text-center text-xs leading-relaxed text-gray-700">
          You&apos;ve reached the highest tier —{" "}
          <span className="font-semibold" style={{ color: TIER_COLORS.platinum.bg }}>
            Platinum!
          </span>
        </p>
      )}
    </Card>
  );
}

// -----------------------------------------------------------------------------
// VARIANT B: tier-stack — Card-pill with hero $ + vertical stack of 4 tier rows
// -----------------------------------------------------------------------------

function TierStackSection() {
  const earned = currentDriver.totalBonusesEarnedThisMonth;
  const currentTier = currentDriver.currentTier;
  const nextTier = getNextTier(currentTier);

  // Render order: top-down platinum → gold → silver → bronze (ladder up)
  const renderOrder: Tier[] = ["platinum", "gold", "silver", "bronze"];

  return (
    <Card className="border-gray-200 bg-white p-4 shadow-sm">
      {/* Header: small uppercase label + $ hero */}
      <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-gray-500">
        Earned this month — May 2026
      </p>
      <p className="mb-3 text-4xl font-bold leading-none text-[#10B981]">
        ${earned}
      </p>

      {/* Hairline divider */}
      <div className="-mx-4 mb-3 h-px bg-gray-100" />

      {/* Tier stack */}
      <div className="space-y-1.5">
        {renderOrder.map((tier) => {
          const threshold = getThreshold(tier);
          const isCurrent = tier === currentTier;
          const isNextTier = tier === nextTier;
          const isAchieved =
            ALL_TIERS.indexOf(tier) < ALL_TIERS.indexOf(currentTier);

          let statusContent: React.ReactNode;
          if (isCurrent) {
            statusContent = (
              <div
                className="flex items-center gap-1.5 text-xs font-bold"
                style={{ color: TIER_COLORS[tier].ring }}
              >
                <CircleDot className="h-3.5 w-3.5" />
                <span>Current</span>
              </div>
            );
          } else if (isAchieved) {
            statusContent = (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#10B981]">
                <Check className="h-3.5 w-3.5" />
                <span>Achieved</span>
              </div>
            );
          } else if (isNextTier) {
            statusContent = (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
                <Lock className="h-3.5 w-3.5 text-gray-500" />
                <span>${threshold - earned} to go</span>
              </div>
            );
          } else {
            statusContent = (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400">
                <Lock className="h-3.5 w-3.5" />
                <span>Locked</span>
              </div>
            );
          }

          return (
            <div
              key={tier}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2.5 py-2 transition-colors",
                isCurrent ? "border-2" : "border border-gray-200"
              )}
              style={
                isCurrent
                  ? {
                      backgroundColor: TIER_COLORS[tier].soft,
                      borderColor: TIER_COLORS[tier].bg,
                    }
                  : { backgroundColor: "#FFFFFF" }
              }
            >
              <TierBadge tier={tier} size="sm" />
              <div className="flex-1">
                <p
                  className={cn(
                    "text-sm leading-tight text-gray-900",
                    isCurrent ? "font-bold" : "font-semibold"
                  )}
                >
                  {TIER_COLORS[tier].label}
                </p>
                <p className="text-[11px] leading-tight text-gray-500">${threshold}+</p>
              </div>
              <div>{statusContent}</div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// -----------------------------------------------------------------------------
// EXPORT — picks active variant from context
// -----------------------------------------------------------------------------

export function TierProgressSection() {
  const { variants, isLoaded } = useVariants();

  if (!isLoaded) return null;

  if (variants.tierProgress === "tier-stack") {
    return <TierStackSection />;
  }
  return <TierLinearSection />;
}
