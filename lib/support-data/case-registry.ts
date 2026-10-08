import {
  getIssueOptions,
  ISSUE_CANCEL_AT_DOOR,
  ISSUE_MISSED_SWIPE,
  ISSUE_RIDER_NO_SHOW,
} from "./issue-types";
import type { SwipeAnchor } from "@/lib/driver-data/missed-swipe-rules";
import {
  CONTACT_RELATION_OPTIONS,
  NO_SHOW_TYPES,
  SPOKE_WITH_CONTACT,
  SPOKE_WITH_OPTIONS,
} from "@/lib/driver-data/no-show-rules";
import type { SupportCaseDefinition } from "@/types/support";

/**
 * Which issue owns a field.
 *
 * Always true while Rider No-Show is the only issue, and kept anyway — this is
 * how a field set declares what it belongs to. Case two arrives as its own
 * `ONLY_*` and its own block, with nothing to unpick here first.
 */
const ONLY_RIDER_NO_SHOW = { field: "issue", equals: [ISSUE_RIDER_NO_SHOW] };
const ONLY_CANCEL_AT_DOOR = { field: "issue", equals: [ISSUE_CANCEL_AT_DOOR] };

/**
 * Fields both no-show cases ask, so they are declared once.
 *
 * ⚠️ `equals` is an array for exactly this: a field belongs to a SET of issues.
 * Two copies of `legId` under different gates would be two fields that could
 * drift apart while looking identical in the rendered form.
 */
const EITHER_NO_SHOW_CASE = {
  field: "issue",
  equals: [ISSUE_RIDER_NO_SHOW, ISSUE_CANCEL_AT_DOOR],
};
const ONLY_MISSED_SWIPE = { field: "issue", equals: [ISSUE_MISSED_SWIPE] };

/**
 * Every case that is filed against one leg.
 *
 * `legId` belongs to all of them, so it is declared once under this gate rather
 * than copied per case — two identical-looking leg pickers under different gates
 * are two fields that can drift.
 */
const ANY_LEG_CASE = {
  field: "issue",
  equals: [ISSUE_RIDER_NO_SHOW, ISSUE_CANCEL_AT_DOOR, ISSUE_MISSED_SWIPE],
};

/** The time fields of a Missed Swipe, in the order they must have happened. */
export const SWIPE_TIME_SEQUENCE = ["enRouteTime", "pickupTime", "dropOffTime"];

/** One end of a missed-swipe leg, and whether the location trail confirmed it. */
export interface MissedSwipeAsk {
  anchor: SwipeAnchor;
  /** The trail placed the driver at this address. */
  confirmed: boolean;
}

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
 * ⚠️ **One field set for all three no-show types.** An earlier version branched:
 * `Cancel At Door` asked who told them instead of how long they waited. It no
 * longer does — the type is a label Support reads, not a branch the form takes,
 * so a Cancel At Door filing answers the same four questions as any other. That
 * removed the `requireOneOf` machinery with it, since the signature-or-photo rule
 * existed only for that variant.
 */
