import type { Trip } from "@/lib/driver-data/mock-trips";
import { buildDeclineMessage } from "./build-decline-message";
import { tripDetailLines } from "./trip-detail-lines";

/**
 * Chat labels for the call-outcome answer, keyed by its stored value.
 *
 * Shorter than the labels in the form, and that is deliberate rather than drift:
 * in the form the driver is choosing between sentences ("Number was disconnected
 * or invalid"), while here the same answer is the right-hand side of a line
 * Support scans ("Result: Disconnected or invalid"). Same convention as
 * `CONTACT_ATTEMPT_LABELS` in `build-no-show-message`.
 */
const CALL_OUTCOME_LABELS: Record<string, string> = {
  "rang-no-answer": "Rang, no answer",
  voicemail: "Went to voicemail",
  disconnected: "Disconnected or invalid",
  "wrong-person": "Someone else answered",
  "no-number": "No number on file",
};

/** Chat labels for how the member declined, keyed by its stored value. */
const DECLINED_CHANNEL_LABELS: Record<string, string> = {
  call: "On a call",
  text: "By text",
  family: "Through a family member or caregiver",
  facility: "Through the facility",
  "in-person": "In person",
};

/**
 * The message for a trip the driver could not reach the member about.
 *
 * The only template in the app whose ask is help *reaching* a member rather than
 * help removing a ride — the driver still wants to drive this trip, they just
 * cannot confirm it. Wording it like the decline and no-show templates would tell
 * Support to cancel a ride nobody has given up on.
 */
export function buildCantReachFormMessage(
  trip: Trip,
  values: Record<string, string>
): string {
  const outcome = values.cantReachOutcome;
  const proof = values.cantReachProof?.trim();

  const answers = [
    values.cantReachPhone?.trim() &&
      `Number tried: ${values.cantReachPhone.trim()}`,
    outcome && `Result: ${CALL_OUTCOME_LABELS[outcome] ?? outcome}`,
    values.cantReachAttempts && `Attempts: ${values.cantReachAttempts}`,
    values.cantReachLastTriedAt &&
      `Last tried: ${values.cantReachLastTriedAt}`,
    values.cantReachDetails?.trim() &&
      `Details: ${values.cantReachDetails.trim()}`,
    // Only named when there is one — the attachment is unenforced in the
    // prototype, and an empty "Attachment:" line would read as a lost upload.
    proof && `Attachment: ${proof}`,
  ].filter(Boolean) as string[];

  return [
    "I wasn't able to reach my member to confirm this trip. I need help confirming the following rides.",
    ...tripDetailLines(trip),
    "",
    ...answers,
  ].join("\n");
}

/**
 * The message for a member who declined the trip.
 *
 * Opens with `buildDeclineMessage` rather than its own copy: that opening and its
 * detail block are replicated verbatim from reference capture `s-04c`, and having
 * one source is what stops the pre-form and post-form versions drifting into two
 * slightly different templates. The driver's answers are appended beneath, so the
 * urgent chat and the filed form tell Support the same story.
 */
export function buildDeclinedFormMessage(
  trip: Trip,
  values: Record<string, string>
): string {
  const how = values.declinedHow;
  const proof = values.declinedProof?.trim();

  const answers = [
    how && `How they told me: ${DECLINED_CHANNEL_LABELS[how] ?? how}`,
    values.declinedAt && `When: ${values.declinedAt}`,
    values.declinedDetails?.trim() &&
      `What they said: ${values.declinedDetails.trim()}`,
    proof && `Attachment: ${proof}`,
  ].filter(Boolean) as string[];

  return [buildDeclineMessage(trip), "", ...answers].join("\n");
}
