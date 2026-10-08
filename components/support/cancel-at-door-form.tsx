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
import type { SupportCallout } from "@/types/support";

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

/**
 * Say why these two questions are being asked, in the driver's terms.
 *
 * ⚠️ The two variants are asked for OPPOSITE reasons and must not share copy.
 * At the pick-up the driver is being let THROUGH a rule — the questions are the
 * price of skipping the wait. Away from it they are being asked to reconstruct
 * something the app could not see. A single neutral sentence would misdescribe
 * one of them.
 */
function buildCallout(atPickup: boolean): SupportCallout {
  return atPickup
    ? {
        tone: "info",
        title: "This can skip the 10-minute wait",
        /**
         * ⚠️ States the CONDITION, not the conclusion. The earlier wording —
         * "The member came out and refused the ride, so the wait is already
         * over" — told the driver what happened before asking them, on the one
         * screen whose entire job is to find out whether it did.
         */
        detail:
          "If someone came to the door and turned you away, the wait is already over. Two quick questions and we'll file it.",
      }
    : {
        tone: "warning",
        title: "You're not at the pick-up",
        detail:
          "We can't confirm the refusal from here, so tell us what happened and Support will take it from there.",
      };
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
      callout={buildCallout(atPickup)}
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
