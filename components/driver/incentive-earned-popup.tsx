"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { TierBadge, TIER_COLORS, type Tier } from "@/components/driver/tier-badge";
import { useIncentiveEarned } from "@/lib/incentive-earned-context";
import {
  getIncentiveProgressInfo,
  INCENTIVE_PILL_COLORS,
} from "@/lib/data/incentive-utils";
import { incentiveDefinitions, type IncentiveType, type IncentiveTierLevel } from "@/lib/data/incentives";

// Map incentive tier levels to TierBadge tier types (no platinum incentives)
function toBadgeTier(tierLevel: IncentiveTierLevel): Tier {
  return tierLevel as Tier;
}

// Tier thresholds for "X to next tier" line — month-to-date bonus totals
const TIER_THRESHOLDS: Record<Tier, number> = {
  bronze: 0,
  silver: 75,
  gold: 150,
  platinum: 300,
};

const NEXT_TIER: Record<Tier, Tier | null> = {
  bronze: "silver",
  silver: "gold",
  gold: "platinum",
  platinum: null,
};

// Mock baseline bonus earned month-to-date (before this incentive completes)
const MOCK_BASELINE_BONUSES_EARNED = 80;

/**
 * Celebratory popup shown when a driver earns an incentive bonus.
 *
 * Triggered manually via the IncentiveEarnedContext (no real "trip completed"
 * wiring — this is a stakeholder-review mockup).
 */
