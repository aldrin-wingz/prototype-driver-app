"use client";

import { useToast } from "@/hooks/use-toast";
import { SupportFormSheet } from "./support-form-sheet";
import { buildSupportFormCase } from "@/lib/support-data/case-registry";
import { ISSUE_RIDER_DECLINED } from "@/lib/support-data/issue-types";
import { buildPrefilledValues } from "@/lib/support/prefill";
import { useRideFlow } from "@/lib/support-data/ride-flow-context";
import {
  DECLINED_LEGS_FIELD,
  declineLegDefault,
  declineLegOptions,
  parseLegSelection,
  tripIdsForLegs,
} from "@/lib/driver-data/rider-declined";
import type { Trip, TripLeg } from "@/lib/driver-data/mock-trips";

/**
 * Build the Rider Declined case for one ride.
 *
 * Exported so `scripts/verify-solutions.ts` can build the same case the app
 * does — the lesson from Can't Reach Member, where two entry points could have
 * assembled two subtly different forms.
 */
export function buildRiderDeclined(trip: Trip, leg: TripLeg | undefined) {
  const supportCase = buildSupportFormCase({
    includeIssues: [ISSUE_RIDER_DECLINED],
    riderDeclined: { legOptions: declineLegOptions(trip) },
  });

  const initialValues: Record<string, string> = {
    ...buildPrefilledValues(supportCase, trip, leg),
    issue: ISSUE_RIDER_DECLINED,
    // ⭐ Every leg of the round trip ticked, per production's own template.
    // Seeded here rather than through `defaultValue` because the value depends
    // on the TRIP and `defaultValue` is a constant on the field.
    [DECLINED_LEGS_FIELD]: declineLegDefault(trip),
  };

  return { supportCase, initialValues };
}

/**
 * The Rider Declined the Trip form — catalogue row 16.
 *
 * ⚠️ `appTracksStatus: false`, like Can't Reach Member and Rider No-Show. The
 * CANCELLATION is the client's to make and the app cannot read it back, so a
 * Pending pill here would promise a status nothing can fill in. What the ride
 * shows instead is `Cancellation requested`, which claims only what we did.
 *
 * ⛔ Knowing whether it went through is **catalogue row 17**, the requests tray,
 * 509 calls in this same subject area and specified nowhere. Building a status
 * here would quietly consume that row while answering none of it.
 */
export function RiderDeclinedForm({
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
  const { submitForm, requestCancellation } = useRideFlow();
  const { supportCase, initialValues } = buildRiderDeclined(trip, leg);

  return (
    <SupportFormSheet
      supportCase={supportCase}
      open={open}
      onOpenChange={onOpenChange}
      initialValues={initialValues}
      onSubmit={(values) => {
        onOpenChange(false);

        const legIds = parseLegSelection(values[DECLINED_LEGS_FIELD] ?? "");
        const tripIds = tripIdsForLegs(trip, legIds);

        submitForm({
          caseId: supportCase.id,
          issue: ISSUE_RIDER_DECLINED,
          // ⛔ Passed explicitly, NOT through `resolveTripContext`. This case has
          // no leg picker — the checklist is its leg field — so the generic
          // resolver finds nothing and would file a trip-less request. See the
          // note beside `ANY_LEG_CASE` in the case registry.
          tripId: trip.id,
          legId: leg?.id,
          values,
          appTracksStatus: false,
        });

        requestCancellation(tripIds);

        // ⛔ ONE toast. `TOAST_LIMIT` is 1, so a handler raising two shows only
        // the second — a driver who finished the flow would be told nothing
        // about what happened to the legs they just ticked.
        toast({
          title: "Sent to Support",
          description:
            legIds.length > 1
              ? `Both legs are marked cancellation requested. They stay on your manifest until the client removes them — you do not need to drive them.`
              : `This leg is marked cancellation requested. It stays on your manifest until the client removes it — you do not need to drive it.`,
        });
        onSubmitted?.();
      }}
    />
  );
}
