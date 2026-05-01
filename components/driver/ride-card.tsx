"use client";

import { Expand, Users, Phone } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useVariants } from "@/lib/variants-context";
import type { Trip, TripLeg, TripPill, TimeAnchorType } from "@/lib/driver-data/mock-trips";
import { ProgramContributionIndicator } from "./program-contribution-indicator";
import { RevenueDisplay } from "./revenue-display";

interface RideCardProps {
  trip: Trip;
  revenueColor?: "green" | "blue";
  onClick?: () => void;
  showDistance?: boolean;
}

function getTimeAnchorStyles(type: TimeAnchorType): { bg: string; text: string } {
  switch (type) {
    case "wait-for-call":
      return { bg: "bg-amber-400", text: "text-amber-600" };
    case "appointment":
      return { bg: "bg-[#10B981]", text: "text-[#10B981]" };
    case "scheduled":
      return { bg: "bg-[#10B981]", text: "text-[#10B981]" };
    case "est-pickup":
    default:
      return { bg: "bg-gray-800", text: "text-gray-800" };
  }
}

function getPillStyles(variant: TripPill["variant"]): string {
  switch (variant) {
    case "success":
      return "bg-[#D1FAE5] text-[#065F46]";
    case "warning":
      return "bg-[#FED7AA] text-[#9A3412]";
    case "attention":
      return "bg-[#FEF3C7] text-[#92400E]";
    case "neutral":
      return "bg-[#F3F4F6] text-[#374151]";
    case "danger":
      return "bg-[#FEE2E2] text-[#991B1B]";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

function LegBlock({ leg, isLast, revenueColor, isCompleted }: { 
  leg: TripLeg; 
  isLast: boolean; 
  revenueColor: "green" | "blue";
  isCompleted: boolean;
}) {
  const anchorStyles = getTimeAnchorStyles(leg.type);
  const showWaitForCall = leg.type === "wait-for-call";
  
  return (
    <div className="relative">
      {/* Timeline connector */}
      <div className="absolute left-[7px] top-4 flex flex-col items-center">
        <div className={cn("h-3.5 w-3.5 rounded-full", anchorStyles.bg)} />
        {!isLast && (
          <div className="h-full w-0.5 bg-[#10B981]" style={{ minHeight: "60px" }} />
        )}
      </div>
      
      <div className="ml-7 pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-700">{leg.label}</p>
            <div className="flex items-center gap-2">
              <p className={cn("text-lg font-bold", anchorStyles.text)}>{leg.time}</p>
              {showWaitForCall && (
                <Phone className="h-4 w-4 text-amber-500" />
              )}
              {leg.type === "appointment" && (
                <span className="rounded border border-gray-400 px-1 py-0.5 text-[10px] font-medium text-gray-600">
                  OTP
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className={cn(
              "text-sm",
              isCompleted ? "text-blue-600" : "text-gray-600"
            )}>
              {leg.county}
            </p>
            {leg.revenue > 0 && (
              <p className={cn(
                "font-semibold",
                revenueColor === "blue" ? "text-blue-600" : "text-[#10B981]"
              )}>
                ${leg.revenue.toFixed(2)}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function RideCard({ trip, revenueColor = "green", onClick, showDistance = true }: RideCardProps) {
  const { variants, isLoaded } = useVariants();
  const isCompleted = trip.status === "completed";
  const hasIncentives = !!trip.incentiveType;
  
  // Banner variants render at the top of the card (banner-wingz-hero, achievement-banner)
  const isBannerVariant = isLoaded && (variants.pill === "banner-wingz-hero" || variants.pill === "achievement-banner");

  return (
    <Card 
      className={cn(
        "relative cursor-pointer bg-white shadow-sm transition-shadow hover:shadow-md",
        isBannerVariant && hasIncentives ? "rounded-xl overflow-hidden" : "rounded-xl p-4"
      )}
      onClick={onClick}
    >
      {/* Banner Variants - render at top of card */}
      {isBannerVariant && hasIncentives && (
        <ProgramContributionIndicator
          incentiveType={trip.incentiveType!}
          isCompleted={isCompleted}
        />
      )}

      {/* Card content wrapper - adds padding when banner is present */}
      <div className={cn(isBannerVariant && hasIncentives && "p-4")}>
        {/* Header section */}
      <div className="mb-3 flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-600">
            When: <span className="font-semibold text-gray-900">{trip.date}</span>
          </p>
          <p className="text-sm text-gray-600">
            Rider: <span className="font-semibold text-gray-900">{trip.rider}</span>
          </p>
          <p className="text-sm text-gray-600">
            Client: <span className="font-semibold text-gray-900">{trip.client}</span>
          </p>
        </div>
        
        <div className="flex flex-col items-end gap-1">
          <button className="text-gray-500 hover:text-gray-700">
            <Expand className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-gray-500">
              <span className="text-sm">{trip.passengerCount}</span>
              <Users className="h-4 w-4" />
            </div>
            <RevenueDisplay
              totalRevenue={trip.totalRevenue}
              addons={trip.revenueAddons}
              revenueColor={revenueColor}
              layout="vertical"
            />
          </div>
          {showDistance && trip.distance && (
            <p className="text-xs text-gray-500">{trip.distance}</p>
          )}
        </div>
      </div>

      {/* Legs timeline */}
      <div className="mb-3">
        {trip.legs.map((leg, index) => (
          <LegBlock 
            key={leg.id} 
            leg={leg} 
            isLast={index === trip.legs.length - 1}
            revenueColor={revenueColor}
            isCompleted={isCompleted}
          />
        ))}
      </div>

      {/* Notes */}
      {trip.notes && (
        <p className="mb-3 text-sm text-gray-500">
          <span className="font-medium text-gray-700">Notes:</span> {trip.notes}
        </p>
      )}

      {/* Pills row (existing pills + incentive pills for pill-named-bottom variant) */}
      <div className="flex flex-wrap gap-2">
        {/* Existing pills (Single Legs Allowed, Expires in X, Not Confirmed, etc.) */}
        {trip.pills.map((pill, index) => (
          <span
            key={index}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium",
              getPillStyles(pill.variant)
            )}
          >
            {pill.label}
          </span>
        ))}

        {/* Incentive pills (pill-named-bottom variant only) */}
        {isLoaded && variants.pill === "pill-named-bottom" && hasIncentives && (
          <ProgramContributionIndicator
            incentiveType={trip.incentiveType!}
            isCompleted={isCompleted}
          />
        )}
      </div>
      </div>
    </Card>
  );
}
