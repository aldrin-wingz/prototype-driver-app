import { hasInProgressLegs } from "./leg-options";
import { TRIP_CHANGE_LABEL } from "@/lib/driver-data/trip-change-request";
import { ADD_LEG_LABEL } from "@/lib/driver-data/add-leg-request";
import type {
  SupportBuildState,
  SupportFieldOption,
} from "@/types/support";

/**
 * Whether an issue can be picked from a dropdown, and when.
 *
 * Visibility is a property of the issue rather than something the form hardcodes,
 * because the same three rules recur: some issues are always available, some only
 * apply to a trip that is under way, and some are never chosen at all — they are
 * entered from somewhere that already knows what happened.
 *
 * Every issue on this branch is `hidden`. The other two are kept because they are the two
 * answers a new case is likely to need, and deciding them per case is the point.
 */
export type IssueVisibility =
  | "always"
  /** Only offered while the driver has a live trip. */
  | "in-progress-only"
  /** Never in the dropdown — reached from a flow, not chosen by the driver. */
  | "hidden";

export interface SupportIssueType {
  value: string;
  label: string;
  /**
   * One line at the top of the form saying what it is for.
   *
   * The issue dropdown swaps an entire field set beneath it, so without this the
   * driver has to infer the purpose from the field labels — and picks the wrong
   * issue when two of them sound close.
   */
  description: string;
  visibility: IssueVisibility;
  buildState: SupportBuildState;
  /** Why it isn't freely selectable, or what still has to be decided. */
  note?: string;
}

/** The label suffix for an issue whose field set isn't built. */
const NOT_YET_SUFFIX = " — ⚠️ not in prototype yet";

export const ISSUE_RIDER_NO_SHOW = "rider-no-show";
export const ISSUE_CANCEL_AT_DOOR = "cancel-at-door";
export const ISSUE_MISSED_SWIPE = "missed-swipe";
export const ISSUE_CANNOT_REACH_MEMBER = "cannot-reach-member";
export const ISSUE_AUTO_ASSIGN_REQUEST = "auto-assign-request";
export const ISSUE_SEND_BACK_REASON = "send-back-reason";
export const ISSUE_RIDER_DECLINED = "rider-declined";
export const ISSUE_TRIP_CHANGE_REQUEST = "trip-change-request";
export const ISSUE_ADD_LEG_REQUEST = "add-leg-request";

/**
 * The support issues a driver can file.
 *
 * This branch covers one: **Rider No-Show**. Still a list, and still carrying
 * visibility and build state, because the point of this file is that a case is an
 * entry in it — the next one is a new object here plus a field block gated on it,
 * and nothing else changes.
 *
 * The Support Case Catalog holds the specs for the other cases. They are not in
 * the code until each has been agreed with the support lead — a case in the
 * prototype reads as a case that was decided.
 */
