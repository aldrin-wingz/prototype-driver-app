"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { TierBadge, TIER_COLORS, type Tier } from "@/components/driver/tier-badge";
import { useIncentiveEarned, type TierUpTier } from "@/lib/incentive-earned-context";

// Tier thresholds per the prompt spec (Bronze $0 / Silver $50 / Gold $150 / Platinum $300)
const TIER_THRESHOLDS: Record<Tier, number> = {
  bronze: 0,
  silver: 50,
  gold: 150,
  platinum: 300,
};

const NEXT_TIER: Record<Tier, Tier | null> = {
  bronze: "silver",
  silver: "gold",
  gold: "platinum",
  platinum: null,
};

/**
 * Tier Up celebration popup — sibling to IncentiveEarnedPopup.
 *
 * Triggered manually via the IncentiveEarnedContext.showTierUp(tier) — purely
 * a stakeholder-review mockup, never auto-fired by real tier-cross events.
 * Pop-up content uses TierConfig thresholds (Bronze $0 / Silver $50 /
 * Gold $150 / Platinum $300).
 */
export function TierUpPopup() {
  const { activeTierUp, dismiss } = useIncentiveEarned();
  const router = useRouter();
  const [confettiOn, setConfettiOn] = useState(false);

  // Restart confetti on each open — sustained ~2.5s (longer than Incentive Earned)
  useEffect(() => {
    if (activeTierUp) {
      setConfettiOn(true);
      const timer = setTimeout(() => setConfettiOn(false), 2500);
      return () => clearTimeout(timer);
    }
  }, [activeTierUp]);

  const computed = useMemo(() => {
    if (!activeTierUp) return null;
    const newTier: Tier = activeTierUp;
    const threshold = TIER_THRESHOLDS[newTier];
    const next = NEXT_TIER[newTier];
    const nextLabel = next ? TIER_COLORS[next].label : null;
    const remaining = next ? TIER_THRESHOLDS[next] - threshold : 0;
    // Visual: completed segment from previous threshold to current
    const prevTierKey = (Object.keys(TIER_THRESHOLDS) as Tier[]).filter(
      (t) => TIER_THRESHOLDS[t] < threshold
    ).pop();
    const prevThreshold = prevTierKey ? TIER_THRESHOLDS[prevTierKey] : 0;
    return {
      newTier,
      threshold,
      tierLabel: TIER_COLORS[newTier].label,
      nextLabel,
      amountToNext: remaining,
      // Mini progress bar represents progress toward NEXT tier; user just hit
      // the floor of the new tier so we anchor the bar at 0% of next-tier band
      progressPct: 0,
      prevThreshold,
    };
  }, [activeTierUp]);

  if (!activeTierUp || !computed) return null;

  const tierColor = TIER_COLORS[computed.newTier];

  const handleViewIncentives = () => {
    dismiss();
    router.push("/incentives");
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tier-up-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
    >
      {/* Dark backdrop — tap-to-dismiss */}
      <button
        type="button"
        aria-label="Dismiss tier up celebration"
        onClick={dismiss}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
      />

      {/* Confetti layer (decorative, non-interactive) */}
      {confettiOn && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <Confetti tierHex={tierColor.bg} />
        </div>
      )}

      {/* Modal card — slightly slower entrance (~400ms) than Earned popup */}
      <div
        className={cn(
          "relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl",
          "animate-in fade-in zoom-in-95 duration-500"
        )}
      >
        {/* Tier-colored ring + badge — sized larger for the bigger moment */}
        <div className="flex justify-center">
          <div
            className="flex h-24 w-24 items-center justify-center rounded-full"
            style={{
              backgroundColor: `${tierColor.bg}20`,
              boxShadow: `0 0 0 4px ${tierColor.bg}`,
              animation: "tier-up-pop 600ms cubic-bezier(0.34, 1.56, 0.64, 1) both",
            }}
          >
            <TierBadge tier={computed.newTier} size="lg" />
          </div>
        </div>

        {/* Headline */}
        <h2
          id="tier-up-title"
          className="mt-4 text-center text-3xl font-bold tracking-tight text-gray-900"
        >
          Tier Up!
        </h2>

        {/* Sub-headline with new tier name in tier color */}
        <p className="mt-1 text-center text-base font-semibold">
          You&apos;re now in{" "}
          <span style={{ color: tierColor.bg }}>{computed.tierLabel}</span>
        </p>

        {/* Trigger context line */}
        <p className="mt-2 text-center text-sm text-gray-500">
          ${computed.threshold} earned this month — {computed.tierLabel} tier unlocked
        </p>

        {/* Progress to next tier OR top-tier copy */}
        {computed.nextLabel ? (
          <div className="mt-6 rounded-xl bg-gray-50 p-4">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Next milestone
              </span>
              <span className="text-sm font-semibold" style={{ color: tierColor.bg }}>
                ${computed.amountToNext} to {computed.nextLabel}
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${computed.progressPct}%`,
                  backgroundColor: tierColor.bg,
                }}
              />
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-xl bg-gray-50 p-4 text-center">
            <p className="text-sm font-semibold text-gray-900">
              <span aria-hidden="true" className="mr-1">★</span>
              You&apos;ve reached the top tier this month
            </p>
            <p className="mt-1 text-xs text-gray-600">Keep going!</p>
          </div>
        )}

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

      {/* Badge "morph" pop animation keyframes */}
      <style>{`
        @keyframes tier-up-pop {
          0% {
            transform: scale(0.6);
            opacity: 0;
          }
          60% {
            transform: scale(1.08);
            opacity: 1;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Confetti — ~28 particles, sustained ~2.5s, tier color + Wingz green.
// -----------------------------------------------------------------------------
function Confetti({ tierHex }: { tierHex: string }) {
  const PARTICLE_COUNT = 28;
  // Tier color leads, Wingz green accents
  const colors = [tierHex, "#10B981", tierHex, "#34D399", tierHex];

  const particles = useMemo(
    () =>
      Array.from({ length: PARTICLE_COUNT }).map((_, i) => ({
        id: i,
        leftPct: Math.random() * 100,
        delay: Math.random() * 800,
        duration: 1800 + Math.random() * 900,
        rotate: Math.floor(Math.random() * 360),
        color: colors[i % colors.length],
        sizePx: 6 + Math.floor(Math.random() * 7),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tierHex]
  );

  return (
    <>
      <style>{`
        @keyframes tier-up-confetti-fall {
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
            animation: `tier-up-confetti-fall ${p.duration}ms cubic-bezier(0.2, 0.6, 0.6, 1) ${p.delay}ms forwards`,
            transform: `rotate(${p.rotate}deg)`,
            ["--drift" as string]: `${(Math.random() - 0.5) * 50}vw`,
          }}
        />
      ))}
    </>
  );
}
