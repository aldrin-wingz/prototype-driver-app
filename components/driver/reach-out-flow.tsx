"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { SupportFormSheet } from "@/components/support/support-form-sheet";
import { ReachOutSheet, RiderDeclinedSheet } from "./reach-out-sheet";
import { buildSupportFormCase } from "@/lib/support-data/case-registry";
import {
  ISSUE_CONFIRM_CANT_REACH,
  ISSUE_CONFIRM_DECLINED,
} from "@/lib/support-data/issue-types";
import {
  useRideFlow,
  type RideConfirmation,
} from "@/lib/support-data/ride-flow-context";
import { buildPrefilledValues } from "@/lib/support/prefill";
import { resolveTripContext } from "@/lib/support/trip-context";
import {
  buildCantReachFormMessage,
  buildDeclinedFormMessage,
} from "@/lib/support/build-confirmation-message";
import type { Trip, TripLeg } from "@/lib/driver-data/mock-trips";

/** Where the driver is in the flow. */
type Step =
  | "options"
  | "declined"
  | "form-cant-reach"
  | "form-declined"
  | null;

/** Which of the two escalation forms a step is showing, if either. */
const FORM_ISSUE: Partial<Record<NonNullable<Step>, string>> = {
  "form-cant-reach": ISSUE_CONFIRM_CANT_REACH,
  "form-declined": ISSUE_CONFIRM_DECLINED,
};

/**
 * "I Reached Out to Confirm", end to end.
 *
 * Four answers, two of which escalate. Each escalation produces both a support
 * form and a chat message, the same pair Rider No-Show settled on: the form is
 * the record Support works from, the chat is what makes it urgent, and a ride
 * waiting on confirmation is urgent by definition.
 *
 * The two that do not escalate are the interesting halves of the design. Yes
 * resolves in session state alone and the ride simply becomes an accepted ride.
 * "I will go anyway" files nothing at all — the driver has decided to drive it,
 * so there is nothing for Support to do and inventing a record would be noise.
 *
 * The forms live here rather than in `ride-detail-layout` for the same reason
 * `NoShowFlow` exists: the branch, the sheets, the templates and the store writes
 * are one decision, and splitting them across a 700-line screen component is how
 * a flow ends up half-wired.
 */
