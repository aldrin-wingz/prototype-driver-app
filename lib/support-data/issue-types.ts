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
 * Supplied by the user 2026-07-31 as the real list. The two Trip Confirmation
 * entries are registered but hidden: they belong to the "I reached out to confirm"
 * flow already built in `reach-out-sheet.tsx`, and how a form fits into that flow
 * has not been explained yet. Registering them now means the flow can be attached
 * later without renumbering anything.
 */
export const SUPPORT_ISSUE_TYPES: SupportIssueType[] = [
  {
    value: ISSUE_GENERAL,
    label: "General",
    visibility: "always",
    buildState: "in-prototype",
  },
  {
    value: ISSUE_PAYMENT,
    label: "Payment Related",
    visibility: "always",
    buildState: "in-prototype",
  },
  {
    value: ISSUE_TRIP_REQUEST,
    label: "Trip Request",
    visibility: "always",
    buildState: "not-yet",
    note: "Field set not specified yet.",
  },
  {
    value: ISSUE_MISSED_SWIPE,
    label: "Missed Swipe",
    visibility: "in-progress-only",
    buildState: "in-prototype",
    note: "Applies anywhere from en-route to drop-off; whatever the app recorded arrives prefilled.",
  },
  {
    value: ISSUE_RIDER_NO_SHOW,
    label: "Rider No-Show",
    visibility: "in-progress-only",
    buildState: "not-yet",
    note: "Field set not specified yet. Note the app already has a Member No-Show action in More Options — the two need reconciling.",
  },
  {
    value: ISSUE_CONFIRM_CANT_REACH,
    label: "Trip Confirmation — Can't Reach Member",
    visibility: "hidden",
    buildState: "not-yet",
    note: "Entered from the reach-out-to-confirm flow, not the dropdown. Behaviour still to be explained.",
  },
  {
    value: ISSUE_CONFIRM_DECLINED,
    label: "Trip Confirmation — Rider Declined",
    visibility: "hidden",
    buildState: "not-yet",
    note: "Entered from the Rider-declined popup, not the dropdown. Behaviour still to be explained.",
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
 */
export function getIssueOptions(): SupportFieldOption[] {
  const liveTrip = hasInProgressLegs();

  return SUPPORT_ISSUE_TYPES.filter((issue) => {
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
