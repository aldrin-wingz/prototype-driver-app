"use client";

import { useToast } from "@/hooks/use-toast";
import { legOptionFor } from "@/lib/support-data/leg-options";
import { SupportFormSheet } from "./support-form-sheet";
import { buildSupportFormCase } from "@/lib/support-data/case-registry";
import { ISSUE_CANNOT_REACH_MEMBER } from "@/lib/support-data/issue-types";
import { buildPrefilledValues } from "@/lib/support/prefill";
import { resolveTripContext } from "@/lib/support/trip-context";
import { useRideFlow } from "@/lib/support-data/ride-flow-context";
import { contactOptionsFor } from "@/lib/driver-data/reach-attempt";
import type { Trip, TripLeg } from "@/lib/driver-data/mock-trips";

/**
 * Build the Can't Reach Member case for one leg.
 *
 * ⛔⛔ **Both entry points call THIS function.** Catalogue rows 04 and 05 are one
 * build reached from two places — a fourth option in the Reach Rider modal and a
 * tile in More Options — and the only thing stopping them becoming two subtly
 * different forms is that neither assembles its own. Exported so the check can
 * build the same case the app does.
 */
export function buildCannotReachMember(trip: Trip, leg: TripLeg | undefined) {
  const supportCase = buildSupportFormCase({
    includeIssues: [ISSUE_CANNOT_REACH_MEMBER],
    cannotReach: { contactOptions: contactOptionsFor(trip) },
  });

  const initialValues: Record<string, string> = {
    ...buildPrefilledValues(supportCase, trip, leg),
    issue: ISSUE_CANNOT_REACH_MEMBER,
  };

  return { supportCase, initialValues };
}

/**
 * The Can't Reach Member form.
 *
 * ⚠️ `appTracksStatus: false`, like Rider No-Show and unlike Missed Swipe. A
 * missed swipe is a correction to the trip record and comes back through the
 * Support Forms portal, so there is a status to show. This is a report that the
 * member could not be reached — it goes to the CS queue and what Support does
 * with it (calling the broker for a new number) never returns to the app. A
 * Pending pill here would promise a status nothing can fill in.
 *
 * ⛔ **The trip is deliberately untouched.** No state change, no Pending banner,
 * no advance to Stage 02 — exactly what `No, try again later` does today. The
 * member still has not been reached, so saying otherwise on the driver's own
 * screen would be a lie, and leaving the trip unconfirmed is what keeps the
 * orange CTA available for the moment they do get through.
 */
export function CannotReachMemberForm({
  trip,
  leg,
  open,
  onOpenChange,
  onSubmitted,
}: {
  trip: Trip;
  leg: TripLeg | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitted?: () => void;
}) {
  const { toast } = useToast();
  const { submitForm } = useRideFlow();
  const { supportCase, initialValues } = buildCannotReachMember(trip, leg);

  return (
    <SupportFormSheet
      context={legOptionFor(trip, leg)}
      supportCase={supportCase}
      open={open}
      onOpenChange={onOpenChange}
      initialValues={initialValues}
      onSubmit={(values) => {
        onOpenChange(false);
        submitForm({
          caseId: supportCase.id,
          issue: ISSUE_CANNOT_REACH_MEMBER,
          ...resolveTripContext(supportCase, values),
          values,
          appTracksStatus: false,
        });
        toast({
          title: "Sent to Support",
          // Says what did NOT happen, on purpose. The driver has just filled in
          // a form and is about to be returned to a screen that looks exactly as
          // it did before — without this line that reads as a failed submit.
          description:
            "The trip is still unconfirmed. Keep trying if you can — you can confirm it yourself the moment you reach them.",
        });
        onSubmitted?.();
      }}
    />
  );
}
