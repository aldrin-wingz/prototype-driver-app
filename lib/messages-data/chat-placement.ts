/**
 * The In-App Chat options study.
 *
 * The driver app is getting a chat for NON-support use cases — Compliance,
 * Same-Day Offers, Standing Orders — while the existing Zendesk chat stays as
 * Support Chat. This registry is the whole experiment.
 *
 * ⭐ ONE AXIS, not two. Each option is a complete proposal that encodes its own
 * answer to "how do the two coexist", which is how the decision actually gets
 * made — you compare whole proposals, not a matrix of independent knobs.
 *
 * ⭐ THE COVERAGE RULE (user, 2026-09-11): chat appears **only where the Zendesk
 * support box appears**. The production captures fix that at Home (`c-01a`),
 * Requests (`c-01b`) and My Rides (`c-01c`) — never Planner (`c-01d`, a
 * date-picker header with no icons), never Options (`c-01e`, no header icons at
 * all), never a stack-pushed screen (`c-01f`, the back chevron owns the left
 * slot). That rule is what removed the nav-tab and Options-row options.
 *
 * ⚠️ Every option is ADDITIVE and defaults to `off`, where the app renders
 * exactly as production does: the Zendesk bubble alone.
 */

export type ChatPlacement = "off" | "beside" | "roles" | "merged";

export const CHAT_PLACEMENTS: ChatPlacement[] = ["off", "beside", "roles", "merged"];

export interface PlacementMeta {
  /** Short label for the study strip. */
  label: string;
  blurb: string;
  /** The cost this option carries — what the screenshot should show. */
  tradeoff: string;
}

export const PLACEMENT_META: Record<ChatPlacement, PlacementMeta> = {
  off: {
    label: "Off",
    blurb:
      "The control. One speech bubble top-left, which is Zendesk Support Chat — exactly what ships today.",
    tradeoff:
      "Nothing to compare against unless you look at it first. Everything below is measured against this.",
  },
  beside: {
    label: "Side by side",
    blurb:
      "The green ?-bubble sits immediately NEXT TO the Zendesk bubble, top-left. Two chats, two icons, both in the corner a driver already looks at.",
    tradeoff:
      "Two speech bubbles 4px apart, differing only by a small ? and a colour. The cheapest to ship and the easiest to confuse — this is the option the study exists to test.",
  },
  roles: {
    label: "Two roles",
    blurb:
      "Same two slots, but neither is 'chat'. Zendesk becomes an explicit Support icon (headset), and the new one becomes Updates — a notification tray for what Wingz is telling you, not a place you go to ask.",
    tradeoff:
      "Solves the confusion by renaming the problem: the driver picks by INTENT (get help / read news) rather than by guessing which bubble. Costs a relearn of an icon drivers already use, and 'Updates' has to earn replies.",
  },
  merged: {
    label: "Merged",
    blurb:
      "One bubble. Tapping it opens a chooser that splits the unread count — 3 from Wingz Support, 4 from Market Ops — and only then opens the channel.",
    tradeoff:
      "No new chrome and no icon confusion, at the price of one extra tap on every visit. The chooser has to carry the split or the merged badge is a number the driver cannot act on.",
  },
};

/**
 * What the in-app channel is called.
 *
 * ⚠️ The user asked for a name ("Market-Ops Chat or whatever else we can call
 * it"). `Market Ops` is the suggestion: every seeded thread — compliance,
 * same-day offers, standing orders — comes from market operations staff about
 * the driver's own work, which is exactly what separates it from Support.
 * Alternatives worth a look: `Wingz Team`, `Dispatch`, `Ops`.
 *
 * Under `roles` it is not a chat at all, so it takes the tray name instead.
 */
export const IN_APP_LABEL = "Market Ops";
export const IN_APP_LABEL_AS_TRAY = "Updates";
export const SUPPORT_LABEL = "Wingz Support";

export function inAppLabel(placement: ChatPlacement): string {
  return placement === "roles" ? IN_APP_LABEL_AS_TRAY : IN_APP_LABEL;
}

