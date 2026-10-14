"use client";

import { useEffect, useState } from "react";
import { ChevronDown, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ridesFilterLabel,
  DEFAULT_RIDES_FILTER,
  MY_RIDES_FILTERS,
  type RidesFilter,
} from "@/lib/driver-data/client-cancellation";

/**
 * Catalogue row 18's filter — one pill showing the current value, opening a
 * sheet to change it.
 *
 * ⭐⭐ **Production's own filter shape, with our options in it.** The Requests
 * screen carries a `Pickup Time ⌄` pill above the map; tapping it opens a
 * bottom sheet with a title, a `Clear` link, the options as chips and a
 * full-width green `Update`. Reusing that is a stronger argument than inventing
 * a control: the driver already knows how this one works, and the proposal is
 * then only about *what* can be filtered, not about a new thing to learn.
 *
 * ⛔ An earlier version was three pills in a row, always visible. It showed the
 * state without a tap, which reads well in a screenshot and badly beside the
 * rest of the app — nothing else in this driver app filters that way. (User
 * direction, 2026-10-15.)
 *
 * ⚠️ The shape is taken from a screenshot the user supplied inline, NOT from a
 * registered capture. It is production's Requests filter and the pattern is not
 * in doubt, but it has no `CAP-###` — so this is replication of a shape, not a
 * citation. Drop that shot into `02 Requests/<date>/` to make it citable.
 *
 * ⛔ **Told, never asks.** Whether this renders at all is `showsCancelledRides`,
 * decided by the page. A control that read the focus itself would be a second
 * reader of the rule the list already uses, and the two could disagree — which
 * is exactly how row 10 shipped a feed narrowed by a filter nobody could see.
 */
export function RidesFilterBar({
  value,
  onChange,
  counts,
}: {
  value: RidesFilter;
  onChange: (next: RidesFilter) => void;
  /**
   * How many rides each option would show.
   *
   * ⚠️ Passed in, not computed here. The list, the tab count and this control
   * must agree, and three places that each count for themselves is three
   * chances to disagree.
   */
  counts: Record<RidesFilter, number>;
}) {
  const [open, setOpen] = useState(false);
  /**
   * ⛔ The sheet edits a DRAFT, and `Update` applies it — production's own
   * behaviour, and the same shape `FilterRequestsModal` uses. Picking an option
   * that took effect immediately would make `Update` decorative and `Clear`
   * ambiguous.
   */
  const [draft, setDraft] = useState<RidesFilter>(value);

  // Reset the draft each time the sheet opens, so a cancelled edit is really
  // cancelled rather than carried into the next open.
  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  const active = value !== DEFAULT_RIDES_FILTER;

  return (
    <>
      <div className="flex border-b border-gray-200 bg-white px-4 py-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={open}
          className={cn(
            "flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-semibold transition-colors",
            // ⚠️ The pill carries the CURRENT value, so the driver can see what
            // they are looking at without opening anything. Tinted once it is
            // not the default, the way production tints an applied filter.
            active
              ? "border-[#10B981] bg-[#ECFDF5] text-[#047857]"
              : "border-gray-300 bg-white text-gray-700"
          )}
        >
          <SlidersHorizontal className="h-4 w-4" />
          {ridesFilterLabel(value)}
          <span className="text-[11px] font-medium text-gray-400">
            {counts[value]}
          </span>
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>

      {open && (
        /*
          ⛔⛔ `z-[60]`, ABOVE the bottom nav.

          The nav is `fixed bottom-0 z-50` and comes later in the document, so
          at the same z-index it wins and sits on top of the sheet — which puts
          it squarely over the `Update` button. Found by walking: the sheet
          opened, looked right, and could not be applied.
        */
        <div
          className="fixed inset-0 z-[60] flex items-end bg-black/50"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-label="Filter rides"
            className="w-full rounded-t-2xl bg-white px-6 pb-8 pt-5 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
              <h2 className="text-lg font-bold text-gray-900">Rides</h2>
              {/* ⛔ `Clear` returns to the DEFAULT, it does not close the sheet.
                  Production's does the same — clearing and applying are two
                  separate decisions. */}
              <button
                type="button"
                onClick={() => setDraft(DEFAULT_RIDES_FILTER)}
                className={cn(
                  "text-sm font-medium",
                  draft === DEFAULT_RIDES_FILTER
                    ? "text-gray-300"
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                Clear
              </button>
            </div>

            {/* ⚠️ Section label on the left, the CURRENT value on the right —
                production's own shape ("PICKUP TIME RANGE … Any time"). It
                repeats what the lit chip says, which is the point: the row
                reads as a sentence before the chips are scanned. */}
            <div className="mb-3 flex items-baseline justify-between">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                Show
              </p>
              <p className="text-sm font-semibold text-gray-900">
                {ridesFilterLabel(draft)}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {MY_RIDES_FILTERS.map((option) => {
                const selected = option.key === draft;
                return (
                  <button
                    key={option.key}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setDraft(option.key)}
                    className={cn(
                      // ⚠️ A three-column grid, not a wrapping flex row. Three
                      // chips of different word lengths wrapped unevenly and
                      // left the sheet looking unaligned against its own
                      // full-width Update button.
                      "rounded-full border py-2.5 text-sm font-semibold transition-colors",
                      selected
                        ? "border-[#10B981] bg-[#10B981] text-white"
                        : "border-gray-300 bg-white text-gray-700"
                    )}
                  >
                    {option.label}
                    <span
                      className={cn(
                        "ml-1.5 text-[11px] font-medium",
                        selected ? "text-white/80" : "text-gray-400"
                      )}
                    >
                      {counts[option.key]}
                    </span>
                  </button>
                );
              })}
            </div>

            <Button
              type="button"
              onClick={() => {
                onChange(draft);
                setOpen(false);
              }}
              className="mt-7 h-12 w-full rounded-full bg-[#10B981] text-base font-semibold text-white hover:bg-[#0EA371]"
            >
              Update
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
