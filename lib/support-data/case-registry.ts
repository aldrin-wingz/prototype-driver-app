import type { SupportCaseDefinition } from "@/types/support";

/**
 * Late reason options — the final approved set of 9.
 *
 * Sourced from the Late Reasons project Story Tracker ("Submit late reason via
 * lightweight modal", Approved; list expanded to these 9 on 2026-05-12). An
 * "Other" option with conditional comments branching was explicitly DROPPED the
 * same day — do not reintroduce it. Comments remain as a plain optional field,
 * which is what reference screenshot `s-02a` shows.
 */
const LATE_REASON_OPTIONS = [
  "Incorrect appointment time",
  "Traffic or road delay",
  "Short-notice trip assignment",
  "Member-caused delay",
  "Vehicle issue",
  "Incorrect address",
  "Conflict with another accepted trip",
  "Personal matters",
  "Overslept",
].map((label) => ({ value: label, label }));

/**
 * CASE-00 — Late pickup reason.
 *
 * A faithful replication of the form already shipping in the app (reference
 * screenshot `s-02a`), not an invention. It exists here as the base pattern
 * every other support case is built from, and it proves the runtime against a
 * real, approved spec.
 */
export const latePickupReasonCase: SupportCaseDefinition = {
  id: "late-pickup-reason",
  title: "Late pickup reason",
  summary: "Explain a late pickup that affects your on-time performance",
  category: "Trip Issue",
  buildState: "in-prototype",
  submitLabel: "Save Reason",
  resolution: "cs-queue",
  successMessage: "Reason saved. Support can see it on this ride.",
  fields: [
    {
      id: "reason",
      type: "select",
      label: "Reason",
      placeholder: "Select a reason",
      required: true,
      options: LATE_REASON_OPTIONS,
    },
    {
      id: "comments",
      // Per s-02a the optional-ness lives in the label text itself.
      type: "textarea",
      label: "Comments (optional)",
      placeholder: "Add any additional details...",
      maxLength: 500,
    },
  ],
};

/**
 * CASE-01 — Missed Pickup.
 *
 * Replaces the Zendesk web form "Submit a request → Trip Data update"
 * (reference captures `s-05a/b/c`). Field list, labels, help text and required
 * markers are taken from that form verbatim.
 *
 * The whole argument for moving it in-app is the `prefillFrom` column: the web
 * form makes drivers retype their own email, the pick-up date, the leg position
 * letter, the leg id and every timestamp the app already recorded. Here all of
 * that arrives filled, and the only genuinely empty required field is the one
 * the app cannot know — why the swipe was missed.
 */
export const missedPickupCase: SupportCaseDefinition = {
  id: "missed-pickup",
  title: "Missed Pickup",
  issueType: "Trip Data update",
  summary: "Send the times for a swipe you missed on this ride",
  category: "Trip Issue",
  buildState: "in-prototype",
  submitLabel: "Submit",
  resolution: "cs-queue",
  successMessage: "Sent to Support",
  zendeskEquivalent: "Submit a request → Trip Data update",
  fields: [
    {
      id: "issue",
      type: "text",
      label: "Issue",
      prefillFrom: "issueType",
      locked: true,
      required: true,
    },
    {
      id: "email",
      type: "text",
      label: "Your email address",
      prefillFrom: "driverEmail",
      locked: true,
      required: true,
    },
    {
      id: "pickupDate",
      type: "date",
      label: "Pick-up Date",
      helpText: "The actual pick-up date.",
      prefillFrom: "pickupDate",
      required: true,
    },
    {
      id: "legPositionLetter",
      type: "text",
      label: "Leg Position Letter",
      helpText: "Position of the leg that needs to be updated.",
      prefillFrom: "legPositionLetter",
      locked: true,
      required: true,
    },
    {
      id: "legId",
      type: "text",
      label: "Leg ID",
      helpText: "The leg that needs to be updated.",
      prefillFrom: "legId",
      locked: true,
      required: true,
    },
    {
      id: "enRouteTime",
      type: "time",
      label: "En-route Time",
      helpText: 'The time you swiped "Start ride" and began driving to pick-up.',
      prefillFrom: "enRouteTime",
    },
    {
      id: "pickupTime",
      type: "time",
      label: "Pick-up Time",
      helpText: "The time you picked up the member.",
      prefillFrom: "pickupTime",
    },
    {
      id: "pickupOdometer",
      type: "number",
      label: "Pick-up Odometer (optional)",
      helpText: "Leave blank if the app did not ask for a reading.",
    },
    {
      id: "dropOffTime",
      type: "time",
      label: "Drop-off Time",
      helpText: "The time you dropped off the member.",
      prefillFrom: "dropOffTime",
    },
    {
      id: "dropOffOdometer",
      type: "number",
      label: "Drop-off Odometer (optional)",
      helpText: "Leave blank if the app did not ask for a reading.",
    },
    {
      id: "reason",
      type: "textarea",
      label: "Why weren't you able to swipe this trip?",
      placeholder: "Tell us briefly why you weren't able to swipe during the ride.",
      required: true,
      maxLength: 500,
    },
    {
      id: "attachment",
      type: "file",
      label: "Attachments (optional)",
      helpText: "Add a photo or screenshot if it helps explain.",
    },
  ],
};

export const supportCases: SupportCaseDefinition[] = [
  latePickupReasonCase,
  missedPickupCase,
];

export function getSupportCase(id: string): SupportCaseDefinition | undefined {
  return supportCases.find((supportCase) => supportCase.id === id);
}
