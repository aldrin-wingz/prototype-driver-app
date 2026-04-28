"use client";

import { ChevronRight, Sheet as SheetIcon } from "lucide-react";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useVariants } from "@/lib/variants-context";
import { PillRowVariant } from "./incentive-badge-renderer";
import { getIncentiveProgressInfo, INCENTIVE_DISPLAY_NAMES, getIncentiveTripLabel } from "@/lib/data/incentive-utils";
import type { Trip } from "@/lib/driver-data/mock-trips";
import type { IncentiveType } from "@/lib/data/incentives";
import { cn } from "@/lib/utils";

interface RideDetailIncentiveCalloutProps {
  trip: Trip;
  state: "before-taken" | "needs-action";
}

// ===== VARIANT 1: Inline Badge =====
function InlineBadgeVariant({ trip }: { trip: Trip }) {
  const incentiveTypes = trip.incentiveTypes || [];
  
  if (!trip.clientEnrolledInIncentives) {
    return null; // Hide for ineligible clients on inline badge
  }
  
  if (incentiveTypes.length === 0) {
    return null; // No incentives
  }
  
  const primaryType = incentiveTypes[0];
  const progress = getIncentiveProgressInfo(primaryType);
  
  if (!progress) return null;
  
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#ECFDF5] px-2.5 py-1 text-sm font-semibold">
      <span className="text-[#10B981]">+${progress.bonusAmount}</span>
      <span className="text-[#065F46] text-xs">{getIncentiveTripLabel(primaryType)}</span>
    </span>
  );
}

// ===== VARIANT 2: Section Pill =====
function SectionPillVariant({ trip }: { trip: Trip }) {
  const incentiveTypes = trip.incentiveTypes || [];
  
  if (!trip.clientEnrolledInIncentives) {
    return (
      <Card className="mx-4 rounded-xl bg-white p-4 shadow-sm border border-gray-200">
        <p className="text-sm text-gray-600">
          This client is not enrolled in driver incentives.
        </p>
      </Card>
    );
  }
  
  if (incentiveTypes.length === 0) {
    return null; // No incentives, nothing to show
  }
  
  return (
    <Card className="mx-4 rounded-xl bg-white shadow-sm border border-gray-100">
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 mb-4">Driver Incentives</h3>
        
        <div className="space-y-4">
          {incentiveTypes.map((type) => {
            const progress = getIncentiveProgressInfo(type);
            if (!progress) return null;
            
            const progressPercent = (progress.currentCount / progress.targetCount) * 100;
            
            return (
              <div key={type} className="flex items-start gap-3">
                {/* Badge/Pill */}
                <div className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-[#10B981]/10">
                  <span className="text-xs font-bold text-[#10B981]">✓</span>
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-900">{progress.name}</p>
                    <span className="text-xs font-semibold text-[#10B981]">
                      Earn ${progress.bonusAmount}
                    </span>
                  </div>
                  
                  {/* Progress meter */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#10B981] transition-all"
                        style={{ width: `${Math.min(progressPercent, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-600 tabular-nums whitespace-nowrap">
                      {progress.currentCount}/{progress.targetCount}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

// ===== VARIANT 3: Map Banner =====
function MapBannerVariant({ trip }: { trip: Trip }) {
  const [isOpen, setIsOpen] = useState(false);
  const incentiveTypes = trip.incentiveTypes || [];
  
  if (!trip.clientEnrolledInIncentives) {
    return (
      <>
        <div className="flex items-center gap-3 bg-gray-100 px-3 py-2.5 text-sm">
          <span className="text-gray-700">This client is not enrolled in driver incentives.</span>
        </div>
      </>
    );
  }
  
  if (incentiveTypes.length === 0) {
    return null; // No incentives
  }
  
  const primaryType = incentiveTypes[0];
  const progress = getIncentiveProgressInfo(primaryType);
  
  if (!progress) return null;
  
  // Format label - show count for multi-incentive
  const displayLabel = incentiveTypes.length > 1
    ? `${incentiveTypes.length} Incentives`
    : progress.name;
  
  return (
    <>
      {/* Banner overlay on map bottom edge */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex w-full items-center justify-between gap-2 bg-gradient-to-r from-[#10B981] to-[#059669] px-3 py-2.5 text-sm font-medium text-white hover:from-[#059669] hover:to-[#047857] transition-all"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">🎯</span>
          <span>{displayLabel} — +${progress.bonusAmount}</span>
        </div>
        <ChevronRight className="h-4 w-4" />
      </button>
      
      {/* Expand sheet */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="bottom" className="max-h-[80vh]">
          <SheetHeader className="mb-4">
            <SheetTitle>Incentive Programs</SheetTitle>
          </SheetHeader>
          
          <div className="space-y-4 pb-8">
            {incentiveTypes.map((type) => {
              const prog = getIncentiveProgressInfo(type);
              if (!prog) return null;
              
              const progressPercent = (prog.currentCount / prog.targetCount) * 100;
              
              return (
                <div key={type} className="rounded-lg bg-gray-50 p-4 border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-900">{prog.name}</h4>
                    <span className="text-sm font-bold text-[#10B981]">
                      +${prog.bonusAmount}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-700 mb-3">{prog.description}</p>
                  
                  {/* Progress meter */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2.5 bg-gray-300 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#10B981] transition-all"
                        style={{ width: `${Math.min(progressPercent, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-600 tabular-nums whitespace-nowrap">
                      {prog.currentCount}/{prog.targetCount}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

// ===== MAIN COMPOSITE COMPONENT =====
export function RideDetailIncentiveCallout({ trip, state }: RideDetailIncentiveCalloutProps) {
  const { variants } = useVariants();
  
  switch (variants.detail) {
    case "detail-inline-badge":
      return <InlineBadgeVariant trip={trip} />;
    
    case "detail-section-pill":
      return <SectionPillVariant trip={trip} />;
    
    case "detail-map-banner":
      return <MapBannerVariant trip={trip} />;
    
    default:
      return null;
  }
}

// Export sub-components for direct use if needed
export { InlineBadgeVariant, SectionPillVariant, MapBannerVariant };
