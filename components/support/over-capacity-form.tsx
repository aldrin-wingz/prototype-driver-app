"use client";

import { useToast } from "@/hooks/use-toast";
import { legOptionFor } from "@/lib/support-data/leg-options";
import { SupportFormSheet } from "./support-form-sheet";
import { buildSupportFormCase } from "@/lib/support-data/case-registry";
import { ISSUE_OVER_CAPACITY_EXCEPTION } from "@/lib/support-data/issue-types";
import { buildPrefilledValues } from "@/lib/support/prefill";
import { useRideFlow } from "@/lib/support-data/ride-flow-context";
import { mockUpcomingTrips, type Trip } from "@/lib/driver-data/mock-trips";
import {
  buildSeatBlocks,
  OVER_CAPACITY_FORM_SUBMIT,
  OVER_CAPACITY_SUCCESS,
} from "@/lib/driver-data/over-capacity";

/**
 * Build the over-capacity exception case — catalogue row 13.
 *
 * Exported for the reason `buildAutoAssignRequest` is: the check builds the
 * case the app builds, rather than a second copy that can agree with the spec
 * while disagreeing with the screen.
 *
 * ⚠️ The manifest is read HERE and nowhere else in the render path. The
 * blocking trips are the driver's own accepted rides, so the only honest
 * source is the upcoming seed; passing them in would let a caller decide which
 * of the driver's trips count, which is a rule, not a parameter.
 */
export function buildOverCapacityException(trip: Trip) {
  const supportCase = buildSupportFormCase({
    includeIssues: [ISSUE_OVER_CAPACITY_EXCEPTION],
    overCapacity: { seatBlocks: buildSeatBlocks(trip, mockUpcomingTrips) },
  });

  const initialValues: Record<string, string> = {
    ...buildPrefilledValues(supportCase, trip, undefined),
    issue: ISSUE_OVER_CAPACITY_EXCEPTION,
  };

  return { supportCase, initialValues };
}

/**
 * The over-capacity exception request.
 *
 * ⛔⛔ **Submitting accepts NOTHING.** The request stays in Requests, still
 * without an accept control, until Support releases it — the same shape as
 * Update Trip Details leaving the ride's times alone and Add Leg adding
 * nothing to the manifest. What this removes is the phone number `CAP-340`
 * hands the driver in place of a decision, not the block behind it.
 *
 * ⚠️ `appTracksStatus: true`, unlike Rider No-Show and Can't Reach Member.
 * This one has an answer that comes back — Support either releases the trip or
 * does not — so the screen can honestly show "Waiting on Support" and swap the
 * footer for the Pending chip. ⛔ The trip is a REQUEST, not a ride, so it
 * never reaches My Rides → Pending; `allRides` does not include the request
 * pool, and the pending state lives entirely on this screen.
 */
export function OverCapacityForm({
  trip,
  open,
  onOpenChange,
  onSubmitted,
}: {
  trip: Trip;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitted?: () => void;
}) {
  const { toast } = useToast();
  const { submitForm } = useRideFlow();
  const { supportCase, initialValues } = buildOverCapacityException(trip);

  return (
    <SupportFormSheet
      context={legOptionFor(trip)}
      supportCase={{ ...supportCase, submitLabel: OVER_CAPACITY_FORM_SUBMIT }}
      open={open}
      onOpenChange={onOpenChange}
      initialValues={initialValues}
      onSubmit={(values) => {
        onOpenChange(false);
        submitForm({
          caseId: supportCase.id,
          issue: ISSUE_OVER_CAPACITY_EXCEPTION,
          tripId: trip.id,
          values,
          appTracksStatus: true,
        });
        toast({
          title: "Sent to Support",
          // Says what did NOT happen, on purpose — the same reason Can't Reach
          // Member's toast does. The driver has just filled in a form and is
          // returned to a screen with no accept control, exactly as before.
          description: OVER_CAPACITY_SUCCESS,
        });
        onSubmitted?.();
      }}
    />
  );
}
