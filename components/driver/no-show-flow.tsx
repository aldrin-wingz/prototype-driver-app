"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { SupportFormSheet } from "@/components/support/support-form-sheet";
import { SignatureSheet } from "./signature-sheet";
import { NoShowBlockedSheet } from "./no-show-blocked-sheet";
import { buildSupportFormCase } from "@/lib/support-data/case-registry";
import { ISSUE_RIDER_NO_SHOW } from "@/lib/support-data/issue-types";
import { useRideFlow } from "@/lib/support-data/ride-flow-context";
import { buildPrefilledValues } from "@/lib/support/prefill";
import { resolveTripContext } from "@/lib/support/trip-context";
import {
  buildNoShowFormMessage,
  buildNoShowMessage,
} from "@/lib/support/build-no-show-message";
import {
  resolveNoShowOutcome,
  type NoShowOutcome,
} from "@/lib/driver-data/no-show-rules";
import type { MarketCode, Trip, TripLeg } from "@/lib/driver-data/mock-trips";

/** Where the driver is in the flow. */
type Step = "signature" | "blocked-left" | "blocked-waiting" | "form" | null;

/**
 * The first thing the driver sees, per outcome.
 *
 * Only the proven-wait path opens on the signature, because it is the only one
 * where signing is the entire submission. Everything else either asks questions
 * first or refuses outright.
 */
function entryStepFor(outcome: NoShowOutcome): Step {
  switch (outcome) {
    case "submit":
      return "signature";
    case "form":
      return "form";
    case "blocked-left":
      return "blocked-left";
    case "blocked-waiting":
      return "blocked-waiting";
  }
}

/**
 * Spelled-out market names for driver-facing copy.
 *
 * A refusal should name the client and place whose rule it is ("Verida Tennessee
 * requires…"), not an abbreviation the driver has to decode.
 */
const MARKET_NAMES: Record<MarketCode, string> = {
  GA: "Georgia",
  FL: "Florida",
  NC: "North Carolina",
  TN: "Tennessee",
};

/**
 * Member No-Show, end to end.
 *
 * The interesting design here is not the form — it is whether a form is needed at
 * all. A driver who waited the full ten minutes should not have to answer
 * questions the app can already answer, and a driver who has since driven off
 * should not be refused outright, which is what happens today.
 *
 * **The check runs first, before anything is asked of the driver.** Production
 * signs first and then refuses, which is work collected for nothing: if the answer
 * is already no, there is no reason to make someone sign. So this resolves the
 * outcome on open and only then collects what that outcome actually needs.
 *
 * Where the signature ends up follows from that. A refusal collects none. A form
 * carries it as the last field, because the driver is attesting to the answers they
 * just gave. And the proven-wait path has no form, so the signature sheet IS the
 * submission — note that proving the wait is not the same as proving the member was
 * absent, which is precisely what the driver is signing for.
 *
 * The branch itself lives in `resolveNoShowOutcome`, driven by seeded presence
 * evidence and the client's on-site policy — see `lib/driver-data/no-show-rules`.
 */
