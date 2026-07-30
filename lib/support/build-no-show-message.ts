import type { Trip, TripLeg } from "@/lib/driver-data/mock-trips";
import { NO_SHOW_WAIT_MINUTES } from "@/lib/driver-data/no-show-rules";
import { tripDetailLines } from "./trip-detail-lines";

/** Human label for the contact-attempt answer, keyed by its stored value. */
const CONTACT_ATTEMPT_LABELS: Record<string, string> = {
  called: "Called",
  texted: "Texted",
  "called-and-texted": "Called and texted",
  "could-not": "Was not able to reach out",
};

/**
 * The no-show message for the path where the app proved the wait itself.
 *
 * Mirrors the decline template because it does the same job: a no-show is urgent,
 * the ride has to come off the manifest now, and Support should not have to ask
 * for the trip's identifiers. Nothing is asked of the driver — we already know
 * everything, including how long they waited.
 */
export function buildNoShowMessage(trip: Trip, leg: TripLeg): string {
  const waited = leg.presence?.dwellMinutes ?? NO_SHOW_WAIT_MINUTES;

  return [
    `My member was not at the pick-up location. I waited ${waited} minutes and need help removing the following rides from my manifest.`,
    ...tripDetailLines(trip),
  ].join("\n");
}

/**
 * The no-show message for the path that went through the form.
 *
 * Carries the driver's own answers, because here the app could NOT establish the
 * wait — the answers are the evidence, and repeating them into chat is what makes
 * the urgent channel and the filed form tell the same story. Support otherwise
 * has a chat asking for help and a form they have to go and find.
 */
export function buildNoShowFormMessage(
  trip: Trip,
  values: Record<string, string>
): string {
  const attempts = values.noShowContactAttempts;
  const proof = values.noShowProof?.trim();

  const answers = [
    values.noShowArrivedAt && `Arrived at pick-up: ${values.noShowArrivedAt}`,
    values.noShowWaitMinutes && `Waited: ${values.noShowWaitMinutes} minutes`,
    values.noShowWaitLocation && `Waited at: ${values.noShowWaitLocation}`,
    attempts &&
      `Tried to reach member: ${CONTACT_ATTEMPT_LABELS[attempts] ?? attempts}`,
    values.noShowContactDetails?.trim() &&
      `What happened: ${values.noShowContactDetails.trim()}`,
    // Only mentioned when there is one — the attachment is unenforced in the
    // prototype, and an empty "Attachment:" line would read as a lost upload.
    proof && `Attachment: ${proof}`,
    // The attestation is the formally meaningful part, and chat is what Support
    // reads first, so it says so here rather than only in the filed request.
    values.noShowSignature?.trim() && "Driver signed the no-show attestation.",
  ].filter(Boolean) as string[];

  return [
    "My member was not at the pick-up location and I could not submit the no-show from there. I need help removing the following rides from my manifest.",
    ...tripDetailLines(trip),
    "",
    ...answers,
  ].join("\n");
}
