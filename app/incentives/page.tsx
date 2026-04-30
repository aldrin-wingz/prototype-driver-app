"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  getAllIncentiveProgress,
  INCENTIVE_PILL_COLORS,
  type IncentiveProgressInfo,
} from "@/lib/data/incentive-utils";
import type { IncentiveType } from "@/lib/data/incentives";

// -----------------------------------------------------------------------------
// Progress Meter (reused from dashboard-incentive-section)
// -----------------------------------------------------------------------------

interface ProgressMeterProps {
  currentCount: number;
  scheduledCount: number;
  targetCount: number;
  isComplete: boolean;
}

function ProgressMeter({ 
  currentCount, 
  scheduledCount, 
  targetCount, 
  isComplete,
}: ProgressMeterProps) {
  const completedPercent = (currentCount / targetCount) * 100;
  const scheduledPercent = (scheduledCount / targetCount) * 100;
  const remainingCount = Math.max(0, targetCount - currentCount - scheduledCount);

  return (
    <div className="w-full space-y-1.5">
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className="absolute inset-y-0 left-0 transition-all bg-[#10B981]"
          style={{ width: `${Math.min(completedPercent, 100)}%` }}
        />
        {scheduledCount > 0 && (
          <div
            className="absolute inset-y-0 bg-[#10B981]/40"
            style={{ 
              left: `${completedPercent}%`,
              width: `${Math.min(scheduledPercent, 100 - completedPercent)}%`,
              backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.4) 2px, rgba(255,255,255,0.4) 4px)'
            }}
          />
        )}
      </div>
      <div className="flex items-center gap-1 text-xs">
        <span className="font-medium text-gray-700">{currentCount} done</span>
        {scheduledCount > 0 && (
          <span className="text-[#10B981]">+{scheduledCount} taken</span>
        )}
        {remainingCount > 0 && (
          <span className="text-gray-400">· {remainingCount} to go</span>
        )}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Incentive Card (full variant, reused from dashboard-incentive-section)
// -----------------------------------------------------------------------------

interface IncentiveCardProps {
  progress: IncentiveProgressInfo;
  onTap: (type: IncentiveType) => void;
}

function IncentiveCard({ progress, onTap }: IncentiveCardProps) {
  const colors = INCENTIVE_PILL_COLORS[progress.incentiveType];

  return (
    <button
      onClick={() => onTap(progress.incentiveType)}
      className={cn(
        "w-full rounded-xl border bg-white p-4 text-left shadow-sm transition-all hover:shadow-md active:scale-[0.99]",
        progress.isComplete && "opacity-80"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className={cn("text-xs font-medium", colors.bg, colors.text, colors.border)}>
              {progress.name}
            </Badge>
            {progress.isComplete && <span className="text-xs text-[#10B981] font-medium">Completed</span>}
          </div>
          <p className="text-sm text-gray-600 mb-3">{progress.description}</p>
          <ProgressMeter
            currentCount={progress.currentCount}
            scheduledCount={progress.scheduledCount}
            targetCount={progress.targetCount}
            isComplete={progress.isComplete}
          />
        </div>
        <div className="flex flex-col items-end justify-between self-stretch">
          <span className={cn("text-lg font-bold", progress.isComplete ? "text-[#10B981]" : "text-gray-900")}>
            ${progress.bonusAmount}
          </span>
          <ChevronRight className="h-5 w-5 text-gray-400" />
        </div>
      </div>
    </button>
  );
}

// -----------------------------------------------------------------------------
// Placeholder Tab Content
// -----------------------------------------------------------------------------

function PlaceholderContent({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-16">
      <Card className="mx-4 p-8 text-center bg-gray-50">
        <p className="text-gray-500">{message}</p>
      </Card>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Main Page Component
// -----------------------------------------------------------------------------

export default function IncentivesPage() {
  const router = useRouter();
  const progressItems = getAllIncentiveProgress();

  const handleCardTap = (type: IncentiveType) => {
    router.push(`/requests?incentive=${type}`);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#F9FAFB]">
      {/* Header - WHITE background per BIBLE */}
      <header className="sticky top-0 z-50 flex h-14 items-center justify-between bg-white px-4 shadow-sm">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="flex h-10 w-10 items-center justify-center text-gray-700"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>

        {/* Title */}
        <h1 className="absolute left-1/2 -translate-x-1/2 text-lg font-semibold text-gray-900">
          Driver Incentives
        </h1>

        {/* Spacer for balance */}
        <div className="w-10" />
      </header>

      {/* Tabs */}
      <Tabs defaultValue="incentives" className="flex-1">
        <TabsList className="w-full justify-start rounded-none border-b bg-white px-4 h-12">
          <TabsTrigger 
            value="incentives" 
            className="flex-1 data-[state=active]:border-b-2 data-[state=active]:border-[#10B981] data-[state=active]:text-[#10B981] data-[state=active]:shadow-none rounded-none"
          >
            Incentives
          </TabsTrigger>
          <TabsTrigger 
            value="leaderboard"
            className="flex-1 data-[state=active]:border-b-2 data-[state=active]:border-[#10B981] data-[state=active]:text-[#10B981] data-[state=active]:shadow-none rounded-none"
          >
            Leaderboard
          </TabsTrigger>
          <TabsTrigger 
            value="tier-progress"
            className="flex-1 data-[state=active]:border-b-2 data-[state=active]:border-[#10B981] data-[state=active]:text-[#10B981] data-[state=active]:shadow-none rounded-none"
          >
            Tier Progress
          </TabsTrigger>
        </TabsList>

        {/* Incentives Tab - Full stacked cards */}
        <TabsContent value="incentives" className="mt-0 p-4">
          <div className="space-y-3">
            {progressItems.map((item) => (
              <IncentiveCard 
                key={item.incentiveType} 
                progress={item} 
                onTap={handleCardTap}
              />
            ))}
          </div>
        </TabsContent>

        {/* Leaderboard Tab - Placeholder */}
        <TabsContent value="leaderboard" className="mt-0">
          <PlaceholderContent message="Leaderboard coming soon" />
        </TabsContent>

        {/* Tier Progress Tab - Placeholder */}
        <TabsContent value="tier-progress" className="mt-0">
          <PlaceholderContent message="Tier Progress coming soon" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
