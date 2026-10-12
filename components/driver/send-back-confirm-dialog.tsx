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
import { WingzWalletMark } from "@/components/driver/wingz-wallet-mark";

/**
 * Step 1 of production's send-back confirmation.
 *
 * ⭐⭐ **Production's own copy, verbatim**, from a screenshot the user supplied
 * on 2026-10-13 — the one artifact in the vault that had never quoted it. The
 * short-notice popup story says only "step 1 copy remains unchanged" and prints
 * nothing; this is what it was withholding.
 *
 * ⚠️ **Unconditional.** Step 1 is raised on EVERY send-back; it is step 2, the
 * penalty warning, that appears only for a short-notice trip.
 *
 * ⛔⛔ **"No" and "Yes" — NOT "Cancel" and "Continue".** Production's two
 * send-back popups disagree with each other about what the buttons are called:
 * this one says No/Yes, and step 2 says Cancel/Continue (named as such in the
 * copy-update story's acceptance criteria). Both are reproduced exactly as they
 * are. Harmonising them would be this prototype quietly redesigning production
 * and then presenting the result as a replica — and the inconsistency is worth
 * someone seeing, not hiding.
 *
 * ⚠️ The dark surface, the emblem and the centred bold copy follow the
 * screenshot. The screenshot itself is **not yet registered in the capture
 * index** — it arrived in conversation, not through the capture pipeline, so
 * `verify-captures` does not know about it. Worth registering before anyone
 * treats this screen as audited.
 */
export function SendBackConfirmDialog({
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
      <AlertDialogContent className="max-w-[320px] rounded-2xl border-none bg-[#5A5A5A] px-6 py-6 text-white">
        <AlertDialogHeader className="items-center space-y-4">
          <span className="flex h-[72px] w-[72px] items-center justify-center rounded-2xl bg-black">
            <WingzWalletMark size={44} />
          </span>
          {/* The whole message is the title in the capture — one bold centred
              block, no separate body line. */}
          <AlertDialogTitle className="text-center text-base font-bold leading-snug text-white">
            Trip sendbacks are strongly discouraged and may result in penalties.
            Do you want to proceed in sending back the trip?
          </AlertDialogTitle>
          <AlertDialogDescription className="sr-only">
            Confirm whether to send this trip back.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row justify-center gap-3">
          {/* No on the LEFT, Yes on the right — the capture's order. */}
          <AlertDialogCancel className="mt-0 flex-1 rounded-lg border-none bg-[#8A8A8A] text-base font-semibold text-white hover:bg-[#9A9A9A] hover:text-white">
            No
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="flex-1 rounded-lg bg-[#8A8A8A] text-base font-semibold text-white hover:bg-[#9A9A9A]"
          >
            Yes
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
