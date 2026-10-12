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
import { SEND_BACK_PENALTY_USD } from "@/lib/driver-data/send-back-reasons";

/**
 * Step 2 of production's send-back confirmation — the penalty warning.
 *
 * ⭐⭐ **The copy below is PRODUCTION'S, verbatim.** It is the "Update (step 2)"
 * block in `Other/NEMT Driver App/Other - NEMT Driver App - Short-notice
 * sendback popup copy update.md`, which replaced the older one-line version.
 * `${PenaltyAmount}` is substituted; nothing else is touched, including the
 * slightly odd line break before the last sentence.
 *
 * ⚠️ **Shown only for a SHORT-NOTICE send-back**, per that story's AC: "The
 * popup appears only for short-notice trip send backs."
 *
 * ⛔⛔ **No screenshot of this screen exists anywhere in the vault.** I searched
 * the 319-row capture index and every image file. The copy is from a written
 * story, so the WORDS are production's and the LAYOUT is this repo's
 * alert-dialog convention. That is weaker evidence than a capture and the
 * prototype should not be read as replicating a screen anyone has seen.
 *
 * ⛔ Production's **step 1** confirmation comes before this one and is NOT
 * built: its copy is the one thing no artifact quotes, and the user is
 * supplying it. See `SEND_BACK_CONFIRM_BUILT`.
 */
export function SendBackPenaltyDialog({
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
          <AlertDialogTitle className="text-lg font-bold text-[#303068]">
            If you send back this trip:
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-left text-sm text-gray-700">
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  A ${SEND_BACK_PENALTY_USD} penalty will be applied and will be
                  offered as a bonus for another driver to accept the trip.
                </li>
                <li>
                  If the member ends up missing their appointment, your account
                  may be subject to deactivation.
                </li>
              </ul>
              <p>
                Trips sent back earlier are less likely to result in penalties.
              </p>
              <p className="font-semibold text-gray-900">
                Are you sure you want to proceed?
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row justify-end gap-2">
          {/* Cancel and Continue, named as the story names them. */}
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
