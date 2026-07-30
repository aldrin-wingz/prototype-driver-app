import {
  getIssueOptions,
  ISSUE_GENERAL,
  ISSUE_MISSED_SWIPE,
  ISSUE_PAYMENT,
  ISSUE_RIDER_NO_SHOW,
  ISSUE_TRIP_REQUEST,
} from "./issue-types";
import type {
  SupportCaseDefinition,
  SupportFieldOption,
} from "@/types/support";

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
 * Payment Related categories.
 *
 * Authored here rather than captured — the user asked for three or four common
 * payment questions. Grounded in what Support actually fields: the pay schedule
 * (deposits land eight days after the pay period ends, pushed to the next
 * business day by a bank holiday) generates most of the "where is my money"
 * traffic, and the rest splits between a specific trip and the deposit itself.
 * Replace with the real Zendesk categories once we have them.
 */
const PAYMENT_CATEGORIES: SupportFieldOption[] = [
  { value: "next-payout", label: "Next payout date or schedule" },
  { value: "missing-trip-pay", label: "Missing pay for a completed trip" },
  { value: "payout-amount", label: "Previous payout amount looks wrong" },
  { value: "bank-details", label: "Direct deposit or bank details" },
];

const ONLY_MISSED_SWIPE = { field: "issue", equals: [ISSUE_MISSED_SWIPE] };
const ONLY_GENERAL = { field: "issue", equals: [ISSUE_GENERAL] };
const ONLY_PAYMENT = { field: "issue", equals: [ISSUE_PAYMENT] };
/** Issues that are registered but whose questions are not specified yet. */
const ONLY_NOT_YET = {
  field: "issue",
  equals: [ISSUE_TRIP_REQUEST, ISSUE_RIDER_NO_SHOW],
};

export const SUPPORT_FORM_CASE_ID = "support-form";

/**
 * CASE-01 — the general support form.
 *
 * One form for every support request, not one per case. The issue dropdown swaps
 * the field set beneath it, which is how the real web form behaves.
 *
 * A builder rather than a constant because the dropdown's options depend on
 * runtime state: the in-progress-only issues drop out when the driver has no live
 * trip, which is what makes the trip-independent Forms menu entry point safe.
 *
 * Per field set:
 *  - **General** — one text box, then submit. Nothing else is known to ask.
 *  - **Payment Related** — a category, then the same text box. The category is
 *    what lets Support route it without reading the body first.
 *  - **Missed Swipe** — for a trip the driver FORGOT TO SWIPE, applying anywhere
 *    from en-route to drop-off. Whatever the app already recorded arrives locked;
 *    whatever it does not is left for the driver. So the same form filed at
 *    drop-off holds en-route and pick-up already, while filed mid-ride it holds
 *    only en-route. Leg selection drives all of it, and the leg's letter, rider,
 *    schedule, appointment and status render as a summary banner rather than as
 *    fields to read past.
 */
export function buildSupportFormCase(): SupportCaseDefinition {
  return {
    id: SUPPORT_FORM_CASE_ID,
    title: "Submit Support Form",
    summary: "Send Support a request",
    category: "Trip Issue",
    buildState: "in-prototype",
    submitLabel: "Submit",
    resolution: "cs-queue",
    successMessage: "Sent to Support",
    zendeskEquivalent: "Submit a request",
    fields: [
      {
        id: "issue",
        type: "select",
        label: "Please choose your issue",
        placeholder: "Select an issue",
        required: true,
        options: getIssueOptions(),
      },

      // ---- General -------------------------------------------------------
      {
        id: "generalDetails",
        type: "textarea",
        label: "How can we help?",
        placeholder: "Tell us what's going on.",
        required: true,
        maxLength: 1000,
        showIf: ONLY_GENERAL,
      },

      // ---- Payment Related -----------------------------------------------
      {
        id: "paymentCategory",
        type: "select",
        label: "What is this about?",
        placeholder: "Select a category",
        required: true,
        options: PAYMENT_CATEGORIES,
        showIf: ONLY_PAYMENT,
      },
      {
        id: "paymentDetails",
        type: "textarea",
        label: "Tell us more",
        placeholder:
          "Add the trip, date or amount involved so we can look it up.",
        required: true,
        maxLength: 1000,
        showIf: ONLY_PAYMENT,
      },

      // ---- Missed Swipe --------------------------------------------------
      {
        id: "legId",
        type: "leg-picker",
        label: "Which trip?",
        placeholder: "Search your rides by leg ID, rider or date",
        required: true,
        showIf: ONLY_MISSED_SWIPE,
        prefillFrom: "legId",
        // A missed swipe is only actionable on a trip that is under way.
        legScope: "in-progress",
      },
      {
        id: "enRouteTime",
        type: "time",
        label: "En-route Time",
        helpText: 'When you started driving to the pick-up ("Start ride").',
        prefillFrom: "enRouteTime",
        lockWhenPrefilled: true,
        showIf: ONLY_MISSED_SWIPE,
      },
      {
        id: "pickupTime",
        type: "time",
        label: "Pick-up Time",
        helpText: "When you picked up the member.",
        prefillFrom: "pickupTime",
        lockWhenPrefilled: true,
        showIf: ONLY_MISSED_SWIPE,
      },
      {
        id: "dropOffTime",
        type: "time",
        label: "Drop-off Time",
        helpText: "When you dropped off the member.",
        prefillFrom: "dropOffTime",
        lockWhenPrefilled: true,
        showIf: ONLY_MISSED_SWIPE,
      },
      {
        id: "pickupOdometer",
        type: "number",
        label: "Pick-up Odometer (optional)",
        helpText: "Leave blank if the app did not ask for a reading.",
        showIf: ONLY_MISSED_SWIPE,
      },
      {
        id: "dropOffOdometer",
        type: "number",
        label: "Drop-off Odometer (optional)",
        helpText: "Leave blank if the app did not ask for a reading.",
        showIf: ONLY_MISSED_SWIPE,
      },
      {
        id: "reason",
        type: "textarea",
        label: "Why weren't you able to swipe this trip?",
        placeholder:
          "Tell us briefly why you weren't able to swipe during the ride.",
        required: true,
        maxLength: 500,
        showIf: ONLY_MISSED_SWIPE,
      },
      {
        id: "attachment",
        type: "file",
        label: "Attachments (optional)",
        helpText: "Add a photo or screenshot if it helps explain.",
        showIf: ONLY_MISSED_SWIPE,
      },

      // ---- Registered, not specified -------------------------------------
      {
        id: "notYetNotice",
        type: "notice",
        label: "",
        helpText:
          "This issue is on the list, but its questions haven't been specified yet. Pick another issue, or send it as General for now.",
        showIf: ONLY_NOT_YET,
      },
    ],
  };
}

export function getSupportCase(id: string): SupportCaseDefinition | undefined {
  return supportCases().find((supportCase) => supportCase.id === id);
}

/** Every case the runtime can render, rebuilt so dropdown options stay current. */
export function supportCases(): SupportCaseDefinition[] {
  return [latePickupReasonCase, buildSupportFormCase()];
}
