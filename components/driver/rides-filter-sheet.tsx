"use client";

import { useEffect, useState } from "react";
import { Check, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Trip } from "@/lib/driver-data/mock-trips";
import {
  narrowedOptions,
  rideFilter,
  withRideFilter,
  FILTER_ANY_LABEL,
  FILTER_CLEAR_LABEL,
  FILTER_EDIT_LABEL,
  FILTER_SHEET_TITLE,
  FILTER_UPDATE_LABEL,
  NO_RIDE_FILTERS,
  RIDE_FILTERS,
  type RideFilterKey,
  type RideFilterValues,
} from "@/lib/driver-data/ride-filters";
import { RIDE_FILTER_ICONS } from "./ride-filter-icon";

/**
 * The My Rides filter sheet — `CAP-051`'s shape with this screen's filters.
 *
 * ⭐⭐ Production's own Requests sheet: `×` left, the title centred,
 * `Clear Filters` right; a section per filter whose heading sits left with the
 * CURRENT VALUE on the right; a short fixed set rendered as chips inline and
 * anything seeded rendered as a row with `Edit ›` that opens an option
 * sub-sheet (`CAP-052`); a full-width green `Update` pinned at the foot
 * (`CAP-053`).
 *
 * ⛔⛔ **The sheet edits a DRAFT and `Update` applies it.** Production's does
 * the same, and without it `Update` is decorative and `Clear Filters` is
 * ambiguous — the driver cannot tell whether clearing has already taken effect.
 * Exactly one call site applies the draft, and a check counts them.
 *
 * ⛔⛔ **Mounted at the PAGE ROOT, never inside the sticky tab box.** A
 * z-index opens a stacking context, so a sheet rendered inside that box tops
 * out at its `z-40` whatever it asks for, and the bottom nav (`fixed bottom-0
 * z-50`) paints over the `Update` button. This page has shipped that bug once.
 *
 * ⛔ **One overlay, two views.** The option sub-sheet REPLACES this one rather
 * than stacking over it — two overlays in one phone frame is a trap this
 * project has already hit, and production's sub-sheet covers the main sheet
 * anyway.
 *
 * ⚠️ The noun is **rides**, where the Requests sheet says *trips*. Both are
 * production's, each on its own screen: this one is reached from a tab called
 * Upcoming inside My Rides, and its empty state already says "No rides".
 */
