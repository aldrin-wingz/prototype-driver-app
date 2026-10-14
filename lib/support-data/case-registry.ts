import {
  getIssueOptions,
  ISSUE_AUTO_ASSIGN_REQUEST,
  ISSUE_CANCEL_AT_DOOR,
  ISSUE_CANNOT_REACH_MEMBER,
  ISSUE_MISSED_SWIPE,
  ISSUE_RIDER_NO_SHOW,
  ISSUE_RIDER_DECLINED,
  ISSUE_SEND_BACK_REASON,
  ISSUE_TRIP_CHANGE_REQUEST,
  ISSUE_ADD_LEG_REQUEST,
  ISSUE_OVER_CAPACITY_EXCEPTION,
} from "./issue-types";
import { toTimeInputValue } from "@/lib/support/prefill";
import {
  OC_REASON_MORE_SEATS,
  OC_REASON_OTHER,
  OVER_CAPACITY_REASONS,
  OVER_CAPACITY_REASON_LABEL,
  OVER_CAPACITY_SEATS_HELP,
  OVER_CAPACITY_SEATS_TITLE,
} from "@/lib/driver-data/over-capacity";
import type { SeatBlockConfig } from "@/types/support";
import { addLegBlockGroup } from "@/lib/driver-data/add-leg-request";
import {
  DECLINE_CHANNELS,
  DECLINE_CHANNEL_OPTIONS,
  DECLINED_LEGS_FIELD,
  SECOND_HAND_CHANNELS,
} from "@/lib/driver-data/rider-declined";
import {
  SEND_BACK_REASON_OTHER,
  sendBackReasonOptions,
} from "@/lib/driver-data/send-back-reasons";
import {
  ASSIGNMENT_SCOPE_SPECIFIC,
  ASSIGNMENT_SCOPE_STANDING,
  ASSIGNMENT_SCOPES,
} from "@/lib/driver-data/member-assignment";
import {
  REACH_OUTCOME_OTHER,
  REACH_OUTCOMES,
} from "@/lib/driver-data/reach-attempt";
import {
  ADD_NOTES_FIELD,
  ADD_DROPOFF_ADDRESS_FIELD,
  ADD_DROPOFF_TIME_FIELD,
  ADD_PICKUP_ADDRESS_FIELD,
  ADD_PICKUP_TIME_FIELD,
  ADD_SOURCE_FIELD,
  ADD_SOURCE_OPTIONS,
  ESTIMATE_HELP,
  OVERNIGHT_WARNING,
  SLOT_FIELD,
  shiftFieldId,
  type AddLegBlock,
} from "@/lib/driver-data/add-leg-request";
import {
  CHANGE_NOTES_FIELD,
  CHANGE_SOURCE_FIELD,
  CHANGE_SOURCE_OPTIONS,
  PASSED_ANCHOR_BADGE,
  changeAddressFieldId,
  changeTimeFieldId,
  changeWatchedFields,
  type ChangeAnchor,
} from "@/lib/driver-data/trip-change-request";
import type { SwipeAnchor } from "@/lib/driver-data/missed-swipe-rules";
import {
  CONTACT_RELATION_OPTIONS,
  NO_SHOW_TYPES,
  SPOKE_WITH_CONTACT,
  SPOKE_WITH_OPTIONS,
} from "@/lib/driver-data/no-show-rules";
import type {
  LegOrderConfig,
  SupportCaseDefinition,
  SupportFieldOption,
} from "@/types/support";

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
const ONLY_CANNOT_REACH = {
  field: "issue",
  equals: [ISSUE_CANNOT_REACH_MEMBER],
};
const ONLY_AUTO_ASSIGN = {
  field: "issue",
  equals: [ISSUE_AUTO_ASSIGN_REQUEST],
};
const ONLY_SEND_BACK = {
  field: "issue",
  equals: [ISSUE_SEND_BACK_REASON],
};
const ONLY_RIDER_DECLINED = {
  field: "issue",
  equals: [ISSUE_RIDER_DECLINED],
};
const ONLY_TRIP_CHANGE = {
  field: "issue",
  equals: [ISSUE_TRIP_CHANGE_REQUEST],
};
const ONLY_ADD_LEG = {
  field: "issue",
  equals: [ISSUE_ADD_LEG_REQUEST],
};
const ONLY_OVER_CAPACITY = {
  field: "issue",
  equals: [ISSUE_OVER_CAPACITY_EXCEPTION],
};

/**
 * Every case that is filed against one leg.
 *
 * `legId` belongs to all of them, so it is declared once under this gate rather
 * than copied per case — two identical-looking leg pickers under different gates
 * are two fields that can drift.
 *
 * ⛔⛔ **`ISSUE_AUTO_ASSIGN_REQUEST` is deliberately ABSENT.** It is the first
 * case that is not about a leg at all: it names a MEMBER and asks about trips
 * that do not exist yet. Adding it here would put a required, locked leg picker
 * on a request whose whole point is that there is no trip to pick — and the
 * leg it locked to would be the one the driver happened to be standing on,
 * which Support would then read as the subject of the request.
 */
const ANY_LEG_CASE = {
  field: "issue",
  equals: [
    ISSUE_RIDER_NO_SHOW,
    ISSUE_CANCEL_AT_DOOR,
    ISSUE_MISSED_SWIPE,
    ISSUE_CANNOT_REACH_MEMBER,
  ],
};

/**
 * ⛔⛔ **`ISSUE_RIDER_DECLINED` is deliberately absent from `ANY_LEG_CASE` too**,
 * and for the opposite reason to the auto-assign case. That one has no leg;
 * this one has SEVERAL, and which of them come off the manifest is the question
 * the form exists to ask. A locked single-leg picker above a checklist listing
 * the same leg would be the form answering its own question in the row above it.
 *
 * ⚠️ The consequence is explicit: `resolveTripContext` finds no picker on this
 * case and returns `{}`, so `rider-declined-form.tsx` passes the trip and leg to
 * `submitForm` itself. That is a deliberate hand-off, not an omission — the
 * entry point is a ride, so the trip was never in doubt.
 */

/** The time fields of a Missed Swipe, in the order they must have happened. */
export const SWIPE_TIME_SEQUENCE = ["enRouteTime", "pickupTime", "dropOffTime"];

/** One end of a missed-swipe leg the driver has to confirm. */
export interface MissedSwipeAsk {
  anchor: SwipeAnchor;
  /** The location trail placed the driver at this address. */
  confirmed: boolean;
}

