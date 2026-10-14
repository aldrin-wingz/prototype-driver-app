"use client";

import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { getLegStage } from "@/lib/driver-data/mock-trips";
import type { LegOption } from "@/lib/support-data/leg-options";
import { tripContextFor } from "@/lib/support-data/trip-context";
import { DRIVER_NAVY } from "@/constants/driver-app-colors";

/**
 * The trip and leg this request is being filed against.
 *
 * ⛔⛔ **Two titled sections, trip before leg.** It was one flat card whose rows
 * mixed them — rider and client beside a leg id and a pick-up time — so nothing
 * on screen said which facts belonged to the trip and which to the leg being
 * reported on. Standardised across every form. (User direction, 2026-10-14.)
 *
 * ⚠️ Every value comes from `tripContextFor`. This file decides how it LOOKS
 * and nothing about what it says — a row computed in JSX is a row no check can
 * reach.
 */
export function TripSummaryBanner({ option }: { option: LegOption }) {
  const context = tripContextFor(option);
  const stage = getLegStage(option.leg);

  return (
    <div className="space-y-3">
      <Section title="Trip details">
        <Row label="Trip ID" value={context.tripId} />
        <Row label="Rider" value={context.rider} />
        <Row label="Client" value={context.client} />

        <div className="flex justify-between gap-3 text-sm">
          <dt className="flex-shrink-0 text-gray-500">Legs</dt>
          <dd className="flex min-w-0 flex-col items-end gap-1">
            {context.legs.map((leg) => (
              <span
                key={leg.legId}
                className={cn(
                  "rounded-md px-1.5 py-0.5 text-right",
                  // ⭐ The current leg is the one the form is about. On a
                  // one-leg trip this still marks it rather than leaving the
                  // row looking like an unanswered question.
                  leg.current
                    ? "bg-[#D1FAE5] font-semibold text-[#065F46]"
                    : "font-medium text-gray-900"
                )}
              >
                {leg.legCode ? `${leg.legCode} · ` : ""}
                {leg.legId}
              </span>
            ))}
          </dd>
        </div>
      </Section>

      <Section
        title="Current leg details"
        pill={
          <span
            className={cn(
              "flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold",
              stage === "completed"
                ? "bg-gray-200 text-gray-700"
                : "bg-[#D1FAE5] text-[#065F46]"
            )}
          >
            {context.status}
          </span>
        }
      >
        {context.legRows.map((row) => (
          <Row
            key={row.label}
            label={row.label}
            value={row.value}
            absent={row.absent}
          />
        ))}

        {/* ⛔ Which marks we already hold. This IS the rule for the form below:
            a recorded mark arrives locked, a blank one is one the driver has to
            supply — so it stays, though it is not one of the named rows. */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-gray-200 pt-3">
          {context.marks.map((mark) => (
            <span
              key={mark.label}
              className="flex items-center gap-1.5 text-xs"
              style={mark.recorded ? { color: DRIVER_NAVY } : undefined}
            >
              {mark.recorded ? (
                <Check className="h-3.5 w-3.5 text-[#00B090]" />
              ) : (
                <Circle className="h-3.5 w-3.5 text-gray-300" />
              )}
              <span className={mark.recorded ? "font-medium" : "text-gray-500"}>
                {mark.label} {mark.recorded ?? "to supply"}
              </span>
            </span>
          ))}
        </div>
      </Section>
    </div>
  );
}

function Section({
  title,
  pill,
  children,
}: {
  title: string;
  pill?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        {pill}
      </div>
      <dl className="mt-3 space-y-1">{children}</dl>
    </div>
  );
}

function Row({
  label,
  value,
  absent,
}: {
  label: string;
  value: string;
  absent?: boolean;
}) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <dt className="flex-shrink-0 text-gray-500">{label}</dt>
      <dd
        className={cn(
          "min-w-0 text-right",
          // ⛔ Said, not blanked. A row the seed cannot fill reads as missing
          // information rather than as a rendering bug.
          absent ? "italic text-gray-400" : "font-medium text-gray-900"
        )}
      >
        {value}
      </dd>
    </div>
  );
}
