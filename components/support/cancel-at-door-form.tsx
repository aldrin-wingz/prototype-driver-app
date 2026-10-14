"use client";

import { useToast } from "@/hooks/use-toast";
import { SupportFormSheet } from "./support-form-sheet";
import { buildSupportFormCase } from "@/lib/support-data/case-registry";
import { ISSUE_CANCEL_AT_DOOR } from "@/lib/support-data/issue-types";
import { buildPrefilledValues } from "@/lib/support/prefill";
import { resolveTripContext } from "@/lib/support/trip-context";
import { useRideFlow } from "@/lib/support-data/ride-flow-context";
import {
  answerEarnsWaiver,
  CONTACT_RELATION_OPTIONS,
  SPOKE_WITH_OPTIONS,
} from "@/lib/driver-data/no-show-rules";
import type { Trip, TripLeg } from "@/lib/driver-data/mock-trips";

/** What the driver's answers resolved to, for the screen that opened this. */
export type CancelAtDoorResolution = "filed" | "sent" | "waiver-refused";

/**
 * Build the Cancel at Door case for one leg.
 *
 * ⚠️ `atPickup` is the whole variant. A driver still standing at the door has
 * nothing to reconstruct, so they are asked only who turned them away. A driver
 * the app could not place there is asked when they arrived and when they left as
 * well — the same two questions Rider No-Show asks, for the same reason.
 */
export function buildCancelAtDoor(
  trip: Trip,
  leg: TripLeg | undefined,
  noShowType: string,
  atPickup: boolean
) {
  const supportCase = buildSupportFormCase({
    includeIssues: [ISSUE_CANCEL_AT_DOOR],
    askWaitTimes: !atPickup,
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
 */
export function CancelAtDoorForm({
  trip,
  leg,
  noShowType,
  atPickup,
  open,
  onOpenChange,
  onResolved,
}: {
  trip: Trip;
  leg: TripLeg | undefined;
  noShowType: string;
  /** True when the app CAN place the driver at the pick-up right now. */
  atPickup: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResolved?: (resolution: CancelAtDoorResolution) => void;
}) {
  const { toast } = useToast();
  const { submitForm } = useRideFlow();
  const { supportCase, initialValues } = buildCancelAtDoor(
    trip,
    leg,
    noShowType,
    atPickup
  );

  return (
    <SupportFormSheet
      supportCase={supportCase}
      open={open}
      onOpenChange={onOpenChange}
      initialValues={initialValues}
      onSubmit={(values) => {
        const earned = answerEarnsWaiver(values.spokeWithWho);
        onOpenChange(false);

        /**
         * ⛔⛔ **The answer can withdraw the waiver, and here is where it does.**
         *
         * A Cancel At Door where nobody came to the door is a Member Not Home
         * wearing the wrong label, and ~9.1% of production's Cancel At Door
         * filings record exactly that. Letting it through would mean the wait is
         * skipped on a refusal that never happened — so the driver gets the
         * countdown they would have got, and nothing is filed.
         *
         * ⚠️ Only at the pick-up. Away from it nothing was going to file either
         * way, so the honest answer still goes to Support as a request.
         */
        if (atPickup && !earned) {
          onResolved?.("waiver-refused");
          return;
        }

        if (atPickup) {
          const who =
            values.spokeWithWho === "point-of-contact"
              ? `${labelFor(CONTACT_RELATION_OPTIONS, values.spokeWithRelation)} (${labelFor(SPOKE_WITH_OPTIONS, values.spokeWithWho)})`
              : labelFor(SPOKE_WITH_OPTIONS, values.spokeWithWho);
          // ⚠️ No support request on this path, deliberately — the app action IS
          // the submission, and inventing a CS queue record would misrepresent
          // what happened. Same reasoning as the plain no-show filing.
          toast({
            title: "Member No-Show submitted",
            description: `${who} refused the ride at the door, so the 10-minute wait does not apply. Not wired further in the prototype.`,
          });
          onResolved?.("filed");
          return;
        }

        submitForm({
          caseId: supportCase.id,
          issue: ISSUE_CANCEL_AT_DOOR,
          ...resolveTripContext(supportCase, values),
          values,
          // Zendesk is the destination, so there is no status to read back.
          appTracksStatus: false,
        });
        toast({
          title: supportCase.successMessage ?? "Sent to Support",
          description:
            "Support has your report. The app will not show its progress — they will contact you if they need more.",
        });
        onResolved?.("sent");
      }}
    />
  );
}