/** The time fields of a Missed Swipe, with each odometer beside its own time. */
export const SWIPE_FIELD_ORDER = [
  "enRouteTime",
  "pickupTime",
  "pickupOdometer",
  "dropOffTime",
  "dropoffOdometer",
];

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
/**
 * What the one trailing signature is called.
 *
 * ⚠️ `Driver Signature` — production's own wording on the Member No-Show screen
 * and on Stage 05, where the pads are labelled `Driver Signature` and `Member
 * Signature`. The three fields this replaced said "Sign to confirm" twice and
 * "Driver Signature" once; only one of those matches a captured screen.
 */
export const DRIVER_SIGNATURE_LABEL = "Driver Signature";

export function buildSupportFormCase({
  includeIssues,
  askNoShowType = false,
  signatureTakenElsewhere = false,
  askWaitTimes = true,
  missedSwipe,
  cannotReach,
  autoAssign = false,
  sendBack = false,
  riderDeclined,
  tripChange,
  addLeg,
  overCapacity,
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
  /**
   * The signature was already taken on the screen that opened this form.
   *
   * ⛔⛔ **Only the Member No-Show screen does this.** It takes a signature
   * before the form exists — production's own screen, captured — so asking
   * again would be a second signature for one claim. Every other entry point
   * is a tile or a sheet that collected nothing.
   *
   * ⚠️ Named for what is TRUE rather than for what to do (`askSignature`), so
   * a caller has to know something about its own screen to pass it, instead of
   * deciding a policy it cannot see.
   */
  signatureTakenElsewhere?: boolean;
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
  /**
   * The member-facing numbers THIS trip carries, for "which number did you try?".
   *
   * ⚠️ Passed in rather than derived here, because the options are a property of
   * the trip and this builder has no trip. ⛔ An empty array is a real case, not
   * a caller mistake — the stage map records the numbers as client-provided, so
   * a trip can carry none. The block below renders a notice instead of an
   * unanswerable required select when that happens.
   */
  cannotReach?: { contactOptions: SupportFieldOption[] };
  /**
   * Build the "ask to be their regular driver" case — catalogue row 09.
   *
   * ⚠️ A plain boolean, unlike `cannotReach`, because this case needs nothing
   * from the trip that `prefillFrom` cannot reach on its own. The member comes
   * through `riderName` like any other prefill; there is no per-trip option list
   * to assemble, so there is nothing for a caller to get wrong by passing.
   */
  autoAssign?: boolean;
  /**
   * Build the send-back reason case — catalogue row 14.
   *
   * ⚠️ A plain boolean like `autoAssign`: the reason options are production's
   * own list and depend on nothing about the trip, so there is nothing for a
   * caller to assemble and nothing for them to get wrong.
   */
  sendBack?: boolean;
  /**
   * Build the rider-declined case — catalogue row 17.
   *
   * ⚠️ Carries the LEGS this report could cover, like `cannotReach` carries the
   * numbers and for the same reason: they are a property of the trip and this
   * builder has no trip. ⛔ Never an empty array — `legsInGroup` returns the
   * ride itself for a one-way trip, so a caller that found nothing has a bug
   * rather than a case to render.
   */
  riderDeclined?: { legOptions: SupportFieldOption[] };
  /**
   * Build the Update Trip Details case — catalogue row 22.
   *
   * ⚠️ Carries the ride's own ANCHORS, because the field set is generated from
   * them: two fields per anchor, labelled with the anchor's own wording. A fixed
   * four-field block would be wrong twice over — it invents a drop-off on the
   * 26 seeded rides that have only one anchor, and it prints "Drop-off time"
   * beside a ride that says "Appointment Time".
   *
   * ⛔ Never an empty array. Every ride has at least one anchor, so a caller
   * that found none has a bug rather than a case to render.
   */
  tripChange?: { anchors: ChangeAnchor[] };
  /**
   * Build the Add Leg to Trip case — catalogue row 21.
   *
   * ⚠️ Carries the whole placement picture, because every part of it is a rule
   * this builder has no way to work out: which slots are legal, what each leg's
   * letter is, how long the new leg is estimated to take and where that estimate
   * came from. All of it is decided in `lib/driver-data/add-leg-request.ts`.
   *
   * ⛔ `shifts` is the field set's own shape — one editable time per existing leg
   * the insertion would push later — so it changes as the driver types. The
   * caller rebuilds the case on every render, exactly as row 22's anchors do.
   */
  addLeg?: {
    legOrder: LegOrderConfig;
    estimateSource: "group" | "default";
    /**
     * The new leg and every existing leg the insertion pushes, in running
     * order — each asked the same four questions.
     *
     * ⛔ Replaced `shifts: LegShift[]`, which carried only a time per pushed
     * leg. The block still carries that time's proposal and its warning; what
     * it adds is the three fields a pushed leg never had.
     */
    blocks: AddLegBlock[];
    /** The trip's original pick-up — what the "rider's home" tick box copies. */
    homeAddress: string;
    overnight: boolean;
    /** Set when the chosen slot contradicts the pick-up time. */
    slotWarning?: string;
  };
  /**
   * Build the over-capacity exception request — catalogue row 13.
   *
   * ⚠️ Carries the assembled `SeatBlockConfig`, like `addLeg` carries its
   * `legOrder` and for the same reason: which accepted trips overlap, how many
   * seats they hold at once and how short the record is are rules living in
   * `lib/driver-data/over-capacity.ts`, and this builder has neither the
   * manifest nor the request to work them out from.
   *
   * ⛔ Never `{ blocks: [] }` as a stand-in for "not this case". A request can
   * genuinely be over capacity with NOTHING overlapping it — a wheelchair plus
   * three escorts in a five-seat vehicle needs no help being too big — and the
   * panel says so instead of listing nothing. Absent means a different case;
   * empty rows mean this one, with the vehicle on its own.
   */
  overCapacity?: { seatBlocks: SeatBlockConfig };
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
    /**
     * ⚠️ "Continue", not "Submit", for the send-back reason — and the word is
     * load-bearing. That form is a STEP: the driver is mid-send-back and the
     * next screen asks whether they are sure. A button saying Submit would tell
     * them they had just sent something, on the one case where they have not.
     */
    submitLabel: sendBack ? "Continue" : "Submit",
    /**
     * ⛔⛔ **The diff gate, and no other case has one.**
     *
     * Every form before this asked for values the app did not have, so Submit
     * could be gated on required fields being FILLED. This one opens with every
     * answer already in place — `areRequiredFieldsFilled` would pass it the
     * instant it rendered, and the driver could send Support a request to change
     * the ride to exactly what it already is.
     *
     * ⚠️ Only the EDITABLE anchors are named. A locked field cannot change, so
     * listing one would put a field in the gate that can never satisfy it.
     */
    requireChangedFrom: tripChange
      ? changeWatchedFields(tripChange.anchors)
      : undefined,
    resolution: "cs-queue",
    successMessage: "Sent to Support",
    zendeskEquivalent: overCapacity
      ? "Over capacity — exception request"
      : addLeg
      ? "Add a leg to a trip"
      : tripChange
      ? "Trip change request"
      : riderDeclined
      ? "Rider declined the trip"
      : sendBack
      ? "Trip sent back"
      : autoAssign
      ? "Driver assignment request"
      : cannotReach
        ? "Unable to reach member"
        : missedSwipe
          ? "Missed swipe"
          : "Member no-show",
    /**
     * ⚠️ `undefined` for Can't Reach, not a fallback.
     *
     * This case asks no times at all, so naming a sequence here would hand
     * `getTimeOrderWarnings` two field ids that never render — a check that
     * passes because it has nothing to look at, which is indistinguishable from
     * a check that passed because the times were in order.
     */
    timeSequence:
      /**
       * ⭐ The one case whose sequence is DERIVED, because the fields are.
       *
       * A ride's anchors happen in timeline order, so the times the driver is
       * proposing must too — a drop-off asked for before its own pick-up
       * describes a ride that cannot happen. ⚠️ Passed anchors are IN the
       * sequence: a pick-up that already happened at 11:10 is the hardest bound
       * there is on a drop-off being asked for at 10:30.
       */
      /**
       * ⭐ Derived, like row 22's — the new leg's two ends, then every leg the
       * insertion pushes, in the order they would happen. A driver who edits a
       * proposed time backwards gets the same warning row 01 already built.
       */
      /**
       * ⛔⛔ Every block's two times, in the order the legs RUN — sorted by
       * position, not by the order the blocks were generated in. The new leg
       * comes first out of `addLegBlocks` whatever slot it took, so reading
       * them unsorted would declare a leg that runs third as happening first
       * and warn about a schedule that is correct.
       */
      addLeg
        ? [...addLeg.blocks]
            .sort((a, b) => a.position - b.position)
            .flatMap((block) => [block.fields.pickupTime, block.fields.dropoffTime])
        : tripChange
        ? tripChange.anchors.map((anchor) => changeTimeFieldId(anchor.index))
        : cannotReach || autoAssign || sendBack || riderDeclined
        ? undefined
        : missedSwipe
          ? SWIPE_TIME_SEQUENCE
          : WAIT_TIME_SEQUENCE,
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
            lockedBadge: null,
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
        /**
         * ⛔⛔ **The scope has to match the case, and `"in-progress"` means one
         * specific seed array — `mockInProgressTrips` — not "a live trip".**
         *
         * A no-show or a missed swipe is only actionable on a trip that is under
         * way, so those keep the narrow scope. Can't Reach Member is filed on a
         * trip that has not been CONFIRMED yet, which lives in Needs Action and
         * is not in that array at all. Left narrow, the picker could not resolve
         * the leg the form had just prefilled and rendered its empty search box
         * instead — a required field showing a placeholder, on a form the driver
         * cannot correct because the field is meant to be locked.
         */
        legScope: cannotReach ? "all" : "in-progress",
        // Locked because the form is only ever opened from a ride, and a no-show
        // is about a specific pick-up the driver physically attended. Leaving it
        // open would let a driver standing at trip A file against trip B.
        lockWhenPrefilled: true,
        lockedBadge: null,
      },
      ...(askWaitTimes
        ? ([
            {
              id: "waitedFrom",
              type: "time",
              label: "What time did you arrive?",
              shortLabel: "time you arrived",
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
        /**
         * ⚠️ **The ask is IN the placeholder**, not in a line beneath it.
         * Production should offer a map pin as well as free text — "the main
         * entrance" of a hospital campus is not a location — and the amber
         * line saying so was one more sentence under one more question.
         * ⛔ Still text only: a pin picker is a map the prototype does not have.
         */
        placeholder: "Place google map pin location",
        required: true,        showIf: ONLY_RIDER_NO_SHOW,
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
      //
      // ⛔⛔ **Only the ends being CONFIRMED render. Anything the app already
      // recorded is NOT a field.** (User direction, 2026-10-14 — "remove any
      // fields that are already recorded and only keep the ones we have not".)
      //
      // The form used to render the whole record, settled values prefilled and
      // locked, so the driver could see what they were not being asked. That
      // reason expired when the sheet gained its `Current leg details` block:
      // every recorded time and odometer is printed two inches above, from
      // `tripContextFor`, with a dash where nothing was supplied. Rendering them
      // again as dead inputs asked the driver to read the same five facts twice
      // and left the real questions below the fold.
      //
      // ⚠️ **So the facts moved, they did not disappear** — and that is a
      // coupling worth naming: `trip-context.ts` is now the only place a
      // recorded pick-up or drop-off mark is shown on this form. `verify-
      // missed-swipe` §4 asserts both halves, absence here and presence there.
      //
      // ⛔ The en-route mark is recorded on every one of these legs, so by this
      // rule it is not a field either — and it is NOT one of the eight rows in
      // `Current leg details`. It is therefore no longer on screen anywhere in
      // this form. Deliberate and flagged to the user; one row restores it.
      //
      // ⚠️ The odometer is the exception the rule has to carry. A time can be
      // proposed from the location trail; a reading exists only because a swipe
      // captured it, and on a missed swipe that is exactly what did not happen.
      // So a confirmable odometer opens BLANK.
      ...(missedSwipe
        ? ([
            // ---- the pick-up end ----
            ...(asksPickup
              ? ([{
                  id: "pickupTime",
                  type: "time",
                  label: "What time did you pick the member up?",
                  shortLabel: "pick-up time",
                  required: true,
                  prefillFrom: "pickupSeenAt",
                  // ⚠️ NOT locked even when it prefills. What fills it is the
                  // app's guess off the trail — when it first saw the driver AT
                  // the address, which is when they arrived, not when the member
                  // got in. Locking a guess makes the driver file a time they
                  // can see is wrong.
                  showIf: ONLY_MISSED_SWIPE,
                },
                {
                  id: "pickupOdometer",
                  type: "number",
                  label: "Odometer at pick-up",
                  shortLabel: "pick-up odometer",
                  required: true,
                  min: 0,
                  placeholder: "e.g. 48213",
                  showIf: ONLY_MISSED_SWIPE,
                }] as SupportCaseDefinition["fields"])
              : []),
            // Only when the trail could NOT place them there. Asking where the
            // pick-up happened while the app can already see they were at the
            // pick-up address is the interrogation this case exists to remove.
            ...(asksPickup && !confirmed("pickup")
              ? [
                  {
                    id: "pickupWhere",
                    type: "text",
                    label: "Where did you pick them up?",
                    placeholder:
                      "e.g. west tower lobby, the side entrance, in the driveway",
                    required: true,
                    showIf: ONLY_MISSED_SWIPE,
                  },
                ]
              : []),

            // ---- the drop-off end ----
            ...(asksDropoff
              ? ([{
                  id: "dropOffTime",
                  type: "time",
                  label: "What time did you drop the member off?",
                  shortLabel: "drop-off time",
                  required: true,
                  prefillFrom: "dropoffSeenAt",
                  showIf: ONLY_MISSED_SWIPE,
                },
                {
                  id: "dropoffOdometer",
                  type: "number",
                  label: "Odometer at drop-off",
                  shortLabel: "drop-off odometer",
                  required: true,
                  min: 0,
                  placeholder: "e.g. 48229",
                  showIf: ONLY_MISSED_SWIPE,
                }] as SupportCaseDefinition["fields"])
              : []),
            ...(asksDropoff && !confirmed("dropoff")
              ? [
                  {
                    id: "dropoffWhere",
                    type: "text",
                    label: "Where did you drop them off?",
                    placeholder: "e.g. the main entrance, bay 3, the front desk",
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
              showIf: ONLY_MISSED_SWIPE,
            },
          ] as SupportCaseDefinition["fields"])
        : []),

      // ---- Can't Reach Member --------------------------------------------
      //
      // Catalogue rows 04 and 05, which are ONE build reached from two places:
      // a fourth option in the Reach Rider modal, and a tile in More Options.
      // Both call this builder, so the two paths cannot drift into asking
      // different questions — the lesson Missed Swipe's two entry points taught.
      //
      // ⛔⛔ Row 04 was written as "driver tags the number invalid from the app".
      // That is the wrong actor and the form does NOT do it. Whether a number is
      // invalid is an agent-side judgement made across every trip it appears on;
      // a driver has one failed call and cannot see that. What they can report
      // truthfully is which number they tried and what happened when they did —
      // and "disconnected or not in service" is the answer an agent reads as a
      // candidate invalid number, sourced from someone who actually observed it.
      ...(cannotReach
        ? ([
            cannotReach.contactOptions.length > 0
              ? {
                  id: "contactNumber",
                  type: "select",
                  label: "Which number did you try?",
                  shortLabel: "number you tried",
                  placeholder: "Select:",
                  required: true,
                  // ⚠️ The trip's own numbers, never a fixed list of three.
                  // Offering a number that was never on the driver's screen
                  // sends Support chasing a call nobody made.
                  options: cannotReach.contactOptions,
                  showIf: ONLY_CANNOT_REACH,
                }
              : {
                  id: "contactNumber",
                  type: "notice",
                  label: "Which number did you try?",
                  helpText:
                    "This trip carries no member phone number at all — which is itself the problem. Tell us what you tried below and Support will chase the client for a number.",
                  showIf: ONLY_CANNOT_REACH,
                },
            {
              id: "reachOutcome",
              type: "select",
              label: "What happened when you called?",
              shortLabel: "what happened",
              placeholder: "Select:",
              required: true,
              options: [...REACH_OUTCOMES],
              showIf: ONLY_CANNOT_REACH,
            },
            {
              id: "reachOutcomeOther",
              type: "text",
              label: "What happened?",
              placeholder: "In a few words",
              required: true,
              /**
               * ⚠️ Gated on the ANSWER, not the issue, because `showIf` carries
               * one condition and this needs the narrower of the two. Safe only
               * because `reachOutcome` is itself gated on this issue and so can
               * hold a value on no other case. A second case asking
               * `reachOutcome` would need a compound condition here, not a
               * comment.
               */
              showIf: { field: "reachOutcome", equals: [REACH_OUTCOME_OTHER] },
            },
            {
              id: "reachNotes",
              type: "textarea",
              label: "Anything else Support should know? (optional)",
              placeholder:
                "e.g. the menu asked for an extension I do not have, or the facility desk said to call back after 2pm",
              maxLength: 500,
              showIf: ONLY_CANNOT_REACH,
            },
            {
              id: "contactProof",
              type: "file",
              label: "Photo of your call log",
              /**
               * ⚠️ `requiredNotEnforced` — the project's existing pattern for a
               * file nobody walking a demo has to hand. The asterisk shows the
               * real requirement; the prototype does not block on it. Since
               * 2026-10-14 it prints nothing: the amber disclosure line came
               * out with the other helper texts.
               */
              required: true,
              requiredNotEnforced: true,
              showIf: ONLY_CANNOT_REACH,
            },
          ] as SupportCaseDefinition["fields"])
        : []),

      // ---- Rider Declined the Trip ---------------------------------------
      //
      // Catalogue row 17 — `Trip / Ride Cancellation`, 509 calls. The member
      // says they no longer need the ride; production shows a sheet saying this
      // is NOT a cancellation and sends the driver to Support. This block is
      // what Support is asked for on that call, collected before it.
      //
      // ⛔⛔ **The driver's own alternative is the expensive one, and that is
      // the whole case.** Sending the trip back is one tap away in More Options
      // and is CHARGED — $25 on TCI TN at or after 10:00 the day before, and
      // `calc_same_day` send-backs were charged 100% of the time over fourteen
      // days. So a member who declines on the morning of the trip costs the
      // driver money if they use the app and nothing if they ring Support.
      // Row 17 is the removal of a $25 reason to pick up the phone.
      ...(riderDeclined
        ? ([
            {
              id: DECLINED_LEGS_FIELD,
              type: "leg-checklist",
              // ⚠️ Names what the MEMBER did, not what Support should do with
              // it. "Which legs should come off?" asked the driver to describe
              // an outcome they do not decide. (User direction, 2026-10-14.)
              label: "Which legs did the member decline?",
              shortLabel: "legs to remove",
              required: true,
              options: riderDeclined.legOptions,
              // ⭐ Every leg ticked to start, because production's own template
              // (`CAP-225`) lists several leg ids at once — a member who is not
              // going has usually dropped the return too. ⚠️ But not always: a
              // member whose family drove them to the appointment still needs
              // the ride home, and unticking is the only way to say so.
              showIf: ONLY_RIDER_DECLINED,
            },
            {
              id: "declineChannel",
              type: "select",
              label: "How did the member tell you?",
              shortLabel: "how they told you",
              placeholder: "Select:",
              required: true,
              options: DECLINE_CHANNEL_OPTIONS,
              /**
               * ⛔⛔ **The load-bearing question on this form.** It decides what
               * proof can even exist — a doorstep conversation leaves nothing to
               * screenshot — and it is what tells Support whether they are
               * acting on the member's own words or a facility's. CASE-07's
               * finding, kept verbatim in substance.
               */
              showIf: ONLY_RIDER_DECLINED,
            },
            {
              id: "toldAt",
              type: "time",
              label: "When did they tell you?",
              shortLabel: "time they told you",
              required: true,
              showIf: ONLY_RIDER_DECLINED,
            },
            {
              id: "toldBy",
              type: "text",
              label: "Who told you?",
              shortLabel: "who told you",
              placeholder: "Name, and how they know the member",
              required: true,
              /**
               * ⭐ The Cancel-at-Door precedent, and it is the strongest one
               * this project has. Production does not ask for a photo of a
               * refusal — it requires the driver to NAME who refused, and
               * `bronze.ride_observation.spoke_with` holds 3,601 distinct values
               * across 6,940 Cancel At Door observations. A name is the proof
               * when no artifact can exist, because it is checkable and it is
               * attributable.
               *
               * ⚠️ Gated on the ANSWER, not the issue, and only safe because
               * `declineChannel` is itself gated on this issue and so can hold a
               * value on no other case. A second case asking `declineChannel`
               * would need a compound condition here, not a comment.
               */
              showIf: { field: "declineChannel", equals: SECOND_HAND_CHANNELS },
            },
            {
              id: "declineSaid",
              type: "textarea",
              label: "What did they say?",
              shortLabel: "what they said",
              placeholder:
                "Their words, and whether they still need a ride another day",
              required: true,
              maxLength: 500,
              showIf: ONLY_RIDER_DECLINED,
            },
            /**
             * ⛔⛔ **One proof field per channel, generated from the one table.**
             *
             * A single file field cannot be honest here. "Screenshot of your
             * call log" is the right ask after a call and a nonsense one after a
             * doorstep conversation, and a required file on the three channels
             * that cannot produce one would make exactly the declines that ring
             * Support today unfileable.
             *
             * ⚠️ Generated rather than typed out, so the field set and
             * `DECLINE_CHANNELS` cannot drift — add a channel and its proof
             * field appears with it. Per user direction (2026-10-13) the ask is
             * never blocking: `requiredNotEnforced` keeps the asterisk and the
             * real requirement visible without holding a demo hostage to a
             * screenshot nobody has.
             */
            ...DECLINE_CHANNELS.map((channel) => ({
              id: `declineProof-${channel.value}`,
              type: "file" as const,
              label: channel.proofLabel,
              required: channel.hasArtifact,
              requiredNotEnforced: channel.hasArtifact,
              showIf: { field: "declineChannel", equals: [channel.value] },
            })),
          ] as SupportCaseDefinition["fields"])
        : []),

      // ---- Update Trip Details -------------------------------------------
      //
      // Catalogue row 22 — `Trip / Ride Modification`, 364 calls. The member's
      // appointment moved, or the address on the manifest is the front entrance
      // when they need the back one. Today that is a phone call, because there
      // is nothing in the app that can even state the request.
      //
      // ⛔⛔ **Generated from the ride's anchors, two fields per anchor.** Every
      // other case in this registry is a fixed block gated by `showIf`; this one
      // cannot be, because how many ends a ride has and what it calls them are
      // properties of the ride. See `tripChange` on the builder's parameters.
      //
      // ⛔⛔ **No `notice` field is used as a section header here**, tempting as
      // it is. `canSubmitCase` treats a visible notice as an outright block — a
      // notice stands in for a field set that does not exist — so one used as a
      // label would make this form permanently unsubmittable, in a way that
      // looks exactly like the diff gate misfiring.
      ...(tripChange
        ? (tripChange.anchors.flatMap((anchor) => [
            {
              id: changeTimeFieldId(anchor.index),
              type: "time",
              // ⛔ The anchor's OWN label, verbatim. "Drop-off time" beside a
              // ride printing "Appointment Time" asks the driver to work out
              // whether those are the same row.
              label: anchor.label,
              shortLabel: `${anchor.label.toLowerCase()}`,
              showIf: ONLY_TRIP_CHANGE,
              /**
               * ⛔ The ride's own time, so the before → after line can say what
               * moved. Read from the SAME `anchor` the form's initial value is
               * built from, so the two cannot drift into disagreeing about
               * what the ride currently says.
               */
              previousValue: toTimeInputValue(anchor.time),
              // A passed anchor is shown with what was recorded and cannot be
              // edited — asking to move a pick-up that already happened is a
              // correction, which is row 03's case, not this one.
              lockWhenPrefilled: anchor.passed,
              lockedBadge: anchor.passed ? PASSED_ANCHOR_BADGE : null,
            },
            {
              id: changeAddressFieldId(anchor.index),
              type: "text",
              /**
               * ⛔⛔ **The anchor is in the LABEL, not in help text beneath it.**
               * It was a help line — and when the help lines came out, that
               * line was the only thing tying a field called "Drop-off address"
               * to a row this ride calls "Appointment Time". A label that needs
               * a sentence under it to say which thing it edits is a label that
               * is not finished.
               *
               * ⚠️ Still names the anchor WITHOUT describing where either sits
               * on screen: the copy lives here and the order lives in the array
               * around it, so "the field above" is a claim it cannot make.
               */
              label: `${anchor.addressLabel} · ${anchor.label}`,
              maxLength: 160,
              showIf: ONLY_TRIP_CHANGE,
              /** ⛔ As above — one `anchor`, read by the field and the prefill. */
              previousValue: anchor.address,
              lockWhenPrefilled: anchor.passed,
              lockedBadge: anchor.passed ? PASSED_ANCHOR_BADGE : null,
            },
          ]) as SupportCaseDefinition["fields"])
        : []),
      ...(tripChange
        ? ([
            {
              id: CHANGE_SOURCE_FIELD,
              type: "select",
              /**
               * ⚠️ **Required, and not in the user's four-field list.**
               *
               * A driver does not invent a new pick-up address — somebody told
               * them. Support's first move on a bare "move this to 11:30" is to
               * find out who said so, and a request that cannot answer that
               * produces the callback this row exists to remove. One tap is the
               * whole cost.
               */
              label: "Who asked for this change?",
              shortLabel: "who asked",
              placeholder: "Select:",
              required: true,
              options: [...CHANGE_SOURCE_OPTIONS],
              showIf: ONLY_TRIP_CHANGE,
            },
            {
              id: CHANGE_NOTES_FIELD,
              type: "textarea",
              label: "Anything else Support should know?",
              shortLabel: "notes",
              placeholder: "Optional — what they told you, or why the details are wrong",
              // ⚠️ Optional, following the user's own call on row 17: ask, never
              // block. The required select already carries the thing Support
              // cannot proceed without.
              maxLength: 300,
              showIf: ONLY_TRIP_CHANGE,
            },
          ] as SupportCaseDefinition["fields"])
        : []),

      // ---- Add Leg to Trip -----------------------------------------------
      //
      // Catalogue row 21 — `Trip / Ride Modification`, 364 calls, and the LAST
      // of the ten form rows. The member needs one more ride on the same trip,
      // most often said at the door seconds after the drop-off swipe.
      //
      // ⛔⛔ "Leg" here is a `Trip` in a `tripGroup`, not an anchor on one
      // trip's timeline — the opposite of row 22's sense of the same word. See
      // `lib/driver-data/trip-groups.ts`, which names both and says why only one
      // of them can carry a new leg's id, revenue and swipes.
      ...(addLeg
        ? ([
            {
              id: ADD_SOURCE_FIELD,
              type: "select",
              /**
               * ⛔ **First, not last** (user direction, 2026-10-14). A driver
               * does not invent a leg — somebody asked for it, and that is the
               * thing Support needs before any of the detail means anything. It
               * sat under the times until now, which made it read as a footnote
               * to a schedule rather than the reason there is a request at all.
               */
              label: "Who asked for this leg?",
              shortLabel: "who asked",
              placeholder: "Select:",
              required: true,
              // ⛔ FOUR options, not row 22's five. A driver can notice a wrong
              // address; nobody notices a leg that does not exist.
              options: [...ADD_SOURCE_OPTIONS],
              showIf: ONLY_ADD_LEG,
            },
            {
              id: SLOT_FIELD,
              type: "leg-order",
              label: "Where does the new leg go?",
              shortLabel: "the new leg's position",
              required: true,
              legOrder: addLeg.legOrder,
              // ⛔ The slot and the pick-up time are two separate answers and
              // can contradict each other — see `slotOrderWarning`.
              warning: addLeg.slotWarning,
              showIf: ONLY_ADD_LEG,
            },
          ] as SupportCaseDefinition["fields"])
        : []),
      /**
       * One block of four questions per leg the request touches.
       *
       * ⛔⛔ **Generated from `addLegBlocks`, never written out twice.** The new
       * leg and a pushed leg are asked the same four things in the same order —
       * where it starts, when, where it ends, when — and two hand-written
       * field sets would be two chances for them to drift. Before 2026-10-14 a
       * pushed leg had exactly ONE field, its new pick-up time, so the driver
       * could say when it now starts but not where.
       *
       * ⚠️ The letters are POST-insertion throughout, from the one rule
       * (`rowLetterWithInsertion`) the slot picker uses. A block labelled for
       * the letter a leg has today, above a picker calling it something else,
       * is the contradiction the slot rows already had once.
       */
      ...(addLeg
        ? (addLeg.blocks.flatMap((block) =>
            /*
              ⛔⛔ **Every field here carries the block's group**, so none of
              them renders in the main scroll — they are reached by tapping the
              leg's own row in the picker, which opens a second view over the
              form. Add Leg reached 4.6 screens with ONE pushed leg, and the
              summary the driver reviews against was scrolled off by the time
              they were filling anything in. (User direction, 2026-10-15.)

              ⚠️ Applied by a `.map` at the end rather than written on each
              field: seven field shapes each repeating `group:` is seven
              chances to leave one ungrouped, and an ungrouped field appears in
              the main scroll with no label saying which leg it belongs to.
            */
            ([
            /**
             * ⛔ The tick box sits BEFORE the address it fills, so the tick
             * explains the value that appears rather than appearing to comment
             * on one the driver typed.
             *
             * ⚠️ Offered only when something runs in front of this leg AND that
             * leg has a drop-off to copy. A box that copies an empty string is
             * a box that silently does nothing.
             */
            ...(block.fields.sameAsPrevious && block.previous
              ? ([
                  {
                    id: block.fields.sameAsPrevious,
                    type: "checkbox",
                    label: `Start where Leg ${block.previous.letter} finishes`,
                    shortLabel: `leg ${block.letter} starts at leg ${block.previous.letter}'s drop-off`,
                    showIf: ONLY_ADD_LEG,
                  },
                ] as SupportCaseDefinition["fields"])
              : []),
            {
              id: block.fields.pickupAddress,
              type: "text",
              label: `Leg ${block.letter} pick-up address`,
              shortLabel: `leg ${block.letter}'s pick-up address`,
              required: true,
              maxLength: 160,
              showIf: ONLY_ADD_LEG,
              // ⛔ Absent on the NEW leg, which has no before — see `was`.
              previousValue: block.was?.pickupAddress,
            },
            {
              id: block.fields.pickupTime,
              type: "time",
              label: `Leg ${block.letter} pick-up time`,
              shortLabel: `leg ${block.letter}'s pick-up time`,
              required: true,
              /**
               * ⚠️ A `warning`, not help text. It is not describing the
               * question — it is saying that a leg already on the manifest has
               * stopped fitting, which is the reason this block exists at all.
               */
              warning:
                block.kind === "existing"
                  ? `Leg ${block.letter} is scheduled for ${block.shiftedFrom}, which no longer fits. Change this if the member can manage something else.`
                  : undefined,
              /**
               * ⛔⛔ The time this leg holds TODAY, not the value the form
               * opened with. The field opens on the leg's NEW time, so
               * inferring "before" from the initial value would print
               * `3:50 PM → 3:50 PM` on exactly the leg the driver most needs
               * to check. The `warning` above says the same thing in a
               * sentence; this says it as a line the eye can scan.
               */
              previousValue: block.was?.pickupTime,
              showIf: ONLY_ADD_LEG,
            },
            ...(block.fields.dropoffIsHome
              ? ([
                  {
                    id: block.fields.dropoffIsHome,
                    type: "checkbox",
                    /**
                     * ⛔ Only ever on the group's LAST leg, and it copies the
                     * trip's ORIGINAL first pick-up — not the first pick-up
                     * after the insertion. A new leg placed at the front does
                     * not relocate the member's home.
                     */
                    label: "Finish back at the rider's home address",
                    shortLabel: `leg ${block.letter} finishes at home`,
                    showIf: ONLY_ADD_LEG,
                  },
                ] as SupportCaseDefinition["fields"])
              : []),
            {
              id: block.fields.dropoffAddress,
              type: "text",
              label: `Leg ${block.letter} drop-off address`,
              shortLabel: `leg ${block.letter}'s drop-off address`,
              required: true,
              maxLength: 160,
              showIf: ONLY_ADD_LEG,
              previousValue: block.was?.dropoffAddress,
            },
            {
              id: block.fields.dropoffTime,
              type: "time",
              label: `Leg ${block.letter} drop-off time`,
              shortLabel: `leg ${block.letter}'s drop-off time`,
              /**
               * ⚠️ **Computed and shown, not asked.** The driver types the
               * pick-up; this follows from it and stays EDITABLE, because an
               * estimate the driver knows is wrong is worse than no estimate.
               * ⛔ Not `required`: a figure the app supplied cannot be
               * something the driver failed to provide.
               */
              showIf: ONLY_ADD_LEG,
            },
          ] as SupportCaseDefinition["fields"]).map((field) => ({
              ...field,
              group: { id: addLegBlockGroup(block), label: `Leg ${block.letter}` },
            }))) as SupportCaseDefinition["fields"])
        : []),
      /**
       * ⭐ The one place a `notice` is the RIGHT answer rather than a trap.
       *
       * ⛔⛔ Row 22 learned that a visible notice blocks Submit outright, and
       * treated that as a hazard. Here it is exactly the behaviour wanted: the
       * values map holds no date beside a time, so a schedule running past
       * midnight is one the app genuinely cannot work out. Refusing and saying
       * to call Support is honest; printing a time on the wrong day is not.
       *
       * ⚠️ Rendered only when the cascade actually crosses midnight, so the
       * form is submittable in every case the app CAN compute.
       */
      ...(addLeg && addLeg.overnight
        ? ([
            {
              id: "addLegOvernight",
              type: "notice",
              label: "These times cross midnight",
              helpText: OVERNIGHT_WARNING,
              showIf: ONLY_ADD_LEG,
            },
          ] as SupportCaseDefinition["fields"])
        : []),
      ...(addLeg
        ? ([
            /**
             * ⛔ `Timing` is GONE (user direction, 2026-10-14: *"not sure what
             * the Timing is for, you can remove that"*). It was a locked line
             * restating the trip's date and whether a leg was under way — both
             * of which the context block above now prints. The rule that
             * computed it went with it; a rule nothing reads is a rule that
             * cannot be wrong and cannot be right.
             */
            {
              id: ADD_NOTES_FIELD,
              type: "textarea",
              label: "Anything else Support should know?",
              shortLabel: "notes",
              placeholder:
                "Optional — where they need to go, or anything about the timing",
              maxLength: 300,
              showIf: ONLY_ADD_LEG,
            },
          ] as SupportCaseDefinition["fields"])
        : []),

      // ---- Ask to Be Their Regular Driver --------------------------------
      //
      // Catalogue row 09 — `Trip / Ride Assignment`, 610 calls. The member asks
      // the driver to be their regular; the driver phones Support; Support asks
      // the client; the client is slow; the driver phones again. This form is
      // the first of those calls, written down.
      //
      // ⛔⛔ **It is deliberately THIN.** `Project - Standing Order Offers` is a
      // live three-phase project building the real thing — driver-owned
      // recurring work, with a Standing Orders nav section, SO ids per
      // client-market, Planner blocks and a Dispatch tab. This is not a small
      // version of that and must not grow into one. It is the support request
      // that absorbs the calls *until* that exists, and when it exists this
      // row's volume belongs to it.
      //
      // ⛔ So: no ride rows, no stepper, no dates. The earlier CASE-03 spec
      // collected SPECIFIC rides a member had mentioned, which is a different
      // request — that one names trips, this one names a standing preference.
      // Asking for ride ids here would invite a driver to file trip details
      // against a case nobody will match them to.
      ...(autoAssign
        ? ([
            {
              id: "member",
              type: "member-picker",
              label: "Which member?",
              required: true,
              prefillFrom: "riderName",
              /**
               * ⛔ Locked, and taken from the ride the tile was tapped on. The
               * picker's search path exists and is not reached from here — the
               * entry point already knows who, so opening it would ask the
               * driver to re-identify the member they are sitting with.
               *
               * ⚠️ What the locked state RENDERS is the point: the member's
               * client and how many rides the driver has done with them in the
               * last 30 days, read from `member-options`. That count is the only
               * evidence in the request Support can check, and "I already drive
               * them most weeks" below is the claim it corroborates.
               */
              lockWhenPrefilled: true,
              lockedBadge: null,
              showIf: ONLY_AUTO_ASSIGN,
            },
            {
              id: "assignmentScope",
              type: "select",
              label: "Which of their trips?",
              shortLabel: "what you are asking for",
              placeholder: "Select:",
              required: true,
              options: [...ASSIGNMENT_SCOPES],
              /**
               * ⛔⛔ **The question Support can act on.** Two earlier versions
               * asked about the request's provenance — why the driver wanted
               * it, then who had asked — and neither told anyone what to set
               * up. These three answers are three different pieces of work.
               */
              /**
               * ⚠️ The quoted option is quoted EXACTLY as the select spells it.
               * The first draft said \u201cjust a specific trip\u201d while the option
               * read \u201cOnly a specific trip\u201d — help text pointing at a choice
               * that is not on the list, which is worse than no help at all.
               * A check asserts every quoted phrase matches a real option.
               */
              showIf: ONLY_AUTO_ASSIGN,
            },
            {
              id: "standingOrderSchedule",
              type: "text",
              label: "What\u2019s the schedule?",
              shortLabel: "the schedule",
              placeholder: "e.g. every Tue and Thu, 9:40 AM pickup",
              required: true,
              /**
               * ⚠️ Gated on the ANSWER, like `reachOutcomeOther` and
               * `spokeWithRelation`, and safe for the same reason:
               * `assignmentScope` is itself gated on this issue, so it can hold
               * a value on no other case. A second case asking
               * `assignmentScope` would need a compound condition here rather
               * than this comment.
               */
              showIf: {
                field: "assignmentScope",
                equals: [ASSIGNMENT_SCOPE_STANDING],
              },
            },
            {
              id: "specificTripWhen",
              type: "datetime",
              label: "When is that trip?",
              shortLabel: "when the trip is",
              required: true,
              /**
               * ⛔ A `datetime`, not free text like the standing-order pattern
               * above. A specific trip has one pick-up moment and Support has
               * to find it in a list; a recurring order has a shape no date
               * picker can express. Two different questions, two field types,
               * and neither one doing the other's job badly.
               */
              showIf: {
                field: "assignmentScope",
                equals: [ASSIGNMENT_SCOPE_SPECIFIC],
              },
            },
            {
              id: "assignmentNotes",
              type: "textarea",
              label: "Anything else Support should know? (optional)",
              placeholder:
                "e.g. dialysis Tue/Thu mornings, or they asked again this week",
              maxLength: 500,
              showIf: ONLY_AUTO_ASSIGN,
            },
          ] as SupportCaseDefinition["fields"])
        : []),

      // ---- Why you sent this trip back ----------------------------------
      //
      // Catalogue row 14 — `Send-back`, 609 calls. A step inside the send-back
      // flow rather than a case the driver picks: tapping Send Back Trip is
      // already the driver saying what they want to do.
      //
      // ⛔⛔ **Scoped down by the user on 2026-10-12 and the scoping is the
      // design.** The catalogue says "...that can bypass the Standing Order
      // block"; the SO block is the user's to handle. Row 15 would weight the
      // penalty by reason; the scoring policy is skipped. What is left is the
      // part that applies to every send-back: say why.
      //
      // ⛔ So this changes NOTHING about whether the send-back is allowed or
      // what it costs. It records an answer nobody collects today.
      ...(sendBack
        ? ([
            {
              id: "returnReason",
              type: "select",
              /**
               * ⛔⛔ `returnReason`, NOT `sendBackReason`.
               * `sendback_calculation_reason` is the warehouse's PENALTY RULE
               * and is what the Balance Dashboard already prints as "the
               * send-back reason". Two different things, and someone will try
               * to join them.
               */
              label: "Why can't you take this trip?",
              shortLabel: "your reason",
              placeholder: "Select:",
              required: true,
              // Production's own CS Tool `DRIVER INITIATED` strings, narrowed
              // to the ones a driver can truthfully answer. See the long note
              // in `send-back-reasons.ts`.
              options: sendBackReasonOptions(),
              showIf: ONLY_SEND_BACK,
            },
            {
              id: "returnReasonOther",
              type: "text",
              label: "Tell us what happened",
              placeholder: "In a few words",
              required: true,
              /**
               * ⚠️ Gated on the ANSWER, like every other escape hatch in this
               * file, and safe for the same reason: `returnReason` is itself
               * gated on this issue so it can hold a value on no other case.
               */
              showIf: {
                field: "returnReason",
                equals: [SEND_BACK_REASON_OTHER],
              },
            },
            {
              id: "returnNotes",
              type: "textarea",
              label: "Anything else Support should know? (optional)",
              placeholder:
                "e.g. I can be back in the area after 2pm if it helps",
              maxLength: 500,
              showIf: ONLY_SEND_BACK,
            },
          ] as SupportCaseDefinition["fields"])
        : []),

      // ---- Over capacity: why you can still take it ---------------------
      //
      // Catalogue row 13 — `Trip / Ride Assignment`, 610 calls, shared with
      // rows 11 and 12. The user's answer, 2026-10-15: *"instead of swipe and
      // then it will call make it a submit form where it will show the trips
      // that are blocking them from taking it and then them to give a reason
      // why they can take another"*.
      //
      // ⛔⛔ **Submitting accepts NOTHING.** The trip stays in Requests and
      // stays unacceptable until Support releases it. What this removes is the
      // phone call `CAP-340` hands the driver instead of an accept control —
      // not the block itself.
      //
      // ⭐ The panel comes FIRST, before the question. The driver is being
      // asked to argue against a refusal, and production never told them what
      // the refusal was made of — only the words "Over Capacity" and a
      // reference number. Asking the question above the evidence would repeat
      // that.
      ...(overCapacity
        ? ([
            {
              id: "seatBlocks",
              type: "seat-blocks",
              label: OVER_CAPACITY_SEATS_TITLE,
              helpText: OVER_CAPACITY_SEATS_HELP,
              seatBlocks: overCapacity.seatBlocks,
              // ⛔ Never `required`. It collects nothing; a required field with
              // no value can never be satisfied and would disable Submit for
              // the life of the form.
              showIf: ONLY_OVER_CAPACITY,
            },
            {
              id: "exceptionReason",
              type: "select",
              label: OVER_CAPACITY_REASON_LABEL,
              shortLabel: "your reason",
              placeholder: "Select:",
              required: true,
              options: [...OVER_CAPACITY_REASONS],
              showIf: ONLY_OVER_CAPACITY,
            },
            {
              /**
               * ⭐⭐ **This single field IS catalogue row 11.** Row 11 proposes
               * a one-off cleanse of stored vehicle capacity; a driver who has
               * just said their vehicle has more seats than the record shows is
               * reporting precisely that record, and this is the value to clean
               * it to. The driver never has to know they filed a data
               * correction.
               *
               * ⛔ Gated on the ANSWER, like every other escape hatch here, and
               * safe for the same reason: `exceptionReason` is itself gated on
               * this issue, so it can hold a value on no other case.
               */
              id: "actualSeats",
              type: "stepper",
              label: "How many seats does it actually have?",
              shortLabel: "your vehicle's real seat count",
              required: true,
              min: 1,
              max: 15,
              // ⚠️ Opens on the record's own number rather than blank, so the
              // driver corrects a value instead of inventing one — and so the
              // before → after line under it has a BEFORE to show.
              defaultValue: String(overCapacity.seatBlocks.seatsOnRecord),
              previousValue: String(overCapacity.seatBlocks.seatsOnRecord),
              showIf: {
                field: "exceptionReason",
                equals: [OC_REASON_MORE_SEATS],
              },
            },
            {
              id: "exceptionReasonOther",
              type: "text",
              label: "Tell us what makes it fit",
              placeholder: "In a few words",
              required: true,
              showIf: {
                field: "exceptionReason",
                equals: [OC_REASON_OTHER],
              },
            },
            {
              id: "exceptionNotes",
              type: "textarea",
              label: "Anything else Support should know? (optional)",
              placeholder:
                "e.g. two of them are in the same wheelchair space and one is an escort",
              maxLength: 500,
              showIf: ONLY_OVER_CAPACITY,
            },
          ] as SupportCaseDefinition["fields"])
        : []),

      /**
       * ⭐⭐ **One driver signature, LAST, on every form.**
       *
       * It used to be three bespoke fields on three cases — `signature` on the
       * no-show, `driverSignature` on the missed swipe, `declineAttestation` on
       * the decline — each with its own label and its own `showIf`. Six other
       * cases asked for nothing. A driver filing a trip change or a send-back
       * attested to none of it. (User direction, 2026-10-14.)
       *
       * ⛔ **LAST, always.** The driver attests to the answers above, so a
       * field after it would be signed for before it was written.
       *
       * ⛔ No `showIf`: it applies to every issue, which is the whole change.
       * A gate here is how six cases went without one.
       */
      ...(signatureTakenElsewhere
        ? []
        : ([
            {
              id: "signature",
              type: "signature",
              label: DRIVER_SIGNATURE_LABEL,
              required: true,
            },
          ] as SupportCaseDefinition["fields"])),
    ],
  };
}
