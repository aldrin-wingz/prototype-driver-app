"use client";

// App-I-6.1 (Resume Wave, 2026-05-12) — Per-Incentive Rides view route.
// Renamed from `/incentives/[id]/history/page.tsx` (App-I-6).
//
// Reads from URL param `id` (App's IncentiveDefinition.id, e.g.
// `inc-pp-001`). Renders the header card + always-on Eligibility
// criteria block + unconditional rides list inside
// `<IncentiveRidesView>`. The "View rides →" CTA on the dashboard
// `<IncentiveCard>` (see dashboard-incentive-section.tsx) navigates here.

import { use } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { IncentiveRidesView } from "@/components/driver/incentive-rides-view";
import { incentiveDefinitions } from "@/lib/data/incentives";

interface IncentiveRidesPageProps {
  // Next.js 15: route params are an awaitable Promise. `use()` unwraps it client-side.
  params: Promise<{ id: string }>;
}

export default function IncentiveRidesPage({ params }: IncentiveRidesPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const incentive = incentiveDefinitions.find((i) => i.id === id);

  return (
    <div className="flex h-[100dvh] flex-col bg-[#F9FAFB]">
      <header className="relative flex h-14 shrink-0 items-center justify-between bg-white px-4 shadow-sm">
        <button
          onClick={() => router.back()}
          className="flex h-10 w-10 items-center justify-center text-gray-700"
          aria-label="Back"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="absolute left-1/2 -translate-x-1/2 text-lg font-semibold text-gray-900">
          Rides
        </h1>
        <div className="w-10" />
      </header>

      {incentive ? (
        <IncentiveRidesView incentive={incentive} />
      ) : (
        <div className="flex-1 flex items-center justify-center px-6 text-center text-sm text-gray-500">
          Incentive not found.
          <button
            onClick={() => router.push("/incentives")}
            className="ml-2 text-[#10B981] underline"
          >
            Back to list
          </button>
        </div>
      )}
    </div>
  );
}
