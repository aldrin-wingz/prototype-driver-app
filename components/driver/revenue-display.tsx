"use client";

import { Info } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface RevenueAddOn {
  label: string;
  amount: number;
}

interface RevenueDisplayProps {
  totalRevenue: number;
  addons?: RevenueAddOn[];
  revenueColor?: "green" | "blue";
  layout?: "vertical" | "inline";
}

export function RevenueDisplay({
  totalRevenue,
  addons,
  revenueColor = "green",
  layout = "vertical",
}: RevenueDisplayProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);

  // Calculate base revenue by subtracting addons
  const addonTotal = addons?.reduce((sum, addon) => sum + addon.amount, 0) ?? 0;
  const baseRevenue = totalRevenue - addonTotal;

  // If no addons, render simple single value
  if (!addons || addons.length === 0) {
    return (
      <p
        className={cn(
          "font-semibold",
          revenueColor === "blue" ? "text-blue-600" : "text-[#10B981]"
        )}
      >
        ${totalRevenue.toFixed(2)}
      </p>
    );
  }

  // Render with addon(s)
  const revenueClass =
    revenueColor === "blue" ? "text-blue-600" : "text-[#10B981]";
  const addonClass = "text-[#10B981]";

  if (layout === "vertical") {
    return (
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <button className="text-left hover:opacity-80 transition-opacity">
            <p className={cn("font-semibold", revenueClass)}>
              ${baseRevenue.toFixed(2)}
            </p>
            <p className={cn("text-sm font-semibold", addonClass)}>
              +${addonTotal.toFixed(2)}
            </p>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3">
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">
              Revenue Breakdown
            </p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-700">${baseRevenue.toFixed(2)} base</span>
              </div>
              {addons.map((addon, idx) => (
                <div key={idx} className="flex justify-between">
                  <span className="text-gray-600">+${addon.amount.toFixed(2)} {addon.label}</span>
                </div>
              ))}
            </div>
            <div className="border-t pt-2 mt-2 flex justify-between font-semibold text-sm">
              <span className="text-gray-700">${totalRevenue.toFixed(2)} total</span>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  // Inline layout
  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <button className="text-left hover:opacity-80 transition-opacity flex items-center gap-1">
          <p className={cn("font-semibold", revenueClass)}>
            ${baseRevenue.toFixed(2)}
          </p>
          <p className={cn("text-sm font-semibold", addonClass)}>
            +${addonTotal.toFixed(2)}
          </p>
          <Info className="h-4 w-4 text-gray-400" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3">
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">
            Revenue Breakdown
          </p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-700">${baseRevenue.toFixed(2)} base</span>
            </div>
            {addons.map((addon, idx) => (
              <div key={idx} className="flex justify-between">
                <span className="text-gray-600">+${addon.amount.toFixed(2)} {addon.label}</span>
              </div>
            ))}
          </div>
          <div className="border-t pt-2 mt-2 flex justify-between font-semibold text-sm">
            <span className="text-gray-700">${totalRevenue.toFixed(2)} total</span>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
