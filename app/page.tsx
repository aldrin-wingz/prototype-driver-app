"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Info, ClipboardCheck } from "lucide-react";
import { Header } from "@/components/driver/header";
import { BottomNav } from "@/components/driver/bottom-nav";
import { RideCard } from "@/components/driver/ride-card";
import { Card } from "@/components/ui/card";
import { DashboardIncentiveSection } from "@/components/driver/dashboard-incentive-section";
import {
  mockRequestTrips,
  mockNeedsActionTrips,
  mockEarningsThisMonth,
  mockEarningsLastMonth,
  type EarningsData,
} from "@/lib/driver-data/mock-trips";

function EarningsCard({
  data,
  onPrevious,
  onNext,
  showPrevious,
  showNext,
}: {
  data: EarningsData;
  onPrevious: () => void;
  onNext: () => void;
  showPrevious: boolean;
  showNext: boolean;
}) {
  return (
    <Card className="relative mx-4 mb-4 overflow-hidden rounded-xl bg-white p-6 shadow-sm">
      {/* Period navigation */}
      <div className="mb-2 flex items-center justify-center">
        <h2 className="text-center text-lg font-semibold text-gray-900">{data.label}</h2>
      </div>

      {/* Earnings amount */}
      <div className="mb-1 flex items-center justify-center gap-1">
        <p className="text-4xl font-bold text-gray-900">${data.earnings.toFixed(2)}</p>
      </div>
      <div className="mb-4 flex items-center justify-center gap-1">
        <span className="text-xs font-medium tracking-wide text-gray-500">EARNINGS</span>
        <Info className="h-3 w-3 text-gray-400" />
      </div>

      {/* Chevron navigation */}
      {showPrevious && (
        <button
          onClick={onPrevious}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-2 text-gray-800 hover:text-gray-600"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}
      {showNext && (
        <button
          onClick={onNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-gray-800 hover:text-gray-600"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 border-t border-gray-100 pt-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">{data.trips}</p>
          <div className="flex items-center justify-center gap-1">
            <span className="text-xs font-medium tracking-wide text-gray-500">
              {data.period === "this-month" ? "TRIPS" : "COMPLETED"}
            </span>
            <Info className="h-3 w-3 text-gray-400" />
          </div>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">{data.onTimePerformance}</p>
          <div className="flex items-center justify-center gap-1">
            <span className="text-xs font-medium tracking-wide text-gray-500">ON-TIME</span>
          </div>
          <div className="flex items-center justify-center gap-1">
            <span className="text-xs font-medium tracking-wide text-gray-500">PERFORMANCE</span>
            <Info className="h-3 w-3 text-gray-400" />
          </div>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">{data.sendBacks}</p>
          <div className="flex items-center justify-center gap-1">
            <span className="text-xs font-medium tracking-wide text-gray-500">SEND BACKS</span>
            <Info className="h-3 w-3 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Pagination dots */}
      <div className="mt-4 flex justify-center gap-2">
        <div
          className={`h-2 w-2 rounded-full ${data.period === "this-month" ? "bg-gray-400" : "bg-gray-800"}`}
        />
        <div
          className={`h-2 w-2 rounded-full ${data.period === "last-month" ? "bg-gray-400" : "bg-gray-800"}`}
        />
      </div>
    </Card>
  );
}

function ConfirmTripPrompt() {
  return (
    <Card className="mx-4 mb-4 flex cursor-pointer items-center gap-3 rounded-xl bg-gray-900 p-4 text-white shadow-sm transition-opacity hover:opacity-95 active:opacity-90">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#10B981]">
        <ClipboardCheck className="h-5 w-5 text-white" />
      </div>
      <div className="flex-1">
        <p className="font-semibold leading-snug">Confirm Your Upcoming Trip</p>
        <p className="text-sm leading-snug text-white/85">
          Your next trip requires action. Tap to view rides awaiting confirmation.
        </p>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-white/80" />
    </Card>
  );
}

/**
 * Driver Home (dashboard) page.
 *
 * v1 locked variant: `dashboard-card-section` — DashboardIncentiveSection
 * renders only in the middle slot. The dashboard-banner top placement and the
 * dashboard-widget-integrated path were stripped in I-0.
 */
export default function HomePage() {
  const [period, setPeriod] = useState<"this-month" | "last-month">("this-month");

  const earningsData =
    period === "this-month" ? mockEarningsThisMonth : mockEarningsLastMonth;
  const previewRequest = mockRequestTrips[0];
  const needsActionTrip = mockNeedsActionTrips[0];

  return (
    <div className="flex min-h-screen flex-col bg-[#F9FAFB] pb-20">
      <Header title="Home" />

      <main className="flex-1 pt-4">
        {/* 1. Earnings Card */}
        <EarningsCard
          data={earningsData}
          onPrevious={() => setPeriod("this-month")}
          onNext={() => setPeriod("last-month")}
          showPrevious={period === "last-month"}
          showNext={period === "this-month"}
        />

        {/* 2. Confirm Trip Prompt */}
        <ConfirmTripPrompt />

        {/* 3. Driver Incentives — locked variant: dashboard-card-section */}
        <DashboardIncentiveSection placement="middle" />

        {/* 4. New Requests Section */}
        <div className="px-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">New Requests</h3>
            <button className="text-sm text-gray-500 hover:text-gray-700">View All</button>
          </div>
          {previewRequest && <RideCard trip={previewRequest} revenueColor="green" />}
        </div>

        {/* Next Accepted Ride Section */}
        {needsActionTrip && (
          <div className="mt-6 px-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Next Accepted Ride</h3>
              <button className="text-sm text-gray-500 hover:text-gray-700">View All</button>
            </div>
            <RideCard
              trip={{
                ...needsActionTrip,
                pills: [{ label: "Not Confirmed", variant: "danger" }],
              }}
              revenueColor="green"
              showDistance={false}
            />
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
