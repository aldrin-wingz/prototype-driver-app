"use client";

import { useToast } from "@/hooks/use-toast";
import { SupportFormSheet } from "./support-form-sheet";
import {
  buildSupportFormCase,
  TIME_FIELD_FOR_SWIPE,
} from "@/lib/support-data/case-registry";
import { ISSUE_MISSED_SWIPE } from "@/lib/support-data/issue-types";
import { buildPrefilledValues } from "@/lib/support/prefill";
import { resolveTripContext } from "@/lib/support/trip-context";
import { useRideFlow } from "@/lib/support-data/ride-flow-context";
import {
  getUnrecordedSwipes,
  type Trip,
  type TripLeg,
} from "@/lib/driver-data/mock-trips";

/**
 * Build the Missed Swipe case for one leg, plus the values the app can prefill.
 *
 * Exported because an entry point needs the prefilled `legId` *before* it opens
 * anything: an empty one means this ride is not a ride the form's own leg picker
 * would accept (`legScope: "in-progress"` drops a ride that has not started), and
 * opening the form anyway degrades the locked "From this ride" card into an open
 * search box — asking the driver the one question arriving from a ride has
 * already answered.
 */
export function buildMissedSwipe(trip: Trip, leg: TripLeg | undefined) {
  const supportCase = buildSupportFormCase({
    // `includeIssues` is what puts Missed Swipe in the select's options at all — a
    // selected value with no matching option renders as the placeholder, so the
    // form would claim no issue was picked.
    includeIssues: [ISSUE_MISSED_SWIPE],
    // Every mark the app has no time for becomes required, because filing this
    // form asserts the driver drove the leg and could not swipe it. So the swipe
    // CTA on the ride is what tells the driver what they will be asked.
    requireFields: leg
      ? getUnrecordedSwipes(leg).map((mark) => TIME_FIELD_FOR_SWIPE[mark])
      : [],
  });

  const initialValues: Record<string, string> = {
    ...buildPrefilledValues(supportCase, trip, leg),
    // Seeding `issue` is what marks it app-supplied, which is what
    // `lockWhenPrefilled` reads.
    issue: ISSUE_MISSED_SWIPE,
  };

  return { supportCase, initialValues };
}

/**
 * The Missed Swipe form, with its submit wired up.
 *
 * Shared rather than inlined because there are now two ways in — the tile behind
 * `More`, and the detection prompt on the ride itself — and the interesting parts
 * (which fields are required, what arrives locked, what the store records) must
 * not be able to differ between them.
 */
export function MissedSwipeForm({
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
  /** Runs after the store write, for a caller that wants to navigate. */
  onSubmitted?: () => void;
}) {
  const { toast } = useToast();
  const { submitForm } = useRideFlow();
  const { supportCase, initialValues } = buildMissedSwipe(trip, leg);

  return (
    <SupportFormSheet
      supportCase={supportCase}
      open={open}
      onOpenChange={onOpenChange}
      initialValues={initialValues}
      onSubmit={(values) => {
        onOpenChange(false);
        submitForm({
          caseId: supportCase.id,
          issue: ISSUE_MISSED_SWIPE,
          ...resolveTripContext(supportCase, values),
          values,
        });
        toast({
          title: supportCase.successMessage ?? "Sent to Support",
          description: "This ride has moved to Pending while Support reviews it.",
        });
        onSubmitted?.();
      }}
    />
  );
}