export function IncentiveEarnedPopup() {
  const { activeIncentive, dismiss } = useIncentiveEarned();
  const router = useRouter();
  const [confettiOn, setConfettiOn] = useState(false);

  // Restart confetti each time the popup opens for a new incentive
  useEffect(() => {
    if (activeIncentive) {
      setConfettiOn(true);
      const timer = setTimeout(() => setConfettiOn(false), 2200);
      return () => clearTimeout(timer);
    }
  }, [activeIncentive]);

  const { definition, progress, badgeTier, pillColors, newTotal, nextTierLabel, amountToNextTier, progressPct } = useMemo(() => {
    if (!activeIncentive) {
      return {
        definition: null,
        progress: null,
        badgeTier: "bronze" as Tier,
        pillColors: null,
        newTotal: 0,
        nextTierLabel: null as string | null,
        amountToNextTier: 0,
        progressPct: 0,
      };
    }

    const def = incentiveDefinitions.find((d) => d.type === activeIncentive) ?? null;
    const prog = getIncentiveProgressInfo(activeIncentive);
    const tier = def ? toBadgeTier(def.tierLevel) : ("bronze" as Tier);
    const colors = INCENTIVE_PILL_COLORS[activeIncentive];

    const bonus = def?.bonusAmount ?? 0;
    const total = MOCK_BASELINE_BONUSES_EARNED + bonus;

    // Find which tier-threshold the new total reaches and the next one
    const thresholdEntries = (Object.keys(TIER_THRESHOLDS) as Tier[]).filter((t) => t !== "platinum");
    let currentTier: Tier = "bronze";
    for (const t of thresholdEntries) {
      if (total >= TIER_THRESHOLDS[t]) currentTier = t;
    }
    const nextT = NEXT_TIER[currentTier];
    const nextLabel = nextT ? TIER_COLORS[nextT].label : null;
    const remaining = nextT ? Math.max(0, TIER_THRESHOLDS[nextT] - total) : 0;
    const pct = nextT
      ? Math.min(
          100,
          Math.round(
            ((total - TIER_THRESHOLDS[currentTier]) /
              Math.max(1, TIER_THRESHOLDS[nextT] - TIER_THRESHOLDS[currentTier])) *
              100
          )
        )
      : 100;

    return {
      definition: def,
      progress: prog,
      badgeTier: tier,
      pillColors: colors,
      newTotal: total,
      nextTierLabel: nextLabel,
      amountToNextTier: remaining,
      progressPct: pct,
    };
  }, [activeIncentive]);

  if (!activeIncentive || !definition) {
    return null;
  }

  const tierColor = TIER_COLORS[badgeTier];

  const handleViewIncentives = () => {
    dismiss();
    router.push("/incentives");
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="incentive-earned-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
    >
      {/* Dark backdrop — tap-to-dismiss */}
      <button
        type="button"
        aria-label="Dismiss celebration"
        onClick={dismiss}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
      />

      {/* Confetti layer (decorative, non-interactive) */}
      {confettiOn && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <Confetti tierHex={tierColor.bg} />
        </div>
      )}

      {/* Modal card */}
      <div
        className={cn(
          "relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl",
          "animate-in fade-in zoom-in-95 duration-300"
        )}
      >
        {/* Tier-colored ring + badge */}
        <div className="flex justify-center">
          <div
            className="flex h-20 w-20 items-center justify-center rounded-full"
            style={{
              backgroundColor: `${tierColor.bg}20`,
              boxShadow: `0 0 0 4px ${tierColor.bg}`,
            }}
          >
            <TierBadge tier={badgeTier} size="lg" />
          </div>
        </div>

        {/* Headline */}
        <h2
          id="incentive-earned-title"
          className="mt-4 text-center text-2xl font-bold tracking-tight text-gray-900"
        >
          Incentive Earned!
        </h2>

        {/* Incentive name pill */}
        <div className="mt-3 flex justify-center">
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold",
              pillColors?.bg,
              pillColors?.text,
              pillColors?.border
            )}
          >
            {definition.name}
          </span>
        </div>

        {/* Big dollar amount */}
        <p className="mt-4 text-center text-5xl font-bold text-[#10B981]">
          +${definition.bonusAmount}
        </p>

        {/* Sub-line */}
        <p className="mt-1 text-center text-sm text-gray-500">
          Added to your May 2026 earnings
        </p>

        {/* Mini tier progress */}
        <div className="mt-6 rounded-xl bg-gray-50 p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Bonus earnings this month
            </span>
            <span className="text-lg font-bold text-gray-900">${newTotal}</span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${progressPct}%`,
                backgroundColor: tierColor.bg,
              }}
            />
          </div>
          {nextTierLabel && amountToNextTier > 0 ? (
            <p className="mt-2 text-xs text-gray-600">
              You&apos;re now at{" "}
              <span className="font-semibold text-gray-900">${newTotal}</span>
              {" — "}
              <span className="font-semibold" style={{ color: tierColor.bg }}>
                ${amountToNextTier} to {nextTierLabel}
              </span>
            </p>
          ) : (
            <p className="mt-2 text-xs text-gray-600">
              You&apos;ve reached the top tier this month!
            </p>
          )}
        </div>

        {/* CTAs */}
        <div className="mt-6 space-y-2">
          <Button
            onClick={handleViewIncentives}
            className="h-12 w-full rounded-full bg-[#10B981] text-base font-semibold text-white shadow-sm hover:bg-[#0EA371]"
          >
            View Incentives
          </Button>
          <button
            type="button"
            onClick={dismiss}
            className="block w-full text-center text-sm font-medium text-gray-500 hover:text-gray-700"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Confetti — pure CSS, ~20 particles falling + drifting for ~2 seconds.
// -----------------------------------------------------------------------------
function Confetti({ tierHex }: { tierHex: string }) {
  const PARTICLE_COUNT = 24;
  // Wingz green + tier color alternated
  const colors = ["#10B981", tierHex, "#10B981", tierHex, "#34D399"];

  // Stable random distribution computed once per render
  const particles = useMemo(
    () =>
      Array.from({ length: PARTICLE_COUNT }).map((_, i) => ({
        id: i,
        leftPct: Math.random() * 100,
        delay: Math.random() * 600,
        duration: 1500 + Math.random() * 800,
        rotate: Math.floor(Math.random() * 360),
        color: colors[i % colors.length],
        sizePx: 6 + Math.floor(Math.random() * 6),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tierHex]
  );

  return (
    <>
      <style>{`
        @keyframes confetti-fall {
          0% {
            transform: translate3d(0, -10vh, 0) rotate(0deg);
            opacity: 1;
          }
          80% {
            opacity: 1;
          }
          100% {
            transform: translate3d(var(--drift, 0), 110vh, 0) rotate(720deg);
            opacity: 0;
          }
        }
      `}</style>
      {particles.map((p) => (
        <span
          key={p.id}
          aria-hidden="true"
          className="absolute top-0 block rounded-sm"
          style={{
            left: `${p.leftPct}%`,
            width: `${p.sizePx}px`,
            height: `${p.sizePx * 0.4}px`,
            backgroundColor: p.color,
            animation: `confetti-fall ${p.duration}ms cubic-bezier(0.2, 0.6, 0.6, 1) ${p.delay}ms forwards`,
            transform: `rotate(${p.rotate}deg)`,
            // Random horizontal drift
            ["--drift" as string]: `${(Math.random() - 0.5) * 40}vw`,
          }}
        />
      ))}
    </>
  );
}
