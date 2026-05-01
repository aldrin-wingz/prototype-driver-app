"use client";

import { useState } from "react";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useVariants } from "@/lib/variants-context";
import {
  PILL_VARIANT_OPTIONS,
  DASHBOARD_VARIANT_OPTIONS,
  PAYOUT_SUMMARY_VARIANT_OPTIONS,
  TIER_PROGRESS_VARIANT_OPTIONS,
  LEADERBOARD_VARIANT_OPTIONS,
  type PillVariant,
  type DashboardVariant,
  type PayoutSummaryVariant,
  type TierProgressVariant,
  type LeaderboardVariant,
} from "@/lib/variants";

export function VariantToggle() {
  const [open, setOpen] = useState(false);
  const {
    variants,
    setPillVariant,
    setDashboardVariant,
    setPayoutSummaryVariant,
    setTierProgressVariant,
    setLeaderboardVariant,
    resetToDefaults,
    isLoaded,
  } = useVariants();

  if (!isLoaded) {
    return null;
  }

  return (
    <>
      {/* Floating Pill Button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed top-3 left-3 z-50 flex items-center gap-1.5 rounded-full bg-[#10B981] px-3 py-1.5 text-xs font-medium text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
        aria-label="Open variant comparison settings"
      >
        <Settings2 className="h-3.5 w-3.5" />
        <span>Variants</span>
      </button>

      {/* Sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Compare Variants</SheetTitle>
            <SheetDescription>
              Switch between UI variants to compare different treatments for each surface.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Pill / Badge / Banner Section */}
            <div>
              <h3 className="mb-3 text-sm font-semibold text-foreground">
                Ride Card Indicator
              </h3>
              <p className="mb-3 text-xs text-muted-foreground">
                How incentive eligibility appears on ride cards in list views.
              </p>

              <RadioGroup
                value={variants.pill}
                onValueChange={(value) => setPillVariant(value as PillVariant)}
                className="space-y-2"
              >
                {PILL_VARIANT_OPTIONS.map((option) => (
                  <div
                    key={option.value}
                    className="flex items-start space-x-3 rounded-lg border p-3 transition-colors hover:bg-muted/50 has-[[data-state=checked]]:border-[#10B981] has-[[data-state=checked]]:bg-[#10B981]/5"
                  >
                    <RadioGroupItem
                      value={option.value}
                      id={`pill-${option.value}`}
                      className="mt-0.5 border-[#10B981] text-[#10B981]"
                    />
                    <div className="flex-1">
                      <Label
                        htmlFor={`pill-${option.value}`}
                        className="text-sm font-medium cursor-pointer"
                      >
                        {option.label}
                      </Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {option.description}
                      </p>
                    </div>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <Separator />

            {/* Dashboard Section */}
            <div>
              <h3 className="mb-3 text-sm font-semibold text-foreground">
                Dashboard Incentives
              </h3>
              <p className="mb-3 text-xs text-muted-foreground">
                How incentive progress is surfaced on the home screen.
              </p>
              <RadioGroup
                value={variants.dashboard}
                onValueChange={(value) => setDashboardVariant(value as DashboardVariant)}
                className="space-y-2"
              >
                {DASHBOARD_VARIANT_OPTIONS.map((option) => (
                  <div
                    key={option.value}
                    className="flex items-start space-x-3 rounded-lg border p-3 transition-colors hover:bg-muted/50 has-[[data-state=checked]]:border-[#10B981] has-[[data-state=checked]]:bg-[#10B981]/5"
                  >
                    <RadioGroupItem
                      value={option.value}
                      id={`dashboard-${option.value}`}
                      className="mt-0.5 border-[#10B981] text-[#10B981]"
                    />
                    <div className="flex-1">
                      <Label
                        htmlFor={`dashboard-${option.value}`}
                        className="text-sm font-medium cursor-pointer"
                      >
                        {option.label}
                      </Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {option.description}
                      </p>
                    </div>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <Separator />

            {/* Payout Summary Section */}
            <div>
              <h3 className="mb-3 text-sm font-semibold text-foreground">
                Payout Summary
              </h3>
              <p className="mb-3 text-xs text-muted-foreground">
                How the payout breakdown is laid out on the Upcoming Payout page.
              </p>
              <RadioGroup
                value={variants.payoutSummary}
                onValueChange={(value) => setPayoutSummaryVariant(value as PayoutSummaryVariant)}
                className="space-y-2"
              >
                {PAYOUT_SUMMARY_VARIANT_OPTIONS.map((option) => (
                  <div
                    key={option.value}
                    className="flex items-start space-x-3 rounded-lg border p-3 transition-colors hover:bg-muted/50 has-[[data-state=checked]]:border-[#10B981] has-[[data-state=checked]]:bg-[#10B981]/5"
                  >
                    <RadioGroupItem
                      value={option.value}
                      id={`payoutSummary-${option.value}`}
                      className="mt-0.5 border-[#10B981] text-[#10B981]"
                    />
                    <div className="flex-1">
                      <Label
                        htmlFor={`payoutSummary-${option.value}`}
                        className="text-sm font-medium cursor-pointer"
                      >
                        {option.label}
                      </Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {option.description}
                      </p>
                    </div>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <Separator />

            {/* Tier Progress Section */}
            <div>
              <h3 className="mb-3 text-sm font-semibold text-foreground">
                Tier Progress
              </h3>
              <p className="mb-3 text-xs text-muted-foreground">
                How tier progression is visualized on the Tier Progress tab.
              </p>
              <RadioGroup
                value={variants.tierProgress}
                onValueChange={(value) => setTierProgressVariant(value as TierProgressVariant)}
                className="space-y-2"
              >
                {TIER_PROGRESS_VARIANT_OPTIONS.map((option) => (
                  <div
                    key={option.value}
                    className="flex items-start space-x-3 rounded-lg border p-3 transition-colors hover:bg-muted/50 has-[[data-state=checked]]:border-[#10B981] has-[[data-state=checked]]:bg-[#10B981]/5"
                  >
                    <RadioGroupItem
                      value={option.value}
                      id={`tierProgress-${option.value}`}
                      className="mt-0.5 border-[#10B981] text-[#10B981]"
                    />
                    <div className="flex-1">
                      <Label
                        htmlFor={`tierProgress-${option.value}`}
                        className="text-sm font-medium cursor-pointer"
                      >
                        {option.label}
                      </Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {option.description}
                      </p>
                    </div>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <Separator />

            {/* Leaderboard Section */}
            <div>
              <h3 className="mb-3 text-sm font-semibold text-foreground">
                Leaderboard
              </h3>
              <p className="mb-3 text-xs text-muted-foreground">
                How drivers are ranked on the Leaderboard tab.
              </p>
              <RadioGroup
                value={variants.leaderboard}
                onValueChange={(value) => setLeaderboardVariant(value as LeaderboardVariant)}
                className="space-y-2"
              >
                {LEADERBOARD_VARIANT_OPTIONS.map((option) => (
                  <div
                    key={option.value}
                    className="flex items-start space-x-3 rounded-lg border p-3 transition-colors hover:bg-muted/50 has-[[data-state=checked]]:border-[#10B981] has-[[data-state=checked]]:bg-[#10B981]/5"
                  >
                    <RadioGroupItem
                      value={option.value}
                      id={`leaderboard-${option.value}`}
                      className="mt-0.5 border-[#10B981] text-[#10B981]"
                    />
                    <div className="flex-1">
                      <Label
                        htmlFor={`leaderboard-${option.value}`}
                        className="text-sm font-medium cursor-pointer"
                      >
                        {option.label}
                      </Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {option.description}
                      </p>
                    </div>
                  </div>
                ))}
              </RadioGroup>
            </div>

          </div>

          <SheetFooter className="mt-6">
            <Button
              variant="outline"
              onClick={resetToDefaults}
              className="w-full"
            >
              Reset to Defaults
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
