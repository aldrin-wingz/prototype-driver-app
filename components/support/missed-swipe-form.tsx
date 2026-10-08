"use client";

import { useToast } from "@/hooks/use-toast";
import { SupportFormSheet } from "./support-form-sheet";
import { buildSupportFormCase } from "@/lib/support-data/case-registry";
import { ISSUE_MISSED_SWIPE } from "@/lib/support-data/issue-types";
import { buildPrefilledValues } from "@/lib/support/prefill";
import { resolveTripContext } from "@/lib/support/trip-context";
import { useRideFlow } from "@/lib/support-data/ride-flow-context";
import {
  anchorMatched,
  canSubmitUnedited,
  leavesSignatureMissing,
  MARK_FOR_ANCHOR,
  matchAnchor,
  type SwipeAnchor,
} from "@/lib/driver-data/missed-swipe-rules";
import { fromTimeInputValue } from "@/lib/support/prefill";
import type { Trip, TripLeg } from "@/lib/driver-data/mock-trips";
import type { SupportCallout } from "@/types/support";

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
 * Say what the app could and could not confirm, before asking anything.
 *
 * ⛔⛔ **The three states are not interchangeable and must not share copy.** The
 * app having a trail that puts the driver at the address, having a trail that
 * never came near it, and having no trail at all look identical from inside the
 * form — same empty boxes — and mean completely different things to the person
 * reading the filing. Saying which one it is costs a sentence and is the only
 * honest way to present a prefill the driver is being asked to stand behind.
 *
 * ⚠️ Measured. On 107 legs a driver started and never swiped again, the
 * background trail placed them within a quarter-mile of the pick-up on 53.3% and
 * of the drop-off on 33.6% — against a control of 135 normally-swiped legs at
 * 89.6% and 92.6%. So the fully-prefilled case is real but it is NOT the usual
 * one, and a form built as though it were would mislead most of the drivers
 * who open it.
 */
function buildCallout(
  leg: TripLeg | undefined,
  asks: SwipeAnchor[]
): SupportCallout {
  if (leg && canSubmitUnedited(leg, asks)) {
    return {
      tone: "info",
      title: "We filled this in from your location history",
      detail:
        "Check the times match what happened, add a reason, and send. Change anything that looks wrong.",
    };
  }

  const noTrace =
    leg !== undefined &&
    asks.every((anchor) => matchAnchor(leg, anchor).kind === "no_trace");

  if (noTrace) {
    return {
      tone: "warning",
      title: "Your phone recorded no location for this trip",
      detail:
        "There is nothing for us to check this against, so every answer here is yours. Support reads it as your account of the trip.",
    };
  }

  return {
    tone: "warning",
    title: "We could only confirm part of this trip",
    detail:
      "Anything we could place you at is filled in. The rest is blank because we genuinely do not know it — not because we are checking your answer.",
  };
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
  const { submitForm, recordSwipe, markSignatureMissing } = useRideFlow();
  const { supportCase, initialValues } = buildMissedSwipe(trip, leg, asks);

  /** Which form fields hold each anchor's answers. */
  const FIELDS: Record<SwipeAnchor, { time: string; odometer: string }> = {
    pickup: { time: "pickupTime", odometer: "pickupOdometer" },
    dropoff: { time: "dropOffTime", odometer: "dropoffOdometer" },
  };

  return (
    <SupportFormSheet
      supportCase={supportCase}
      callout={buildCallout(leg, asks)}
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
          // present, so the signature it would have taken was never taken.
          if (leavesSignatureMissing(asks)) markSignatureMissing(leg.id);
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
          description: leavesSignatureMissing(asks)
            ? "The leg is complete. It stays pending while Support confirms it, and the rider signature is recorded as missing."
            : "The leg is complete. It stays pending while Support confirms the pick-up.",
        });
        onSubmitted?.();
      }}
    />
  );
}
