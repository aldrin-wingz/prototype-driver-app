"use client";

import { Header } from "@/components/driver/header";
import { BottomNav } from "@/components/driver/bottom-nav";
import { RideCard } from "@/components/driver/ride-card";
import { mockRequestTrips } from "@/lib/driver-data/mock-trips";
import { useToast } from "@/hooks/use-toast";

export default function RequestsPage() {
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
      
      <main className="flex-1 space-y-4 p-4">
        {mockRequestTrips.map((trip) => (
          <RideCard
            key={trip.id}
            trip={trip}
            revenueColor="green"
            onClick={() => console.log("[v0] Navigate to request detail:", trip.id)}
          />
        ))}
      </main>
      
      <BottomNav />
    </div>
  );
}
