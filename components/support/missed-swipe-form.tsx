"use client";

import { useToast } from "@/hooks/use-toast";
import { legOptionFor } from "@/lib/support-data/leg-options";
import { SupportFormSheet } from "./support-form-sheet";
import { buildSupportFormCase } from "@/lib/support-data/case-registry";
import { ISSUE_MISSED_SWIPE } from "@/lib/support-data/issue-types";
import { buildPrefilledValues } from "@/lib/support/prefill";
import { resolveTripContext } from "@/lib/support/trip-context";
import { useRideFlow } from "@/lib/support-data/ride-flow-context";
import {
  anchorMatched,
  leavesMemberSignatureMissing,
  MARK_FOR_ANCHOR,
  matchAnchor,
  type SwipeAnchor,
} from "@/lib/driver-data/missed-swipe-rules";
import { fromTimeInputValue } from "@/lib/support/prefill";
import type { Trip, TripLeg } from "@/lib/driver-data/mock-trips";

/**
 * Build the Missed Swipe case for one leg.
 *
 * `asks` is the routing decision already taken — this never re-derives it, so a
 * postponed pick-up asked after the drop-off and a pick-up asked because the
 * member left cannot drift into asking different things.
 */
export function buildMissedSwipe(
  trip: Trip,
  leg: TripLeg | undefined,
  asks: SwipeAnchor[]
) {
  const supportCase = buildSupportFormCase({
    includeIssues: [ISSUE_MISSED_SWIPE],
    missedSwipe: asks.map((anchor) => ({
      anchor,
      confirmed: leg ? anchorMatched(matchAnchor(leg, anchor)) : false,
    })),
  });

  const initialValues: Record<string, string> = {
    ...buildPrefilledValues(supportCase, trip, leg),
    issue: ISSUE_MISSED_SWIPE,
  };

  return { supportCase, initialValues };
}

/**
 * The Missed Swipe form.
 *
 * ⚠️ `appTracksStatus: true` — the one case on this branch that keeps Pending.
 * Rider No-Show lost it when its destination became Zendesk; a missed swipe is a
 * correction to the trip record, which comes back through the Support Forms
 * portal, so there genuinely is a status to show. The removal was scoped per
 * case precisely so this one could keep it.
 */
export function MissedSwipeForm({
  trip,
  leg,
  asks,
  open,
  onOpenChange,
  onSubmitted,
}: {
  trip: Trip;
  leg: TripLeg | undefined;
  asks: SwipeAnchor[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitted?: () => void;
}) {
  const { toast } = useToast();
  const { submitForm, recordSwipe, markMemberSignatureMissing } = useRideFlow();
  const { supportCase, initialValues } = buildMissedSwipe(trip, leg, asks);

  /** Which form fields hold each anchor's answers. */
  const FIELDS: Record<SwipeAnchor, { time: string; odometer: string }> = {
    pickup: { time: "pickupTime", odometer: "pickupOdometer" },
    dropoff: { time: "dropOffTime", odometer: "dropoffOdometer" },
  };

  return (
    <SupportFormSheet
      context={legOptionFor(trip, leg)}
      supportCase={supportCase}
      open={open}
      onOpenChange={onOpenChange}
      initialValues={initialValues}
      onSubmit={(values) => {
        onOpenChange(false);

        /**
         * ⛔⛔ **The confirmed answers become the marks.** Without this the leg
         * stays visibly unswiped after the driver has just told us when each end
         * happened — the record they filed to correct would still be wrong on
         * their own screen. Only the CONFIRMED ends are written; a read-only
         * field is already a mark and writing it back would be a no-op pretending
         * to be a correction.
         */
        if (leg) {
          for (const anchor of asks) {
            const time = (values[FIELDS[anchor].time] ?? "").trim();
            if (!time) continue;
            const reading = Number(values[FIELDS[anchor].odometer]);
            recordSwipe(
              leg,
              MARK_FOR_ANCHOR[anchor],
              Number.isFinite(reading) ? reading : undefined,
              fromTimeInputValue(time)
            );
          }
          // The drop-off was reconstructed rather than swiped with the member
          // present, so the MEMBER's half of Stage 05 was never taken. The
          // driver's half is the `driverSignature` field above.
          if (leavesMemberSignatureMissing(asks)) markMemberSignatureMissing(leg.id);
        }

        submitForm({
          caseId: supportCase.id,
          issue: ISSUE_MISSED_SWIPE,
          ...resolveTripContext(supportCase, values),
          values,
          appTracksStatus: true,
        });
        toast({
          title: "Sent to Support",
          description: leavesMemberSignatureMissing(asks)
            ? "The leg is complete. It stays pending while Support confirms it, and the member's signature is recorded as missing."
            : "The leg is complete. It stays pending while Support confirms the pick-up.",
        });
        onSubmitted?.();
      }}
    />
  );
}
