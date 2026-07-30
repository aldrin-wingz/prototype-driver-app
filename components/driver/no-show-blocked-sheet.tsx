"use client";

import { AlarmClock, MapPin, X } from "lucide-react";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { NO_SHOW_WAIT_MINUTES } from "@/lib/driver-data/no-show-rules";

/** Which refusal this is. The two are NOT the same message with a button hidden. */
export type NoShowBlockedVariant = "left" | "waiting";

const DRIVER_ROSE_DEEP = "#D85878";

/**
 * The Member No-Show refusal, for clients that still require an on-site filing.
 *
 * Two variants, deliberately worded as different problems with different answers:
 *
 *  - `left`    — the driver is no longer at the pick-up. Nothing they can do on
 *                site fixes that, so the form IS the way forward and sits right
 *                here beside the dismissal.
 *  - `waiting` — the driver is at the pick-up but the wait isn't finished. They
 *                can simply wait, so there is no form: offering one would make it
 *                a way to skip the wait entirely. The copy says so outright
 *                rather than leaving the missing button to be inferred.
 */
export function NoShowBlockedSheet({
  open,
  onOpenChange,
  variant,
  clientLabel,
  waitedMinutes,
  onSubmitForm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variant: NoShowBlockedVariant;
  /** Named in the copy, so the rule reads as the client's and not the app's. */
  clientLabel: string;
  /** Minutes the app can account for, when it can account for any. */
  waitedMinutes: number | null;
  onSubmitForm: () => void;
}) {
  const isLeft = variant === "left";
  const Icon = isLeft ? MapPin : AlarmClock;

  const title = isLeft
    ? "You must be at the pick-up to submit"
    : `You haven't waited ${NO_SHOW_WAIT_MINUTES} minutes yet`;

  const detail = isLeft
    ? `${clientLabel} requires a no-show to be submitted from the pick-up location after a ${NO_SHOW_WAIT_MINUTES}-minute wait, and you're no longer there. Send it to Support as a form instead.`
    : `You're at the pick-up, so finish the ${NO_SHOW_WAIT_MINUTES}-minute wait and submit the no-show right here. There's no form for this — a form can't shortcut the wait.`;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="rounded-t-3xl border-0 px-6 pb-8">
        <div className="mx-auto w-full max-w-md">
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              aria-label="Close"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-2 flex flex-col items-center text-center">
            <span
              className="flex h-20 w-20 items-center justify-center rounded-full"
              style={{ backgroundColor: DRIVER_ROSE_DEEP }}
            >
              <Icon className="h-10 w-10 text-white" strokeWidth={2} />
            </span>

            <DrawerTitle className="mt-6 text-3xl font-bold leading-tight text-gray-900">
              {title}
            </DrawerTitle>
            <p className="mt-3 text-lg leading-snug text-gray-500">{detail}</p>

            {/* What the app can actually account for. On the `left` variant this is
                the crux — the driver DID wait, and saying so is what makes the
                block feel like a policy rather than a doubt about them. */}
            {waitedMinutes !== null && (
              <p className="mt-4 text-base text-gray-400">
                We recorded {waitedMinutes} minute
                {waitedMinutes === 1 ? "" : "s"} at the pick-up.
              </p>
            )}
          </div>

          {isLeft ? (
            <>
              <Button
                type="button"
                onClick={onSubmitForm}
                className="mt-8 h-14 w-full rounded-xl bg-[#1ECFA0] text-lg font-bold text-white hover:bg-[#0FB88C]"
              >
                Submit Form
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="mt-4 h-14 w-full rounded-xl border-gray-300 text-lg font-bold text-gray-900"
              >
                Close
              </Button>
            </>
          ) : (
            <Button
              type="button"
              onClick={() => onOpenChange(false)}
              className="mt-8 h-14 w-full rounded-xl bg-[#00B090] text-lg font-bold text-white hover:bg-[#059669]"
            >
              Got it
            </Button>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
