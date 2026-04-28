"use client";

import { Header } from "@/components/driver/header";
import { RideCard } from "@/components/driver/ride-card";
import { mockCompletedTrips } from "@/lib/driver-data/mock-trips";
import { useToast } from "@/hooks/use-toast";

export default function RideHistoryPage() {
  const { toast } = useToast();
  
  const handleFilterClick = () => {
    toast({
      title: "Filter coming in I-5",
      description: "The filter modal will be built in step I-5.",
    });
  };
  
  const handleRefreshClick = () => {
    toast({
      title: "Refreshing...",
      description: "History refreshed.",
    });
  };
  
  return (
    <div className="flex min-h-screen flex-col">
      <Header 
        title="Ride History" 
        showBack={true}
        showMessages={false}
        showFilter={true}
        showRefresh={true}
        onFilterClick={handleFilterClick}
        onRefreshClick={handleRefreshClick}
      />
      
      <main className="flex-1 space-y-4 p-4">
        {mockCompletedTrips.map((trip) => (
          <RideCard
            key={trip.id}
            trip={trip}
            revenueColor="blue"
            showDistance={false}
            onClick={() => console.log("[v0] Navigate to completed ride detail:", trip.id)}
          />
        ))}
      </main>
      
      {/* No BottomNav - this is a stack-pushed screen */}
    </div>
  );
}
