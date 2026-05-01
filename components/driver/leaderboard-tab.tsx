"use client";

import { Card } from "@/components/ui/card";
import { useVariants } from "@/lib/variants-context";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Pencil, Check, X } from "lucide-react";
import { TierBadge, TIER_COLORS } from "./tier-badge";
import {
  leaderboardEntries,
  currentDriver,
  type LeaderboardEntry,
} from "@/lib/data/incentives";

// -----------------------------------------------------------------------------
// YourPlacementCard — Always-visible sticky card at the top of the Leaderboard tab
// With editable username (local state only, mock-only)
// -------

function YourPlacementCard() {
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [editedUsername, setEditedUsername] = useState(currentDriver.username);
  const [displayUsername, setDisplayUsername] = useState(currentDriver.username);

  const handleSaveUsername = () => {
    setDisplayUsername(editedUsername);
    setIsEditingUsername(false);
  };

  const handleCancelUsername = () => {
    setEditedUsername(displayUsername);
    setIsEditingUsername(false);
  };

  return (
    <Card className="border-[#10B981]/30 bg-[#10B981]/5 p-3 shadow-sm">
      <p className="mb-0.5 text-[11px] font-medium uppercase tracking-wide text-gray-500">
        Your placement
      </p>
      
      {/* Username row with edit icon */}
      <div className="mb-1.5 flex items-center gap-1">
        {isEditingUsername ? (
          <>
            <input
              type="text"
              value={editedUsername}
              onChange={(e) => setEditedUsername(e.target.value)}
              autoFocus
              className="h-6 flex-1 rounded border border-[#10B981] px-2 text-sm font-medium text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#10B981]"
            />
            <button
              onClick={handleSaveUsername}
              className="flex h-6 w-6 items-center justify-center rounded text-[#10B981] hover:bg-[#10B981]/10"
              aria-label="Save username"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              onClick={handleCancelUsername}
              className="flex h-6 w-6 items-center justify-center rounded text-gray-500 hover:bg-gray-100"
              aria-label="Cancel edit"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        ) : (
          <>
            <span className="text-sm font-semibold text-gray-900">
              {displayUsername}
            </span>
            <button
              onClick={() => setIsEditingUsername(true)}
              className="ml-1 flex h-5 w-5 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label="Edit username"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>

      {/* Rank + $ row */}
      <p className="mb-1.5 flex items-baseline gap-2 text-lg font-bold text-gray-900">
        <span className="tabular-nums">
          #{currentDriver.currentRank} of {currentDriver.totalDrivers}
        </span>
        <span className="text-gray-400">·</span>
        <span className="text-[#10B981] tabular-nums">
          ${currentDriver.totalBonusesEarnedThisMonth}
        </span>
      </p>

      {/* Tier + county row */}
      <div className="flex items-center gap-2">
        <TierBadge tier={currentDriver.currentTier} size="sm" />
        <span className="text-xs font-semibold text-gray-900">
          {TIER_COLORS[currentDriver.currentTier].label}
        </span>
        <span className="text-gray-400">·</span>
        <span className="text-xs text-gray-600">{currentDriver.county}</span>
      </div>
    </Card>
  );
}

// -----------------------------------------------------------------------------
// Shared row component (for ranks 1-3 and 4-20)
// -----------------------------------------------------------------------------

function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
  return (
    <div className="flex items-center rounded-lg bg-white px-2.5 py-1.5 transition-colors">
      {/* Rank + tier badge cluster */}
      <div className="flex items-center gap-1.5">
        <span className="w-5 text-right text-sm font-semibold tabular-nums text-gray-500">
          {entry.rank}
        </span>
        <TierBadge tier={entry.tier} size="sm" />
      </div>
      {/* Handle + county subtitle */}
      <div className="ml-2.5 flex-1 min-w-0">
        <p className="text-sm font-medium leading-tight text-gray-700 truncate">
          {entry.handle}
        </p>
        <p className="text-[10px] leading-tight text-gray-500 truncate">{entry.county}</p>
      </div>
      <span className="text-sm font-semibold tabular-nums text-gray-900">
        ${entry.bonusesEarnedThisMonth}
      </span>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Podium column (for podium variant)
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
  const isFirst = position === 1;

  // Subtle gold tint on 1st card
  const cardBg = isFirst ? "#FEF9C3" : "#FFFFFF";

  return (
    <div
      className="flex w-full flex-col items-center justify-end gap-1 rounded-t-lg px-1.5 pb-2 pt-2.5 shadow-sm"
      style={{
        backgroundColor: cardBg,
        border: "1px solid #E5E7EB",
        borderTop: isFirst ? `2px solid ${TIER_COLORS.gold.bg}` : undefined,
        height,
      }}
    >
      {/* Tier badge — no standalone rank number circle (position implies rank) */}
      <TierBadge tier={entry.tier} size={isFirst ? "md" : "sm"} />

      {/* Handle — wraps if needed; never truncated */}
      <p className="text-center text-[10px] font-semibold leading-tight text-gray-700 break-words">
        {entry.handle}
      </p>

      {/* County subtitle */}
      <p className="text-center text-[9px] leading-tight text-gray-500 truncate w-full">
        {entry.county}
      </p>

      {/* $ value */}
      <p
        className={cn(
          "tabular-nums",
          isFirst ? "text-base font-bold" : "text-sm font-bold",
          "text-gray-900"
        )}
      >
        ${entry.bonusesEarnedThisMonth}
      </p>
    </div>
  );
}

// -----------------------------------------------------------------------------
// VARIANT A: leaderboard-list — Sticky header + YourPlacement + ranks 1-3 + scrollable 4-20
// -----------------------------------------------------------------------------

function LeaderboardListVariant() {
  const top3 = leaderboardEntries.slice(0, 3);
  const rest = leaderboardEntries.slice(3);

  return (
    <div className="flex h-full flex-col">
      {/* Sticky region: header + YourPlacement + Top 3 */}
      <div className="shrink-0 space-y-3 px-4 pb-3 pt-4">
        <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
          This month — May 2026
        </p>

        <YourPlacementCard />

        {/* Top 3 */}
        <Card className="border-gray-200 bg-white p-1.5 shadow-sm">
          <div className="space-y-0.5">
            {top3.map((entry) => (
              <LeaderboardRow key={entry.rank} entry={entry} />
            ))}
          </div>
        </Card>
      </div>

      {/* Lighter "Ranks 4+" divider */}
      <div className="shrink-0 px-4">
        <div className="flex items-center gap-2 pb-2">
          <div className="h-px flex-1 bg-gray-100" />
          <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
            Ranks 4+
          </span>
          <div className="h-px flex-1 bg-gray-100" />
        </div>
      </div>

      {/* Scrollable region: ranks 4-20 + footer */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <Card className="border-gray-200 bg-white p-1.5 shadow-sm">
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
    </div>
  );
}

// -----------------------------------------------------------------------------
// VARIANT B: leaderboard-podium — Sticky podium + scrollable ranks 4-20
// -----------------------------------------------------------------------------

function LeaderboardPodiumVariant() {
  const top3 = leaderboardEntries.slice(0, 3);
  const rest = leaderboardEntries.slice(3);

  // 2nd | 1st | 3rd
  const podiumLayout = [
    { entry: top3[1], position: 2 as const, height: "104px" },
    { entry: top3[0], position: 1 as const, height: "144px" },
    { entry: top3[2], position: 3 as const, height: "104px" },
  ];

  return (
    <div className="flex h-full flex-col">
      {/* Sticky region: header + YourPlacement + podium */}
      <div className="shrink-0 space-y-3 px-4 pb-3 pt-4">
        <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
          This month — May 2026
        </p>

        <YourPlacementCard />

        {/* Podium */}
        <div className="grid grid-cols-3 items-end gap-2">
          {podiumLayout.map(({ entry, position, height }) => (
            <PodiumColumn
              key={entry.rank}
              entry={entry}
              position={position}
              height={height}
            />
          ))}
        </div>
      </div>

      {/* "Ranks 4+" divider */}
      <div className="shrink-0 px-4">
        <div className="flex items-center gap-2 pb-2">
          <div className="h-px flex-1 bg-gray-100" />
          <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
            Ranks 4+
          </span>
          <div className="h-px flex-1 bg-gray-100" />
        </div>
      </div>

      {/* Scrollable region: ranks 4-20 + footer */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <Card className="border-gray-200 bg-white p-1.5 shadow-sm">
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
