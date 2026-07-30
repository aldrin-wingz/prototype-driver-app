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
 * CASE-01 — Trip Update.
 *
 * ⚠️ Not in prototype yet. The field list is still to come from the support
 * lead / user, and the runtime renders whatever that list says. Declared here
 * with an empty field set so the options menu can show the row in its real
 * place without implying the form works.
 */
export const tripUpdateCase: SupportCaseDefinition = {
  id: "trip-update",
  title: "Trip Update",
  summary: "Correct trip details, including a swipe you missed",
  category: "Trip Issue",
  buildState: "not-yet",
  submitLabel: "Submit Update",
  resolution: "cs-queue",
  fields: [],
};

export const supportCases: SupportCaseDefinition[] = [
  latePickupReasonCase,
  tripUpdateCase,
];

export function getSupportCase(id: string): SupportCaseDefinition | undefined {
  return supportCases.find((supportCase) => supportCase.id === id);
}
