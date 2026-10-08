"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * The odometer popup, replicated from `CAP-095`.
 *
 * ⚠️ **`CAP-095` is the PICK-UP popup.** The drop-off one is
 * `[SCREENSHOT PENDING]` in `Trip Completion Flow Stage Map.md` and has been
 * since 2026-04-24 — its existence and position are user-confirmed, its pixels
 * are not. The stage map records the expected shape as mirroring the pick-up
 * popup, so that is what this replicates, with only the title word changed.
 *
 * ⛔ Everything else here is read off the capture rather than designed: a
 * centred native-style alert over the live screen, grey panel, bold title, the
 * line "Please input your odometer reading:", a white input, then Cancel and
 * Submit side by side with Submit greyed until a value is entered.
 */
export function OdometerReadingDialog({
  anchor,
  open,
  onOpenChange,
  onSubmit,
}: {
  anchor: "pickup" | "dropoff";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (reading: number) => void;
}) {
  const [reading, setReading] = useState("");

  // Cleared on every opening, so a cancelled reading cannot survive into the
  // next one — production's popup opens empty each time.
  useEffect(() => {
    if (open) setReading("");
  }, [open]);

  if (!open) return null;

  const value = Number(reading);
  const ready = reading.trim().length > 0 && Number.isFinite(value) && value >= 0;
  // Capitalised exactly as the capture has it: "Pickup", not "Pick-up".
  const title = anchor === "pickup" ? "Pickup" : "Dropoff";

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 px-8">
      <div className="w-full max-w-[320px] overflow-hidden rounded-2xl bg-[#E6E6E6] shadow-xl">
        <div className="px-5 pb-5 pt-5 text-center">
          <p className="text-lg font-bold text-black">
            {title} Odometer Reading
          </p>
          <p className="mt-1 text-[15px] text-black">
            Please input your odometer reading:
          </p>
          <input
            type="number"
            inputMode="numeric"
            autoFocus
            value={reading}
            onChange={(event) => setReading(event.target.value)}
            aria-label={`${title} odometer reading`}
            // ⚠️ Spinners off. `CAP-095` shows a plain field over a numeric
            // keypad — the stepper arrows are the browser's, not production's.
            className="mt-4 w-full appearance-none rounded-md border border-gray-300 bg-white px-3 py-2 text-[15px] text-black outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
        </div>
        {/* Two actions, hairline-divided — the native alert shape in the capture. */}
        <div className="flex border-t border-[#C7C7C7]">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex-1 py-3 text-[17px] text-[#007AFF]"
          >
            Cancel
          </button>
          <div className="w-px bg-[#C7C7C7]" />
          <button
            type="button"
            disabled={!ready}
            onClick={() => onSubmit(value)}
            className={cn(
              "flex-1 py-3 text-[17px]",
              ready ? "text-[#007AFF]" : "text-[#8E8E93]"
            )}
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}
