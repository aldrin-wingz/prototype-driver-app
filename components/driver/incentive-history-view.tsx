"use client";

// App-I-6 (Resume Wave, 2026-05-12) — Per-incentive history view.
//
// Top: header card (title + bonus + status badge + date range).
// Middle: tab strip "Counted | Missed Out (N)".
// Body: Counted list (simple v3-style row) OR Missed Out list
//       (disqualified-trip unique UI: desaturated card + amber
//       "Disqualified" badge + reason line + appeal-state UI).
//
// Tap on a Missed Out row opens the dispute form (App-I-7 stub for now
// — surfaces a placeholder until App-I-7 ships).
//
// Reads `disqualifications` + `appeals` collections via the
// `useDisqualificationsState` hook (seed-or-localStorage; persists
// future App-I-7 writes).

import * as React from "react";
import { AlertTriangle, CalendarRange, CheckCircle2, Clock, MessageCircleWarning } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  buildCountedTripRows,
  buildMissedOutRows,
  CURRENT_DRIVER_ID,
  useDisqualificationsState,
} from "@/lib/data/disqualification-helpers";
import type {
  CountedTripRow,
  MissedOutTripRow,
} from "@/lib/data/disqualification-helpers";
import {
  formatRollingWindow,
} from "@/lib/data/incentive-utils";
import type { IncentiveDefinition } from "@/lib/data/incentives";

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  upcoming: "Upcoming",
  ended: "Ended",
};

function deriveStatus(startDateIso: string, endDateIso: string, now = new Date()): "active" | "upcoming" | "ended" {
  const start = new Date(startDateIso).getTime();
  const end = new Date(endDateIso).getTime();
  const t = now.getTime();
  if (t < start) return "upcoming";
  if (t > end) return "ended";
  return "active";
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

interface IncentiveHistoryViewProps {
  incentive: IncentiveDefinition;
}

export function IncentiveHistoryView({ incentive }: IncentiveHistoryViewProps) {
  const {
    isHydrated,
    disqualifications,
    appeals,
  } = useDisqualificationsState();

  const [activeTab, setActiveTab] = React.useState<"counted" | "missed-out">(
    "counted",
  );

  const status = deriveStatus(incentive.startDate, incentive.endDate);

  // Mode-aware rolling-window chip in the header.
  const rollingWindow = formatRollingWindow(
    incentive.goal,
    incentive.startDate,
    incentive.endDate,
  );

  const countedRows: CountedTripRow[] = React.useMemo(
    () =>
      buildCountedTripRows({
        incentiveType: incentive.type,
        incentiveId: incentive.id,
        driverId: CURRENT_DRIVER_ID,
        bonusAmount: incentive.bonusAmount,
        goalCount: incentive.goal.count,
        disqualifications,
        appeals,
      }),
    [incentive, disqualifications, appeals],
  );

  const missedOutRows: MissedOutTripRow[] = React.useMemo(
    () =>
      buildMissedOutRows({
        driverId: CURRENT_DRIVER_ID,
        incentiveId: incentive.id,
        disqualifications,
        appeals,
      }),
    [incentive.id, disqualifications, appeals],
  );

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      {/* Header card */}
      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <Badge
                variant="outline"
                className="text-xs font-medium"
                style={{
                  backgroundColor: `${incentive.color}1a`,
                  color: incentive.color,
                  borderColor: `${incentive.color}40`,
                }}
              >
                {incentive.title}
              </Badge>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-medium",
                  status === "active" && "bg-emerald-100 text-emerald-800",
                  status === "upcoming" && "bg-blue-100 text-blue-800",
                  status === "ended" && "bg-gray-200 text-gray-700",
                )}
              >
                {STATUS_LABEL[status]}
              </span>
            </div>
            <p className="text-sm text-gray-600">{incentive.description}</p>
            <div className="mt-2 text-xs text-gray-500">
              {formatShortDate(incentive.startDate)} – {formatShortDate(incentive.endDate)}
            </div>
            {rollingWindow ? (
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-[#10B981]/30 bg-[#10B981]/5 px-2 py-1 text-xs font-medium text-[#10B981]">
                <CalendarRange className="h-3.5 w-3.5" aria-hidden="true" />
                <span>
                  Window: {rollingWindow.fromLabel} – {rollingWindow.toLabel}
                </span>
              </div>
            ) : null}
          </div>
          <div className="flex flex-col items-end">
            <span className="text-2xl font-bold text-gray-900">
              ${incentive.bonusAmount}
            </span>
            <span className="text-xs text-gray-500">bonus</span>
          </div>
        </div>
      </div>

      {/* Tab strip */}
      <div
        role="tablist"
        aria-label="Incentive history tabs"
        className="flex items-center gap-2 border-b border-gray-200"
      >
        <TabButton
          active={activeTab === "counted"}
          onClick={() => setActiveTab("counted")}
          label="Counted"
          count={countedRows.length}
        />
        <TabButton
          active={activeTab === "missed-out"}
          onClick={() => setActiveTab("missed-out")}
          label="Missed Out"
          count={missedOutRows.length}
          variant="warning"
        />
      </div>

      {/* Body */}
      {!isHydrated ? (
        <div className="text-center text-sm text-gray-400 py-8">Loading…</div>
      ) : activeTab === "counted" ? (
        <CountedList rows={countedRows} />
      ) : (
        <MissedOutList rows={missedOutRows} />
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Tab button
// -----------------------------------------------------------------------------

function TabButton({
  active,
  onClick,
  label,
  count,
  variant = "default",
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  variant?: "default" | "warning";
}) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "relative flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors",
        active ? "text-[#10B981]" : "text-gray-600 hover:text-gray-900",
      )}
    >
      <span>{label}</span>
      <span
        className={cn(
          "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold",
          variant === "warning" && count > 0
            ? "bg-amber-100 text-amber-800"
            : "bg-gray-100 text-gray-700",
        )}
      >
        {count}
      </span>
      {active && (
        <span
          aria-hidden="true"
          className="absolute inset-x-0 -bottom-px h-0.5 bg-[#10B981]"
        />
      )}
    </button>
  );
}

