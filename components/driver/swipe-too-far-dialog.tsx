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
  SWIPE_TOO_FAR_DISMISS,
  SWIPE_TOO_FAR_TITLE,
  swipeTooFarBody,
  type SwipeAnchor,
} from "@/lib/driver-data/missed-swipe-rules";

/**
 * ⭐⭐ Production's answer to a swipe made from outside the geofence — catalogue
 * row 03's Now side. `CAP-326`, verbatim for the drop-off.
 *
 * ⛔⛔ **It is a BLOCK, not a warning.** The title says *Unable to complete
 * action*: the mark is not made. "Trip payment may be denied" is about having
 * driven to the wrong place, not about the tap succeeding — and this module's
 * own data agrees, with 2,521 legs a month ending with NEITHER mark after the
 * driver swiped en-route. Those are these taps.
 *
 * ⛔ Terminal. One button, and what the driver does next is ring the number in
 * the sentence — which is the 805 calls row 03 exists to absorb. Missing the
 * pick-up costs the drop-off too, because the marks fill left to right.
 *
 * ⛔⛔ The PICK-UP wording is **INFERRED, not captured** — see
 * `SWIPE_TOO_FAR_PROVENANCE`. It does not fold into `driver-app-base` until
 * someone shoots it.
 *
 * ⚠️ White panel, one action: the Android shape `CAP-326` shows, which is what
 * the prototype targets. The dark panels on `CAP-324`/`CAP-328`/`CAP-330` are
 * the same alert on a macOS desktop build — a platform difference, not a
 * product one.
 */
export function SwipeTooFarDialog({
  anchor,
  onOpenChange,
}: {
  /** `null` when the dialog is closed — the anchor IS the open state. */
  anchor: SwipeAnchor | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <AlertDialog open={anchor !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-sm rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-lg font-bold text-gray-900">
            {SWIPE_TOO_FAR_TITLE}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left text-sm text-gray-700">
            {anchor ? swipeTooFarBody(anchor) : ""}
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
