"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { SignaturePad } from "@/components/ui/signature-pad";

/**
 * Standalone driver signature, for a no-show that needs no form.
 *
 * Only reached when the app has already proven the wait — so this sheet IS the
 * submission, and the signature is the whole of it. Where a form is involved the
 * signature is that form's last field instead, because the attestation belongs
 * with the claim it attests to.
 *
 * Note the app proving the wait is NOT the same as proving the member was absent:
 * we know how long the driver sat there, not who failed to appear. That gap is
 * exactly what the driver is signing for.
 */
export function SignatureSheet({
  open,
  onOpenChange,
  riderName,
  onSigned,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Named in the attestation line, so the driver sees who they are signing about. */
  riderName: string;
  onSigned: () => void;
}) {
  const [signed, setSigned] = useState(false);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="rounded-t-3xl border-0 px-6 pb-8">
        <div className="mx-auto w-full max-w-md">
          <div className="flex items-start justify-between pt-2">
            <DrawerTitle className="text-2xl font-bold text-gray-900">
              Sign to confirm the no-show
            </DrawerTitle>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              aria-label="Close"
              className="-mr-2 -mt-1 p-2 text-gray-400"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <p className="mt-2 text-sm leading-relaxed text-gray-500">
            By signing, you confirm {riderName} was not present at the pick-up
            location.
          </p>

          <SignaturePad
            className="mt-6"
            onSignedChange={setSigned}
            // Reopening must not inherit the last signature.
            resetKey={open}
          />

          <Button
            type="button"
            disabled={!signed}
            onClick={onSigned}
            className="mt-7 h-14 w-full rounded-xl bg-[#00B090] text-lg font-bold text-white hover:bg-[#059669] disabled:bg-[#9DECD4] disabled:opacity-100"
          >
            Submit No-Show
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
