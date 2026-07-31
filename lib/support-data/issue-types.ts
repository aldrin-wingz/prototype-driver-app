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
 * Every v1 issue is `hidden`. The other two are kept because they are the two
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

export const ISSUE_MISSED_SWIPE = "missed-swipe";

/**
 * The support issues a driver can file.
 *
 * v1 covers one. Still a list, and still carrying visibility and build state,
 * because the point of this file is that a case is an entry in it: the second one
 * is a new object here plus a field block gated on it, and nothing else changes.
 *
 * The Support Case Catalog holds the specs for the six cases that came before this
 * branch. They are not in the code until each has been agreed with the support
 * lead — a case in the prototype reads as a case that was decided.
 */
export const SUPPORT_ISSUE_TYPES: SupportIssueType[] = [
  {
    value: ISSUE_MISSED_SWIPE,
    label: "Missed Swipe",
    description:
      "For a trip you drove but couldn't swipe at the time. Anything the app already recorded is filled in — just add the times that are missing.",
    // Hidden rather than in-progress-only: the driver reaches this from the Missed
    // Swipe tile on a ride, which already knows the trip and the issue. There is
    // no dropdown left to be visible in.
    visibility: "hidden",
    buildState: "in-prototype",
    note: "Entered from the Missed Swipe tile in More Options. Applies anywhere from en-route to drop-off; whatever the app recorded arrives prefilled.",
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
