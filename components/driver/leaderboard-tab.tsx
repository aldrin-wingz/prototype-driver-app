"use client";

import { Card } from "@/components/ui/card";
import { useVariants } from "@/lib/variants-context";
import { cn } from "@/lib/utils";
import { TierBadge, TIER_COLORS } from "./tier-badge";
import { leaderboardEntries, type LeaderboardEntry } from "@/lib/data/incentives";

// -----------------------------------------------------------------------------
// Shared row component
// -----------------------------------------------------------------------------

function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
  const isYou = entry.isCurrentDriver;
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
        isYou ? "bg-[#10B981]/10 ring-1 ring-[#10B981]/30" : "bg-white"
      )}
    >
      <span
        className={cn(
          "w-6 text-sm font-semibold tabular-nums",
          isYou ? "text-[#10B981]" : "text-gray-500"
        )}
      >
        {entry.rank}
      </span>
      <TierBadge tier={entry.tier} size="sm" />
      <span
        className={cn(
          "flex-1 text-sm",
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
        <div className="space-y-1">
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

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={cn(
          "flex w-full flex-col items-center justify-end gap-2 rounded-t-lg px-2 pb-3 pt-3 shadow-sm",
          isYou ? "ring-2 ring-[#10B981]" : ""
        )}
        style={{
          backgroundColor: isYou ? "rgba(16, 185, 129, 0.1)" : "#FFFFFF",
          border: "1px solid #E5E7EB",
          height,
        }}
      >
        {/* Position number */}
        <div
          className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white"
          style={{ backgroundColor: positionColor }}
        >
          {position}
        </div>

        {/* Tier badge */}
        <TierBadge tier={entry.tier} size="md" />

        {/* Handle */}
        <p
          className={cn(
            "truncate text-center text-xs",
            isYou ? "font-bold text-gray-900" : "font-semibold text-gray-700"
          )}
          style={{ maxWidth: "100%" }}
        >
          {isYou ? "YOU" : entry.handle}
        </p>

        {/* $ value */}
        <p
          className={cn(
            "text-sm font-bold tabular-nums",
            isYou ? "text-[#10B981]" : "text-gray-900"
          )}
        >
          ${entry.bonusesEarnedThisMonth}
        </p>
      </div>
    </div>
  );
}

function LeaderboardPodiumVariant() {
  const top3 = leaderboardEntries.slice(0, 3);
  const rest = leaderboardEntries.slice(3);

  // Reorder for podium display: 2nd | 1st | 3rd
  const podiumLayout = [
    { entry: top3[1], position: 2 as const, height: "144px" },
    { entry: top3[0], position: 1 as const, height: "176px" },
    { entry: top3[2], position: 3 as const, height: "128px" },
  ];

  return (
    <div className="px-4 py-6">
      <p className="mb-4 text-xs font-medium uppercase tracking-wide text-gray-500">
        This month — May 2026
      </p>

      {/* Podium */}
      <div className="mb-6 grid grid-cols-3 items-end gap-2">
        {podiumLayout.map(({ entry, position, height }) => (
          <PodiumColumn
            key={entry.rank}
            entry={entry}
            position={position}
            height={height}
          />
        ))}
      </div>

      {/* Ranks 4+ */}
      <div className="mb-2 flex items-center gap-3">
        <div className="h-px flex-1 bg-gray-200" />
        <span className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
          Ranks 4+
        </span>
        <div className="h-px flex-1 bg-gray-200" />
      </div>

      <Card className="border-gray-200 bg-white p-2 shadow-sm">
        <div className="space-y-1">
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
