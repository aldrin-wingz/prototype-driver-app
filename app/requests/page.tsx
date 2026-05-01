"use client";

import { useRouter, useSearchParams } from "next/navigation";
import React from "react";
import { Header } from "@/components/driver/header";
import { BottomNav } from "@/components/driver/bottom-nav";
import { RideCard } from "@/components/driver/ride-card";
import { IncentiveFilter } from "@/components/driver/incentive-filter";
import { Button } from "@/components/ui/button";
import { mockRequestTrips } from "@/lib/driver-data/mock-trips";
import { useToast } from "@/hooks/use-toast";

export default function RequestsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [filteredTrips, setFilteredTrips] = React.useState(mockRequestTrips);

  // Initialize filter from URL param on mount
  React.useEffect(() => {
    const incentiveParam = searchParams.get("incentive");
    if (incentiveParam) {
      const filtered = mockRequestTrips.filter((t) => t.incentiveType === incentiveParam);
      setFilteredTrips(filtered);
    }
  }, [searchParams]);

  const handleFilterChange = (filtered: any[]) => {
    setFilteredTrips(filtered);
  };

  const handleClearFilter = () => {
    router.replace("/requests");
  };

  const handleFilterClick = () => {
    toast({
      title: "Filter coming in I-5",
      description: "The filter modal will be built in step I-5.",
    });
  };

  const handleRefreshClick = () => {
    toast({
      title: "Refreshing...",
      description: "Request list refreshed.",
    });
  };

  const incentiveParam = searchParams.get("incentive");

  return (
    <div className="flex min-h-screen flex-col pb-20">
      <Header 
        title="Requests" 
        showFilter={true}
        showRefresh={true}
        onFilterClick={handleFilterClick}
        onRefreshClick={handleRefreshClick}
      />

      <IncentiveFilter
        trips={mockRequestTrips}
        onFilterChange={handleFilterChange}
        initialIncentiveType={incentiveParam || undefined}
        onClearFilter={handleClearFilter}
      />
      
      <main className="flex-1 p-4">
        {filteredTrips.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-12">
            <p className="text-center text-gray-600">
              No incentive-eligible trips right now.
            </p>
            <Button
              variant="outline"
              onClick={handleClearFilter}
            >
              Clear filter
            </Button>
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
