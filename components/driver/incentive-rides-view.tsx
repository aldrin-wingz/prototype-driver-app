"use client";

// App-MVP-2 (2026-05-14) — Per-incentive Rides view.
// Per-criterion eligibility subsystem stripped: the Eligibility criteria
// block and its accompanying banner + dispute sheet are all gone. The
// view now renders just the header card + Completed rides list (every
// completed trip whose `incentiveTypes` includes this incentive's type).

import * as React from "react";
import { CheckCircle2, Hourglass } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  formatEndsIn,
  getIncentiveProgressInfo,
} from "@/lib/data/incentive-utils";
import {
  seedTrips,
  type IncentiveDefinition,
} from "@/lib/data/incentives";
import { ProgressMeter } from "@/components/driver/dashboard-incentive-section";

interface IncentiveRidesViewProps {
  incentive: IncentiveDefinition;
}

interface RideRow {
  tripId: string;
  date: string;
  pickup: string;
  dropoff: string;
  bonusContribution: number;
  pickupTime?: string;
}

export function IncentiveRidesView({ incentive }: IncentiveRidesViewProps) {
  // App-I-7.1 (2026-05-13 polish second wave): pull the same progress
  // shape the list-view `<IncentiveCard>` consumes so the inside header
  // renders the identical mode-aware `<ProgressMeter>` + ends-in chip.
  const progressInfo = getIncentiveProgressInfo(incentive.type);
  const endsIn = formatEndsIn(incentive.endDate);

  // Build the "Completed rides" list — every completed trip whose
  // `incentiveTypes` includes this incentive's type. Per-ride bonus
  // contribution = bonusAmount / goal.count rounded to nearest dollar
  // (matches App-I-6.1 semantics carried over from buildCountedTripRows).
  const rideRows: RideRow[] = React.useMemo(() => {
    const goalCount = incentive.goal.count;
    const perRide = Math.round(incentive.bonusAmount / goalCount);
    return seedTrips
      .filter(
        (t) =>
          t.status === "completed" && t.incentiveTypes.includes(incentive.type),
      )
      .map((t) => {
        const pickupAddr = t.legs[0]?.address ?? "";
        const dropoffAddr = t.legs[t.legs.length - 1]?.address ?? "";
        return {
          tripId: t.id,
          date: t.date,
          pickup: pickupAddr,
          dropoff: dropoffAddr,
          bonusContribution: perRide,
          pickupTime: t.pickupTime,
        };
      });
  }, [incentive]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      {/* Header card — mirrors the list-view `<IncentiveCard>` layout:
       *  title pill + ends-in indicator share row 1, description,
       *  mode-aware `<ProgressMeter>` (rolling-window caption embedded). */}
      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1">
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
            <p className="mb-3 text-sm text-gray-600">{incentive.description}</p>
            {progressInfo ? (
              <ProgressMeter
                currentCount={progressInfo.currentCount}
                goal={progressInfo.goal}
                mode={progressInfo.goalMode}
                windowDays={progressInfo.goalDays}
              />
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

      {/* Completed rides list — unconditional. */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-gray-900">Completed rides</h2>
        <RidesList rows={rideRows} />
      </section>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Rides list — unconditional simple list
// -----------------------------------------------------------------------------

function RidesList({ rows }: { rows: RideRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 bg-white p-8 text-center">
        <CheckCircle2
          className="mx-auto mb-2 h-8 w-8 text-gray-300"
          aria-hidden="true"
        />
        <p className="text-sm text-gray-500">
          No qualifying trips yet. Eligible trips will appear here as you
          complete them.
        </p>
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