export function buildSupportFormCase({
  includeIssues,
  askNoShowType = false,
  askSignature = false,
  askWaitTimes = true,
  missedSwipe,
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
  /**
   * Ask when the driver arrived and when they left.
   *
   * ⚠️ Always true for Rider No-Show — the whole case is about a wait. For
   * Cancel at Door it is true ONLY when the app could not place the driver at
   * the pick-up: a driver standing there right now has nothing to reconstruct,
   * and asking anyway is the interrogation this form exists to avoid.
   */
  askWaitTimes?: boolean;
  /**
   * The ends of a missed-swipe leg to ask about, and what the trail confirmed.
   *
   * ⚠️ Anchor AND evidence together, never two parallel lists. Which end is
   * asked and whether the app can already place the driver there decide
   * different things — the time field's prefill, and whether the "where were
   * you" field exists at all — and two lists that could disagree would let the
   * form ask where someone was while telling them it knows.
   */
  missedSwipe?: MissedSwipeAsk[];
} = {}): SupportCaseDefinition {
  const asksPickup = missedSwipe?.some((a) => a.anchor === "pickup") ?? false;
  const asksDropoff = missedSwipe?.some((a) => a.anchor === "dropoff") ?? false;
  const confirmed = (anchor: SwipeAnchor) =>
    missedSwipe?.find((a) => a.anchor === anchor)?.confirmed ?? false;
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
    zendeskEquivalent: missedSwipe ? "Missed swipe" : "Member no-show",
    timeSequence: missedSwipe ? SWIPE_TIME_SEQUENCE : WAIT_TIME_SEQUENCE,
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
            showIf: EITHER_NO_SHOW_CASE,
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
            showIf: EITHER_NO_SHOW_CASE,
          },
      {
        id: "legId",
        type: "leg-picker",
        label: "Which trip?",
        placeholder: "Search your rides by leg ID, rider or date",
        required: true,
        showIf: ANY_LEG_CASE,
        prefillFrom: "legId",
        // A no-show is only actionable on a trip that is under way.
        legScope: "in-progress",
        // Locked because the form is only ever opened from a ride, and a no-show
        // is about a specific pick-up the driver physically attended. Leaving it
        // open would let a driver standing at trip A file against trip B.
        lockWhenPrefilled: true,
        lockedBadge: "From this ride",
      },
      ...(askWaitTimes
        ? ([
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
              showIf: EITHER_NO_SHOW_CASE,
            },
            {
              id: "leftAt",
              type: "time",
              label: "What time did you leave?",
              shortLabel: "time you left",
              helpText: "When you gave up and drove off.",
              required: true,
              prefillFrom: "waitLeftAt",
              showIf: EITHER_NO_SHOW_CASE,
            },
          ] as SupportCaseDefinition["fields"])
        : []),
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

      // ---- Cancel at Door ------------------------------------------------
      // ⚠️ Two questions, and they are the entire evidence the waived wait rests
      // on. Production asks `Spoke with` as free text and gets a NAME; a name
      // says who was there and nothing about whether they could speak for the
      // member. These ask the two things that actually matter, as categories —
      // which is also why nothing identifying reaches the request.
      {
        id: "spokeWithWho",
        type: "select",
        label: "Who did you talk to?",
        placeholder: "Select:",
        required: true,
        options: [...SPOKE_WITH_OPTIONS],
        /**
         * ⚠️ Deliberately says nothing about WHO, because one of the three
         * answers is "no one". An earlier version read "You named them on the
         * previous screen…", which contradicts itself the moment a driver picks
         * the option this field exists to offer.
         */
        helpText: "Not their name — you gave that on the previous screen.",
        showIf: ONLY_CANCEL_AT_DOOR,
      },
      {
        id: "spokeWithRelation",
        type: "select",
        label: "What are they to the member?",
        placeholder: "Select:",
        required: true,
        options: [...CONTACT_RELATION_OPTIONS],
        /**
         * ⚠️ Gated on the ANSWER, not on the issue, because `showIf` carries one
         * condition and this field needs the narrower of the two. It is safe
         * only because `spokeWithWho` is itself gated on this issue, so it can
         * hold a value on no other case. If a second case ever asks
         * `spokeWithWho`, this needs a compound condition rather than a comment.
         */
        showIf: { field: "spokeWithWho", equals: [SPOKE_WITH_CONTACT] },
      },

      // ---- Missed Swipe --------------------------------------------------
      // A leg the driver DROVE but could not mark. Every question here is one
      // the app would have answered itself if the swipe had happened — which is
      // why each one carries what the location trail could and could not say,
      // rather than presenting a blank box and letting the driver guess whether
      // we already knew.
      ...(missedSwipe
        ? ([
            {
              id: "enRouteTime",
              type: "time",
              label: "En-route time",
              helpText: "When you swiped to start. This is the one mark we have.",
              prefillFrom: "enRouteTime",
              lockWhenPrefilled: true,
              showIf: ONLY_MISSED_SWIPE,
            },
            asksPickup
              ? {
                  id: "pickupTime",
                  type: "time",
                  label: "What time did you pick the member up?",
                  shortLabel: "pick-up time",
                  required: true,
                  prefillFrom: "pickupSeenAt",
                  // ⚠️ NOT locked even when it prefills. What fills it is the
                  // app's own guess off the trail — the time it first saw the
                  // driver AT the address, which is when they arrived, not when
                  // the member got in. Locking a guess would make the driver
                  // file a time they can see is wrong.
                  helpText: confirmed("pickup")
                    ? "Your location history puts you at the pick-up around this time. Change it if the member got in later."
                    : "We could not place you at the pick-up, so this one is yours to fill in.",
                  showIf: ONLY_MISSED_SWIPE,
                }
              : {
                  id: "pickupTime",
                  type: "time",
                  label: "Pick-up time",
                  prefillFrom: "recordedPickupAt",
                  lockWhenPrefilled: true,
                  showIf: ONLY_MISSED_SWIPE,
                },
            // Only when the trail could NOT place them there. Asking where the
            // pick-up happened while the app can already see they were at the
            // pick-up address is exactly the interrogation this case exists to
            // remove.
            ...(asksPickup && !confirmed("pickup")
              ? [
                  {
                    id: "pickupWhere",
                    type: "text",
                    label: "Where did you pick them up?",
                    placeholder:
                      "e.g. west tower lobby, the side entrance, in the driveway",
                    helpText:
                      "Be specific — with no location record of the pick-up, this is what Support has.",
                    required: true,
                    showIf: ONLY_MISSED_SWIPE,
                  },
                ]
              : []),
            asksDropoff
              ? {
                  id: "dropOffTime",
                  type: "time",
                  label: "What time did you drop the member off?",
                  shortLabel: "drop-off time",
                  required: true,
                  prefillFrom: "dropoffSeenAt",
                  helpText: confirmed("dropoff")
                    ? "Your location history puts you at the drop-off around this time. Change it if you left later."
                    : "We could not place you at the drop-off, so this one is yours to fill in.",
                  showIf: ONLY_MISSED_SWIPE,
                }
              : {
                  id: "dropOffTime",
                  type: "time",
                  label: "Drop-off time",
                  prefillFrom: "recordedDropoffAt",
                  lockWhenPrefilled: true,
                  showIf: ONLY_MISSED_SWIPE,
                },
            ...(asksDropoff && !confirmed("dropoff")
              ? [
                  {
                    id: "dropoffWhere",
                    type: "text",
                    label: "Where did you drop them off?",
                    placeholder: "e.g. the main entrance, bay 3, the front desk",
                    helpText:
                      "Be specific — with no location record of the drop-off, this is what Support has.",
                    required: true,
                    showIf: ONLY_MISSED_SWIPE,
                  },
                ]
              : []),
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
          ] as SupportCaseDefinition["fields"])
        : []),

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