export function ReachOutFlow({
  trip,
  leg,
  open,
  onOpenChange,
}: {
  trip: Trip;
  /** The leg the driver is working — prefills whichever form opens. */
  leg: TripLeg | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const { setConfirmation, saveDraft, submitForm, appendSupportMessage } =
    useRideFlow();
  const [step, setStep] = useState<Step>(null);

  // A closed flow is on no step at all, and an open one with nothing chosen is on
  // the options. Deriving it in that order matters: keying off `step` first would
  // let a step left behind by the previous run decide what the next open shows,
  // which is how a re-open ended up rendering nothing.
  //
  // Opening therefore always starts over rather than resuming mid-flow, so a
  // driver who backs out of a form is asked the whole question again instead of
  // being dropped back into the answer they abandoned.
  const current: Step = open ? (step ?? "options") : null;

  // Closing discards where the driver was, so the step cannot outlive the flow
  // and decide what the next open shows. `close()` clears it too; this covers
  // every other way `open` can go false.
  useEffect(() => {
    if (!open) setStep(null);
  }, [open]);

  // Read by the dismissal guard below instead of `current` itself. vaul reports a
  // close through the callback it captured while the drawer was open, so a guard
  // that closed over `current` saw the step the flow had already left — which is
  // exactly the case it needs to distinguish.
  const stepRef = useRef<Step>(null);
  stepRef.current = current;

  const issue = current ? FORM_ISSUE[current] : undefined;

  // The two confirmation issues are hidden, so each has to be force-included as
  // an option — otherwise the locked dropdown holds a value it cannot render a
  // label for and falls back to showing the placeholder.
  const supportCase = buildSupportFormCase({
    includeIssues: issue ? [issue] : [],
  });

  function close() {
    setStep(null);
    onOpenChange(false);
  }

  /**
   * A drawer closing only ends the flow if the flow is still on that step.
   *
   * Every step transition closes the drawer behind it, and vaul reports that
   * close through the same `onOpenChange(false)` a swipe-down uses. Treating every
   * close as a dismissal therefore had the outgoing drawer tear down the flow it
   * had just handed off to — tapping an option closed the sheet and nothing opened
   * in its place.
   *
   * Traced ordering, which is what makes this awkward:
   *
   *     onOpenChange(false)   ← vaul, first
   *     onNext("declined")    ← the handler that caused it, second
   */
  function dismissFrom(atStep: Step) {
    return (next: boolean) => {
      if (next) return;
      // Deferred by a tick on purpose. vaul reports the close BEFORE running the
      // handler that caused it, so at this instant the flow is still on `atStep`
      // whether the driver dismissed it or picked an option — the two are
      // indistinguishable until the option handler has moved the step on.
      setTimeout(() => {
        if (stepRef.current === atStep) close();
      }, 0);
    };
  }

  /** Files the form, sends the chat message, and lands the driver in chat. */
  function submitEscalation(
    values: Record<string, string>,
    confirmation: Extract<RideConfirmation, "declined" | "cant-reach">,
    message: string,
    toastTitle: string
  ) {
    if (!issue) return;

    close();
    setConfirmation(trip.id, confirmation);
    submitForm({
      caseId: supportCase.id,
      issue,
      ...resolveTripContext(supportCase, values),
      values,
    });
    appendSupportMessage(trip.id, message);
    toast({
      title: toastTitle,
      description: "This ride is waiting on Support while they review it.",
    });
    router.push(`/my-rides/${trip.id}/support-chat`);
  }

  const initialValues = issue
    ? {
        ...buildPrefilledValues(supportCase, trip, leg),
        // Locks the dropdown, via the sheet's app-supplied tracking.
        issue,
      }
    : {};

  return (
    <>
      <ReachOutSheet
        open={current === "options"}
        onOpenChange={dismissFrom("options")}
        onNext={(choice) => {
          if (choice === "declined") {
            // Declining opens its own follow-up rather than resolving here.
            setStep("declined");
            return;
          }

          if (choice === "cant-reach") {
            // Straight to the form — there is nothing to explain in an
            // intermediate sheet that the form does not already ask.
            setStep("form-cant-reach");
            return;
          }

          if (choice === "confirmed") {
            // The ride becomes an accepted ride awaiting its first swipe — the
            // detail state flips to in-progress on the next render.
            close();
            setConfirmation(trip.id, "confirmed");
            toast({
              title: "Confirmed with the rider",
              description: "This ride is ready to start.",
            });
            return;
          }

          // "No, but I will go to the pickup as scheduled" — per the flow this
          // just closes. No state change, no confirmation, nothing to announce:
          // the ride stays exactly as it was so the driver can try again.
          close();
        }}
      />

      <RiderDeclinedSheet
        open={current === "declined"}
        onOpenChange={dismissFrom("declined")}
        onContinue={() => setStep("form-declined")}
        onNeedsTransportation={() => {
          // Walks back to the options rather than resolving anything.
          setStep("options");
        }}
      />

      {issue && (
        <SupportFormSheet
          supportCase={supportCase}
          open
          initialValues={initialValues}
          onOpenChange={dismissFrom(current)}
          onSaveDraft={(values) => {
            close();
            saveDraft({
              caseId: supportCase.id,
              issue,
              ...resolveTripContext(supportCase, values),
              values,
            });
            toast({
              title: "Saved to drafts",
              description: "Pick it back up from Support Requests whenever.",
            });
          }}
          onSubmit={(values) => {
            if (current === "form-cant-reach") {
              submitEscalation(
                values,
                "cant-reach",
                buildCantReachFormMessage(trip, values),
                "Sent to Support"
              );
              return;
            }

            submitEscalation(
              values,
              "declined",
              buildDeclinedFormMessage(trip, values),
              "Decline sent to Support"
            );
          }}
        />
      )}
    </>
  );
}