/** Every driver-app route the study covers. Dev routes are excluded entirely. */
export type RouteKey =
  | "/"
  | "/requests"
  | "/planner"
  | "/my-rides"
  | "/my-rides/[id]"
  | "/my-rides/[id]/more"
  | "/my-rides/[id]/no-show"
  | "/requests/[id]"
  | "/options"
  | "/ride-history"
  | "/incentives"
  | "/incentives/[id]/rides";

export interface RouteCoverage {
  label: string;
  /** Does the Zendesk bubble — and therefore the study — reach this screen? */
  covered: boolean;
  /** Why not, rendered in the slot by `<ChatSlotNote>` and in the strip. */
  absentReason?: string;
  /** An open question about this route, shown in the study strip. */
  caveat?: string;
}

const NO_BOX = "the Zendesk support box is not shown on this screen";
const BACK_WINS = "back chevron owns the left slot, and no support box here";

export const ROUTE_COVERAGE: Record<RouteKey, RouteCoverage> = {
  "/": { label: "Home", covered: true },
  "/requests": {
    label: "Requests",
    covered: true,
    caveat: "Already carries filter + refresh on the right. The busiest header.",
  },
  "/my-rides": { label: "My Rides", covered: true },

  "/planner": {
    label: "Planner",
    covered: false,
    absentReason: NO_BOX + " — c-01d shows a date-picker bar, not a standard header",
  },
  "/options": {
    label: "Options",
    covered: false,
    absentReason: NO_BOX + " — c-01e has no header icons; support is a Contact Support row",
  },
  "/requests/[id]": { label: "Ride Details (request)", covered: false, absentReason: BACK_WINS },
  "/my-rides/[id]": {
    label: "Ride Details",
    covered: false,
    absentReason: BACK_WINS,
    caveat:
      "⚠️ The rule excludes this — but it is where Ops coordination happens, and the action row already carries a navy chat glyph for rider SMS.",
  },
  "/my-rides/[id]/more": {
    label: "More Options",
    covered: false,
    absentReason: BACK_WINS,
    caveat: 'Holds today\'s other Zendesk doors: "Call Member or Support" and "Email Support".',
  },
  "/my-rides/[id]/no-show": { label: "Member No-Show", covered: false, absentReason: BACK_WINS },
  "/ride-history": { label: "Ride History", covered: false, absentReason: BACK_WINS },
  "/incentives": { label: "Incentives", covered: false, absentReason: BACK_WINS },
  "/incentives/[id]/rides": { label: "Incentive Rides", covered: false, absentReason: BACK_WINS },
};

/** Map a live pathname onto a coverage key. Unknown paths get no affordance. */
export function routeKeyFor(pathname: string): RouteKey | null {
  if (pathname === "/") return "/";
  if (pathname === "/requests") return "/requests";
  if (pathname === "/planner") return "/planner";
  if (pathname === "/my-rides") return "/my-rides";
  if (pathname === "/options") return "/options";
  if (pathname === "/ride-history") return "/ride-history";
  if (pathname === "/incentives") return "/incentives";
  if (pathname.startsWith("/requests/")) return "/requests/[id]";
  if (pathname.endsWith("/no-show")) return "/my-rides/[id]/no-show";
  if (pathname.endsWith("/more")) return "/my-rides/[id]/more";
  if (pathname.startsWith("/incentives/")) return "/incentives/[id]/rides";
  if (pathname.startsWith("/my-rides/")) return "/my-rides/[id]";
  return null;
}

/** Does the in-app chat affordance appear on this screen under this option? */
export function isChatVisible(pathname: string, placement: ChatPlacement): boolean {
  if (placement === "off") return false;
  const key = routeKeyFor(pathname);
  return key ? ROUTE_COVERAGE[key].covered : false;
}

/** Why the affordance is missing here, or undefined if it isn't missing. */
export function absentReasonFor(
  pathname: string,
  placement: ChatPlacement
): string | undefined {
  if (placement === "off") return undefined;
  const key = routeKeyFor(pathname);
  if (!key) return undefined;
  const coverage = ROUTE_COVERAGE[key];
  return coverage.covered ? undefined : coverage.absentReason;
}
