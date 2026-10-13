"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  SWIPE_TOO_FAR_BODY,
  SWIPE_TOO_FAR_DISMISS,
  SWIPE_TOO_FAR_TITLE,
} from "@/lib/driver-data/swipe-refusal";

/**
 * ⭐⭐ Production's answer to a drop-off swipe made from outside the geofence —
 * `CAP-326`, verbatim.
 *
 * ⛔⛔ **A BLOCK, not a warning.** See `swipe-refusal.ts` for why the body's
 * *"Trip payment may be denied"* does not mean the tap went through.
 *
 * ⛔ Terminal: one button, the mark is never made, and what the driver does
 * next is ring the number in the sentence.
 *
 * ⚠️ White panel, one action — the Android shape `CAP-326` shows. The dark
 * panels on `CAP-324` / `CAP-328` / `CAP-330` are the same kind of alert on a
 * macOS desktop build. Platform, not product.
 */
export function SwipeTooFarDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-sm rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-lg font-bold text-gray-900">
            {SWIPE_TOO_FAR_TITLE}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left text-sm text-gray-700">
            {SWIPE_TOO_FAR_BODY}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {/* ⛔ One action, and it is a dismissal. Production offers no way
            forward from here — the phone number in the sentence is the way
            forward, and it is not a button. */}
        <AlertDialogFooter>
          <AlertDialogAction onClick={() => onOpenChange(false)}>
            {SWIPE_TOO_FAR_DISMISS}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