// -----------------------------------------------------------------------------
// Counted tab — simple v3-style list
// -----------------------------------------------------------------------------

function CountedList({ rows }: { rows: CountedTripRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 bg-white p-8 text-center">
        <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-gray-300" aria-hidden="true" />
        <p className="text-sm text-gray-500">No counted trips yet for this incentive.</p>
      </div>
    );
  }
  return (
    <ul className="space-y-2">
      {rows.map((row) => (
        <li
          key={row.tripId}
          className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                <span>{row.date}</span>
                {row.pickupTime ? (
                  <span className="text-xs font-normal text-gray-500">
                    · {row.pickupTime}
                  </span>
                ) : null}
                {row.restoredFromAppeal ? (
                  <Badge
                    variant="outline"
                    className="border-emerald-300 bg-emerald-50 text-xs font-medium text-emerald-700"
                  >
                    Restored
                  </Badge>
                ) : null}
              </div>
              <p className="mt-1 truncate text-xs text-gray-600">
                {row.pickup} → {row.dropoff}
              </p>
            </div>
            <div className="text-right">
              <span className="text-sm font-semibold text-[#10B981]">
                +${row.bonusContribution}
              </span>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

// -----------------------------------------------------------------------------
// Missed Out tab — disqualified-trip unique UI (W3-A2)
// -----------------------------------------------------------------------------

function MissedOutList({ rows }: { rows: MissedOutTripRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 bg-white p-8 text-center">
        <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-emerald-400" aria-hidden="true" />
        <p className="text-sm text-gray-500">No disqualified trips. Keep it up!</p>
      </div>
    );
  }
  return (
    <ul className="space-y-2">
      {rows.map((row) => (
        <MissedOutCard key={row.disqualificationId} row={row} />
      ))}
    </ul>
  );
}

function MissedOutCard({ row }: { row: MissedOutTripRow }) {
  const [expanded, setExpanded] = React.useState(false);

  const handleTap = () => {
    // Pending / denied appeals: tap expands the inline detail. No-appeal:
    // tap will open the dispute form (App-I-7); for App-I-6 we surface a
    // stub alert so the affordance is visible without the App-I-7 sheet.
    if (row.appealState === "no-appeal") {
      // TODO(App-I-7): replace alert with `<DisputeAppealSheet>` open.
      // The sheet pre-fills disqualification context + driverText form
      // and calls `createAppeal(...)` on submit (see useDisqualificationsState).
      alert(
        `Dispute coming soon (App-I-7).\n\n${row.reason}\n\nThis trip can be appealed once the dispute form ships.`,
      );
      return;
    }
    setExpanded((prev) => !prev);
  };

  return (
    <li>
      <button
        type="button"
        onClick={handleTap}
        className={cn(
          "block w-full rounded-lg border bg-gray-50 p-3 text-left shadow-sm transition-all hover:bg-gray-100 active:scale-[0.99]",
          "border-amber-200",
        )}
        aria-expanded={row.appealState !== "no-appeal" ? expanded : undefined}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="border-amber-300 bg-amber-100 text-xs font-medium text-amber-800"
              >
                <AlertTriangle className="mr-1 h-3 w-3" aria-hidden="true" />
                Disqualified · {row.reasonLabel}
              </Badge>
              {row.appealState === "pending" && (
                <Badge
                  variant="outline"
                  className="border-blue-300 bg-blue-100 text-xs font-medium text-blue-800"
                >
                  <Clock className="mr-1 h-3 w-3" aria-hidden="true" />
                  Appeal under review
                </Badge>
              )}
              {row.appealState === "denied" && (
                <Badge
                  variant="outline"
                  className="border-red-300 bg-red-100 text-xs font-medium text-red-800"
                >
                  <MessageCircleWarning className="mr-1 h-3 w-3" aria-hidden="true" />
                  Appeal denied
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
              <span>{row.date}</span>
              {row.pickupTime ? (
                <span className="text-xs font-normal text-gray-500">
                  · {row.pickupTime}
                </span>
              ) : null}
            </div>
            <p className="mt-1 truncate text-xs text-gray-600">
              {row.pickup} → {row.dropoff}
            </p>
            <p className="mt-2 text-xs text-amber-800">{row.reason}</p>

            {/* Expanded detail (pending / denied) */}
            {expanded && row.driverText && (
              <div className="mt-3 rounded-md border border-gray-200 bg-white p-3">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  Your appeal
                </p>
                <p className="text-xs text-gray-700">{row.driverText}</p>
              </div>
            )}
            {expanded && row.appealState === "denied" && row.managerReason && (
              <div className="mt-2 rounded-md border border-red-200 bg-red-50 p-3">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-red-700">
                  Manager response
                </p>
                <p className="text-xs text-red-800">{row.managerReason}</p>
              </div>
            )}
            {row.appealState === "no-appeal" && (
              <p className="mt-2 text-xs font-medium text-[#10B981]">
                Tap to dispute
              </p>
            )}
          </div>
        </div>
      </button>
    </li>
  );
}
