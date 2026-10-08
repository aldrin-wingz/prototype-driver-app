"use client";

import { useState } from "react";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SignaturePad } from "@/components/ui/signature-pad";

/**
 * The drop-off swipe, as production takes it: an odometer reading and the
 * member's signature.
 *
 * ⚠️ **NOT replicated from a capture.** The base's library has no shot of the
 * production drop-off flow — `references/captures/INDEX.md` lists re-shooting
 * Ride Details at P3 and this screen is inside that gap. Every previous guess at
 * an uncaptured screen in this project has been wrong, so treat the LAYOUT here
 * as invented and only the two things it collects as specified. Re-shoot before
 * anyone reads this as the design.
 *
 * ⛔ It exists because 1a turns on it. A driver who still has the member is sent
 * to swipe the drop-off *properly* — and "properly" has to mean the same two
 * captures a normal drop-off takes, or the pick-up form that follows would be
 * confirming a drop-off that skipped them.
 */
export function DropOffSwipeSheet({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Fires with the reading once both are given. */
  onConfirm: (odometer: number) => void;
}) {
  const [reading, setReading] = useState("");
  const [signed, setSigned] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  const value = Number(reading);
  const ready = reading.trim().length > 0 && Number.isFinite(value) && value >= 0 && signed;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto max-w-md">
        <div className="px-5 pb-8 pt-2">
          <DrawerTitle className="text-lg font-bold text-[#303068]">
            Drop off member
          </DrawerTitle>
          <p className="mt-1 text-sm text-gray-600">
            Take the odometer reading and the member&apos;s signature to complete
            the leg.
          </p>

          <div className="mt-5">
            <label
              htmlFor="dropoff-odometer"
              className="text-sm font-semibold text-[#303068]"
            >
              Odometer at drop-off <span className="text-red-500">*</span>
            </label>
            <Input
              id="dropoff-odometer"
              type="number"
              inputMode="numeric"
              min={0}
              value={reading}
              placeholder="e.g. 48229"
              onChange={(event) => setReading(event.target.value)}
              className="mt-1.5"
            />
          </div>

          <div className="mt-5">
            <span className="text-sm font-semibold text-[#303068]">
              Member signature <span className="text-red-500">*</span>
            </span>
            <p className="mb-1.5 mt-1 text-xs text-gray-500">
              {/*
                ⚠️ Says why it is being taken NOW. This is the one capture that
                cannot be recovered later — once the member is gone the leg is
                simply "signature missing", which is the whole difference
                between this path and the other two.
              */}
              Taken here because the member is with you. It cannot be collected
              after they have gone.
            </p>
            <SignaturePad
              onSignedChange={setSigned}
              resetKey={resetKey}
              canvasClassName="h-32"
            />
          </div>

          <div className="mt-6 flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1 rounded-full"
              onClick={() => {
                setReading("");
                setSigned(false);
                setResetKey((key) => key + 1);
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!ready}
              className="flex-1 rounded-full bg-[#E06078] hover:bg-[#C9516A]"
              onClick={() => {
                onConfirm(value);
                setReading("");
                setSigned(false);
                setResetKey((key) => key + 1);
              }}
            >
              Complete drop-off
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
