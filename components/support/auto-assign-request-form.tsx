"use client";

import { useToast } from "@/hooks/use-toast";
import { SupportFormSheet } from "./support-form-sheet";
import { buildSupportFormCase } from "@/lib/support-data/case-registry";
import { ISSUE_AUTO_ASSIGN_REQUEST } from "@/lib/support-data/issue-types";
import { buildPrefilledValues } from "@/lib/support/prefill";
import { useRideFlow } from "@/lib/support-data/ride-flow-context";
import type { Trip } from "@/lib/driver-data/mock-trips";

/**
 * Build the "ask to be their regular driver" case — catalogue row 09.
 *
 * Exported for the same reason `buildCannotReachMember` is: the check builds the
 * case the app builds, rather than a second copy that can agree with the spec
 * while disagreeing with the screen.
 *
 * ⚠️ No `leg` parameter. This case is filed against a MEMBER, not a leg — see
 * the `ANY_LEG_CASE` note in the registry. Taking a leg here would be an unused
 * argument that the next person reads as a hint that one is expected.
 */
export function buildAutoAssignRequest(trip: Trip) {
  const supportCase = buildSupportFormCase({
    includeIssues: [ISSUE_AUTO_ASSIGN_REQUEST],
    autoAssign: true,
  });

  const initialValues: Record<string, string> = {
    ...buildPrefilledValues(supportCase, trip, undefined),
    issue: ISSUE_AUTO_ASSIGN_REQUEST,
  };

  return { supportCase, initialValues };
}

/**
 * The "ask to be their regular driver" form.
 *
 * ⛔⛔ **Nothing is assigned, held or claimed by submitting this**, and no trip
 * changes state — see `AUTO_ASSIGN_CHANGES_NOTHING`. The trips it is about do
 * not exist yet; assignment is the client's and Support can only ask. A screen
 * that implied otherwise would be promising the one thing this case cannot do,
 * to the driver most likely to act on it.
 *
 * ⚠️ `appTracksStatus: false`, like Rider No-Show and Can't Reach Member. What
 * Support does next — asking the broker, waiting — never comes back to the app,
 * so a Pending pill here would promise a status nothing can fill in.
 *
 * ⛔ It is NOT attached to a ride. `resolveTripContext` is deliberately not
 * called: the ride is how the member was identified and is not the subject of
 * the request, and recording it would put this request in My Rides against a
 * trip that has nothing to do with it.
 */
export function AutoAssignRequestForm({
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
  const { supportCase, initialValues } = buildAutoAssignRequest(trip);

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
          issue: ISSUE_AUTO_ASSIGN_REQUEST,
          values,
          appTracksStatus: false,
        });
        toast({
          title: "Sent to Support",
          // Says what did NOT happen, on purpose — the same reason Can't Reach
          // Member's toast does. The driver has just filled in a form and is
          // returned to a screen that looks exactly as it did before.
          description:
            "Nothing is assigned yet. Support will ask the client, and their trips will keep appearing in Requests until it is agreed.",
        });
        onSubmitted?.();
      }}
    />
  );
}
