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

interface FilterRequestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (filters: RequestFilters) => void;
  initialFilters?: RequestFilters;
}

export interface RequestFilters {
  pickupLocation?: string;
  day?: string;
  client?: string;
  sortBy?: string;
  mode?: string;
  incentiveType?: string;
}

export function FilterRequestsModal({
  isOpen,
  onClose,
  onUpdate,
  initialFilters,
}: FilterRequestsModalProps) {
  const [filters, setFilters] = useState<RequestFilters>({
    pickupLocation: undefined,
    day: undefined,
    client: undefined,
    sortBy: "expiration-date",
    mode: "full-trip",
    ...initialFilters,
  });

  // Sync if initialFilters changes (e.g. deep-link param changes)
  React.useEffect(() => {
    if (initialFilters) {
      setFilters((prev) => ({ ...prev, ...initialFilters }));
    }
  }, [initialFilters?.mode, initialFilters?.incentiveType]);

  const handleUpdateClick = () => {
    onUpdate(filters);
    onClose();
  };

  const handleClearFilters = () => {
    setFilters({
      pickupLocation: undefined,
      day: undefined,
      client: undefined,
      sortBy: "expiration-date",
      mode: "full-trip",
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/50">
      {/* Modal container */}
      <div className="w-full max-h-[90vh] overflow-y-auto rounded-t-2xl bg-white p-6 shadow-lg">
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

        {/* Mode section */}
        <div className="mb-6">
          <h3 className="mb-3 text-sm font-semibold text-gray-900">Mode:</h3>
          <div className="space-y-3">
            <Select
              value={filters.mode || "full-trip"}
              onValueChange={(value) =>
                setFilters({
                  ...filters,
                  mode: value,
                  // Clear incentive type when switching away from driver-incentives
                  incentiveType: value === "driver-incentives" ? filters.incentiveType : undefined,
                })
              }
            >
              <SelectTrigger className="h-12 border-gray-300 bg-white px-4 py-3 text-left text-gray-900">
                <SelectValue placeholder="Full Trip" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full-trip">Full Trip</SelectItem>
                <SelectItem value="driver-incentives">Driver Incentives</SelectItem>
              </SelectContent>
            </Select>

            {/* Incentive type sub-filter — only shown when Driver Incentives mode is active */}
            {filters.mode === "driver-incentives" && (
              <Select
                value={filters.incentiveType || "all"}
                onValueChange={(value) =>
                  setFilters({
                    ...filters,
                    incentiveType: value === "all" ? undefined : value,
                  })
                }
              >
                <SelectTrigger className="h-12 border-[#10B981]/40 bg-[#10B981]/5 px-4 py-3 text-left text-gray-900">
                  <SelectValue placeholder="All Incentives" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Incentives</SelectItem>
                  <SelectItem value="weekend-warrior">Weekend Warrior</SelectItem>
                  <SelectItem value="early-bird">Early Bird</SelectItem>
                  <SelectItem value="peak-hours">Peak Hours</SelectItem>
                  <SelectItem value="loyalty-streak">Loyalty Streak</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Clear Filters link */}
        <button
          onClick={handleClearFilters}
          className="mb-6 text-sm text-gray-400 hover:text-gray-600"
        >
          Clear Filters
        </button>

        {/* Update button */}
        <Button
          onClick={handleUpdateClick}
          className="w-full bg-[#10B981] px-6 py-3 text-base font-semibold text-white hover:bg-[#0EA371]"
        >
          Update
        </Button>
      </div>
    </div>
  );
}
