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
  SEND_BACK_DENIED_BODY,
  SEND_BACK_DENIED_DISMISS,
  SEND_BACK_DENIED_TITLE,
} from "@/lib/driver-data/send-back-reasons";

/**
 * ⭐⭐ Production's refusal — catalogue row 13's Now side. `CAP-330`, verbatim.
 *
 * ⛔ **Terminal, and that is the whole point.** One button, no way forward, and
 * the sentence ends at *call into support*. The driver is at least two taps in
 * before the app says no — and what they do next is make the phone call row 13
 * exists to absorb.
 *
 * ⛔ Every word is production's. Nothing is softened, nothing is added, and
 * there is deliberately no "we can help" line — production does not offer one.
 *
 * ⚠️ The capture is a macOS native alert (dark panel, app icon). This renders
 * the Android shape — white panel, one action — which is what `CAP-326` shows
 * the same kind of alert looks like on a phone, and the prototype is a phone.
 */
export function SendBackDeniedDialog({
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
            {SEND_BACK_DENIED_TITLE}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left text-sm text-gray-700">
            {SEND_BACK_DENIED_BODY}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {/* ⛔ One action. There is no cancel, because there is nothing to
            cancel — the send-back already failed. */}
        <AlertDialogFooter>
          <AlertDialogAction onClick={() => onOpenChange(false)}>
            {SEND_BACK_DENIED_DISMISS}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
