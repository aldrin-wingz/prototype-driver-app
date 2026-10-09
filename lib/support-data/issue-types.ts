import { hasInProgressLegs } from "./leg-options";
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
