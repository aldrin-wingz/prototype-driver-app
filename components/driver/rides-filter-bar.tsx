"use client";

import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  chipRowKeys,
  chipText,
  isFilterSet,
  rideFilter,
  type RideFilterKey,
  type RideFilterValues,
} from "@/lib/driver-data/ride-filters";
import { RIDE_FILTER_ICONS } from "./ride-filter-icon";

/**
 * The chip row under the My Rides tabs — what is filtered, without opening
 * anything.
 *
 * ⭐⭐ **Production's own Requests chip row, with this screen's filters in it**
 * (`CAP-054`). The driver already knows how it works, so the proposal is only
 * about *what* can be filtered, not about a new control to learn: a chip per
 * applied filter, each carrying its current value and a chevron, each opening
 * the thing it names.
 *
 * ⛔ **Which chips are here is `chipRowKeys`, not a rule written in this file.**
 * The always-shown one plus whatever is set — and the badge on the header icon
 * counts the rest. Three readers of that rule (this row, the badge, the sheet)
 * is three chances to disagree, which is why none of them decides.
 *
 * ⛔ **Told, never asks.** Whether this renders at all is the page's call via
 * `showsRidesFilter`. A control that read the demo focus itself would be a
 * second reader of the gate the list already uses, and the two could disagree —
 * which is exactly how row 10 shipped a feed narrowed by a filter nobody could
 * see.
 *
 * ⚠️ An earlier version was a single pill with a status sheet behind it. It was
 * right for one filter and wrong for seven: the pill can only ever name one of
 * them, so the other six would apply invisibly.
 */
export function RidesFilterBar({
  values,
  counts,
  onOpen,
}: {
  values: RideFilterValues;
  /**
   * How many rides each chip's filter currently leaves, keyed by filter.
   *
   * ⚠️ Passed in, not computed here. The list, the tab count and this row must
   * agree, and three places that each count for themselves is three chances to
   * disagree.
   */
  counts: Partial<Record<RideFilterKey, number>>;
  onOpen: (key: RideFilterKey) => void;
}) {
  const keys = chipRowKeys(values);

  return (
    <div className="flex flex-wrap gap-2 border-b border-gray-200 bg-white px-4 py-2">
      {keys.map((key) => {
        const def = rideFilter(key);
        const Icon = RIDE_FILTER_ICONS[def.icon];
        const set = isFilterSet(key, values);
        const count = counts[key];
        return (
          <button
            key={key}
            type="button"
            onClick={() => onOpen(key)}
            aria-haspopup="dialog"
            className={cn(
              "flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-semibold transition-colors",
              // ⚠️ Tinted once the filter is away from its default, the way
              // production tints an applied filter. The always-shown chip sits
              // untinted at `All`, which is the state it spends most of its
              // life in and must not read as "something is on".
              set
                ? "border-[#10B981] bg-[#ECFDF5] text-[#047857]"
                : "border-gray-300 bg-white text-gray-700",
            )}
          >
            <Icon className="h-4 w-4" />
            {chipText(key, values)}
            {count !== undefined && (
              <span
                className={cn(
                  "text-[11px] font-medium",
                  set ? "text-[#047857]/70" : "text-gray-400",
                )}
              >
                {count}
              </span>
            )}
            <ChevronDown className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}
