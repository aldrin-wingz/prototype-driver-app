"use client";

import { useToast } from "@/hooks/use-toast";
import { legOptionFor } from "@/lib/support-data/leg-options";
import { SupportFormSheet } from "./support-form-sheet";
import { buildSupportFormCase } from "@/lib/support-data/case-registry";
import { ISSUE_CANCEL_AT_DOOR } from "@/lib/support-data/issue-types";
import { buildPrefilledValues } from "@/lib/support/prefill";
import {
  CONTACT_RELATION_OPTIONS,
  SPOKE_WITH_OPTIONS,
} from "@/lib/driver-data/no-show-rules";
import type { Trip, TripLeg } from "@/lib/driver-data/mock-trips";

/** What the driver's answers resolved to, for the screen that opened this. */
/**
 * ⛔⛔ **`"waiver-refused"` is GONE, and it went with the option that produced
 * it.** The only answer that could withdraw the waiver was "no one came to the
 * door", removed 2026-10-15 because a form reached by choosing *Cancel At Door*
 * must not offer the contradiction of that choice. With every offered answer
 * earning the waiver, the branch became unreachable — and a branch nothing can
 * reach is a branch that cannot be wrong and cannot be right.
 *
 * ⚠️ So a driver who meant *nobody came out* now says so where it belongs: by
 * choosing **Member Not Home** on the type screen. What the prototype should do
 * about production's ~9.1% of mis-typed Cancel At Door filings is an OPEN
 * question for that screen, not for this one.
 */
export type CancelAtDoorResolution = "filed";

/**
 * Build the Cancel at Door case for one leg.
 *
 * ⛔⛔ **One shape, and it is the at-the-pick-up one (D148, ticket 11299).**
 * There was an `atPickup` variant here that added "what time did you arrive"
 * and "what time did you leave" for a driver the app could not place at the
 * pick-up. The approved story says that driver is not waived at all — they go
 * to the **away support form** (arrived · left · where · knocked), which is a
 * different form asking different questions. So the away variant had nothing
 * left that could reach it, and an unreachable branch can be neither right nor
 * wrong. Removed with its caller, 2026-10-16. (Same reasoning as
 * `"waiver-refused"` above.)
 *
 * ⚠️ `askWaitTimes: false` is therefore unconditional, not a default: a driver
 * standing at the door has nothing to reconstruct, and the app already placed
 * them there.
 */
export function buildCancelAtDoor(
  trip: Trip,
  leg: TripLeg | undefined,
  noShowType: string
) {
  const supportCase = buildSupportFormCase({
    includeIssues: [ISSUE_CANCEL_AT_DOOR],
    askWaitTimes: false,
    /**
     * ⛔⛔ **FALSE, and the comment that said otherwise was the defect.** It
     * read "the Member No-Show screen takes a signature before the form
     * exists" — true, but it takes the **MEMBER's**. `NO_SHOW_TYPE_FORMS`
     * swaps the pad's label to `Member Signature` for Cancel At Door alone;
     * every other type keeps `Driver Signature`. So this was the one no-show
     * path on which the driver attested to nothing, while the two beside it
     * both did. (User direction, 2026-10-15.)
     *
     * ⚠️ Two signatures on one claim is still the thing to avoid — they are
     * just not the same person's.
     */
    signatureTakenElsewhere: false,
  });

  const initialValues: Record<string, string> = {
    ...buildPrefilledValues(supportCase, trip, leg),
    issue: ISSUE_CANCEL_AT_DOOR,
    noShowType,
  };

  return { supportCase, initialValues };
}

/** Readable label for a stored option value, for the confirmation copy. */
function labelFor(
  options: readonly { value: string; label: string }[],
  value: string | undefined
): string {
  return options.find((option) => option.value === value)?.label ?? "someone";
}

/**
 * The Cancel at Door form.
 *
 * Opens straight after Submit on the Member No-Show screen — never from a tile —
 * because it exists to justify a waiver, and there is no waiver to justify
 * anywhere else.
 *
 * ⛔ And on exactly one path: the app placed the driver at the pick-up and the
 * only thing short was the duration. Away, or with no fix at all, the screen
 * refuses and offers the away support form instead (D148).
 */
export function CancelAtDoorForm({
  trip,
  leg,
  noShowType,
  open,
  onOpenChange,
  onResolved,
}: {
  trip: Trip;
  leg: TripLeg | undefined;
  noShowType: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResolved?: (resolution: CancelAtDoorResolution) => void;
}) {
  const { toast } = useToast();
  const { supportCase, initialValues } = buildCancelAtDoor(trip, leg, noShowType);

  return (
    <SupportFormSheet
      context={legOptionFor(trip, leg)}
      supportCase={supportCase}
      open={open}
      onOpenChange={onOpenChange}
      initialValues={initialValues}
      onSubmit={(values) => {
        onOpenChange(false);

        const who =
          values.spokeWithWho === "point-of-contact"
            ? `${labelFor(CONTACT_RELATION_OPTIONS, values.spokeWithRelation)} (${labelFor(SPOKE_WITH_OPTIONS, values.spokeWithWho)})`
            : labelFor(SPOKE_WITH_OPTIONS, values.spokeWithWho);
        /**
         * ⚠️ No support request on this path, deliberately — the app action IS
         * the submission, and inventing a CS queue record would misrepresent
         * what happened. Same reasoning as the plain no-show filing.
         *
         * ⭐ Which answers an open question by removing its other half: a
         * waived Cancel At Door raises NO ticket, and the away one raises one
         * through the away support form, which is a Rider No-Show request. The
         * two outcomes no longer share a form, so they no longer share a
         * destination either.
         */
        toast({
          title: "Member No-Show submitted",
          description: `${who} refused the ride at the door, so the 10-minute wait does not apply. Not wired further in the prototype.`,
        });
        onResolved?.("filed");
      }}
    />
  );
}
