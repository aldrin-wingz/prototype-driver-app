"use client";

import { legOptionFor } from "@/lib/support-data/leg-options";
import { SupportFormSheet } from "./support-form-sheet";
import { buildSupportFormCase } from "@/lib/support-data/case-registry";
import { ISSUE_SEND_BACK_REASON } from "@/lib/support-data/issue-types";
import { buildPrefilledValues } from "@/lib/support/prefill";
import type { Trip } from "@/lib/driver-data/mock-trips";

/**
 * Build the send-back reason case — catalogue row 13.
 *
 * Exported so the check builds the case the app builds, rather than a second
 * copy that can agree with the spec while disagreeing with the screen.
 */
export function buildSendBackReason(trip: Trip) {
  const supportCase = buildSupportFormCase({
    includeIssues: [ISSUE_SEND_BACK_REASON],
    sendBack: true,
  });

  const initialValues: Record<string, string> = {
    ...buildPrefilledValues(supportCase, trip, undefined),
    issue: ISSUE_SEND_BACK_REASON,
  };

  return { supportCase, initialValues };
}

/**
 * The reason step of the send-back flow.
 *
 * ⛔⛔ **This does not submit anything on its own, and that is the difference
 * between it and every other form in this prototype.** Every other case ENDS at
 * Submit — the request goes to the CS queue and the driver is returned to their
 * screen. This one is a step: the driver is mid-send-back, and the trip only
 * leaves them once the flow finishes. So it hands its answers back to the
 * caller via `onCollected` and lets the flow decide what happens next.
 *
 * A version that filed here would have produced a support request for a
 * send-back the driver then cancelled at the penalty warning.
 */
export function SendBackReasonForm({
  trip,
  open,
  onOpenChange,
  onCollected,
}: {
  trip: Trip;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCollected: (values: Record<string, string>) => void;
}) {
  const { supportCase, initialValues } = buildSendBackReason(trip);

  return (
    <SupportFormSheet
      context={legOptionFor(trip)}
      supportCase={supportCase}
      open={open}
      onOpenChange={onOpenChange}
      initialValues={initialValues}
      onSubmit={(values) => {
        onOpenChange(false);
        onCollected(values);
      }}
    />
  );
}
