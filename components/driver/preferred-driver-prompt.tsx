"use client";

import { useState } from "react";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { UserRoundCheck } from "lucide-react";
import {
  PREFERRED_DRIVER_QUESTION,
  PREFERRED_DRIVER_SUPPRESS_LABEL,
} from "@/lib/driver-data/member-assignment";
import { DRIVER_NAVY, DRIVER_TEAL } from "@/constants/driver-app-colors";

/**
 * Asked once the drop-off signature is taken — catalogue row 09's second door.
 *
 * ⛔⛔ **Here, and not on the More Options tile's own terms, because this is the
 * moment the driver actually knows.** The member asked them during the ride;
 * the tile requires the driver to remember afterwards and go looking for it.
 * The 610 calls exist partly because nobody writes this down at the time.
 *
 * ⚠️ **It asks; it does not file.** Answering yes opens the same form the tile
 * opens, with the member locked — the driver still says who asked and when, and
 * Support still gets a request rather than an assignment. A one-tap "yes" that
 * filed on its own would turn a prompt the driver barely read into a claim
 * about what a member wanted.
 *
 * ⛔ The opt-out is per MEMBER and is applied on BOTH answers. A driver who
 * ticks it and taps No has said "stop asking me about this person", and a
 * driver who ticks it and taps Yes has said "I have told you, stop asking" —
 * honouring it only on the No would keep asking the one person who already
 * answered.
 */
export function PreferredDriverPrompt({
  member,
  open,
  onOpenChange,
  onAnswer,
}: {
  member: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `requested` is the answer; `optOut` is the checkbox, on either answer. */
  onAnswer: (answer: { requested: boolean; optOut: boolean }) => void;
}) {
  const [optOut, setOptOut] = useState(false);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto max-w-md">
        <div className="px-5 pb-8 pt-2">
          <div className="flex items-start gap-3">
            <span
              className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: DRIVER_NAVY }}
            >
              <UserRoundCheck className="h-5 w-5 text-white" />
            </span>
            <div className="min-w-0">
              <DrawerTitle className="text-lg font-bold text-[#303068]">
                {PREFERRED_DRIVER_QUESTION}
              </DrawerTitle>
              {/* The member by name, because the opt-out below is about THEM
                  and a driver cannot agree to never be asked again about
                  someone the prompt did not identify. */}
              <p className="mt-2 text-sm text-gray-600">
                If <span className="font-semibold text-gray-900">{member}</span>{" "}
                asked you to be their driver, tell Support — they can take it to
                the client. Nothing is assigned by saying so.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <Button
              type="button"
              onClick={() => onAnswer({ requested: true, optOut })}
              className="h-14 w-full rounded-2xl text-base font-semibold text-white"
              style={{ backgroundColor: DRIVER_TEAL }}
            >
              Yes — they asked for me
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onAnswer({ requested: false, optOut })}
              className="h-14 w-full rounded-2xl border-gray-300 text-base font-semibold text-[#303068]"
            >
              No
            </Button>
          </div>

          <label className="mt-5 flex cursor-pointer items-center gap-3">
            <Checkbox
              checked={optOut}
              onCheckedChange={(next) => setOptOut(next === true)}
              aria-label={PREFERRED_DRIVER_SUPPRESS_LABEL}
            />
            <span className="text-sm text-gray-600">
              {PREFERRED_DRIVER_SUPPRESS_LABEL}
            </span>
          </label>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
