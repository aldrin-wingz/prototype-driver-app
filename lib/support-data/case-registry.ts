import { getIssueOptions, ISSUE_RIDER_NO_SHOW } from "./issue-types";
import type { SupportCaseDefinition } from "@/types/support";

/**
 * Which issue owns a field.
 *
 * Always true while Rider No-Show is the only issue, and kept anyway — this is
 * how a field set declares what it belongs to. Case two arrives as its own
 * `ONLY_*` and its own block, with nothing to unpick here first.
 */
const ONLY_RIDER_NO_SHOW = { field: "issue", equals: [ISSUE_RIDER_NO_SHOW] };

const SUPPORT_FORM_CASE_ID = "support-form";

/**
 * The two time fields, in the order they must have happened.
 *
 * Read by `getTimeOrderWarnings` so a driver who says they left before they
 * started waiting is told so. Declared here rather than in the checker, because
 * which fields are a sequence is a property of the CASE — the checker is generic.
 */
export const WAIT_TIME_SEQUENCE = ["waitedFrom", "leftAt"];

/**
 * The support form.
 *
 * One form for every support request, not one per case: the issue swaps the field
 * set beneath it, which is how the real web form behaves. This branch registers
 * one issue, so the form always renders the same set — but the shape is still the
 * multi-issue one, because the next case should cost a field block and nothing
 * else.
 *
 * **Rider No-Show** — for a member who never came out. It exists because the
 * production flow REFUSES rather than asks: a driver who waited, gave up and
 * drove off is told no, and the only way forward is Zendesk. Every question here
 * is one the app would have answered itself if it could, which is why the form
 * only ever opens when it could not.
 *
 * Reached only from the Member No-Show screen, after its guardrail refuses — so
 * the issue, the leg, the no-show type and the signature are all already settled
 * by the time this renders. It asks the three things that screen could not know.
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
    // takes over, and here the issue is always set.
    description: "Pick the issue that fits and we'll only ask what we need to.",
    category: "Rider",
    buildState: "in-prototype",
    submitLabel: "Submit",
    resolution: "cs-queue",
    successMessage: "Sent to Support",
    zendeskEquivalent: "Member no-show",
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
        // Explicitly no badge. This field is ALWAYS locked, so a badge explaining
        // why states the obvious — and omitting the property instead would fall
        // through to the "Already recorded" default, which belongs on a timestamp.
        lockedBadge: null,
      },

      // ---- Rider No-Show -------------------------------------------------
      {
        id: "noShowType",
        type: "text",
        label: "No-show type",
        // Locked: chosen on the Member No-Show screen a moment ago, so asking
        // again would be asking the driver to repeat themselves. Carried into
        // the request because Support needs to know which kind was claimed.
        lockWhenPrefilled: true,
        lockedBadge: "From the no-show screen",
        showIf: ONLY_RIDER_NO_SHOW,
      },
      {
        id: "legId",
        type: "leg-picker",
        label: "Which trip?",
        placeholder: "Search your rides by leg ID, rider or date",
        required: true,
        showIf: ONLY_RIDER_NO_SHOW,
        prefillFrom: "legId",
        // A no-show is only actionable on a trip that is under way.
        legScope: "in-progress",
        // Locked because the form is only ever opened from a ride, and a no-show
        // is about a specific pick-up the driver physically attended. Leaving it
        // open would let a driver standing at trip A file against trip B.
        lockWhenPrefilled: true,
        lockedBadge: "From this ride",
      },
      {
        id: "waitedFrom",
        type: "time",
        label: "What time did you start waiting?",
        // The label is a question; the warning copy needs a noun phrase.
        shortLabel: "time you started waiting",
        helpText: "When you arrived at the pick-up.",
        required: true,
        prefillFrom: "waitArrivedAt",
        // ⚠️ NO `lockWhenPrefilled`, and that is the whole point — the inverse of
        // a recorded swipe mark. What prefills here is the evidence we have just
        // judged insufficient, so locking it would stop the driver correcting the
        // one thing we are unsure about.
        showIf: ONLY_RIDER_NO_SHOW,
      },
      {
        id: "leftAt",
        type: "time",
        label: "What time did you leave?",
        shortLabel: "time you left",
        helpText: "When you gave up and drove off.",
        required: true,
        prefillFrom: "waitLeftAt",
        showIf: ONLY_RIDER_NO_SHOW,
      },
      {
        id: "contactProof",
        type: "file",
        label: "Attach proof you tried to reach the member",
        // Required in the real flow — a no-show without a contact attempt is not
        // a no-show — but a prototype must not hold a demo hostage to a call-log
        // screenshot nobody has to hand.
        required: true,
        requiredNotEnforced: true,
        helpText: "A call log, a screenshot of your texts, anything showing you tried.",
        showIf: ONLY_RIDER_NO_SHOW,
      },
      // ⚠️ NO signature field, and that is a change of position worth stating.
      //
      // It used to be here, last, on the reasoning that proving the wait is not
      // proving the member was absent. That reasoning still holds — but the
      // driver now signs on the Member No-Show screen BEFORE the guardrail runs,
      // because that is production's order and familiarity won. Asking again
      // here would be a second signature for one claim.
    ],
  };
}
