"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, FilePlus, X } from "lucide-react";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
import { CannotReachMemberForm } from "@/components/support/cannot-reach-member-form";
import { RiderDeclinedForm } from "@/components/support/rider-declined-form";
import {
  CANNOT_REACH_LABEL,
  showsCannotReachOption,
} from "@/lib/driver-data/reach-attempt";
import type { DemoFocus } from "@/lib/solutions/demo-mode";
import { useSolution } from "@/lib/solutions/solution-context";
import {
  declinedSheetFor,
  SHEET_SWAP_MS,
} from "@/lib/driver-data/rider-declined";

import {
  DRIVER_SPRING,
  DRIVER_SPRING_MUTED,
  DRIVER_TEAL,
} from "@/constants/driver-app-colors";
import type { Trip, TripLeg } from "@/lib/driver-data/mock-trips";

/**
 * Stage 01 Step 2 — the Reach Rider modal.
 *
 * Replicated from `Stage 01 - Member Confirmation - Reach Rider modal
 * (standard).webp` and `(same-day).webp`, and from the Trip Completion Flow
 * Stage Map's Step 2 table. Before this the `I REACHED OUT TO CONFIRM` CTA
 * raised a toast saying it was not wired, so the app could enter the unconfirmed
 * phase and never leave it.
 *
 * ⚠️ **Three production options, then one proposal.** Catalogue rows 04 and 05
 * are the fourth. Keeping the production three honest matters more than the new
 * one looking good — the whole argument for the proposal is what the driver's
 * alternatives are today, and option 3 closing with no state change IS the
 * problem.
 */

/** Which option is selected. The three production values, then the proposal. */
type ReachOutcome = "confirmed" | "declined" | "later" | "cannot-reach";

interface ReachOption {
  value: ReachOutcome;
  label: string;
  /** Helper line printed under the option list while it is selected. */
  note?: string;
  /** ⚠️ Marks the one option production does not have. */
  proposed?: boolean;
}

/**
 * The option list for a variant, for the solution in focus.
 *
 * ⚠️ Built per variant rather than patched, because the difference is not
 * cosmetic: the same-day third option ADVANCES the trip where the standard one
 * closes without changing anything. A single list with a swapped label would
 * make two different behaviours look like one.
 *
 * ⛔⛔ **The fourth option is a PROPOSAL and belongs to its own build.** It is
 * rows 04/05, and it used to render on every focus — so a reviewer walking
 * row 16's decline met it on the way past, and two proposals in one flow read
 * as one feature. `buildGridTiles` has applied this rule to the More Options
 * grid since Phase 6; the modal was missed. The three PRODUCTION options are
 * never filtered: they are what the screen does today, whatever is in focus.
 *
 * ⚠️ `focus` is a PARAMETER, not context read inside: this stays
 * pure so `verify-solutions` can build the real list for each focus rather than
 * grep for a line.
 */
export function reachOptionsFor(
  sameDay: boolean,
  focus: DemoFocus
): ReachOption[] {
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
    ...(showsCannotReachOption(focus)
      ? ([
          {
            value: "cannot-reach",
            label: CANNOT_REACH_LABEL,
            // ⚠️ The one piece of copy that says what the OPTION does rather than
            // what the driver did. It is here because the honest answer is
            // "nothing happens to your trip", and a driver who expects the trip
            // to move on would read the unchanged screen afterwards as a failed
            // submit.
            note: "Tell us which number you tried and what happened. Your trip stays unconfirmed — you can still confirm it yourself if you reach them later.",
            proposed: true,
          },
        ] as ReachOption[])
      : []),
  ];
}

