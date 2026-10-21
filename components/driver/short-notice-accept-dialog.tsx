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
 * Catalogue row 16 — the warning a driver meets BEFORE taking a short-notice
 * trip, instead of after.
 *
 * ⛔⛔ **This is the FIRST thing in this prototype to intercept the accept
 * swipe.** `request-swipe.ts` records that the control is decorative on every
 * request screen — no accept handler, no reject handler — because accepting a
 * trip is not what these prototypes are about. Row 16 needs exactly one thing
 * from it: a moment between "I want this trip" and "I have it". The reject half
 * stays as inert as it has always been.
 *
 * ⚠️ **OURS, not production's — and the distinction matters more here than
 * usual.** The send-back penalty dialog two screens later quotes production's
 * written copy verbatim. There is no production copy for this screen because
 * there is no such screen; what is reused is the SHAPE (title, consequence,
 * Cancel/Continue) so the two read as one mechanism met at two moments.
 *
 * ⛔ **It informs, it does not block.** Continue takes the trip. A driver who
 * wants a short-notice trip is not doing anything wrong — a third of all
 * sendbacks are charged nothing and the ones that are, are priced by rule. The
 * complaint row 16 answers is "nobody told me", not "I should not have been
 * allowed".
 *
 * ⚠️ `amount` is a prop for the same reason the send-back dialog's is: the
 * figure belongs to the market's ladder, and a constant here would disagree
 * with the pill on the card the driver just tapped.
 */
export function ShortNoticeAcceptDialog({
  open,
  onOpenChange,
  onConfirm,
  amount,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  amount: number;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-sm rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-lg font-bold text-[#303068]">
            This is a short-notice trip
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-left text-sm text-gray-700">
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  If you send it back, a ${amount} penalty will be applied and
                  will be offered as a bonus for another driver to accept the
                  trip.
                </li>
                <li>
                  If the member ends up missing their appointment, your account
                  may be subject to deactivation.
                </li>
              </ul>
              <p>You can still take it — this is so you know before you do.</p>
              <p className="font-semibold text-gray-900">
                Accept this trip?
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row justify-end gap-2">
          {/* Cancel / Continue — the same pair the send-back warning uses, so
              the two readings of one mechanism do not disagree about its
              controls. */}
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
