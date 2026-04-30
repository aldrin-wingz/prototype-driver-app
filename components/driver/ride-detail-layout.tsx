"use client";

import { ChevronLeft, RefreshCw, AlertTriangle, Phone, MessageSquare, MoreHorizontal, Users, Info, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { ProgramContributionIndicator } from "./program-contribution-indicator";
import { useVariants } from "@/lib/variants-context";
import { cn } from "@/lib/utils";
import type { Trip, TripLeg, TimeAnchorType } from "@/lib/driver-data/mock-trips";

type DetailState = "before-taken" | "needs-action";

interface RideDetailLayoutProps {
  trip: Trip;
  state: DetailState;
  backHref: string;
}

function getTimeAnchorStyles(type: TimeAnchorType): { bg: string; text: string; border: string } {
  switch (type) {
    case "wait-for-call":
      return { bg: "bg-amber-400", text: "text-amber-600", border: "border-amber-400" };
    case "appointment":
      return { bg: "bg-[#10B981]", text: "text-[#10B981]", border: "border-[#10B981]" };
    case "scheduled":
      return { bg: "bg-[#10B981]", text: "text-[#10B981]", border: "border-[#10B981]" };
    case "est-pickup":
    default:
      return { bg: "bg-gray-800", text: "text-gray-800", border: "border-gray-800" };
  }
}

function LegCard({ leg, isFirst, isLast, state }: { 
  leg: TripLeg; 
  isFirst: boolean;
  isLast: boolean; 
  state: DetailState;
}) {
  const anchorStyles = getTimeAnchorStyles(leg.type);
  const showWaitForCall = leg.type === "wait-for-call";
  const showOTP = leg.type === "appointment";
  
  return (
    <div className="relative">
      {/* Timeline line - connects from previous to this node */}
      {!isFirst && (
        <div 
          className="absolute left-[7px] bottom-[calc(100%-8px)] w-0.5 bg-blue-500" 
          style={{ height: "24px" }}
        />
      )}
      
      {/* Timeline node and content */}
      <div className="flex gap-3">
        {/* Timeline node */}
        <div className="relative flex flex-col items-center">
          <div className={cn("h-4 w-4 rounded-full border-2", anchorStyles.bg, anchorStyles.border)} />
          {/* Line to next node */}
          {!isLast && (
            <div className="w-0.5 flex-1 bg-blue-500" style={{ minHeight: "80px" }} />
          )}
        </div>
        
        {/* Content */}
        <div className="flex-1 pb-4">
          <p className="text-sm font-medium text-gray-700">{leg.label}</p>
          <div className="flex items-center gap-2">
            <p className={cn("text-xl font-bold", anchorStyles.text)}>{leg.time}</p>
            {showWaitForCall && (
              <Phone className="h-4 w-4 text-amber-500" />
            )}
            {showOTP && (
              <span className="rounded border border-gray-400 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
                OTP
              </span>
            )}
          </div>
          
          {/* Revenue - show for first leg or legs with revenue */}
          {leg.revenue > 0 && (
            <p className="mt-1 font-semibold text-gray-900">
              ${leg.revenue.toFixed(2)} {state === "needs-action" && "Accepted by you"}
            </p>
          )}
          
          {/* Address details */}
          <p className="mt-1 text-sm text-gray-700">{leg.address.split(",")[0]}</p>
          <p className="text-sm text-gray-600">{leg.address}</p>
          <p className="text-sm text-gray-500">{leg.county}</p>
        </div>
      </div>
    </div>
  );
}

export function RideDetailLayout({ trip, state, backHref }: RideDetailLayoutProps) {
  const router = useRouter();
  const { variants, isLoaded } = useVariants();
  
  const subtitle = state === "before-taken" ? "Will-Call Ride" : "Accepted Ride";
  const hasWaitForCall = trip.legs.some(leg => leg.type === "wait-for-call");
  
  // Determine incentive eligibility
  const hasIncentives = trip.incentiveTypes && trip.incentiveTypes.length > 0 && trip.clientEnrolledInIncentives !== false;
  const incentiveTypes = hasIncentives ? trip.incentiveTypes! : [];
  
  // Determine if banner variant is active (banner renders ABOVE the metadata card)
  const isBannerVariant = isLoaded && (variants.pill === 'banner-wingz-hero' || variants.pill === 'achievement-banner');
  const isPillVariant = isLoaded && variants.pill === 'pill-named-bottom';
  
  return (
    <div className="flex min-h-screen flex-col bg-[#F9FAFB]">
      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between bg-white px-4 py-3 shadow-sm">
        <button 
          onClick={() => router.push(backHref)}
          className="flex items-center text-gray-700"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <div className="flex-1 text-center">
          <h1 className="text-base font-bold text-gray-900">
            #{trip.id} - {subtitle}
          </h1>
        </div>
        <button className="text-gray-700">
          <RefreshCw className="h-5 w-5" />
        </button>
      </header>
      
      {/* Scrollable content area */}
      <div className={cn(
        "flex-1 overflow-y-auto",
        state === "before-taken" ? "pb-28" : "pb-44"
      )}>
        {/* Map preview */}
        <div className="relative h-64 w-full bg-[#1e3a4c]">
          <iframe
            src="https://www.openstreetmap.org/export/embed.html?bbox=-84.9,33.4,-83.5,34.2&layer=mapnik"
            className="h-full w-full border-0 opacity-90"
            style={{ filter: "saturate(0.8) hue-rotate(150deg)" }}
            title="Trip route map"
          />
          {/* Route line overlay indicator */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-1 w-32 rounded-full bg-[#10B981]/60" />
          </div>
          
          {/* Confirmation alert - only for needs-action state */}
          {state === "needs-action" && (
            <div className="absolute bottom-4 left-4 right-4">
              <div className="rounded-lg bg-[#FEE2E2] border border-[#F87171] px-4 py-3">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#DC2626]" />
                  <div>
                    <p className="font-semibold text-[#991B1B]">Confirmation required</p>
                    <p className="text-sm text-[#991B1B]">
                      This ride has not been confirmed yet. Please call the rider first.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Banner variant: Incentive banner ABOVE the metadata card */}
        {hasIncentives && isBannerVariant && (
          <div className="mx-4 mt-4">
            <ProgramContributionIndicator
              incentiveTypes={incentiveTypes}
              isCompleted={false}
              context="detail"
            />
          </div>
        )}
        
        {/* Trip metadata card - sits cleanly below map with gap */}
        <Card className={cn(
          "mx-4 rounded-xl bg-white p-4 shadow-md",
          // Reduce top margin when banner is present above
          hasIncentives && isBannerVariant ? "mt-2" : "mt-4"
        )}>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm text-gray-600">
                When: <span className="font-semibold text-gray-900">{trip.date}</span>
              </p>
              <p className="text-sm text-gray-600">
                Rider: <span className="font-semibold text-gray-900">{trip.rider}</span>
              </p>
              <p className="text-sm text-gray-600">
                Client: <span className="font-semibold text-gray-900">{trip.client}</span>
                {trip.client === "Verida" && <span className="ml-1">🌿</span>}
              </p>
              {/* Leg ID inside the metadata card */}
              <p className="text-sm text-gray-600">
                Leg: <span className="font-semibold text-gray-900">{trip.legs[0]?.id || trip.id}</span>
              </p>
            </div>
            <div className="flex items-center gap-1 text-gray-500">
              <span className="text-sm">{trip.passengerCount}</span>
              <Users className="h-4 w-4" />
              <span className="font-semibold text-[#10B981]">
                ${trip.totalRevenue.toFixed(2)}
              </span>
              <Info className="h-4 w-4 text-gray-400" />
            </div>
          </div>
        </Card>
        
        {/* Pill variant: Incentive pills BELOW the metadata card */}
        {hasIncentives && isPillVariant && (
          <div className="mx-4 mt-3">
            <ProgramContributionIndicator
              incentiveTypes={incentiveTypes}
              isCompleted={false}
              context="detail"
            />
          </div>
        )}
        
        {/* Leg details section */}
        <div className="p-4">
          
          {/* Leg cards with timeline */}
          <div className="ml-1">
            {trip.legs.map((leg, index) => (
              <LegCard 
                key={leg.id}
                leg={leg}
                isFirst={index === 0}
                isLast={index === trip.legs.length - 1}
                state={state}
              />
            ))}
          </div>
          
          {/* Notes */}
          {trip.notes && (
            <p className="mt-2 text-sm text-gray-600">
              <span className="font-medium text-gray-700">Notes:</span> {trip.notes}
            </p>
          )}
          
          {/* Status pill */}
          {state === "before-taken" && (
            <div className="mt-3">
              <span className="inline-block rounded-full bg-[#F3F4F6] px-3 py-1 text-xs font-medium text-[#6B7280]">
                Expires in 185 days
              </span>
            </div>
          )}
          
          {state === "needs-action" && (
            <div className="mt-3">
              <span className="inline-block rounded-full bg-[#FEE2E2] px-3 py-1 text-xs font-medium text-[#991B1B]">
                Not Confirmed
              </span>
            </div>
          )}
        </div>
      </div>
      
      {/* Bottom region - varies by state */}
      {state === "before-taken" ? (
        /* Swipe footer for before-taken */
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-white px-4 py-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
          <div className="relative flex h-14 items-center justify-center overflow-hidden rounded-full">
            {/* Pink reject side */}
            <div className="absolute inset-y-0 left-0 w-1/2 bg-[#F472B6]" />
            {/* Green accept side */}
            <div className="absolute inset-y-0 right-0 w-1/2 bg-[#34D399]" />
            
            {/* Center pill with logo */}
            <div className="absolute left-1/2 top-1/2 z-10 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-md">
              <svg className="h-6 w-6 text-[#10B981]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" fill="none" />
              </svg>
            </div>
            
            {/* Labels */}
            <span className="relative z-10 pr-8 text-sm font-bold uppercase text-white">
              Swipe to Reject
            </span>
            <span className="relative z-10 pl-8 text-sm font-bold uppercase text-white">
              Swipe to Accept
            </span>
          </div>
        </div>
      ) : (
        /* Action toolbar + CTA for needs-action */
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
          {/* Action toolbar */}
          <div className="flex items-center justify-around border-b border-gray-100 px-4 py-3">
            <button className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#10B981]">
              <RotateCcw className="h-5 w-5 text-[#10B981]" />
            </button>
            <button className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#EC4899]">
              <RotateCcw className="h-5 w-5 rotate-180 text-[#EC4899]" />
            </button>
            <button className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-gray-300">
              <Phone className="h-5 w-5 text-gray-600" />
            </button>
            <button className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-gray-300">
              <MessageSquare className="h-5 w-5 text-gray-600" />
            </button>
            <span className="text-sm font-medium text-gray-700">More</span>
          </div>
          
          {/* Sticky red CTA */}
          <div className="px-4 py-4">
            <button className="flex w-full items-center justify-center gap-3 rounded-full bg-[#F97316] py-4 text-white shadow-lg">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                <Phone className="h-5 w-5" />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold uppercase">I Reached Out to Confirm</p>
                <p className="text-xs opacity-90">A Leg</p>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
