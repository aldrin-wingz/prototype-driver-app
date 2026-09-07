import { getIssueOptions, ISSUE_RIDER_NO_SHOW } from "./issue-types";
import { NO_SHOW_TYPES } from "@/lib/driver-data/no-show-rules";
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
 * by the time this renders. It asks the four things that screen could not know:
 * when they arrived, when they left, where they waited, whether they knocked.
 *
 * ⚠️ **One field set, no variants.** An earlier version branched on the no-show
 * type: `Cancel At Door` asked who told them instead of how long they waited.
 * That case is out of scope for this release, and removing the branch removed the
 * `requireOneOf` machinery with it — the signature-or-photo rule existed only for
 * that variant.
 */
export function buildSupportFormCase({
  includeIssues,
  askNoShowType = false,
  askSignature = false,
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
  /**
   * Ask for the no-show type here rather than showing one already chosen.
   *
   * ⚠️ The form has TWO entry paths and they have collected different things.
   * Reached from the Member No-Show screen, the type and signature are already
   * given, so the type shows locked and the signature is not asked twice.
   * Reached straight from `More` — which is what happens when the app can see
   * the driver is not at the pick-up — neither exists yet, so the form has to
   * collect both or Support gets a claim with no type and no attestation.
   */
  askNoShowType?: boolean;
  /** Ask for the signature here, because no screen collected one. */
  askSignature?: boolean;
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
      askNoShowType
        ? {
            id: "noShowType",
            type: "select",
            label: "No-show type",
            placeholder: "Select:",
            required: true,
            // The same values as the screen's picker, from the one list.
            options: NO_SHOW_TYPES.map((value) => ({ value, label: value })),
            showIf: ONLY_RIDER_NO_SHOW,
          }
        : {
            id: "noShowType",
            type: "text",
            label: "No-show type",
            // Locked: chosen on the Member No-Show screen a moment ago, so
            // asking again would be asking the driver to repeat themselves.
            // Carried into the request because Support needs to know which kind
            // was claimed.
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
        label: "What time did you arrive?",
        shortLabel: "time you arrived",
        helpText: "When you got to the pick-up.",
        required: true,
        prefillFrom: "waitArrivedAt",
        // ⚠️ NO `lockWhenPrefilled` — the inverse of a recorded swipe mark. What
        // prefills here is the evidence we have just judged insufficient, so
        // locking it would stop the driver correcting the one thing we are
        // unsure about.
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
        id: "waitedWhere",
        type: "text",
        label: "Where did you wait for the member?",
        placeholder: "e.g. front entrance, west tower lobby, in the driveway",
        required: true,
        // ⚠️ Production should offer a map pin as well as free text — "the main
        // entrance" of a hospital campus is not a location. Text only here,
        // because a pin picker is a map the prototype does not have.
        helpText:
          "Be specific — it is how Support can tell you were at the right door. ⚠️ A map pin belongs here too.",
        showIf: ONLY_RIDER_NO_SHOW,
      },
      {
        id: "knocked",
        type: "select",
        label: "Did you knock at the door?",
        placeholder: "Select:",
        required: true,
        options: [
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
        ],
        showIf: ONLY_RIDER_NO_SHOW,
      },

      // ⚠️ The signature is conditional, and where it lives is a real decision.
      //
      // Reached from the Member No-Show screen the driver has already signed —
      // production signs before it refuses, and familiarity won — so asking
      // again would be a second signature for one claim. Reached straight from
      // `More`, no screen ran, and the claim needs an attestation: proving a wait
      // is not proving the member was absent, and that gap is what a signature
      // covers.
      //
      // LAST when present, always. The driver attests to the answers above, so a
      // field after it would be signed for before it was written.
      ...(askSignature
        ? ([
            {
              id: "signature",
              type: "signature",
              label: "Sign to confirm",
              helpText:
                "Sign to confirm the member did not come out for this ride.",
              required: true,
              showIf: ONLY_RIDER_NO_SHOW,
            },
          ] as SupportCaseDefinition["fields"])
        : []),
    ],
  };
}
