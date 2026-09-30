"use client";

import { useState } from "react";
import { Check, ChevronDown, ChevronUp, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  RIDE_HISTORY_FILTERS, RIDE_HISTORY_FILTER_COPY, filterLabel,
  type RideHistoryFilter,
} from "@/lib/driver-data/ride-history";

/**
 * "Filter ride history" — replicated from `04-02` (closed) and `04-03` (open).
 *
 * A centred card over a dimmed list, an × top-left, the title, one dropdown,
 * a green Update button and a grey Clear All beneath it. The open dropdown
 * pushes down inside the card rather than floating over it, and a tick marks
 * the selected option.
 */
export function RideHistoryFilterModal({
  open, value, onApply, onClose,
}: {
  open: boolean;
  value: RideHistoryFilter;
  onApply: (v: RideHistoryFilter) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<RideHistoryFilter>(value);
  const [listOpen, setListOpen] = useState(false);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-6">
      <div className="w-full max-w-sm rounded-3xl bg-white px-6 pb-10 pt-5">
        <button type="button" onClick={onClose} aria-label="Close" className="text-gray-400">
          <X className="h-6 w-6" />
        </button>

        <p className="pb-8 pt-6 text-center text-2xl font-bold text-gray-900">
          {RIDE_HISTORY_FILTER_COPY.title}
        </p>

        <div className="rounded-2xl border border-gray-300">
          <button
            type="button"
            onClick={() => setListOpen((o) => !o)}
            className="flex w-full items-center justify-between px-5 py-4 text-left text-lg text-gray-900"
          >
            {filterLabel(draft)}
            {listOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </button>

          {listOpen && (
            <div className="border-t border-gray-200 py-1">
              {RIDE_HISTORY_FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => { setDraft(f.key); setListOpen(false); }}
                  className="flex w-full items-center justify-between px-5 py-3 text-left text-lg text-gray-900"
                >
                  {f.label}
                  {f.key === draft && <Check className="h-5 w-5 text-gray-900" />}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col items-center pt-7">
          <button
            type="button"
            onClick={() => { onApply(draft); onClose(); }}
            className="rounded-xl bg-[#5BCFA0] px-10 py-3.5 text-lg font-semibold text-white"
          >
            {RIDE_HISTORY_FILTER_COPY.update}
          </button>
          <button
            type="button"
            onClick={() => { setDraft("all"); onApply("all"); onClose(); }}
            className={cn("pt-5 text-xl font-semibold text-gray-400")}
          >
            {RIDE_HISTORY_FILTER_COPY.clear}
          </button>
        </div>
      </div>
    </div>
  );
}
