"use client";

import React, { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { memberFilterOptions } from "@/lib/driver-data/member-assignment";

interface FilterRequestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (filters: RequestFilters) => void;
  initialFilters?: RequestFilters;
  /**
   * Whether to offer the **Member** row — catalogue row 10's proposal.
   *
   * ⛔⛔ **A prop, not a `useSolution()` call.** This sheet is production's,
   * replicated from a capture; it has no business knowing which catalogue row
   * the selector is focused on. Reading the focus here would make a mirrored
   * screen depend on the tooling that frames it, which the base contract
   * forbids — and would put the decision in the one place a check cannot run
   * a truth table over. `app/requests/page.tsx` asks `showsMemberFilter`; this
   * sheet is told.
   *
   * ⚠️ Required, with no default. A default would let the one call site be
   * converted wrongly and still compile, showing a proposed control in
   * production's own sheet.
   */
  showMemberFilter: boolean;
}

export interface RequestFilters {
  pickupLocation?: string;
  day?: string;
  client?: string;
  /**
   * Catalogue row **10** — the member whose trips to show.
   *
   * ⛔⛔ **This one and `incentiveType` are the only entries here that actually
   * filter anything.** `pickupLocation`, `day`, `client`, `sortBy` and `mode`
   * are rendered, stored and read by NOTHING — they are inherited from the base,
   * which replicated the captured production sheet faithfully, controls and all.
   * That is a deliberate, logged state and not something this slice quietly
   * fixed: wiring the others is base behaviour to change on purpose, not a side
   * effect of adding a feature. If you are here because a filter did nothing,
   * this is why, and `app/requests/page.tsx` is where the two live ones are
   * applied.
   */
  member?: string;
  sortBy?: string;
  mode?: string;
  incentiveType?: string;
}

