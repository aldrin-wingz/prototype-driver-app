"use client";

import { AlertTriangle } from "lucide-react";
import type { SeatBlockConfig, SeatBlockRow } from "@/types/support";
import {
  OVER_CAPACITY_VEHICLE_LABEL,
} from "@/lib/driver-data/over-capacity";

/**
 * Catalogue row 13's evidence panel — the seats, and the trips holding them.
 *
 * ⭐⭐ **This is the half production does not have.** `CAP-340` offers the
 * words `Over Capacity Trip # 2156877` and a telephone; it never says which
 * trips are in the way, how many seats they hold, or what the record thinks
 * the vehicle seats. A driver who cannot see any of that has nothing to answer
 * with, which is why the answer today is a phone call.
 *
 * ⛔ **The component works NOTHING out.** Every number here is assembled by
 * `buildOverCapacityException` from the rules in
 * `lib/driver-data/over-capacity.ts`. A total computed in JSX is a total no
 * check can reach — and this one has to be right, because the driver is about
 * to argue with it.
 */
export function SeatBlocksField({ config }: { config: SeatBlockConfig }) {
  const over = config.seatsNeeded - config.seatsOnRecord;
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200">
      {/* --- the record --------------------------------------------------- */}
      <div className="flex items-baseline justify-between gap-3 bg-gray-50 px-4 py-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            {OVER_CAPACITY_VEHICLE_LABEL}
          </p>
          <p className="truncate text-sm font-semibold text-gray-900">
            {config.vehicle}
          </p>
        </div>
        <p className="shrink-0 text-sm font-semibold tabular-nums text-gray-900">
          {seatWord(config.seatsOnRecord)}
        </p>
      </div>

      {/* --- what is already aboard --------------------------------------- */}
      {config.rows.length > 0 ? (
        <ul className="divide-y divide-gray-100">
          {config.rows.map((row) => (
            <SeatRow key={row.rideId} row={row} />
          ))}
        </ul>
      ) : (
        /*
          ⛔ A real state, not a fallback. A wheelchair plus three escorts in a
          five-seat vehicle is over capacity with nothing overlapping it at
          all, and a panel that printed an empty list would read as a bug on
          the one request where the arithmetic is simplest.
        */
        <p className="px-4 py-3 text-sm text-gray-600">
          Nothing you have accepted overlaps this trip. It is over capacity on
          its own.
        </p>
      )}

      {/* --- the arithmetic ----------------------------------------------- */}
      <div className="space-y-1.5 border-t border-gray-200 px-4 py-3">
        {config.peakLabel && (
          <Line label="Most at once" detail={config.peakLabel} />
        )}
        <Line label="This trip" detail={seatWord(config.seatsRequested)} />
        <div className="flex items-baseline justify-between gap-3 border-t border-gray-200 pt-1.5">
          <p className="text-sm font-semibold text-gray-900">Seats needed</p>
          <p className="text-sm font-semibold tabular-nums text-gray-900">
            {seatWord(config.seatsNeeded)}
          </p>
        </div>
      </div>

      {over > 0 && (
        <div className="flex items-start gap-2 border-t border-[#FECACA] bg-[#FEF2F2] px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#DC2626]" />
          <p className="text-sm font-semibold text-[#991B1B]">
            {over} {over === 1 ? "seat" : "seats"} over what your record allows
          </p>
        </div>
      )}
    </div>
  );
}

function SeatRow({ row }: { row: SeatBlockRow }) {
  return (
    <li className="flex items-baseline justify-between gap-3 px-4 py-2.5">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-gray-900">
          {row.rider}
        </p>
        <p className="text-xs text-gray-500">
          {row.client} · {row.fromLabel} → {row.toLabel}
        </p>
      </div>
      <p className="shrink-0 text-sm tabular-nums text-gray-700">
        {seatWord(row.seats)}
      </p>
    </li>
  );
}

function Line({ label, detail }: { label: string; detail: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <p className="text-sm text-gray-600">{label}</p>
      <p className="text-sm tabular-nums text-gray-700">{detail}</p>
    </div>
  );
}

/**
 * ⚠️ Singular and plural, because "1 seats" on a one-passenger ride is the
 * kind of thing a reviewer stops reading at. Declared here rather than at each
 * call site so the three places that print a seat count cannot disagree.
 */
function seatWord(seats: number): string {
  return `${seats} ${seats === 1 ? "seat" : "seats"}`;
}
