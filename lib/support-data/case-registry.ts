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
 * The issue types offered by the general support form's dropdown.
 *
 * "Trip Data update" is the one we have a real spec for — it is the web form
 * captured in `s-05a/b/c`. The rest are placeholders so the mechanism (choosing
 * an issue swaps the field set) is visible without inventing a canonical list.
 * The real dropdown's full option list still needs capturing.
 */
export const TRIP_DATA_UPDATE = "Trip Data update";

export const SUPPORT_ISSUES: SupportFieldOption[] = [
  { value: TRIP_DATA_UPDATE, label: "Trip Data update (missed swipe)" },
  { value: "rider-no-show", label: "Rider no-show — ⚠️ not in prototype yet" },
  { value: "address-correction", label: "Address correction — ⚠️ not in prototype yet" },
  { value: "pay-discrepancy", label: "Pay or mileage discrepancy — ⚠️ not in prototype yet" },
];

/** Only the Trip Data update field set is built, so gate on this value. */
const ONLY_TRIP_DATA = { field: "issue", equals: [TRIP_DATA_UPDATE] };

/**
 * CASE-01 — the general support form.
 *
 * One form for every support request, not one per case. The issue dropdown swaps
 * the field set beneath it, which is how the real web form behaves.
 *
 * The Trip Data update field set is for a trip the driver FORGOT TO SWIPE, and it
 * applies at any point in the sequence — en-route, pick-up or drop-off. Whatever
 * the app already recorded arrives locked; whatever it does not is left for the
 * driver. So the same form asked at drop-off holds en-route and pick-up already,
 * while asked mid-ride it holds only en-route.
 *
 * Leg selection drives everything: pick a leg and its letter, rider, schedule,
 * appointment time and status render as a summary banner rather than as fields
 * the driver has to read past.
 */
export const supportFormCase: SupportCaseDefinition = {
  id: "support-form",
  title: "Submit Support Form",
  issueType: TRIP_DATA_UPDATE,
  summary: "Send Support a request about one of your trips",
  category: "Trip Issue",
  buildState: "in-prototype",
  submitLabel: "Submit",
  resolution: "cs-queue",
  successMessage: "Sent to Support",
  zendeskEquivalent: "Submit a request → Trip Data update",
  fields: [
    {
      id: "issue",
      type: "select",
      label: "Please choose your issue",
      placeholder: "Select an issue",
      required: true,
      options: SUPPORT_ISSUES,
    },
    {
      id: "legId",
      type: "leg-picker",
      label: "Which trip?",
      placeholder: "Search your rides by leg ID, rider or date",
      required: true,
      showIf: ONLY_TRIP_DATA,
      prefillFrom: "legId",
    },
    {
      id: "enRouteTime",
      type: "time",
      label: "En-route Time",
      helpText: 'When you started driving to the pick-up ("Start ride").',
      prefillFrom: "enRouteTime",
      lockWhenPrefilled: true,
      showIf: ONLY_TRIP_DATA,
    },
    {
      id: "pickupTime",
      type: "time",
      label: "Pick-up Time",
      helpText: "When you picked up the member.",
      prefillFrom: "pickupTime",
      lockWhenPrefilled: true,
      showIf: ONLY_TRIP_DATA,
    },
    {
      id: "dropOffTime",
      type: "time",
      label: "Drop-off Time",
      helpText: "When you dropped off the member.",
      prefillFrom: "dropOffTime",
      lockWhenPrefilled: true,
      showIf: ONLY_TRIP_DATA,
    },
    {
      id: "pickupOdometer",
      type: "number",
      label: "Pick-up Odometer (optional)",
      helpText: "Leave blank if the app did not ask for a reading.",
      showIf: ONLY_TRIP_DATA,
    },
    {
      id: "dropOffOdometer",
      type: "number",
      label: "Drop-off Odometer (optional)",
      helpText: "Leave blank if the app did not ask for a reading.",
      showIf: ONLY_TRIP_DATA,
    },
    {
      id: "reason",
      type: "textarea",
      label: "Why weren't you able to swipe this trip?",
      placeholder: "Tell us briefly why you weren't able to swipe during the ride.",
      required: true,
      maxLength: 500,
      showIf: ONLY_TRIP_DATA,
    },
    {
      id: "attachment",
      type: "file",
      label: "Attachments (optional)",
      helpText: "Add a photo or screenshot if it helps explain.",
      showIf: ONLY_TRIP_DATA,
    },
  ],
};

export const supportCases: SupportCaseDefinition[] = [
  latePickupReasonCase,
  supportFormCase,
];

export function getSupportCase(id: string): SupportCaseDefinition | undefined {
  return supportCases.find((supportCase) => supportCase.id === id);
}
