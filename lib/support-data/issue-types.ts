import { hasInProgressLegs } from "./leg-options";
import type {
  SupportBuildState,
  SupportFieldOption,
} from "@/types/support";

/**
 * Whether an issue can be picked from the dropdown, and when.
 *
 * Visibility is a property of the issue rather than something the form hardcodes,
 * because the same three rules recur: some issues are always available, some only
 * apply to a trip that is under way, and some are never chosen at all — they are
 * entered by a flow that already knows what happened.
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

export const ISSUE_GENERAL = "general";
export const ISSUE_PAYMENT = "payment";
export const ISSUE_TRIP_REQUEST = "trip-request";
export const ISSUE_MISSED_SWIPE = "missed-swipe";
export const ISSUE_RIDER_NO_SHOW = "rider-no-show";
export const ISSUE_CONFIRM_CANT_REACH = "confirm-cant-reach";
export const ISSUE_CONFIRM_DECLINED = "confirm-declined";

/**
 * The support issues a driver can file, in dropdown order.
 *
 * Supplied by the user 2026-07-31 as the real list. Three entries are hidden
 * rather than absent: they are reached from a flow that decides which of them
 * applies, so offering them in the dropdown would let a driver skip the decision
 * that is the point of the flow.
 */
export const SUPPORT_ISSUE_TYPES: SupportIssueType[] = [
  {
    value: ISSUE_GENERAL,
    label: "General",
    description:
      "Anything that doesn't fit the other options. Tell us what's happening and Support will pick it up.",
    visibility: "always",
    buildState: "in-prototype",
  },
  {
    value: ISSUE_PAYMENT,
    label: "Payment Related",
    description:
      "Questions about your pay — when a payout lands, an amount that looks wrong, or a trip you weren't paid for.",
    visibility: "always",
    buildState: "in-prototype",
  },
  {
    value: ISSUE_TRIP_REQUEST,
    label: "Trip Request",
    description:
      "For upcoming trips a member has told you about that aren't in the app yet. Send what you know and Support will assign them to you once they come in.",
    visibility: "always",
    buildState: "in-prototype",
  },
  {
    value: ISSUE_MISSED_SWIPE,
    label: "Missed Swipe",
    description:
      "For a trip you drove but couldn't swipe at the time. Anything the app already recorded is filled in — just add the times that are missing.",
    visibility: "in-progress-only",
    buildState: "in-prototype",
    note: "Applies anywhere from en-route to drop-off; whatever the app recorded arrives prefilled.",
  },
  {
    value: ISSUE_RIDER_NO_SHOW,
    label: "Rider No-Show",
    description:
      "The app couldn't confirm your wait at the pick-up, so we need the details from you.",
    // Hidden on purpose. The Member No-Show action decides whether a form is
    // needed at all — most no-shows submit with no form — so letting a driver
    // reach this from the dropdown would skip the check that is the whole point.
    visibility: "hidden",
    buildState: "in-prototype",
    note: "Entered from the Member No-Show action in More Options, not the dropdown. That action IS this case's entry point — there is no separate Member No-Show case.",
  },
  {
    value: ISSUE_CONFIRM_CANT_REACH,
    label: "Trip Confirmation — Can't Reach Member",
    description:
      "Tell Support what number you tried and what happened, so they can reach the member or fix the number.",
    visibility: "hidden",
    buildState: "in-prototype",
    note: "Entered from \"Number can not be reached\" in the reach-out-to-confirm flow, not the dropdown. The only case whose ask is help REACHING a member rather than help removing a ride.",
  },
  {
    value: ISSUE_CONFIRM_DECLINED,
    label: "Trip Confirmation — Rider Declined",
    description:
      "Tell Support how the member declined, so they can take this ride off your manifest.",
    visibility: "hidden",
    buildState: "in-prototype",
    note: "Entered from the Rider-declined popup, not the dropdown. The form sits between the popup and the chat template, so the claim arrives evidenced.",
  },
];

export function getIssueType(value: string): SupportIssueType | undefined {
  return SUPPORT_ISSUE_TYPES.find((issue) => issue.value === value);
}

/** Issues whose questions aren't specified yet — the form shows a notice instead. */
export const NOT_YET_ISSUE_VALUES = SUPPORT_ISSUE_TYPES.filter(
  (issue) => issue.buildState === "not-yet"
).map((issue) => issue.value);

/**
 * The dropdown's options for right now.
 *
 * Computed rather than constant because availability moves: the in-progress-only
 * issues drop out when the driver has no live trip, which is what makes the
 * trip-independent Forms menu entry point safe to offer.
 *
 * `extraIssues` force-includes issues that are normally hidden. A flow that opens
 * the form with its issue already chosen needs that issue present as an option —
 * a selected value with no matching option renders as the placeholder, so the
 * form would claim no issue was picked. Callers pass only what they just selected.
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
