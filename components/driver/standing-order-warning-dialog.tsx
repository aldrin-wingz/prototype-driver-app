"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  STANDING_ORDER_BLOCK_CHAT,
  STANDING_ORDER_BLOCK_COST,
  STANDING_ORDER_BLOCK_DISMISS,
  STANDING_ORDER_BLOCK_RISK,
  STANDING_ORDER_BLOCK_ROUTE,
  STANDING_ORDER_BLOCK_TITLE,
  STANDING_ORDER_BLOCK_WHY,
} from "@/lib/driver-data/send-back-reasons";

/**
 * Raised the instant a driver taps `Send Back Trip` on a **standing order**.
 *
 * ⛔⛔ **It BLOCKS; it does not warn.** This is the reverse of what stood here
 * until 2026-10-16, and the reversal is user direction. The old dialog argued
 * that a hard block is what sends a driver to Support, which is the traffic
 * row 14 exists to absorb — but production already blocks (`CAP-330`), the
 * block is not ours to lift, and the proposal was quietly lifting it. What was
 * actually missing was never permission; it was somewhere to go.
 *
 * ⛔⛔ **The copy here is PROPOSED, not production's.** Production's refusal
 * ends at *"please call into support for assistance"* and arrives two taps in,
 * after a confirmation that was never going to matter. This says the same no on
 * the first tap and opens a chat instead of naming a phone. Treat a screenshot
 * of it as a proposal to review, never as a replicated screen.
 *
 * ⛔ Every string comes from `lib/`. A consequence sentence written inline here
 * is a claim no check can reach — and this one makes a promise about the
 * client's behaviour.
 */
export function StandingOrderWarningDialog({
  open,
  onOpenChange,
  onContactSupport,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContactSupport: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-sm rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-lg font-bold text-[#D85878]">
            {STANDING_ORDER_BLOCK_TITLE}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-left text-sm text-gray-700">
              {/* Why it stopped, before what it costs — a driver who is told the
                  consequence first has not yet been told they cannot proceed. */}
              <p>{STANDING_ORDER_BLOCK_WHY}</p>
              <p>{STANDING_ORDER_BLOCK_COST}</p>
              <p>{STANDING_ORDER_BLOCK_RISK}</p>
              {/* ⚠️ The way out, named. A block with no alternative is the dead
                  end this row exists to remove. */}
              <p className="font-semibold text-gray-900">
                {STANDING_ORDER_BLOCK_ROUTE}
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row justify-end gap-2">
          {/* ⛔ "Close", not "Cancel". On a block, "Cancel" is ambiguous — cancel
              the trip, or cancel the send-back? "Close" can only mean the
              dialog, which is all this button does: nothing was in flight to
              abandon, because the block arrives before the reason form. */}
          <AlertDialogCancel className="mt-0 rounded-xl border-gray-300 text-base font-semibold text-[#303068]">
            {STANDING_ORDER_BLOCK_DISMISS}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onContactSupport}
            className="rounded-xl bg-[#10B981] text-base font-bold text-white hover:bg-[#059669]"
          >
            {STANDING_ORDER_BLOCK_CHAT}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
