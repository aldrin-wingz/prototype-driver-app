"use client";

import { useState } from "react";
import { ChevronUp, ChevronDown, Check, CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { RideCard } from "./ride-card";
import {
  BANNER, DEFAULT_SORT, SORT_OPTIONS, countLine, sheetPrompt, sortTrips,
  EMPTY_TITLE, EMPTY_BODY,
  type RequestTab, type SheetDetent, type SortKey,
} from "@/lib/driver-data/map-view";
import type { Trip } from "@/lib/driver-data/mock-trips";

/**
 * The pull-up list over the map.
 *
 * Three detents, per contract Part 1 — `halfway` is where Requests OPENS, not
 * `down` and not `up`. Fully up, the list "works exactly as it did before",
 * which is why the cards are the existing `RideCard` rather than a second card
 * component that could drift from it.
 */

interface Props {
  detent: SheetDetent;
  onDetent: (d: SheetDetent) => void;
  trips: Trip[];
  visibleCount: number;
  dayLabel: string;
  tab: RequestTab;
  selectedId: string | null;
  onOpenTrip: (id: string) => void;
  onClearFilters: () => void;
  hasFilters: boolean;
}

/** The banner every card carries — what kind of trip this is. */
function CardBanner({ tab }: { tab: RequestTab }) {
  const { label, note } = BANNER[tab];
  const special = tab === "special-offers";
  return (
    <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
      <div className="flex items-center gap-2">
        {special ? (
          <Clock className="h-5 w-5 text-[#D97706]" />
        ) : (
          <CheckCircle2 className="h-5 w-5 text-[#10B981]" />
        )}
        <span className="font-bold text-gray-900">{label}</span>
      </div>
      <span className="text-sm text-gray-500">{note}</span>
    </div>
  );
}

function SortMenu({ value, onChange }: { value: SortKey; onChange: (k: SortKey) => void }) {
  const [open, setOpen] = useState(false);
  const active = SORT_OPTIONS.find((o) => o.key === value)!;
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-gray-300 px-3 py-1.5 text-[13px] text-gray-900"
      >
        {active.label}
        <ChevronDown className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-40 w-60 overflow-hidden rounded-2xl bg-white shadow-xl">
          <p className="px-4 pt-4 text-xs font-medium uppercase tracking-wide text-gray-500">
            Sort list by
          </p>
          <div className="py-2">
            {SORT_OPTIONS.map((o) => (
              <button
                key={o.key}
                type="button"
                onClick={() => { onChange(o.key); setOpen(false); }}
                className={cn(
                  "flex w-full items-center justify-between px-4 py-3 text-left text-[15px]",
                  o.key === value ? "bg-[#ECFDF5] text-gray-900" : "text-gray-900",
                )}
              >
                {o.label}
                {/* A tick marks the one in use — capture 04-05 */}
                {o.key === value && <Check className="h-5 w-5 text-[#10B981]" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function RequestListSheet({
  detent, onDetent, trips, visibleCount, dayLabel, tab,
  selectedId, onOpenTrip, onClearFilters, hasFilters,
}: Props) {
  const [sort, setSort] = useState<SortKey>(DEFAULT_SORT);
  const ordered = sortTrips(trips, sort);

  // When a pin is selected the sheet shows that one trip, headed SELECTED TRIP.
  const selected = selectedId ? trips.find((t) => t.id === selectedId) ?? null : null;
  const shown = selected ? [selected] : detent === "halfway" ? ordered.slice(0, 1) : ordered;

  return (
    <div
      data-detent={detent}
      className={cn(
        // bottom-16, not bottom-0: an absolutely positioned child resolves
        // `bottom` against the PADDING box, so the container's pb-16 does not
        // hold it off the fixed bottom nav. It has to clear the nav itself.
        "absolute inset-x-0 bottom-16 z-30 flex flex-col rounded-t-2xl bg-white shadow-[0_-8px_24px_-8px_rgba(0,0,0,0.25)]",
        // Collapsed is CONTENT-SIZED, not a percentage: the capture shows the
        // handle, the prompt and the whole List View row (count + sort) still
        // visible when the sheet is all the way down. A percentage clipped it.
        detent === "down" && "h-auto",
        detent === "halfway" && "h-[52%]",
        detent === "up" && "h-full",
      )}
    >
      {/* Grab handle + prompt */}
      <button
        type="button"
        onClick={() => onDetent(detent === "up" ? "halfway" : detent === "halfway" ? "up" : "halfway")}
        className="shrink-0 pt-2"
        aria-label={sheetPrompt(detent)}
      >
        <span className="mx-auto block h-1.5 w-12 rounded-full bg-gray-300" />
        <p className="pt-2 text-center text-xs font-medium uppercase tracking-[0.08em] text-gray-400">
          {sheetPrompt(detent)}
        </p>
      </button>

      {/* Header: chevron, title + the two counts, sort */}
      <div className="flex shrink-0 items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={() => onDetent(detent === "up" ? "down" : "up")}
          aria-label={detent === "up" ? "Collapse list" : "Expand list"}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-[#D1FAE5]"
        >
          {detent === "up"
            ? <ChevronDown className="h-5 w-5 text-[#047857]" />
            : <ChevronUp className="h-5 w-5 text-[#047857]" />}
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold leading-tight text-gray-900">
            {selected ? "Selected trip" : "List View"}
          </p>
          {!selected && (
            <p data-count-line className="text-[13px] leading-tight text-gray-600">
              {countLine(visibleCount, trips.length, dayLabel)}
            </p>
          )}
        </div>
        {!selected && <SortMenu value={sort} onChange={setSort} />}
      </div>

      {/* Cards */}
      <div className={cn("flex-1 overflow-y-auto px-4 pb-4", detent === "down" && "hidden")}>
        {trips.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10">
            <p className="text-center text-lg font-semibold text-gray-900">{EMPTY_TITLE}</p>
            <p className="text-center text-sm text-gray-600">{EMPTY_BODY}</p>
            {hasFilters && (
              <button
                type="button"
                onClick={onClearFilters}
                className="mt-3 rounded-full border border-gray-300 px-5 py-2 text-sm font-medium text-gray-900"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {shown.map((trip) => (
              <div key={trip.id} className="overflow-hidden rounded-xl bg-white shadow-md">
                <CardBanner tab={tab} />
                {/* ⛔ No Accept button on a card — claiming moved to Ride Details
                    and its swipe. The card only opens the trip. */}
                <RideCard trip={trip} revenueColor="green" onClick={() => onOpenTrip(trip.id)} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
