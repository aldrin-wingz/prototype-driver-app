"use client";

import React from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Trip } from "@/lib/driver-data/mock-trips";

const INCENTIVE_TYPE_LABELS: Record<string, string> = {
  'short-notice': 'Short Notice',
  'short-distance': 'Short Distance',
  'door-to-door': 'Door-to-Door',
  'standing-order': 'Standing Order',
};

interface IncentiveFilterProps {
  trips: Trip[];
  onFilterChange: (filtered: Trip[]) => void;
  initialIncentiveType?: string;
  onClearFilter?: () => void;
}

export function IncentiveFilter({
  trips,
  onFilterChange,
  initialIncentiveType,
  onClearFilter,
}: IncentiveFilterProps) {
  const [filterMode, setFilterMode] = React.useState<'all' | 'incentive'>(
    initialIncentiveType ? 'incentive' : 'all'
  );
  const [selectedType, setSelectedType] = React.useState<string>(
    initialIncentiveType || 'all'
  );
  const [showFilteredFromDashboard, setShowFilteredFromDashboard] =
    React.useState(!!initialIncentiveType);

  const handleFilterModeChange = (mode: 'all' | 'incentive') => {
    if (mode === 'all') {
      setFilterMode('all');
      setSelectedType('all');
      setShowFilteredFromDashboard(false);
      onFilterChange(trips);
    } else {
      setFilterMode('incentive');
      // Show only incentive-eligible trips when switching to incentive mode
      const filtered = trips.filter((t) => t.incentiveType);
      onFilterChange(filtered);
    }
  };

  const handleTypeChange = (type: string) => {
    setSelectedType(type);
    setShowFilteredFromDashboard(false);

    if (type === 'all') {
      // Show only incentive-eligible trips
      const filtered = trips.filter((t) => t.incentiveType);
      onFilterChange(filtered);
    } else {
      // Filter by specific incentive type
      const filtered = trips.filter((t) => t.incentiveType === type);
      onFilterChange(filtered);
    }
  };

  const handleClear = () => {
    setFilterMode('all');
    setSelectedType('all');
    setShowFilteredFromDashboard(false);
    onFilterChange(trips);
    onClearFilter?.();
  };

  const showTypeSelect = filterMode === 'incentive';

  return (
    <div className="space-y-3 border-b border-gray-200 px-4 py-3">
      {/* Filter Mode Chips */}
      <div className="flex gap-2">
        <button
          onClick={() => handleFilterModeChange('all')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            filterMode === 'all'
              ? 'bg-[#10B981] text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All Trips
        </button>
        <button
          onClick={() => handleFilterModeChange('incentive')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            filterMode === 'incentive'
              ? 'bg-[#10B981] text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Incentive-Eligible
        </button>
      </div>

      {/* Type Select */}
      {showTypeSelect && (
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-2">
            Type
          </label>
          <Select value={selectedType} onValueChange={handleTypeChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Incentives</SelectItem>
              <SelectItem value="short-notice">Short Notice</SelectItem>
              <SelectItem value="short-distance">Short Distance</SelectItem>
              <SelectItem value="door-to-door">Door-to-Door</SelectItem>
              <SelectItem value="standing-order">Standing Order</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Filtered from Dashboard Chip */}
      {showFilteredFromDashboard && initialIncentiveType && (
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="border-[#10B981] text-[#10B981] text-xs"
          >
            Filtered from Dashboard: {INCENTIVE_TYPE_LABELS[initialIncentiveType] || initialIncentiveType}
            <button
              onClick={handleClear}
              className="ml-1.5 hover:opacity-70"
              aria-label="Clear filter"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        </div>
      )}
    </div>
  );
}
