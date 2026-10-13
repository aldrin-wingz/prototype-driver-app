"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, FilePlus, X } from "lucide-react";

import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
import {
  DECLINED_BODY,
  DECLINED_CHAT_SUPPORT,
  DECLINED_TITLE,
  DECLINED_WALK_BACK,
  SHEET_SWAP_MS,
} from "@/lib/driver-data/rider-declined";
import {
  DRIVER_SPRING,
  DRIVER_SPRING_MUTED,
  DRIVER_TEAL,
} from "@/constants/driver-app-colors";
import type { Trip } from "@/lib/driver-data/mock-trips";

/**
 * Stage 01 Step 2 — the Reach Rider modal, behind `I REACHED OUT TO CONFIRM`.
 *
 * Replicated from `Stage 01 - Member Confirmation - Reach Rider modal
 * (standard).webp` and `(same-day).webp` in the Flow Reference shoot, the
 * Trip Completion Flow Stage Map's Step 2 table, and `CAP-321` / `CAP-322` for
 * the Next button's disabled and enabled states.
 *
 * ⛔⛔ **Three options, and the interesting one is the third.** Until this
 * landed the CTA raised a "not wired" toast, so the app could enter the
 * unconfirmed phase and never leave it. Now the whole production path is here,
 * including where it ends — which for a declined rider is a Zendesk ticket
 * filed on the driver's behalf and then silence.
 */

/** Which option is selected. All three are production's. */
type ReachOutcome = "confirmed" | "declined" | "later";

interface ReachOption {
  value: ReachOutcome;
  label: string;
  /** Helper line printed under the option list while it is selected. */
  note?: string;
}

/**
 * The option list for a variant.
 *
 * ⛔⛔ **Built per variant rather than patched, because the difference is not
 * cosmetic.** The same-day third option ADVANCES the trip where the standard
 * one closes without changing anything. A single list with a swapped label
 * would make two different behaviours look like one.
 *
 * ⚠️ `sameDay` is a PARAMETER, not read from a trip inside, so `verify-base`
 * can build both real lists rather than grep for a line — the base seeds one
 * unconfirmed ride and it is a same-day one, so the standard variant is not
 * reachable by tapping. The check is the only thing that exercises it.
 */
export function reachOptionsFor(sameDay: boolean): ReachOption[] {
  return [
    { value: "confirmed", label: "Yes, I confirmed with the rider" },
    { value: "declined", label: "Rider declined the trip" },
    sameDay
      ? {
          value: "later",
          label: "No, but I will go to the pickup as scheduled",
          note: "Note: Don't worry—you can still start the trip on the pickup day, but it's best to confirm with the rider in advance.",
        }
      : { value: "later", label: "No, try again later" },
  ];
}

