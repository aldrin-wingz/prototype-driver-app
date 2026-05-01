"use client";

import { useRouter } from "next/navigation";
import React from "react";
import { Header } from "@/components/driver/header";
import { BottomNav } from "@/components/driver/bottom-nav";
import { RideCard } from "@/components/driver/ride-card";
import { FilterRequestsModal, type RequestFilters } from "@/components/driver/filter-requests-modal";
import { Button } from "@/components/ui/button";
import { mockRequestTrips } from "@/lib/driver-data/mock-trips";
import { useToast } from "@/hooks/use-toast";

export default function RequestsPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [filteredTrips, setFilteredTrips] = React.useState(mockRequestTrips);
  const [appliedFilters, setAppliedFilters] = React.useState<RequestFilters>({});

  const handleFilterClick = () => {
    setIsFilterOpen(true);
  };

  const handleFilterUpdate = (filters: RequestFilters) => {
    setAppliedFilters(filters);
    // Apply filters to trips (mock filtering)
    let filtered = mockRequestTrips;
    
    if (filters.mode === "driver-incentives") {
      filtered = filtered.filter((t) => t.incentiveType);
    }
    
    setFilteredTrips(filtered);
  };

  const handleClearFilters = () => {
    setAppliedFilters({});
    setFilteredTrips(mockRequestTrips);
  };

  const handleRefreshClick = () => {
    toast({
      title: "Refreshing...",
      description: "Request list refreshed.",
    });
  };

  return (
    <div className="flex min-h-screen flex-col pb-20">
      <Header 
        title="Requests" 
        showFilter={true}
        showRefresh={true}
        onFilterClick={handleFilterClick}
        onRefreshClick={handleRefreshClick}
      />

      <FilterRequestsModal
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        onUpdate={handleFilterUpdate}
      />
      
      <main className="flex-1 p-4">
        {filteredTrips.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-12">
            <div className="flex flex-col items-center gap-2">
              <div className="h-32 w-32 opacity-20">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 1H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2zm0 16H6V3h12v14zm-6-10h3v3h-3v-3zm0 6h3v3h-3v-3zm-4-6h3v3H8v-3zm0 6h3v3H8v-3z" fill="currentColor"/>
                </svg>
              </div>
              <p className="text-center text-lg font-semibold text-gray-900">
                Looking for requests.
              </p>
              <p className="text-center text-sm text-gray-600">
                We&apos;re checking for available ride requests.
              </p>
            </div>
            <div className="mt-4 h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#10B981]" />
            {Object.keys(appliedFilters).length > 0 && (
              <Button
                variant="outline"
                onClick={handleClearFilters}
                className="mt-4"
              >
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTrips.map((trip) => (
              <RideCard
                key={trip.id}
                trip={trip}
                revenueColor="green"
                onClick={() => router.push(`/requests/${trip.id}`)}
              />
            ))}
          </div>
        )}
      </main>
      
      <BottomNav />
    </div>
  );
}
