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

/**
 * Raised when the trip being sent back belongs to a **standing order**.
 *
 * ⛔⛔ **The copy here is PROPOSED, not production's** — and that is the
 * opposite of the penalty dialog beside it, whose every phrase is lifted
 * verbatim from `Other/NEMT Driver App/Other - NEMT Driver App - Short-notice
 * sendback popup copy update.md`. Nothing in the vault says what the app tells
 * a driver about sending back a standing order, because the app tells them
 * nothing: that silence is the problem this screen exists to fix. Treat a
 * screenshot of it as a proposal to review, never as a replicated screen.
 *
 * ⚠️ **It warns; it does not block.** A driver who genuinely cannot do the trip
 * still has to be able to return it — a hard block is exactly what sends them
 * to Support, which is the traffic row 14 exists to absorb. What was missing
 * was never permission, it was the driver knowing what it costs.
 *
 * ⛔ Nothing here changes the penalty, and nothing here bypasses any block.
 * Both are out of scope by user direction — the Standing Order block is being
 * handled separately and the scoring policy is row 15's.
 */
export function StandingOrderWarningDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-sm rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-lg font-bold text-[#D85878]">
            This is a standing order
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-left text-sm text-gray-700">
              {/* Consequence first, and the big one first — the driver is not
                  risking this trip, they are risking all of them. */}
              <p>
                This member rides with you on a set schedule. Sending back one
                trip can cost you{" "}
                <span className="font-semibold text-gray-900">
                  the whole standing order
                </span>{" "}
                — the client can reassign every future trip to another driver.
              </p>
              <p>
                Standing orders are the trips clients depend on most. Sending
                them back can also put your account at risk of{" "}
                <span className="font-semibold text-gray-900">suspension</span>.
              </p>
              {/* ⚠️ The way out, named. A warning with no alternative is a
                  warning a driver can only ignore. */}
              <p>
                If you can still make it, go back and keep the trip. If you
                cannot, send it back as early as you can and tell Support why.
              </p>
              <p className="font-semibold text-gray-900">
                Are you sure you want to send this one back?
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row justify-end gap-2">
          {/* Cancel and Continue, matching the penalty dialog beside it — two
              confirmation popups in one flow must not disagree about which
              button means stop. */}
          <AlertDialogCancel className="mt-0 rounded-xl border-gray-300 text-base font-semibold text-[#303068]">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="rounded-xl bg-[#D85878] text-base font-bold text-white hover:bg-[#C44A68]"
          >
            Continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
