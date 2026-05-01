"use client";

import { Card } from "@/components/ui/card";
import { useVariants } from "@/lib/variants-context";
import { cn } from "@/lib/utils";
import { TierBadge, TIER_COLORS } from "./tier-badge";
import { leaderboardEntries, type LeaderboardEntry } from "@/lib/data/incentives";

// -----------------------------------------------------------------------------
// Shared row component (compressed for ~44px row height)
// -----------------------------------------------------------------------------

function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
  const isYou = entry.isCurrentDriver;
  return (
    <div
      className={cn(
        "flex items-center rounded-lg px-3 py-1.5 transition-colors",
        isYou ? "bg-[#10B981]/10 ring-1 ring-[#10B981]/30" : "bg-white"
      )}
    >
      {/* Rank + tier badge as a tight cluster */}
      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            "w-5 text-right text-sm font-semibold tabular-nums",
            isYou ? "text-[#10B981]" : "text-gray-500"
          )}
        >
          {entry.rank}
        </span>
        <TierBadge tier={entry.tier} size="sm" />
      </div>
      <span
        className={cn(
          "ml-3 flex-1 text-sm",
          isYou ? "font-bold text-gray-900" : "font-medium text-gray-700"
        )}
      >
        {isYou ? "YOU" : entry.handle}
      </span>
      <span
        className={cn(
          "text-sm font-semibold tabular-nums",
          isYou ? "text-[#10B981]" : "text-gray-900"
        )}
      >
        ${entry.bonusesEarnedThisMonth}
      </span>
    </div>
  );
}

// -----------------------------------------------------------------------------
// VARIANT A: leaderboard-list — Flat 10-row ranked list
// -----------------------------------------------------------------------------

function LeaderboardListVariant() {
  return (
    <div className="px-4 py-6">
      <p className="mb-4 text-xs font-medium uppercase tracking-wide text-gray-500">
        This month — May 2026
      </p>

      <Card className="border-gray-200 bg-white p-2 shadow-sm">
        <div className="space-y-0.5">
          {leaderboardEntries.map((entry) => (
            <LeaderboardRow key={entry.rank} entry={entry} />
          ))}
        </div>
      </Card>

      <p className="mt-4 text-center text-[11px] text-gray-500">
        Names anonymized for privacy.
      </p>
    </div>
  );
}

// -----------------------------------------------------------------------------
// VARIANT B: leaderboard-podium — Top 3 podium + ranks 4+ as list
// -----------------------------------------------------------------------------

function PodiumColumn({
  entry,
  height,
  position,
}: {
  entry: LeaderboardEntry;
  height: string;
  position: 1 | 2 | 3;
}) {
  const isYou = entry.isCurrentDriver;
  const positionColor =
    position === 1 ? "#EAB308" : position === 2 ? "#94A3B8" : "#B45309";
  const isFirst = position === 1;

  // Subtle gold tint on 1st card (Polish 1: 1st-place visual prominence)
  const cardBg = isYou
    ? "rgba(16, 185, 129, 0.1)"
    : isFirst
    ? "#FEF9C3" // gold-50 wash
    : "#FFFFFF";

  return (
    <div
      className={cn(
        "flex w-full flex-col items-center justify-end gap-1.5 rounded-t-lg px-1.5 pb-2.5 pt-3 shadow-sm",
        isYou ? "ring-2 ring-[#10B981]" : ""
      )}
      style={{
        backgroundColor: cardBg,
        border: "1px solid #E5E7EB",
        // 2px gold top border emphasizes the winner without overpowering
        borderTop: isFirst ? `2px solid ${TIER_COLORS.gold.bg}` : undefined,
        height,
      }}
    >
      {/* Tier badge with rank number overlaid as corner badge (single visual element) */}
      <div className="relative">
        <TierBadge tier={entry.tier} size={isFirst ? "md" : "sm"} />
        <div
          className="absolute -bottom-1 -right-1 flex items-center justify-center rounded-full text-[10px] font-bold leading-none text-white"
          style={{
            backgroundColor: positionColor,
            border: "1.5px solid #FFFFFF",
            height: isFirst ? "18px" : "16px",
            width: isFirst ? "18px" : "16px",
          }}
        >
          {position}
        </div>
      </div>

      {/* Handle — no truncation, smaller font, allow wrap if needed */}
      <p
        className={cn(
          "text-center text-[11px] leading-tight",
          isYou ? "font-bold text-gray-900" : "font-semibold text-gray-700"
        )}
      >
        {isYou ? "YOU" : entry.handle}
      </p>

      {/* $ value */}
      <p
        className={cn(
          "tabular-nums",
          isFirst ? "text-base font-bold" : "text-sm font-bold",
          isYou ? "text-[#10B981]" : "text-gray-900"
        )}
      >
        ${entry.bonusesEarnedThisMonth}
      </p>
    </div>
  );
}

function LeaderboardPodiumVariant() {
  const top3 = leaderboardEntries.slice(0, 3);
  const rest = leaderboardEntries.slice(3);

  // Reorder for podium display: 2nd | 1st | 3rd.
  // 1st bumped to ~140px; 2nd and 3rd held at ~96px for stronger 1st-place contrast.
  const podiumLayout = [
    { entry: top3[1], position: 2 as const, height: "96px" },
    { entry: top3[0], position: 1 as const, height: "140px" },
    { entry: top3[2], position: 3 as const, height: "96px" },
  ];

  return (
    <div className="px-4 py-6">
      <p className="mb-4 text-xs font-medium uppercase tracking-wide text-gray-500">
        This month — May 2026
      </p>

      {/* Podium */}
      <div className="mb-5 grid grid-cols-3 items-end gap-2">
        {podiumLayout.map(({ entry, position, height }) => (
          <PodiumColumn
            key={entry.rank}
            entry={entry}
            position={position}
            height={height}
          />
        ))}
      </div>

      {/* Lighter "Ranks 4+" divider — thinner rule + smaller, more muted label */}
      <div className="mb-2 flex items-center gap-2">
        <div className="h-px flex-1 bg-gray-100" />
        <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
          Ranks 4+
        </span>
        <div className="h-px flex-1 bg-gray-100" />
      </div>

      <Card className="border-gray-200 bg-white p-2 shadow-sm">
        <div className="space-y-0.5">
          {rest.map((entry) => (
            <LeaderboardRow key={entry.rank} entry={entry} />
          ))}
        </div>
      </Card>

      <p className="mt-4 text-center text-[11px] text-gray-500">
        Names anonymized for privacy.
      </p>
    </div>
  );
}

// -----------------------------------------------------------------------------
// EXPORT — picks active variant from context
// -----------------------------------------------------------------------------

export function LeaderboardTab() {
  const { variants, isLoaded } = useVariants();

  if (!isLoaded) return null;

  if (variants.leaderboard === "leaderboard-podium") {
    return <LeaderboardPodiumVariant />;
  }
  return <LeaderboardListVariant />;
}