export const SUPPORT_ISSUE_TYPES: SupportIssueType[] = [
  {
    value: ISSUE_RIDER_NO_SHOW,
    label: "Rider No-Show",
    description:
      "For a member who never came out. Tell us when you started waiting and when you left, and attach anything showing you tried to reach them.",
    // Hidden rather than in-progress-only: the driver reaches this from the
    // Member No-Show tile, which already knows the trip and the issue. There is
    // no dropdown left to be visible in.
    visibility: "hidden",
    buildState: "in-prototype",
    note: "Entered from the Member No-Show tile in More Options — that tile IS this case. Only offered on a leg that is en-route, and only asks anything when the app cannot confirm the wait itself.",
  },
  {
    value: ISSUE_CANCEL_AT_DOOR,
    label: "Cancel at Door",
    description:
      "For a member who came to the door and refused the ride. Tell us who turned you away, so Support can see the wait was over before it started.",
    // Same reasoning as Rider No-Show: reached from the Member No-Show screen
    // with the type already chosen, so there is no dropdown to be visible in.
    visibility: "hidden",
    buildState: "in-prototype",
    note: "Opens automatically after Submit on the Member No-Show screen when the type is Cancel At Door and the ten-minute wait has not been served. It is the evidence the waiver rests on, so it exists only on the paths that use the waiver.",
  },
  {
    value: ISSUE_MISSED_SWIPE,
    label: "Missed Swipe",
    description:
      "For a leg you drove but could not mark. Tell us when each end happened — anything your location history can confirm is filled in already.",
    // Hidden like the other two: reached from the ride whose swipe is missing,
    // which already knows the leg and which mark is absent. A driver choosing
    // "Missed Swipe" from a dropdown would then have to tell the form the one
    // thing the entry point already knew.
    visibility: "hidden",
    buildState: "in-prototype",
    note: "Entered from the Missed Swipe tile in More Options, on a leg with an unrecorded mark. A missed PICK-UP asks whether the member is still in the car before it asks anything else — if they are, no form opens at all until the drop-off is swiped.",
  },
  {
    value: ISSUE_CANNOT_REACH_MEMBER,
    label: "Can't Reach Member",
    description:
      "For a member you have not been able to get hold of. Tell us which number you tried and what happened, and we will take it from there.",
    // Hidden like the rest: both entry points — the confirmation modal and the
    // More Options tile — open this form with the issue already chosen, so
    // there is no dropdown left to be visible in.
    visibility: "hidden",
    buildState: "in-prototype",
    note: "Two entry points, one form. Offered as a fourth option in the Reach Rider modal (both the standard and the same-day variant) and as a tile in More Options. ⛔ Filing changes nothing about the trip — it stays unconfirmed, exactly as 'No, try again later' leaves it today.",
  },
  {
    value: ISSUE_AUTO_ASSIGN_REQUEST,
    label: "Member Requested Me as Preferred Driver",
    // ⚠️ No ⛔ in here. That marker is the repo's note-to-ourselves notation and
    // `description` is the one field on this type a DRIVER reads — the form
    // prints it under the title. Say the limit in words instead.
    description:
      "For a member who has asked you to be their driver. Tell us whether that is all their trips, a standing order or one specific one, and Support will take it to the client. Sending this does not assign, hold or claim anything — it asks.",
    // Hidden like the rest: the tile is on a ride, so the member is already
    // known by the time the form opens. A dropdown would make the driver name
    // a member the entry point was standing on.
    visibility: "hidden",
    buildState: "in-prototype",
    note: "Entered from the 'Member requested me as preferred driver' tile in More Options, or from the prompt after the drop-off signature, with the member taken from that ride and locked. ⚠️ Deliberately THIN: `Project - Standing Order Offers` is the long-term home for driver-owned recurring work. This is the support request that absorbs the calls until that exists.",
  },
  {
    value: ISSUE_SEND_BACK_REASON,
    /**
     * ⛔ Present tense, deliberately. "Why You Sent This Trip Back" titled the
     * sheet in the PAST at the exact moment the rest of the design is careful
     * to say nothing has happened yet — the button says "Continue", not
     * "Submit", and the penalty warning after it still asks "are you sure".
     * A title claiming the trip was already sent contradicts both. Found by
     * walking; no gate can see a tense.
     */
    label: "Sending This Trip Back",
    description:
      "Tell us why you cannot take this trip. Support uses this to decide what happens to it next, and nobody has to ring you to ask.",
    // Hidden like the rest: reached by tapping Send Back Trip, which already
    // knows the trip and the issue.
    visibility: "hidden",
    buildState: "in-prototype",
    note: "A step inside the SEND BACK flow, not a support case the driver chooses. Reasons are production's own CS Tool `DRIVER INITIATED` list, narrowed to the ones a driver can truthfully answer. ⛔ Does NOT bypass any block and does not change the penalty — the Standing Order block and the scoring policy are both out of scope by user direction.",
  },
  {
    value: ISSUE_RIDER_DECLINED,
    label: "Rider Declined the Trip",
    // ⚠️ No ⛔ markers in here — a driver reads this line under the form title.
    // It says what the report is and, just as importantly, what it is not: the
    // client cancels, we report. Production's own popup makes the same point.
    description:
      "For a member who has told you they no longer need the ride. Tell us how they told you and attach what you have — Support takes it to the client, who removes it from your manifest.",
    // Hidden like the rest: reached by choosing "Rider declined the trip" on the
    // confirmation modal, which already knows the trip and the issue.
    visibility: "hidden",
    buildState: "in-prototype",
    note: "Entered from option 2 of the Reach Rider modal, through the declined sheet production already shows. ⛔ Filing does NOT cancel anything — the client owns the cancellation; the ride stays on the manifest marked 'Cancellation requested'. What it DOES change is the record: a member cancellation rather than a driver send-back, which is what the $25 send-back penalty makes worth a phone call today.",
  },
  {
    value: ISSUE_TRIP_CHANGE_REQUEST,
    label: TRIP_CHANGE_LABEL,
    // ⚠️ The description's job here is to say what the driver is NOT doing.
    // The form opens with every current value filled in and lets them type over
    // it, which looks exactly like editing the ride — and it is not. Nothing
    // moves until the client moves it.
    description:
      "For a ride whose pick-up or drop-off time or address needs to change. Edit what is wrong and tell us who asked — Support takes it to the client, who updates your manifest.",
    // Hidden like the rest: both entry points name the issue when they open the
    // form, so there is no dropdown left to be visible in.
    visibility: "hidden",
    buildState: "in-prototype",
    note: "Entered from the Update Trip Details tile in More Options, or the pencil on a ride's own anchor rows. ⛔ Submitting changes NOTHING on the ride — the client owns the manifest. The ride keeps its old times and addresses and gains a 'Change requested' banner saying what was asked for.",
  },
  {
    value: ISSUE_ADD_LEG_REQUEST,
    label: ADD_LEG_LABEL,
    // ⚠️ Says what the driver is asking for AND where it sits, because the
    // position is the half of this form nobody expects to have to give.
    description:
      "For a member who needs another ride on this same trip. Tell us where the new leg goes in the order and when it starts — we will work out the rest of the timings for you to check.",
    // Hidden: all three entry points name the issue when they open the form.
    visibility: "hidden",
    buildState: "in-prototype",
    note: "Entered from the Add Leg to Trip tile in More Options, or — for a leg that is already finished — the one dedicated button on the completed ride. ⛔ Submitting adds NOTHING to the manifest; the client owns it. The group gains a 'Leg requested' banner naming the position asked for and which existing legs would shift.",
  },
];

