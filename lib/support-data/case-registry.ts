import { getIssueOptions, ISSUE_MISSED_SWIPE } from "./issue-types";
import type { SupportCaseDefinition } from "@/types/support";

/**
 * Which issue owns a field.
 *
 * Always true while Missed Swipe is the only issue, and kept anyway — this is how
 * a field set declares what it belongs to. Case two arrives as its own `ONLY_*`
 * and its own block, with nothing to unpick here first.
 */
const ONLY_MISSED_SWIPE = { field: "issue", equals: [ISSUE_MISSED_SWIPE] };

const SUPPORT_FORM_CASE_ID = "support-form";

/**
 * The support form.
 *
 * One form for every support request, not one per case: the issue swaps the field
 * set beneath it, which is how the real web form behaves. v1 registers one issue,
 * so the form always renders the same set — but the shape is still the multi-issue
 * one, because the next case should cost a field block and nothing else.
 *
 * A builder rather than a constant so the issue's options are resolved per call.
 *
 * **Missed Swipe** — for a trip the driver drove but FORGOT TO SWIPE, applying
 * anywhere from en-route to drop-off. Whatever the app already recorded arrives
 * locked; whatever it does not is left for the driver. So the same form filed
 * after a missed pick-up holds en-route and drop-off already and asks only for the
 * one mark that is absent. The leg drives all of it, and its letter, rider,
 * schedule, appointment and status render as a summary banner rather than as
 * fields to read past.
 */
export function buildSupportFormCase({
  includeIssues,
}: {
  /**
   * Issues to offer even though they are hidden.
   *
   * Every entry point opens this form with its issue already chosen, and a
   * selected value with no matching option renders as the placeholder — so the
   * form would claim no issue was picked. Callers pass the issue they just chose
   * on the driver's behalf.
   */
  includeIssues?: string[];
} = {}): SupportCaseDefinition {
  return {
    id: SUPPORT_FORM_CASE_ID,
    title: "Submit Support Form",
    summary: "Send Support a request",
    // Only ever seen if no issue is set; otherwise the issue's own description
    // takes over, and in v1 the issue is always set.
    description: "Pick the issue that fits and we'll only ask what we need to.",
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
        // Not "Please choose your issue", as the web form has it: nothing is
        // being chosen here. The driver picked the case when they picked the
        // tile, and this field reports that back rather than asking again.
        label: "Issue type",
        placeholder: "Select an issue",
        required: true,
        options: getIssueOptions(includeIssues),
        lockWhenPrefilled: true,
        lockedBadge: "Chosen for you",
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
        // Locked because the form is only ever opened from a ride. Leaving it
        // open would let a driver standing on trip A file against trip B, which
        // is not a correction anyone asked for.
        lockWhenPrefilled: true,
        lockedBadge: "From this ride",
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
    ],
  };
}
