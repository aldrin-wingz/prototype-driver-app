"use client";

import { useToast } from "@/hooks/use-toast";
import { SupportFormSheet } from "./support-form-sheet";
import { buildSupportFormCase } from "@/lib/support-data/case-registry";
import { ISSUE_RIDER_NO_SHOW } from "@/lib/support-data/issue-types";
import { buildPrefilledValues } from "@/lib/support/prefill";
import { resolveTripContext } from "@/lib/support/trip-context";
import { useRideFlow } from "@/lib/support-data/ride-flow-context";
import { resolveNoShowGate } from "@/lib/driver-data/no-show-rules";
import type { Trip, TripLeg } from "@/lib/driver-data/mock-trips";
import type { SupportCallout } from "@/types/support";

/**
 * Build the Rider No-Show case for one leg, plus the values the app can prefill.
 *
 * Exported because an entry point needs the prefilled `legId` *before* it opens
 * anything: an empty one means this ride is not a ride the form's own leg picker
 * would accept (`legScope: "in-progress"` drops a ride that has not started), and
 * opening the form anyway degrades the locked "From this ride" card into an open
 * search box — asking the driver the one question arriving from a ride has
 * already answered.
 */
export function buildRiderNoShow(trip: Trip, leg: TripLeg | undefined) {
  const supportCase = buildSupportFormCase({
    // `includeIssues` is what puts Rider No-Show in the select's options at all —
    // a selected value with no matching option renders as the placeholder, so the
    // form would claim no issue was picked.
    includeIssues: [ISSUE_RIDER_NO_SHOW],
  });

  const initialValues: Record<string, string> = {
    ...buildPrefilledValues(supportCase, trip, leg),
    // Seeding `issue` is what marks it app-supplied, which is what
    // `lockWhenPrefilled` reads.
    issue: ISSUE_RIDER_NO_SHOW,
  };

  return { supportCase, initialValues };
}

/**
 * What the app could not confirm, said plainly at the top of the sheet.
 *
 * The driver is being asked questions *because* a check failed, and a form that
 * opens without saying which one reads as the app being difficult. Naming the gap
 * also tells them what to write: "we only saw 4 minutes" and "we never placed you
 * there" call for different answers.
 */
function buildCallout(leg: TripLeg | undefined): SupportCallout | undefined {
  if (!leg) return undefined;
  const gate = resolveNoShowGate(leg);
  if (gate.ok) return undefined;

  return {
    tone: "warning",
    title: "We couldn't confirm your wait",
    detail: gate.detail,
  };
}

/**
 * The Rider No-Show form, with its submit wired up.
 *
 * One mount, so the required fields, the locks and the store write cannot differ
 * between callers — there is a single entry point today, and that is exactly when
 * it is cheap to keep it that way.
 */
export function RiderNoShowForm({
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
  const { supportCase, initialValues } = buildRiderNoShow(trip, leg);

  return (
    <SupportFormSheet
      supportCase={supportCase}
      callout={buildCallout(leg)}
      open={open}
      onOpenChange={onOpenChange}
      initialValues={initialValues}
      onSubmit={(values) => {
        onOpenChange(false);
        submitForm({
          caseId: supportCase.id,
          issue: ISSUE_RIDER_NO_SHOW,
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