export function ReachRiderModal({
  trip,
  sameDay,
  open,
  onOpenChange,
  onUnwired,
}: {
  trip: Trip;
  sameDay: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * The driver confirmed, or accepted the same-day risk path.
   *
   * ⛔ Production ADVANCES the trip here. This mirror cannot: its ride states
   * are seeded, not runtime, so there is no unconfirmed-to-confirmed
   * transition to make. The caller says so out loud rather than leaving a dead
   * tap — the same treatment every unwired More Options tile gets.
   */
  onUnwired: (what: string) => void;
}) {
  const [choice, setChoice] = useState<ReachOutcome | null>(null);
  const [declined, setDeclined] = useState(false);
  const router = useRouter();

  const options = reachOptionsFor(sameDay);
  const selected = options.find((option) => option.value === choice);

  function close() {
    onOpenChange(false);
    // ⚠️ Cleared on the way OUT, not on the way in. vaul animates the sheet
    // closed, and resetting before that finishes makes the selected option
    // visibly un-tick while the sheet is still on screen.
    setTimeout(() => setChoice(null), SHEET_SWAP_MS);
  }

  function handleNext() {
    switch (choice) {
      case "confirmed":
        close();
        onUnwired("Confirmed with the rider");
        return;
      case "declined":
        // ⛔ No trip state change here — production's own behaviour, and the
        // sheet that opens next says in as many words that this is not a
        // cancellation.
        close();
        // ⚠️ Deferred — see `SHEET_SWAP_MS`. Two vaul drawers opened in one
        // frame stack instead of handing over.
        setTimeout(() => setDeclined(true), SHEET_SWAP_MS);
        return;
      case "later":
        close();
        // ⚠️ **The same-day third option is a RISK PATH**: production advances
        // the trip without anybody having confirmed it. The standard variant
        // closes and changes nothing, which needs no stand-in.
        if (sameDay) onUnwired("Going to the pickup unconfirmed");
        return;
      default:
        return;
    }
  }

  return (
    <>
      <Drawer
        open={open}
        onOpenChange={(next) => {
          if (!next) close();
        }}
      >
        <DrawerContent className="flex max-h-[92vh] flex-col rounded-t-3xl border-0 px-6 pb-8">
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full bg-gray-200 text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="pt-6">
            <DrawerTitle className="max-w-[16ch] text-left text-[28px] font-bold leading-tight text-gray-900">
              Were you able to reach the rider?
            </DrawerTitle>
            <p className="mt-3 text-base leading-snug text-gray-600">
              Please select the appropriate option to confirm your next steps.
            </p>
          </div>

          <div className="-mx-6 mt-7 flex flex-1 flex-col gap-3 overflow-y-auto px-6">
            {options.map((option) => {
              const isSelected = option.value === choice;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setChoice(option.value)}
                  aria-pressed={isSelected}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl border px-5 py-5 text-left",
                    isSelected ? "border-2" : "border-gray-300"
                  )}
                  style={isSelected ? { borderColor: DRIVER_SPRING } : undefined}
                >
                  <span className="flex-1">
                    <span className="block text-base font-bold leading-snug text-gray-900">
                      {option.label}
                    </span>
                  </span>
                  {isSelected && (
                    <span
                      className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: DRIVER_TEAL }}
                    >
                      <Check className="h-4 w-4 text-white" strokeWidth={3} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* One note slot under the list, matching the capture — and OUTSIDE
              the scroll area, with the button. A note that explained what the
              selected option does and then scrolled out of sight would be
              worse than no note. */}
          {selected?.note && (
            <p className="mt-4 flex-shrink-0 text-sm leading-snug text-gray-600">
              {selected.note}
            </p>
          )}

          {/* ⚠️ Disabled until an option is picked — `CAP-321` shows it muted
              with nothing selected, `CAP-322` live with one. */}
          <button
            type="button"
            onClick={handleNext}
            disabled={!choice}
            className="mt-7 w-full flex-shrink-0 rounded-full py-4 text-lg font-semibold text-white"
            style={{
              backgroundColor: choice ? DRIVER_SPRING : DRIVER_SPRING_MUTED,
            }}
          >
            Next
          </button>
        </DrawerContent>
      </Drawer>

      {/*
        The Rider Declined sheet — `CAP-323`, corroborated by `CAP-325`.

        ⚠️ A BOTTOM SHEET with a teal document mark and TWO buttons. The older
        `CAP-090` (iOS, a 2021 ride) is a one-button alert offering `Call
        Support`; it is not this screen and must not be reintroduced from an old
        screenshot. See `DECLINED_BODY`.
      */}
      <Drawer open={declined} onOpenChange={(next) => !next && setDeclined(false)}>
        <DrawerContent className="rounded-t-3xl border-0 px-6 pb-8">
          <button
            type="button"
            onClick={() => setDeclined(false)}
            aria-label="Close"
            className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex flex-col items-center pt-10 text-center">
            <span
              className="flex h-16 w-16 items-center justify-center rounded-full"
              style={{ backgroundColor: DRIVER_TEAL }}
            >
              <FilePlus className="h-8 w-8 text-white" strokeWidth={2} />
            </span>
            <DrawerTitle className="mt-6 text-[28px] font-bold leading-tight text-gray-900">
              {DECLINED_TITLE}
            </DrawerTitle>
            <p className="mt-3 text-lg font-semibold leading-snug text-gray-500">
              {DECLINED_BODY}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setDeclined(false);
              /**
               * ⛔ Production NAVIGATES. The driver leaves the ride for the
               * Zendesk chat, and that departure IS the dead end — an overlay
               * would leave the ride visible behind it and read as a detour.
               * ⚠️ Deferred for the same reason the sheet handover is.
               */
              setTimeout(() => router.push(`/support-chat/${trip.id}`), SHEET_SWAP_MS);
            }}
            className="mt-8 w-full rounded-full py-4 text-lg font-semibold text-white"
            style={{ backgroundColor: DRIVER_SPRING }}
          >
            {DECLINED_CHAT_SUPPORT}
          </button>

          {/* ⛔ Files NOTHING and changes nothing — it returns the driver to the
              option list. A driver who tapped the wrong option has to be able
              to leave without having reported that a member said something
              they did not. */}
          <button
            type="button"
            onClick={() => {
              setDeclined(false);
              setChoice(null);
              setTimeout(() => onOpenChange(true), SHEET_SWAP_MS);
            }}
            className="mt-3 w-full rounded-full border border-gray-300 py-4 text-lg font-semibold text-gray-900"
          >
            {DECLINED_WALK_BACK}
          </button>
        </DrawerContent>
      </Drawer>
    </>
  );
}
