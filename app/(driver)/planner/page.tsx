"use client";

import { Header } from "@/components/driver/header";
import { BottomNav } from "@/components/driver/bottom-nav";
import { Calendar } from "lucide-react";

export default function PlannerPage() {
  return (
    <div className="flex min-h-screen flex-col pb-20">
      <Header title="Planner" showFilter={false} />
      
      <main className="flex flex-1 flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <Calendar className="h-8 w-8 text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Planner</h2>
          <p className="text-gray-500">
            Schedule and plan your rides here.
          </p>
          <p className="text-sm text-gray-400">
            (Placeholder - not part of prototype scope)
          </p>
        </div>
      </main>
      
      <BottomNav />
    </div>
  );
}
