"use client";

import { cn } from "@/lib/utils";
import {
  MY_RIDES_FILTERS,
  type RidesFilter,
} from "@/lib/driver-data/client-cancellation";

/**
 * Catalogue row 18's filter — `All | Active | Cancelled`, under the My Rides
 * tab row.
 *
 * ⛔⛔ **A bar, not a sheet.** The Request Feed's filter is an icon that opens a
 * bottom sheet, which is right for seven controls and wrong for three: it hides
 * which one is active behind a tap. The whole point here is that a driver can
 * see at a glance that they are looking at the full manifest, and switch
 * without losing their place.
 *
 * ⛔ **Told, never asks.** Whether this renders at all is `showsCancelledRides`,
 * decided by the page. A control that read the focus itself would be a second
 * reader of the rule the list already uses, and the two could disagree — which
 * is exactly how row 10 shipped a feed narrowed by a filter the driver could
 * not see.
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
   * ⚠️ Passed in rather than computed here for the same reason as above: the
   * list, the tab count and this bar must agree, and three places that each
   * count for themselves is three chances to disagree.
   */
  counts: Record<RidesFilter, number>;
}) {
  return (
    <div
      role="group"
      aria-label="Filter rides"
      className="flex gap-1 border-b border-gray-200 bg-white px-4 py-2"
    >
      {MY_RIDES_FILTERS.map((option) => {
        const selected = option.key === value;
        return (
          <button
            key={option.key}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.key)}
            className={cn(
              "flex-1 rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors",
              selected
                ? "bg-[#10B981] text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
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
  );
}