export function ReachRiderModal({
  trip,
  leg,
  open,
  onOpenChange,
  onConfirmed,
}: {
  trip: Trip;
  leg: TripLeg | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The driver confirmed with the member — the trip advances to Stage 02. */
  onConfirmed: () => void;
}) {
  const [choice, setChoice] = useState<ReachOutcome | null>(null);
  const [declined, setDeclined] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [declineFormOpen, setDeclineFormOpen] = useState(false);

  const router = useRouter();
  const { demo } = useSolution();
  const sameDay = Boolean(trip.sameDay);
  // ⚠️ `demo.solutionId` is `null` for the plain mirror, which the rule reads
  // as "no filtering" — see `showsProposal`.
  const options = reachOptionsFor(sameDay, demo);
  /**
   * ⛔ The sheet's copy AND its destination come from one rule. Production hands
   * the driver to a Zendesk chat that files a ticket for them; the proposal
   * hands them a form. A button whose label and target were decided separately
   * is how `Chat with Support` ends up opening a form.
   */
  const declinedSheet = declinedSheetFor(demo);
  const selected = options.find((option) => option.value === choice);

  function close() {
    onOpenChange(false);
    // ⚠️ Cleared on the way out, not on the way in. vaul animates the sheet
    // closed, and resetting before that finishes makes the selected option
    // visibly un-tick while the sheet is still on screen.
    //
    // ⭐ The same 250ms as every sheet handover below, and now the same named
    // constant — it is one fact about vaul, not four coincidences.
    setTimeout(() => setChoice(null), SHEET_SWAP_MS);
  }

  function handleNext() {
    switch (choice) {
      case "confirmed":
        close();
        onConfirmed();
        return;
      case "declined":
        // ⛔ No trip state change HERE — production's own behaviour, and it is
        // still true: the sheet that opens next says in as many words that this
        // is not a cancellation. What changed in row 16 is where its primary
        // button goes.
        close();
        // ⚠️ Deferred — see `SHEET_SWAP_MS`. Two vaul drawers opened in one
        // frame stack instead of handing over.
        setTimeout(() => setDeclined(true), SHEET_SWAP_MS);
        return;
      case "later":
        close();
        // ⚠️ The same-day variant's third option is a RISK PATH: it advances the
        // trip without anybody confirming it. Faithful to production, and the
        // reason the fourth option exists — today a driver who cannot reach the
        // member either drives out unconfirmed or files nothing at all.
        if (sameDay) onConfirmed();
        return;
      case "cannot-reach":
        onOpenChange(false);
        setFormOpen(true);
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
                {/* ⚠️ `max-h` + an internally scrolling body, the same shape
            `support-form-sheet` uses. A four-option list is taller than a
            three-option one, and the sheet is `fixed` inside the solutions
            strip's containing block rather than the viewport — so without this
            the fourth option and the `Next` button render off the bottom of the
            screen, which is precisely where the proposal lives. */}
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
                  style={
                    isSelected ? { borderColor: DRIVER_SPRING } : undefined
                  }
                >
                  <span className="flex-1">
                    <span className="block text-base font-bold leading-snug text-gray-900">
                      {option.label}
                    </span>
                    {/* The three options above are production; this one is the
                        proposal, and a screenshot of this sheet has to say which
                        is which. ⚠️ Its own block, not a trailing span — inline
                        it wrapped onto a second line and left a dangling
                        separator behind the label. */}
                    {option.proposed && (
                      <span className="mt-1 inline-block rounded-full border border-gray-300 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                        Proposed
                      </span>
                    )}
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

          {/* One note slot under the list, matching the capture — the same-day
              helper line sits here, and the proposed option reuses it rather
              than growing a second pattern. */}
          {/* Outside the scroll area, with the button — a note that explained
              what the selected option does and then scrolled out of sight would
              be worse than no note. */}
          {selected?.note && (
            <p className="mt-4 flex-shrink-0 text-sm leading-snug text-gray-600">
              {selected.note}
            </p>
          )}

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
        The Rider Declined sheet.

        ⚠️ **Rebuilt 2026-10-13 against `CAP-224` / `s-04b`.** It was an
        `AlertDialog` replicating `CAP-090` — an iOS capture of a 2021 ride,
        offering `Call Support` and nothing else. The current build shows a
        BOTTOM SHEET with a teal document mark and TWO buttons, the second of
        which is a walk-back. Replicating the older screen meant the prototype
        was arguing against a flow production had already changed.

        ⚠️ One departure, and it is named in `rider-declined.ts`: the primary
        button reads `Continue` rather than `Chat with Support`, because it
        opens a form. A button naming a chat that opens a form is a small lie
        about the very next tap.
      */}
      <Drawer
        open={declined}
        onOpenChange={(next) => !next && setDeclined(false)}
      >
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
              {declinedSheet.title}
            </DrawerTitle>
            <p className="mt-3 text-lg font-semibold leading-snug text-gray-500">
              {declinedSheet.body}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setDeclined(false);
              // ⚠️ Deferred — the next screen is a third sheet either way, and
              // the same handover applies. See `SHEET_SWAP_MS`.
              setTimeout(() => {
                /**
                 * ⛔ Production NAVIGATES. The driver leaves the ride for the
                 * Zendesk chat, and that departure is the dead end — an overlay
                 * would leave the ride visible behind it and read as a detour.
                 * ⚠️ `router.push`, so `RideFlowProvider` survives: the ride is
                 * still there when they come back, which is also true today.
                 */
                if (declinedSheet.primaryGoesTo === "zendesk") {
                  router.push(`/support-chat/${trip.id}`);
                } else {
                  setDeclineFormOpen(true);
                }
              }, SHEET_SWAP_MS);
            }}
            className="mt-8 w-full rounded-full py-4 text-lg font-semibold text-white"
            style={{ backgroundColor: DRIVER_SPRING }}
          >
            {declinedSheet.primaryLabel}
          </button>

          {/* ⛔ Files NOTHING and changes nothing — it returns the driver to the
              option list. A driver who tapped the wrong option has to be able to
              leave without having reported that a member said something they
              did not. Verbatim from the capture. */}
          <button
            type="button"
            onClick={() => {
              setDeclined(false);
              setChoice(null);
              setTimeout(() => onOpenChange(true), SHEET_SWAP_MS);
            }}
            className="mt-3 w-full rounded-full border border-gray-300 py-4 text-lg font-semibold text-gray-900"
          >
            {declinedSheet.walkBackLabel}
          </button>
        </DrawerContent>
      </Drawer>

      <RiderDeclinedForm
        trip={trip}
        leg={leg}
        open={declineFormOpen}
        onOpenChange={setDeclineFormOpen}
        onSubmitted={() => setChoice(null)}
      />

      <CannotReachMemberForm
        trip={trip}
        leg={leg}
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmitted={() => setChoice(null)}
      />
    </>
  );
}
