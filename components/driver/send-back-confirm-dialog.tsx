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
import {
  SEND_BACK_CONFIRM_BODY,
  SEND_BACK_CONFIRM_NO,
  SEND_BACK_CONFIRM_YES,
} from "@/lib/driver-data/send-back";

/**
 * Step 1 of production's send-back confirmation, raised on EVERY send-back.
 *
 * ⚠️ Provenance is a user-supplied screenshot, not a registered capture — see
 * `SEND_BACK_PROVENANCE`. The dark surface, the emblem and the centred bold
 * copy follow it.
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
            {SEND_BACK_CONFIRM_BODY}
          </AlertDialogTitle>
          <AlertDialogDescription className="sr-only">
            Confirm whether to send this trip back.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row justify-center gap-3">
          {/* No on the LEFT, Yes on the right — the capture's order. */}
          <AlertDialogCancel className="mt-0 flex-1 rounded-lg border-none bg-[#8A8A8A] text-base font-semibold text-white hover:bg-[#9A9A9A] hover:text-white">
            {SEND_BACK_CONFIRM_NO}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="flex-1 rounded-lg bg-[#8A8A8A] text-base font-semibold text-white hover:bg-[#9A9A9A]"
          >
            {SEND_BACK_CONFIRM_YES}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