export function RidesFilterSheet({
  open,
  openKey,
  values,
  trips,
  onClose,
  onApply,
}: {
  open: boolean;
  /**
   * The filter whose sub-sheet to show on opening, or `null` for the sheet
   * itself. Production's day chip opens the day sheet directly; a chip that
   * opened a long sheet the driver then had to scroll would be a worse control
   * than the one it replaced.
   */
  openKey: RideFilterKey | null;
  values: RideFilterValues;
  /**
   * The pool the options are counted against.
   *
   * ⛔ The manifest AS THE TAB WOULD SHOW IT with no filters — not the seed,
   * and not the already-filtered list. The seed includes rides the mode
   * strips, so the sheet would offer days that cannot appear; the filtered
   * list would make every option read `0` except the ones already chosen.
   */
  trips: readonly Trip[];
  onClose: () => void;
  onApply: (next: RideFilterValues) => void;
}) {
  const [draft, setDraft] = useState<RideFilterValues>(values);
  const [editing, setEditing] = useState<RideFilterKey | null>(null);

  // Reset both each time the sheet opens, so a cancelled edit is really
  // cancelled rather than carried into the next open.
  useEffect(() => {
    if (open) {
      setDraft(values);
      setEditing(openKey && rideFilter(openKey).control === "list" ? openKey : null);
    }
  }, [open, openKey, values]);

  if (!open) return null;

  const editingDef = editing ? rideFilter(editing) : null;

  return (
    /*
      ⛔⛔ `z-[60]`, ABOVE the bottom nav. The nav is `fixed bottom-0 z-50` and
      comes later in the document, so at an equal z-index it wins — and what it
      covers is the Update button. Found by walking: the sheet opened, looked
      right, and could not be applied.
    */
    <div
      className="fixed inset-0 z-[60] flex items-end bg-black/50"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label={editingDef ? editingDef.title : FILTER_SHEET_TITLE}
        className="flex max-h-[88%] w-full flex-col rounded-t-2xl bg-white shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        {editingDef ? (
          <>
            {/* The option sub-sheet — `CAP-052`. */}
            <SheetHeader
              title={editingDef.title}
              onClose={() => setEditing(null)}
              action={null}
            />
            <div className="flex-1 overflow-y-auto px-6 pb-6">
              {narrowedOptions(editing!, trips, draft).map((option) => {
                const selected =
                  (draft[editing!] ?? editingDef.defaultValue) === option.value;
                return (
                  <button
                    key={option.value || "any"}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      setDraft(withRideFilter(draft, editing!, option.value));
                      setEditing(null);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl px-4 py-3 text-left",
                      selected ? "bg-[#ECFDF5]" : "bg-white",
                    )}
                  >
                    <span>
                      <span className="block text-base font-bold text-gray-900">
                        {option.label || FILTER_ANY_LABEL}
                      </span>
                      {/* ⚠️ The count is what selecting this option would leave
                          under the OTHER filters — production's "N trips
                          available", in this screen's noun. */}
                      <span className="block text-sm text-gray-500">
                        {option.count} {option.count === 1 ? "ride" : "rides"} available
                      </span>
                    </span>
                    {selected && <Check className="h-5 w-5 text-[#10B981]" />}
                  </button>
                );
              })}
              {/* ⛔ The way back to "no filter" for a seeded list, which has no
                  natural default row of its own. Absent for a filter whose
                  default IS one of its options. */}
              {editingDef.defaultValue === "" && (
                <button
                  type="button"
                  onClick={() => {
                    setDraft(withRideFilter(draft, editing!, ""));
                    setEditing(null);
                  }}
                  className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-700"
                >
                  {FILTER_ANY_LABEL}
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            <SheetHeader
              title={FILTER_SHEET_TITLE}
              onClose={onClose}
              action={
                /* ⛔ `Clear Filters` resets the DRAFT and does not close.
                   Production's does the same — clearing and applying are two
                   separate decisions. */
                <button
                  type="button"
                  onClick={() => setDraft(NO_RIDE_FILTERS)}
                  className={cn(
                    "text-sm font-medium",
                    Object.keys(draft).length === 0
                      ? "text-gray-300"
                      : "text-gray-500 hover:text-gray-700",
                  )}
                >
                  {FILTER_CLEAR_LABEL}
                </button>
              }
            />

            <div className="flex-1 space-y-5 overflow-y-auto px-6 pb-6">
              {RIDE_FILTERS.map((def) => {
                const value = draft[def.key] ?? def.defaultValue;
                const Icon = RIDE_FILTER_ICONS[def.icon];
                return (
                  <div key={def.key}>
                    {/* ⚠️ Heading left, current value right — production's own
                        shape ("PICKUP TIME RANGE … Any time"). It repeats what
                        the lit chip says, which is the point: the row reads as
                        a sentence before the chips are scanned. */}
                    <div className="mb-2 flex items-baseline justify-between gap-3">
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                        {def.label}
                      </p>
                      <p className="truncate text-sm font-semibold text-gray-900">
                        {value ? def.chipLabel(value) : FILTER_ANY_LABEL}
                      </p>
                    </div>

                    {def.control === "chips" ? (
                      <div className="flex flex-wrap gap-2">
                        {narrowedOptions(def.key, trips, draft).map((option) => {
                          const selected = value === option.value;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              aria-pressed={selected}
                              onClick={() =>
                                setDraft(withRideFilter(draft, def.key, option.value))
                              }
                              className={cn(
                                "rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
                                selected
                                  ? "border-[#10B981] bg-[#10B981] text-white"
                                  : "border-gray-300 bg-white text-gray-700",
                              )}
                            >
                              {option.label}
                              <span
                                className={cn(
                                  "ml-1.5 text-[11px] font-medium",
                                  selected ? "text-white/80" : "text-gray-400",
                                )}
                              >
                                {option.count}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setEditing(def.key)}
                        className="flex w-full items-center justify-between rounded-xl border border-gray-300 px-4 py-3 text-left"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <Icon className="h-4 w-4 shrink-0 text-gray-500" />
                          <span className="truncate text-base font-bold text-gray-900">
                            {value ? def.chipLabel(value) : FILTER_ANY_LABEL}
                          </span>
                        </span>
                        <span className="flex shrink-0 items-center text-sm font-semibold text-[#10B981]">
                          {FILTER_EDIT_LABEL}
                          <ChevronRight className="h-4 w-4" />
                        </span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ⛔ Pinned, not scrolled with the sections. Seven filters is more
                than one screenful, and an Update the driver has to scroll to
                reach is how a sheet gets abandoned half-set. */}
            <div className="border-t border-gray-200 px-6 pb-8 pt-4">
              <Button
                type="button"
                onClick={() => onApply(draft)}
                className="h-12 w-full rounded-full bg-[#10B981] text-base font-semibold text-white hover:bg-[#0EA371]"
              >
                {FILTER_UPDATE_LABEL}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SheetHeader({
  title,
  onClose,
  action,
}: {
  title: string;
  onClose: () => void;
  action: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-6 pb-4 pt-5">
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-600"
      >
        <X className="h-5 w-5" />
      </button>
      <h2 className="text-lg font-bold text-gray-900">{title}</h2>
      {/* ⚠️ A fixed-width spacer when there is no action, so the title stays
          optically centred rather than drifting left on the sub-sheet. */}
      {action ?? <span className="w-9" />}
    </div>
  );
}