export function FilterRequestsModal({
  isOpen,
  onClose,
  onUpdate,
  initialFilters,
  showMemberFilter,
}: FilterRequestsModalProps) {
  const [filters, setFilters] = useState<RequestFilters>({
    pickupLocation: undefined,
    day: undefined,
    client: undefined,
    member: undefined,
    sortBy: "expiration-date",
    mode: "full-trip",
    ...initialFilters,
  });

  // Reset local filter state each time the modal opens so it reflects
  // the currently applied filters (e.g. from a deep-link tap).
  const prevIsOpen = React.useRef(false);
  React.useEffect(() => {
    if (isOpen && !prevIsOpen.current) {
      setFilters({
        pickupLocation: undefined,
        day: undefined,
        client: undefined,
        member: undefined,
        sortBy: "expiration-date",
        mode: "full-trip",
        ...initialFilters,
      });
    }
    prevIsOpen.current = isOpen;
  }, [isOpen]);

  const handleUpdateClick = () => {
    onUpdate(filters);
    onClose();
  };

  const handleClearFilters = () => {
    setFilters({
      pickupLocation: undefined,
      day: undefined,
      client: undefined,
      member: undefined,
      sortBy: "expiration-date",
      mode: "full-trip",
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/50">
      {/* Modal container */}
      <div className="w-full max-h-[90vh] overflow-y-auto rounded-t-2xl bg-white px-6 pt-6 pb-28 shadow-lg">
        {/* Header with close button */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Filter Requests</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close filter modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Filter by section */}
        <div className="mb-6">
          <h3 className="mb-3 text-sm font-semibold text-gray-900">Filter by:</h3>
          <div className="space-y-3">
            {/* Pickup Location */}
            <Select
              value={filters.pickupLocation || ""}
              onValueChange={(value) =>
                setFilters({ ...filters, pickupLocation: value || undefined })
              }
            >
              <SelectTrigger className="h-12 border-gray-300 bg-white px-4 py-3 text-left text-gray-900">
                <SelectValue placeholder="Pickup Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="atlanta">Atlanta, GA</SelectItem>
                <SelectItem value="buckhead">Buckhead</SelectItem>
                <SelectItem value="midtown">Midtown</SelectItem>
              </SelectContent>
            </Select>

            {/* Day */}
            <Select
              value={filters.day || ""}
              onValueChange={(value) =>
                setFilters({ ...filters, day: value || undefined })
              }
            >
              <SelectTrigger className="h-12 border-gray-300 bg-white px-4 py-3 text-left text-gray-900">
                <SelectValue placeholder="Day" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="tomorrow">Tomorrow</SelectItem>
                <SelectItem value="this-week">This Week</SelectItem>
              </SelectContent>
            </Select>

            {/* Client */}
            <Select
              value={filters.client || ""}
              onValueChange={(value) =>
                setFilters({ ...filters, client: value || undefined })
              }
            >
              <SelectTrigger className="h-12 border-gray-300 bg-white px-4 py-3 text-left text-gray-900">
                <SelectValue placeholder="Client" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="verida">Verida</SelectItem>
                <SelectItem value="uber">Uber</SelectItem>
                <SelectItem value="lyft">Lyft</SelectItem>
              </SelectContent>
            </Select>

            {/*
              Member — catalogue row 10, and the one PROPOSED control in this
              sheet.

              ⚠️ The options are members the driver has DRIVEN in the last 30
              days, not the riders currently in the feed. Listing the feed's own
              names would put twenty strangers in a dropdown to solve a problem
              that only arises for a member the driver already knows — and it is
              the same list the "ask to be their regular driver" form picks from,
              so the two halves of one scenario cannot disagree about who the
              driver knows. See `lib/driver-data/member-assignment.ts`.

              It can legitimately come up empty: that member simply has no trips
              posted right now, which is a real answer and the one the Clear
              Filters empty state already handles.

              ⛔⛔ B3d gated it. Production's sheet has THREE rows under
              "Filter by:" — Pickup Location, Day, Client — and this is the
              fourth. In `"now"` it is not rendered at all, rather than rendered
              and ignored: a dropdown that lists the right names and then
              changes nothing is a worse lie than its absence.
            */}
            {showMemberFilter && (
              <Select
                value={filters.member || ""}
                onValueChange={(value) =>
                  setFilters({ ...filters, member: value || undefined })
                }
              >
                <SelectTrigger className="h-12 border-[#10B981] bg-white px-4 py-3 text-left text-gray-900">
                  <SelectValue placeholder="Member" />
                </SelectTrigger>
                <SelectContent>
                  {memberFilterOptions().map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Sort by section */}
        <div className="mb-6">
          <h3 className="mb-3 text-sm font-semibold text-gray-900">Sort by:</h3>
          <Select
            value={filters.sortBy || "expiration-date"}
            onValueChange={(value) =>
              setFilters({ ...filters, sortBy: value })
            }
          >
            <SelectTrigger className="h-12 border-gray-300 bg-white px-4 py-3 text-left text-gray-900">
              <SelectValue placeholder="Expiration Date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="expiration-date">Expiration Date</SelectItem>
              <SelectItem value="price-high">Price (High to Low)</SelectItem>
              <SelectItem value="price-low">Price (Low to High)</SelectItem>
              <SelectItem value="distance">Distance</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Incentive Filter section */}
        <div className="mb-6">
          <h3 className="mb-3 text-sm font-semibold text-gray-900">Incentive Filter:</h3>
          <Select
            value={filters.incentiveType || "all"}
            onValueChange={(value) =>
              setFilters({
                ...filters,
                incentiveType: value === "all" ? undefined : value,
              })
            }
          >
            <SelectTrigger className="h-12 border-gray-300 bg-white px-4 py-3 text-left text-gray-900">
              <SelectValue placeholder="All Incentives" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Incentives</SelectItem>
              <SelectItem value="weekend-warrior">Weekend Warrior</SelectItem>
              <SelectItem value="early-bird">Early Bird</SelectItem>
              <SelectItem value="peak-hours">Peak Performer</SelectItem>
              <SelectItem value="loyalty-streak">Loyalty Streak</SelectItem>
              <SelectItem value="white-glove">White Glove</SelectItem>
              <SelectItem value="quick-wins">Quick Wins</SelectItem>
              <SelectItem value="hometown-hero">Hometown Hero</SelectItem>
              <SelectItem value="squad-goals">Squad Goals</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Mode section */}
        <div className="mb-6">
          <h3 className="mb-3 text-sm font-semibold text-gray-900">Mode:</h3>
          <Select
            value={filters.mode || "full-trip"}
            onValueChange={(value) =>
              setFilters({
                ...filters,
                mode: value,
              })
            }
          >
            <SelectTrigger className="h-12 border-gray-300 bg-white px-4 py-3 text-left text-gray-900">
              <SelectValue placeholder="Full Trip" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="full-trip">Full Trip</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Clear Filters link */}
        <button
          onClick={handleClearFilters}
          className="mb-6 text-sm text-gray-400 hover:text-gray-600"
        >
          Clear Filters
        </button>

        {/* Update button — full-width primary green */}
        <Button
          onClick={handleUpdateClick}
          className="h-12 w-full rounded-full bg-[#10B981] text-base font-semibold text-white shadow-sm hover:bg-[#0EA371]"
        >
          Update
        </Button>
      </div>
    </div>
  );
}