export function NoShowFlow({
  trip,
  leg,
  open,
  onOpenChange,
}: {
  trip: Trip;
  /** The leg being no-showed — its presence evidence decides the branch. */
  leg: TripLeg;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const { saveDraft, submitForm, appendSupportMessage } = useRideFlow();
  const [step, setStep] = useState<Step>(null);

  // Opening resolves the branch immediately: a refusal shows up front rather than
  // after the driver has signed for nothing. A re-open starts over.
  //
  // A closed flow is on no step at all — checked first, so a step left behind by
  // the previous run cannot decide what the next open shows.
  const current: Step = open
    ? (step ?? entryStepFor(resolveNoShowOutcome(trip, leg)))
    : null;

  // Closing discards where the driver was, so the step cannot outlive the flow
  // and pre-empt the branch check on the next open.
  useEffect(() => {
    if (!open) setStep(null);
  }, [open]);

  // Read by the dismissal guard below rather than `current` itself — vaul reports
  // a close through the callback it captured while the sheet was open, so a guard
  // closing over `current` sees the step the flow has already left.
  const stepRef = useRef<Step>(null);
  stepRef.current = current;

  // The issue is normally hidden, so it has to be force-included as an option —
  // otherwise the locked dropdown holds a value it cannot render a label for.
  const supportCase = buildSupportFormCase({
    includeIssues: [ISSUE_RIDER_NO_SHOW],
  });

  function close() {
    setStep(null);
    onOpenChange(false);
  }

  /**
   * A sheet closing only ends the flow if the flow is still on that step.
   *
   * The blocked → form handoff closes the blocked sheet, and vaul reports that
   * through the same `onOpenChange(false)` a swipe-down uses — and it reports it
   * BEFORE running the handler that caused it, so the two are indistinguishable
   * until the step has moved on. Hence the deferred check. Reproduced in
   * `reach-out-flow`, where the same shape stopped the flow advancing at all.
   */
  function dismissFrom(...steps: Step[]) {
    return (next: boolean) => {
      if (next) return;
      setTimeout(() => {
        if (steps.includes(stepRef.current)) close();
      }, 0);
    };
  }

  /** The proven-wait path: nothing to ask beyond the attestation, so send it. */
  function submitDirectly() {
    close();
    appendSupportMessage(trip.id, buildNoShowMessage(trip, leg));
    toast({
      title: "No-show submitted",
      description: "We've sent Support the details to remove this ride.",
    });
    router.push(`/my-rides/${trip.id}/support-chat`);
  }

  const initialValues = {
    ...buildPrefilledValues(supportCase, trip, leg),
    // Locks the dropdown, via the sheet's app-supplied tracking.
    issue: ISSUE_RIDER_NO_SHOW,
  };

  // Remembered rather than derived from `current`, because both variants share one
  // sheet and the step moves on before that sheet finishes animating out. Deriving
  // it meant tapping "Submit Form" made the sheet flash the OTHER refusal's copy on
  // its way off screen.
  const blockedVariant = useRef<"left" | "waiting">("left");
  if (current === "blocked-left") blockedVariant.current = "left";
  if (current === "blocked-waiting") blockedVariant.current = "waiting";

  return (
    <>
      <SignatureSheet
        open={current === "signature"}
        onOpenChange={dismissFrom("signature")}
        riderName={trip.rider}
        onSigned={submitDirectly}
      />

      <NoShowBlockedSheet
        open={current === "blocked-left" || current === "blocked-waiting"}
        onOpenChange={dismissFrom("blocked-left", "blocked-waiting")}
        variant={blockedVariant.current}
        clientLabel={
          trip.market
            ? `${trip.client} ${MARKET_NAMES[trip.market]}`
            : trip.client
        }
        waitedMinutes={leg.presence?.dwellMinutes ?? null}
        onSubmitForm={() => setStep("form")}
      />

      {current === "form" && (
        <SupportFormSheet
          supportCase={supportCase}
          open
          initialValues={initialValues}
          onOpenChange={dismissFrom("form")}
          onSaveDraft={(values) => {
            close();
            saveDraft({
              caseId: supportCase.id,
              issue: ISSUE_RIDER_NO_SHOW,
              ...resolveTripContext(supportCase, values),
              values,
            });
            toast({
              title: "Saved to drafts",
              description: "Pick it back up from Support Requests whenever.",
            });
          }}
          onSubmit={(values) => {
            close();
            submitForm({
              caseId: supportCase.id,
              issue: ISSUE_RIDER_NO_SHOW,
              ...resolveTripContext(supportCase, values),
              values,
            });
            // The form goes to Support's queue; the chat message is what makes it
            // urgent. A no-show needs the ride off the manifest now, so both.
            appendSupportMessage(trip.id, buildNoShowFormMessage(trip, values));
            toast({
              title: "No-show sent to Support",
              description: "This ride has moved to Pending while Support reviews it.",
            });
            router.push(`/my-rides/${trip.id}/support-chat`);
          }}
        />
      )}
    </>
  );
}
