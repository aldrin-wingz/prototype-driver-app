"use client";

import { Check, Circle, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getLegStatusLabel,
  getLegStage,
  getMissingSwipes,
} from "@/lib/driver-data/mock-trips";
import type { LegOption } from "@/lib/support-data/leg-options";
import { DRIVER_NAVY } from "@/constants/driver-app-colors";

/**
 * Compressed summary of the selected leg.
 *
 * Everything here used to be individual locked form fields — leg letter, rider,
 * scheduled date and time, appointment time, status. As fields they made the form
 * look long and manual; as a banner they read as context the app already has, and
 * they re-render whenever a different leg is picked.
 */
export function TripSummaryBanner({ option }: { option: LegOption }) {
  const { trip, leg } = option;
  const stage = getLegStage(leg);
  const missing = getMissingSwipes(leg);
  const appointment = trip.legs.find((candidate) => candidate.type === "appointment");

  const rows: Array<{ label: string; value: string }> = [
    { label: "Rider", value: trip.rider },
    { label: "Client", value: trip.client },
    { label: "Leg", value: leg.legCode ? `${leg.legCode} · ${leg.id}` : leg.id },
    { label: "Scheduled pick-up", value: `${trip.date} · ${leg.time}` },
  ];
  if (appointment) {
    rows.push({ label: "Appointment", value: appointment.time });
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-gray-900">Trip #{trip.id}</p>
        <span
          className={cn(
            "flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold",
            stage === "blocked"
              ? "bg-[#FEF3C7] text-[#92400E]"
              : stage === "completed"
                ? "bg-gray-200 text-gray-700"
                : "bg-[#D1FAE5] text-[#065F46]"
          )}
        >
          {getLegStatusLabel(leg)}
        </span>
      </div>

      <dl className="mt-3 space-y-1">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between gap-3 text-sm">
            <dt className="text-gray-500">{row.label}</dt>
            <dd className="text-right font-medium text-gray-900">{row.value}</dd>
          </div>
        ))}
      </dl>

      {/* Which swipes we already hold — this is what decides how much of the
          form below is left for the driver to fill. */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-gray-200 pt-3">
        {(
          [
            ["startedAt", "En-route"],
            ["pickedUpAt", "Pick-up"],
            ["droppedOffAt", "Drop-off"],
          ] as const
        ).map(([key, label]) => {
          const recorded = leg.progress?.[key];
          const isMissing = missing.includes(key);
          return (
            <span
              key={key}
              className="flex items-center gap-1.5 text-xs"
              style={recorded ? { color: DRIVER_NAVY } : undefined}
            >
              {recorded ? (
                <Check className="h-3.5 w-3.5 text-[#00B090]" />
              ) : isMissing ? (
                <AlertTriangle className="h-3.5 w-3.5 text-[#D97706]" />
              ) : (
                <Circle className="h-3.5 w-3.5 text-gray-300" />
              )}
              <span className={recorded ? "font-medium" : "text-gray-500"}>
                {label} {recorded ?? (isMissing ? "missing" : "not yet")}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
