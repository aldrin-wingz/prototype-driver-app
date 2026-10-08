"use client";

import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { PersonStanding, FileText } from "lucide-react";

/**
 * The one question that decides what a missed pick-up becomes.
 *
 * ⛔⛔ **This is a router, not a form field.** The answer does not go to Support;
 * it decides whether Support is involved at all. A driver with the member in the
 * car can still finish the leg properly, so the right outcome is no form — just
 * the drop-off swipe they were blocked from, and the pick-up collected
 * afterwards. A driver whose member is long gone has only a form left. Same
 * missing mark, two different products, and nothing the app can work out for
 * itself: it is the one fact only the driver has.
 *
 * ⚠️ Asked ONLY when the pick-up is the missing mark. A missed drop-off cannot
 * have the member still aboard, so asking would offer an answer that makes no
 * sense and invite the wrong one.
 */
export function MissedSwipePrompt({
  open,
  onOpenChange,
  onAnswer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAnswer: (memberAboard: boolean) => void;
}) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto max-w-md">
        <div className="px-5 pb-8 pt-2">
          <DrawerTitle className="text-lg font-bold text-[#303068]">
            Is the member still with you?
          </DrawerTitle>
          <p className="mt-2 text-sm text-gray-600">
            You haven&apos;t recorded the pick-up for this leg. What happens next
            depends on where the member is now.
          </p>

          <div className="mt-6 flex flex-col gap-3">
            <Button
              type="button"
              onClick={() => onAnswer(true)}
              className="h-auto w-full justify-start gap-3 whitespace-normal rounded-2xl bg-[#00B090] px-4 py-4 text-left hover:bg-[#00997C]"
            >
              <PersonStanding className="h-6 w-6 shrink-0 text-white" />
              <span className="flex min-w-0 flex-col">
                <span className="text-sm font-semibold text-white">
                  Yes, they&apos;re in the car
                </span>
                <span className="text-xs font-normal text-white/85">
                  Carry on and drop them off — we&apos;ll sort the pick-up out
                  afterwards.
                </span>
              </span>
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => onAnswer(false)}
              className="h-auto w-full justify-start gap-3 whitespace-normal rounded-2xl border-gray-300 px-4 py-4 text-left"
            >
              <FileText className="h-6 w-6 shrink-0 text-[#303068]" />
              <span className="flex min-w-0 flex-col">
                <span className="text-sm font-semibold text-[#303068]">
                  No, the ride is already over
                </span>
                <span className="text-xs font-normal text-gray-500">
                  We&apos;ll ask about both ends of the trip and fill in whatever
                  we can.
                </span>
              </span>
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
