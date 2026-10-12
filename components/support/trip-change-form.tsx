"use client";

import { useToast } from "@/hooks/use-toast";
import { SupportFormSheet } from "./support-form-sheet";
import { buildSupportFormCase } from "@/lib/support-data/case-registry";
import { ISSUE_TRIP_CHANGE_REQUEST } from "@/lib/support-data/issue-types";
import { buildPrefilledValues, toTimeInputValue } from "@/lib/support/prefill";
import { useRideFlow } from "@/lib/support-data/ride-flow-context";
import {
  changeAddressFieldId,
  changeAnchors,
  changeTimeFieldId,
  tripChanges,
  TRIP_CHANGE_SUBMIT_TOAST,
  TRIP_CHANGE_REQUESTED_TITLE,
} from "@/lib/driver-data/trip-change-request";
import type { Trip, TripLeg } from "@/lib/driver-data/mock-trips";

/**
 * Build the Update Trip Details case for one ride — catalogue row 20.
 *
 * Exported so `scripts/verify-solutions.ts` can build the same case both entry
 * points do. Two entry points assembling two subtly different forms is the
 * lesson from Can't Reach Member, and this case has two of them: the More
 * Options tile and the pencil on the ride's own anchor rows.
 *
 * ⛔ Returns the ANCHORS alongside the case, because the caller needs them to
 * compute the diff at submit and the field ids are built from their indices.
 * Re-deriving them in the handler would be a second walk over the same trip that
 * could disagree with the one the form was built from.
 */
export function buildTripChange(trip: Trip, leg: TripLeg | undefined) {
  const anchors = changeAnchors(trip);
  const supportCase = buildSupportFormCase({
    includeIssues: [ISSUE_TRIP_CHANGE_REQUEST],
    tripChange: { anchors },
  });

  const initialValues: Record<string, string> = {
    ...buildPrefilledValues(supportCase, trip, leg),
    issue: ISSUE_TRIP_CHANGE_REQUEST,
  };

  // ⭐ The ride's own values, seeded straight in. Not a `prefillFrom` source,
  // because how many anchors a ride has varies — a source per index would be a
  // list of sources nobody could keep in step with the seed.
  for (const anchor of anchors) {
    initialValues[changeTimeFieldId(anchor.index)] = toTimeInputValue(
      anchor.time
    );
    initialValues[changeAddressFieldId(anchor.index)] = anchor.address;
  }

  return { supportCase, initialValues, anchors };
}

/**
 * The Update Trip Details form — catalogue row 20.
 *
 * ⛔⛔ **Nothing this form does changes the ride.** The driver types over the
 * ride's own times and addresses, which looks exactly like editing it, and it is
 * not: the client owns the manifest. What leaves here is a request, and the ride
 * goes on showing its old values with a `Change requested` banner saying what
 * was asked for.
 *
 * ⚠️ `appTracksStatus: false`, like rows 05, 09, 13 and 16. Whether the client
 * accepts the new time never comes back to the app, so a Pending pill would
 * promise a status nothing can fill in.
 */
export function TripChangeForm({
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
  const { submitForm, requestTripChange } = useRideFlow();
  const { supportCase, initialValues, anchors } = buildTripChange(trip, leg);

  return (
    <SupportFormSheet
      supportCase={supportCase}
      open={open}
      onOpenChange={onOpenChange}
      initialValues={initialValues}
      onSubmit={(values) => {
        onOpenChange(false);

        const changes = tripChanges(anchors, initialValues, values);

        submitForm({
          caseId: supportCase.id,
          issue: ISSUE_TRIP_CHANGE_REQUEST,
          // ⛔ Passed explicitly. This case carries no leg picker — the anchor
          // fields are its subject — so `resolveTripContext` finds nothing and
          // would file a trip-less request. Same hand-off as row 16.
          tripId: trip.id,
          legId: leg?.id,
          values,
          appTracksStatus: false,
        });

        requestTripChange(trip.id, changes);

        // ⛔ ONE toast. `TOAST_LIMIT` is 1, so a handler raising two shows only
        // the second.
        toast({
          title: TRIP_CHANGE_REQUESTED_TITLE,
          description: TRIP_CHANGE_SUBMIT_TOAST,
        });
        onSubmitted?.();
      }}
    />
  );
}
