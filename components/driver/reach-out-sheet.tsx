"use client";

import { useState } from "react";
import { X, FilePlus2 } from "lucide-react";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { RideConfirmation } from "@/lib/support-data/ride-flow-context";

/**
 * The answers offered after the driver swipes "I Reached Out to Confirm".
 *
 * The first three are replicated verbatim from reference capture `s-04a`. The
 * fourth is new: production offers no answer for "the number doesn't work", so a
 * driver who called a disconnected line had to either claim the member declined
 * or pick the option that files nothing. The bad number was never reported and
 * so never fixed — while the ride's own banner told them to call it.
 *
 * ⚠️ Worth putting to the support lead: this label and "No, but I will go to the
 * pickup as scheduled" both describe a failed call. What separates them is what
 * happens next — one files a support request, one files nothing — and neither
 * label says so.
 */
const OPTIONS: Array<{ id: RideConfirmation; label: string }> = [
  { id: "confirmed", label: "Yes, I confirmed with the rider" },
  { id: "declined", label: "Rider declined the trip" },
  { id: "going-anyway", label: "No, but I will go to the pickup as scheduled" },
  { id: "cant-reach", label: "Number can not be reached" },
];

/**
 * "Were you able to reach the rider?" — the sheet behind the confirm swipe.
 *
 * Replicates `s-04a`: single-select option cards plus a `Next` button that stays
 * disabled until something is chosen. Same disabled-primary pattern as the
 * support forms (`s-02a`), which is worth preserving — it is how this app
 * consistently signals an incomplete step.
 */
export function ReachOutSheet({
  open,
  onOpenChange,
  onNext,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNext: (choice: RideConfirmation) => void;
}) {
  const [selected, setSelected] = useState<RideConfirmation | null>(null);

  function close() {
    onOpenChange(false);
    setSelected(null);
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="rounded-t-3xl border-0 px-6 pb-8">
        <div className="mx-auto w-full max-w-md">
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <DrawerTitle className="mt-3 text-3xl font-bold leading-tight text-gray-900">
            Were you able to reach the rider?
          </DrawerTitle>
          <p className="mt-3 text-lg leading-snug text-gray-500">
            Please select the appropriate option to confirm your next steps.
          </p>

          <div className="mt-7 space-y-4" role="radiogroup">
            {OPTIONS.map((option) => {
              const isSelected = selected === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => setSelected(option.id)}
                  className={cn(
                    "w-full rounded-xl border px-5 py-5 text-left text-lg font-bold",
                    isSelected
                      ? "border-[#00B090] bg-[#F0FDF9] text-gray-900 ring-1 ring-[#00B090]"
                      : "border-gray-200 text-gray-900"
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          <Button
            type="button"
            disabled={!selected}
            onClick={() => {
              if (!selected) return;
              onNext(selected);
              setSelected(null);
            }}
            className="mt-8 h-14 w-full rounded-xl bg-[#00B090] text-lg font-bold text-white hover:bg-[#059669] disabled:bg-[#9DECD4] disabled:opacity-100"
          >
            Next
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

/**
 * "Rider declined the trip" — the follow-up when the driver picks option two.
 *
 * Layout replicates `s-04b`: centred teal badge, title, explanatory line, a
 * primary action and a secondary "Rider Needs Transportation" that walks back to
 * the options.
 *
 * The copy deliberately departs from the capture. Production said "Please chat
 * with support to remove it from your manifest" and went straight to chat, which
 * handed Support an unevidenced claim about a member for a ride with revenue
 * attached. A form now comes first, so the sheet says so — a button labelled
 * "Chat with Support" that opens a form would be a small lie.
 */
export function RiderDeclinedSheet({
  open,
  onOpenChange,
  onContinue,
  onNeedsTransportation,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContinue: () => void;
  onNeedsTransportation: () => void;
}) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="rounded-t-3xl border-0 px-6 pb-8">
        <div className="mx-auto w-full max-w-md">
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              aria-label="Close"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-2 flex flex-col items-center text-center">
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-[#1ECFA0]">
              <FilePlus2 className="h-10 w-10 text-white" strokeWidth={2} />
            </span>

            <DrawerTitle className="mt-6 text-3xl font-bold text-gray-900">
              Rider declined the trip
            </DrawerTitle>
            <p className="mt-3 text-lg font-semibold leading-snug text-gray-400">
              Support needs a few details before we can remove it from your
              manifest.
            </p>
          </div>

          <Button
            type="button"
            onClick={onContinue}
            className="mt-8 h-14 w-full rounded-xl bg-[#1ECFA0] text-lg font-bold text-white hover:bg-[#0FB88C]"
          >
            Continue
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={onNeedsTransportation}
            className="mt-4 h-14 w-full rounded-xl border-gray-300 text-lg font-bold text-gray-900"
          >
            Rider Needs Transportation
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
