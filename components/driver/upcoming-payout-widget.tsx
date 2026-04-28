"use client";

import { useState } from "react";
import { Check, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  getWeeklyPayoutData,
  getPayoutBreakdown,
  INCENTIVE_PILL_COLORS,
} from "@/lib/data/incentive-utils";

// -----------------------------------------------------------------------------
// PAYOUT BREAKDOWN SHEET
// -----------------------------------------------------------------------------

interface PayoutBreakdownSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function PayoutBreakdownSheet({ open, onOpenChange }: PayoutBreakdownSheetProps) {
  const payoutData = getWeeklyPayoutData();
  const breakdown = getPayoutBreakdown();
  
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[80vh] rounded-t-2xl">
        <SheetHeader className="text-left">
          <SheetTitle>Payout Breakdown</SheetTitle>
          <SheetDescription>
            Next payout: {payoutData.nextPayoutDateFormatted}
          </SheetDescription>
        </SheetHeader>
        
        <div className="mt-6 space-y-4">
          {/* Base earnings */}
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-sm text-gray-600">Base Earnings</span>
            <span className="text-sm font-medium text-gray-900">
              ${payoutData.baseEarnings.toFixed(2)}
            </span>
          </div>
          
          {/* Incentive breakdown */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-900">Incentive Programs</h4>
            
            {breakdown.length === 0 ? (
              <p className="text-sm text-gray-500">No incentive programs this period.</p>
            ) : (
              <div className="space-y-2">
                {breakdown.map((item) => {
                  const colors = INCENTIVE_PILL_COLORS[item.incentiveType];
                  
                  return (
                    <div
                      key={item.incentiveType}
                      className={cn(
                        "flex items-center justify-between rounded-lg p-3",
                        item.isComplete ? "bg-[#10B981]/10" : "bg-gray-50"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        {item.isComplete ? (
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#10B981]">
                            <Check className="h-3 w-3 text-white" />
                          </div>
                        ) : (
                          <div className={cn("h-5 w-5 rounded-full", colors.bg, "border", colors.border)} />
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-900">{item.name}</p>
                          <p className="text-xs text-gray-500">
                            {item.isComplete 
                              ? `Completed (${item.targetCount}/${item.targetCount})`
                              : `In progress (${item.currentCount}/${item.targetCount})`
                            }
                          </p>
                        </div>
                      </div>
                      <span className={cn(
                        "text-sm font-bold",
                        item.isComplete ? "text-[#10B981]" : "text-gray-400"
                      )}>
                        {item.isComplete ? `+$${item.bonusAmount}` : "$0"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
            
            {/* In-progress note */}
            {breakdown.some(b => !b.isComplete) && (
              <p className="text-xs text-gray-500 italic">
                In-progress programs earn $0 until completed.
              </p>
            )}
          </div>
          
          {/* Total */}
          <div className="flex items-center justify-between border-t border-gray-200 pt-4">
            <span className="text-base font-semibold text-gray-900">Total Payout</span>
            <span className="text-xl font-bold text-[#10B981]">
              ${payoutData.totalPayout.toFixed(2)}
            </span>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------

export function UpcomingPayoutWidget() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const payoutData = getWeeklyPayoutData();
  
  const hasBonus = payoutData.bonusesEarned > 0;

  return (
    <>
      <Card 
        id="upcoming-payout"
        className="mx-4 mb-4 cursor-pointer rounded-xl bg-white p-4 shadow-sm transition-all hover:shadow-md active:scale-[0.99]"
        onClick={() => setSheetOpen(true)}
      >
        {/* Section header */}
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-600">Upcoming Payout</h3>
          <span className="text-xs text-gray-400">
            Next payout: {payoutData.nextPayoutDateFormatted}
          </span>
        </div>
        
        {/* Main amount */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-3xl font-bold text-[#10B981]">
              ${payoutData.totalPayout.toFixed(2)}
            </p>
            
            {/* Breakdown row */}
            <div className="mt-1 flex items-center gap-1 text-sm">
              <span className="text-gray-500">Base ${payoutData.baseEarnings.toFixed(2)}</span>
              {hasBonus ? (
                <>
                  <span className="text-gray-400">·</span>
                  <span className="font-semibold text-[#10B981]">
                    +${payoutData.bonusesEarned.toFixed(2)} bonus
                  </span>
                </>
              ) : (
                <>
                  <span className="text-gray-400">·</span>
                  <span className="text-gray-400">$0 bonus</span>
                </>
              )}
            </div>
            
            {/* Empty state message */}
            {!hasBonus && (
              <p className="mt-2 text-xs text-gray-400">
                No bonuses earned yet this week. Complete an incentive program to earn one.
              </p>
            )}
          </div>
          
          <ChevronRight className="h-5 w-5 text-gray-400" />
        </div>
      </Card>
      
      {/* Breakdown sheet */}
      <PayoutBreakdownSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </>
  );
}
