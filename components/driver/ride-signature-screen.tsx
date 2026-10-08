"use client";

import { useState } from "react";
import { SignaturePad } from "@/components/ui/signature-pad";
import { cn } from "@/lib/utils";

/**
 * The Ride Signature screen, replicated from `CAP-098`.
 *
 * ⛔⛔ **TWO signatures, not one.** Production takes a `Driver Signature` and a
 * `Member Signature` on one full screen, each with its own blue centred `Clear`,
 * under a single green `Submit`. The first version of this flow invented a
 * single "Member signature" pad inside a drawer — which is why the capture
 * matters: that invention also made the missing-signature outcome wrong, since
 * the DRIVER's signature can always be taken and the member's cannot.
 *
 * ⚠️ A full-screen overlay rather than a route, because the prototype's drop-off
 * is driven from the ride detail's own state. Production is a real screen, so
 * the header carries no trip id, exactly as captured.
 *
 * `[VERIFY]` in the stage map: whether Submit genuinely requires BOTH panels.
 * Treated as required here, which is the stricter reading — a prototype that
 * accepted one would be asserting a leniency nobody has confirmed.
 */
export function RideSignatureScreen({
  open,
  memberPresent = true,
  onCancel,
  onSubmit,
}: {
  open: boolean;
  /**
   * False when the member has already gone.
   *
   * ⛔ Then only the driver panel renders, and the member's is recorded as
   * missing rather than shown as an empty box the driver cannot fill. Asking for
   * a signature from someone who is not in the car is the one thing this screen
   * must never do.
   */
  memberPresent?: boolean;
  onCancel: () => void;
  onSubmit: (signed: { driver: boolean; member: boolean }) => void;
}) {
  const [driverSigned, setDriverSigned] = useState(false);
  const [memberSigned, setMemberSigned] = useState(false);
  const [driverReset, setDriverReset] = useState(0);
  const [memberReset, setMemberReset] = useState(0);

  if (!open) return null;

  const ready = driverSigned && (memberPresent ? memberSigned : true);

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-white">
      <div className="relative flex items-center justify-center border-b border-gray-200 py-3">
        <button
          type="button"
          onClick={onCancel}
          className="absolute left-4 text-sm font-medium text-[#007AFF]"
        >
          Back
        </button>
        <h1 className="text-base font-bold text-black">Ride Signature</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        <Panel
          label="Driver Signature"
          onSignedChange={setDriverSigned}
          resetKey={driverReset}
          onClear={() => setDriverReset((key) => key + 1)}
        />
        {memberPresent ? (
          <Panel
            label="Member Signature"
            onSignedChange={setMemberSigned}
            resetKey={memberReset}
            onClear={() => setMemberReset((key) => key + 1)}
          />
        ) : (
          <div className="border-t border-gray-300 px-4 py-5">
            <p className="text-base font-bold text-black">Member Signature</p>
            <p className="mt-2 text-sm text-gray-600">
              The member has already left, so this one cannot be taken. It will be
              recorded as missing on the completed ride.
            </p>
          </div>
        )}
      </div>

      <div className="border-t border-gray-300 px-10 py-4">
        <button
          type="button"
          disabled={!ready}
          onClick={() => onSubmit({ driver: driverSigned, member: memberSigned })}
          className={cn(
            "h-12 w-full text-base font-bold text-black",
            ready ? "bg-[#00E59B]" : "bg-[#B9F0DA]"
          )}
        >
          Submit
        </button>
      </div>
    </div>
  );
}

/** One capture panel: bold label, canvas, blue centred Clear — per `CAP-098`. */
function Panel({
  label,
  onSignedChange,
  resetKey,
  onClear,
}: {
  label: string;
  onSignedChange: (signed: boolean) => void;
  resetKey: number;
  onClear: () => void;
}) {
  return (
    <div className="border-t border-gray-300">
      <p className="px-4 py-2 text-base font-bold text-black">{label}</p>
      <div className="border-t border-gray-100">
        {/*
          `showFooter={false}` — the pad's own hint-and-button row is for a form
          field. This surface replicates a production screen, where Clear is a
          centred blue link under a full-bleed canvas.
        */}
        <SignaturePad
          onSignedChange={onSignedChange}
          resetKey={resetKey}
          showFooter={false}
          canvasClassName="h-48 w-full"
        />
      </div>
      <button
        type="button"
        onClick={onClear}
        className="w-full border-t border-gray-100 py-2.5 text-center text-base text-[#007AFF]"
      >
        Clear
      </button>
    </div>
  );
}
