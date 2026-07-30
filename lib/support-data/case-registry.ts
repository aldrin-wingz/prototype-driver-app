import {
  getIssueOptions,
  ISSUE_CONFIRM_CANT_REACH,
  ISSUE_CONFIRM_DECLINED,
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
  description:
    "This pick-up ran late, which counts against your on-time performance. Tell us why so it can be reviewed.",
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
const ONLY_TRIP_REQUEST = { field: "issue", equals: [ISSUE_TRIP_REQUEST] };
const ONLY_RIDER_NO_SHOW = { field: "issue", equals: [ISSUE_RIDER_NO_SHOW] };
const ONLY_CONFIRM_CANT_REACH = {
  field: "issue",
  equals: [ISSUE_CONFIRM_CANT_REACH],
};
const ONLY_CONFIRM_DECLINED = {
  field: "issue",
  equals: [ISSUE_CONFIRM_DECLINED],
};

/**
 * What the driver heard when they called.
 *
 * The distinction Support acts on is whether the number is bad or the member is
 * simply not picking up: a disconnected line needs the record fixed, an unanswered
 * one needs someone else to try. "No number on file" is last because it is the one
 * answer that says the app failed the driver rather than the other way round.
 */
const CALL_OUTCOME_OPTIONS: SupportFieldOption[] = [
  { value: "rang-no-answer", label: "Rang, no answer" },
  { value: "voicemail", label: "Went to voicemail" },
  { value: "disconnected", label: "Number was disconnected or invalid" },
  { value: "wrong-person", label: "Someone else answered" },
  { value: "no-number", label: "There was no number on file" },
];

/**
 * How the member got the decline to the driver.
 *
 * Second-hand declines are the reason this is asked. A caregiver or a facility
 * telling the driver "she isn't going today" is the common case, and it is not the
 * same evidence as the member saying it themselves — Support should be able to see
 * which one they are acting on.
 */
const DECLINED_CHANNEL_OPTIONS: SupportFieldOption[] = [
  { value: "call", label: "On a call" },
  { value: "text", label: "By text message" },
  { value: "family", label: "Through a family member or caregiver" },
  { value: "facility", label: "Through the facility" },
  { value: "in-person", label: "In person" },
];

/**
 * How the driver tried to reach the member.
 *
 * The last option matters as much as the first three: "I couldn't try" is a real
 * answer — no phone number on the trip, a dead battery — and forcing a driver to
 * claim an attempt they didn't make would make the whole record less trustworthy.
 */
const CONTACT_ATTEMPT_OPTIONS: SupportFieldOption[] = [
  { value: "called", label: "I called them" },
  { value: "texted", label: "I texted them" },
  { value: "called-and-texted", label: "I called and texted" },
  { value: "could-not", label: "I wasn't able to reach out" },
];

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
export function buildSupportFormCase({
  includeIssues,
}: {
  /**
   * Normally-hidden issues to offer anyway.
   *
   * A flow that opens this form with its issue already chosen has to pass that
   * issue here, or the dropdown holds a value with no matching option and renders
   * the placeholder instead of the label.
   */
  includeIssues?: string[];
} = {}): SupportCaseDefinition {
  return {
    id: SUPPORT_FORM_CASE_ID,
    title: "Submit Support Form",
    summary: "Send Support a request",
    // Only ever seen before an issue is picked; after that the issue's own
    // description takes over.
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
        label: "Please choose your issue",
        placeholder: "Select an issue",
        required: true,
        options: getIssueOptions(includeIssues),
        // Only ever locked when a flow supplied the issue — the driver picking one
        // themselves leaves it editable, since `appSupplied` is seeded from the
        // caller's initial values and cleared the moment the driver touches it.
        lockWhenPrefilled: true,
        lockedBadge: "Chosen for you",
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

      // ---- Trip Request --------------------------------------------------
      //
      // The only case that is NOT about a trip in the system. A member has told
      // the driver about upcoming rides that haven't landed yet, and the driver
      // wants them assigned when they do. Every detail is optional because the
      // driver sometimes has leg ids and times and sometimes only a name — a
      // required field here would just block the requests we most want.
      {
        id: "member",
        type: "member-picker",
        label: "Which member?",
        placeholder: "Search members you've driven recently",
        // The one thing we do insist on: without a member there is nothing for
        // Support to match incoming trips against.
        required: true,
        helpText: "Members you've driven in the last 30 days.",
        prefillFrom: "riderName",
        lockWhenPrefilled: true,
        lockedBadge: "From this ride",
        showIf: ONLY_TRIP_REQUEST,
      },
      {
        id: "expectedLegs",
        type: "stepper",
        label: "How many rides do you expect?",
        helpText: "Sets up that many ride rows below.",
        // This field IS the row count — the repeater below reads and writes it —
        // so the number here and the rows shown cannot drift apart.
        defaultValue: "1",
        min: 1,
        max: 8,
        showIf: ONLY_TRIP_REQUEST,
      },
      {
        id: "tripLegs",
        type: "leg-repeater",
        label: "Ride details (optional)",
        helpText:
          "Fill in whatever the member gave you. Blank rows are fine — Support will match on the member.",
        addRowLabel: "Add another ride",
        rowLabel: "Ride",
        rowCountFrom: "expectedLegs",
        max: 8,
        showIf: ONLY_TRIP_REQUEST,
        rowFields: [
          {
            id: "legId",
            type: "text",
            // "Ride ID" per the driver-facing rename, though the value is still
            // the system's leg id — which is what Support will look it up by.
            label: "Ride ID (optional)",
            placeholder: "e.g. 1930447",
          },
          {
            id: "pickupAt",
            type: "datetime",
            label: "Pick-up date & time (optional)",
          },
        ],
      },
      {
        id: "tripRequestNotes",
        type: "textarea",
        label: "Anything else? (optional)",
        placeholder:
          "Standing order, recurring appointment, anything else the member told you.",
        maxLength: 500,
        showIf: ONLY_TRIP_REQUEST,
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

      // ---- Rider No-Show -------------------------------------------------
      //
      // Reached only from the Member No-Show action, and only when the app could
      // NOT establish the 10-minute wait itself. So every question here is one the
      // app would have answered on its own if it could — which is why they are all
      // required: this form is the substitute for evidence, and a half-answered
      // one is worth nothing to Support.
      {
        id: "noShowLegId",
        type: "leg-picker",
        label: "Which trip?",
        required: true,
        showIf: ONLY_RIDER_NO_SHOW,
        prefillFrom: "legId",
        legScope: "in-progress",
        // Its own field rather than sharing Missed Swipe's, because this one must
        // stay pinned to the ride the driver filed from — a no-show is about a
        // specific pick-up they physically attended.
        lockWhenPrefilled: true,
        lockedBadge: "From this ride",
      },
      {
        id: "noShowArrivedAt",
        type: "time",
        label: "What time did you arrive at the pick-up?",
        required: true,
        prefillFrom: "arrivedAt",
        helpText: "Prefilled when we have it — correct it if it's wrong.",
        showIf: ONLY_RIDER_NO_SHOW,
      },
      {
        id: "noShowWaitMinutes",
        type: "stepper",
        label: "How many minutes did you wait?",
        required: true,
        // No default: a stepper starting at a number would answer the question
        // for them, and "0" would pass the required check by inaction.
        min: 1,
        max: 60,
        showIf: ONLY_RIDER_NO_SHOW,
      },
      {
        id: "noShowWaitLocation",
        type: "text",
        label: "Where did you wait?",
        placeholder: "e.g. Parked in the driveway, front entrance",
        required: true,
        helpText: "How Support can tell you were at the right door.",
        showIf: ONLY_RIDER_NO_SHOW,
      },
      {
        id: "noShowContactAttempts",
        type: "select",
        label: "Did you try to reach the member?",
        placeholder: "Select what you tried",
        required: true,
        options: CONTACT_ATTEMPT_OPTIONS,
        showIf: ONLY_RIDER_NO_SHOW,
      },
      {
        id: "noShowContactDetails",
        type: "textarea",
        label: "What happened when you tried?",
        placeholder:
          "Times you called or texted and how it went — no answer, voicemail, wrong number.",
        required: true,
        maxLength: 500,
        showIf: ONLY_RIDER_NO_SHOW,
      },
      {
        id: "noShowProof",
        type: "file",
        label: "Attach proof",
        required: true,
        requiredNotEnforced: true,
        helpText: "A call log or screenshot showing you tried to reach them.",
        showIf: ONLY_RIDER_NO_SHOW,
      },
      {
        // LAST, deliberately. The driver is attesting to the answers above, so a
        // field after the signature would be signed for before it was written.
        id: "noShowSignature",
        type: "signature",
        label: "Sign to confirm",
        required: true,
        helpText:
          "By signing, you confirm the member was not present at the pick-up.",
        showIf: ONLY_RIDER_NO_SHOW,
      },

      // ---- Trip Confirmation — Can't Reach Member -------------------------
      //
      // Reached from "Number can not be reached" in the reach-out-to-confirm
      // flow. The number is the point of this form: if it is dead, Support needs
      // to see which number the driver had before they can fix the record, and
      // until then the ride's own banner keeps telling the next driver to call it.
      //
      // Neither confirmation form takes a signature. The attestation belongs to
      // Rider No-Show, where the driver is asserting something they alone
      // witnessed at a pick-up; here they are reporting a call that did not
      // connect, and asking them to sign for that would be ceremony.
      //
      // Note the leg picker carries NO `legScope`. It must default to "all":
      // these forms are filed from a needs-action ride, which is not in
      // `mockInProgressTrips`, so an "in-progress" scope would find the prefilled
      // leg ineligible and blank it (see `withinScope` in lib/support/prefill).
      {
        id: "cantReachLegId",
        type: "leg-picker",
        label: "Which trip?",
        required: true,
        showIf: ONLY_CONFIRM_CANT_REACH,
        prefillFrom: "legId",
        lockWhenPrefilled: true,
        lockedBadge: "From this ride",
      },
      {
        id: "cantReachPhone",
        type: "text",
        label: "Number you tried",
        placeholder: "The number you called",
        required: true,
        prefillFrom: "riderPhone",
        // Locked when we have one, because then it is evidence of what the app
        // told the driver to call. When the trip carries no number the prefill
        // resolves empty, nothing locks, and the driver types what they tried —
        // which is the honest handling of "there was nothing to call".
        lockWhenPrefilled: true,
        lockedBadge: "On file",
        helpText: "The number we have for this member.",
        showIf: ONLY_CONFIRM_CANT_REACH,
      },
      {
        id: "cantReachOutcome",
        type: "select",
        label: "What happened when you called?",
        placeholder: "Select what you heard",
        required: true,
        options: CALL_OUTCOME_OPTIONS,
        showIf: ONLY_CONFIRM_CANT_REACH,
      },
      {
        id: "cantReachAttempts",
        type: "stepper",
        label: "How many times did you try?",
        required: true,
        // No default, same reasoning as the no-show wait: a number already in the
        // box is an answer the driver never gave.
        min: 1,
        max: 10,
        showIf: ONLY_CONFIRM_CANT_REACH,
      },
      {
        id: "cantReachLastTriedAt",
        type: "time",
        label: "When did you last try?",
        required: true,
        helpText: "So Support knows how fresh this is before they call.",
        showIf: ONLY_CONFIRM_CANT_REACH,
      },
      {
        id: "cantReachDetails",
        type: "textarea",
        label: "Tell us what happened",
        placeholder:
          "Anything Support should know — who answered, what the recording said, whether you left a message.",
        required: true,
        maxLength: 500,
        showIf: ONLY_CONFIRM_CANT_REACH,
      },
      {
        id: "cantReachProof",
        type: "file",
        label: "Attach proof",
        required: true,
        requiredNotEnforced: true,
        helpText: "A call log or screenshot showing your attempts.",
        showIf: ONLY_CONFIRM_CANT_REACH,
      },

      // ---- Trip Confirmation — Rider Declined -----------------------------
      //
      // Reached from the Rider-declined popup. Production went straight from that
      // popup to a chat message, which handed Support an unevidenced claim about a
      // member for a ride with revenue attached. These five questions are what
      // turn "the member declined" into something Support can act on.
      //
      // No phone field here on purpose: the number worked, so it is not evidence.
      // It is evidence only when it fails, which is the case above.
      {
        id: "declinedLegId",
        type: "leg-picker",
        label: "Which trip?",
        required: true,
        showIf: ONLY_CONFIRM_DECLINED,
        prefillFrom: "legId",
        // Its own field rather than shared, for the same reason as the no-show
        // picker: it must stay pinned to the ride the driver filed from.
        lockWhenPrefilled: true,
        lockedBadge: "From this ride",
      },
      {
        id: "declinedHow",
        type: "select",
        label: "How did the member tell you?",
        placeholder: "Select how you heard",
        required: true,
        options: DECLINED_CHANNEL_OPTIONS,
        showIf: ONLY_CONFIRM_DECLINED,
      },
      {
        id: "declinedAt",
        type: "time",
        label: "When did they tell you?",
        required: true,
        showIf: ONLY_CONFIRM_DECLINED,
      },
      {
        id: "declinedDetails",
        type: "textarea",
        label: "What did the member say?",
        placeholder:
          "Their words as best you remember, and whether they still need a ride another day.",
        required: true,
        maxLength: 500,
        showIf: ONLY_CONFIRM_DECLINED,
      },
      {
        id: "declinedProof",
        type: "file",
        label: "Attach proof",
        required: true,
        requiredNotEnforced: true,
        helpText:
          "A screenshot of the message, or a call log showing the conversation.",
        showIf: ONLY_CONFIRM_DECLINED,
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
