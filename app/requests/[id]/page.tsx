"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import { RideDetailLayout } from "@/components/driver/ride-detail-layout";
import { mockRequestTrips } from "@/lib/driver-data/mock-trips";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function RequestDetailPage({ params }: PageProps) {
  const { id } = use(params);
  
  const trip = mockRequestTrips.find((t) => t.id === id);
  
  if (!trip) {
    notFound();
  }
  
  return (
    <RideDetailLayout 
      trip={trip} 
      state="before-taken" 
      backHref="/requests" 
    />
  );
}