export function getIssueType(value: string): SupportIssueType | undefined {
  return SUPPORT_ISSUE_TYPES.find((issue) => issue.value === value);
}

/**
 * The issue field's options for right now.
 *
 * Computed rather than constant because availability moves: an in-progress-only
 * issue drops out when the driver has no live trip.
 *
 * `extraIssues` force-includes issues that are normally hidden — which in v1 is
 * every issue. Whatever opens the form with its issue already chosen has to pass
 * that issue here, or the field holds a value with no matching option and renders
 * the placeholder instead of the label. Callers pass only what they just chose.
 */
export function getIssueOptions(extraIssues: string[] = []): SupportFieldOption[] {
  const liveTrip = hasInProgressLegs();

  return SUPPORT_ISSUE_TYPES.filter((issue) => {
    if (extraIssues.includes(issue.value)) return true;
    if (issue.visibility === "hidden") return false;
    if (issue.visibility === "in-progress-only") return liveTrip;
    return true;
  }).map((issue) => ({
    value: issue.value,
    label:
      issue.buildState === "not-yet"
        ? `${issue.label}${NOT_YET_SUFFIX}`
        : issue.label,
  }));
}

/** The plain label, for records and lists that shouldn't carry the flag suffix. */
export function getIssueLabel(value: string): string {
  return getIssueType(value)?.label ?? value;
}

export function getIssueDescription(value: string): string | undefined {
  return getIssueType(value)?.description;
}
