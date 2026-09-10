/**
 * The In-App Chat placement study: what is being compared, and where.
 *
 * The app is getting an in-app chat for NON-support use cases while the existing
 * Zendesk chat stays as "Support Chat". This registry is the whole experiment —
 * two independent axes plus a per-route coverage table that both the chrome and
 * `<ChatSlotNote>` read, so the coverage decision is live code rather than a doc
 * that drifts from what the screens actually render.
 *
 * ⚠️ Every placement is ADDITIVE and defaults to `off`. At `off` the app must
 * render exactly as it does on `luis/rider-no-show` — that is what keeps the
 * Rider No-Show branch reviewable, and it is checked by the baseline screenshot.
 */

/** Axis 1 — where the chat affordance sits. */
export type ChatPlacement =
  | "off"
  | "header-left"
  | "header-right"
  | "nav-tab"
  | "options-row";

/** Axis 2 — how In-App Chat and Zendesk Support Chat relate. */
export type ChatCoexistence = "unified" | "separate";

export const CHAT_PLACEMENTS: ChatPlacement[] = [
  "off",
  "header-left",
  "header-right",
  "nav-tab",
  "options-row",
];

export const CHAT_COEXISTENCE: ChatCoexistence[] = ["unified", "separate"];

export interface PlacementMeta {
  label: string;
  blurb: string;
  /** The cost this placement carries — the thing the screenshot should show. */
  tradeoff: string;
}

export const PLACEMENT_META: Record<ChatPlacement, PlacementMeta> = {
  off: {
    label: "Off",
    blurb: "The control. App exactly as it ships today.",
    tradeoff:
      "The header MessageCircle still renders its red 6 badge and still goes nowhere — that is the current state, not a bug in the study.",
  },
  "header-left": {
    label: "Header left",
    blurb:
      "Wire the MessageCircle that is ALREADY in the header top-left and already badged.",
    tradeoff:
      "Looks free and is not: showBack wins the left slot, so it is structurally unavailable on 7 of the 12 driver routes — including every ride detail.",
  },
  "header-right": {
    label: "Header right",
    blurb: "Move the chat icon into the right cluster, before filter and refresh.",
    tradeoff:
      "The only placement that reaches every screen, and the most crowded: on Requests it makes a third icon, or a fourth once Support Chat has its own.",
  },
  "nav-tab": {
    label: "Nav tab",
    blurb: "A sixth bottom-nav tab beside Home, Requests, Planner, My Rides, Options.",
    tradeoff:
      "Never appears on a ride detail — the bottom nav does not mount there, which is exactly where Ops coordination happens. And \"Messages\" does not fit in a sixth cell at 375px; the label has to shorten to \"Chat\".",
  },
  "options-row": {
    label: "Options row",
    blurb:
      "No chrome change at all. The Options menu's \"Help & Support\" row becomes the way in.",
    tradeoff:
      "Cheapest and least discoverable: an unread message is invisible until the driver goes looking, so the badge does no work.",
  },
};

export interface CoexistenceMeta {
  label: string;
  blurb: string;
}

export const COEXISTENCE_META: Record<ChatCoexistence, CoexistenceMeta> = {
  unified: {
    label: "One inbox",
    blurb:
      "One affordance. Messages holds both — \"Wingz Team\" threads and a \"Support\" row that hands off to Zendesk. The driver picks a conversation, never a system.",
  },
  separate: {
    label: "Two entry points",
    blurb:
      "Two affordances. The chat icon opens in-app threads only; a separate lifebuoy in the header right goes to Zendesk. Honest about the split, and it costs a second icon on every screen.",
  },
};

/** Every driver-app route the study covers. Dev routes are excluded entirely. */
export type RouteKey =
  | "/"
  | "/requests"
  | "/requests/[id]"
  | "/planner"
  | "/my-rides"
  | "/my-rides/[id]"
  | "/my-rides/[id]/more"
  | "/my-rides/[id]/no-show"
  | "/options"
  | "/ride-history"
  | "/incentives"
  | "/incentives/[id]/rides"
  | "/messages";

export interface RouteCoverage {
  label: string;
  /** Placements that put a chat affordance on this route. */
  placements: ChatPlacement[];
  /** Why a placement is absent here. Rendered in the slot by `<ChatSlotNote>`. */
  absentReason: Partial<Record<ChatPlacement, string>>;
  /** An open question about this route, shown in the study strip. */
  caveat?: string;
}

const NO_NAV = "no bottom nav on this screen";
const BACK_WINS = "back chevron owns the left slot";
const NOT_OPTIONS = "reached from the Options menu, not from here";

/**
 * ⏳ PROVISIONAL until the production chat screenshots are filed.
 *
 * The one genuinely contested row is `/my-rides/[id]/no-show`, currently excluded
 * under every placement: App Release 4.5.1 shipped a fix for "the Zendesk chat
 * overlay covering the trip screen mid-trip", which is precedent for keeping a
 * chat affordance off a mid-flow form. If Dispatch <-> driver ride coordination is
 * a real use case, that argues the other way — the 4.5.1 bug was an overlay
 * problem, not a placement problem. Flip the row, don't rewrite the table.
 */
export const ROUTE_COVERAGE: Record<RouteKey, RouteCoverage> = {
  "/": {
    label: "Home",
    placements: ["header-left", "header-right", "nav-tab"],
    absentReason: { "options-row": NOT_OPTIONS },
  },
  "/requests": {
    label: "Requests",
    placements: ["header-left", "header-right", "nav-tab"],
    absentReason: { "options-row": NOT_OPTIONS },
    caveat:
      "Already carries filter + refresh. Header right makes 3 icons, or 4 under two entry points.",
  },
  "/planner": {
    label: "Planner",
    placements: ["header-left", "header-right", "nav-tab"],
    absentReason: { "options-row": NOT_OPTIONS },
  },
  "/my-rides": {
    label: "My Rides",
    placements: ["header-left", "header-right", "nav-tab"],
    absentReason: { "options-row": NOT_OPTIONS },
  },
  "/options": {
    label: "Options",
    placements: ["header-left", "header-right", "nav-tab", "options-row"],
    absentReason: {},
    caveat: "The only tab screen with a free header right corner today.",
  },
  "/requests/[id]": {
    label: "Ride Details (request)",
    placements: ["header-right"],
    absentReason: { "header-left": BACK_WINS, "nav-tab": NO_NAV, "options-row": NOT_OPTIONS },
  },
  "/my-rides/[id]": {
    label: "Ride Details",
    placements: ["header-right"],
    absentReason: { "header-left": BACK_WINS, "nav-tab": NO_NAV, "options-row": NOT_OPTIONS },
    caveat:
      "The contested one. In progress, the driver is driving — but this is also where Ops coordination happens.",
  },
  "/my-rides/[id]/more": {
    label: "More Options",
    placements: ["header-right", "options-row"],
    absentReason: { "header-left": BACK_WINS, "nav-tab": NO_NAV },
    caveat:
      "Already holds today's Zendesk front doors: \"Call Member or Support\" and \"Email Support\".",
  },
  "/my-rides/[id]/no-show": {
    label: "Member No-Show",
    placements: [],
    absentReason: {
      "header-left": BACK_WINS,
      "header-right": "⏳ provisional — mid-flow form, and 4.5.1 fixed a chat overlay covering the trip screen",
      "nav-tab": NO_NAV,
      "options-row": NOT_OPTIONS,
    },
    caveat: "⏳ Excluded provisionally, pending the production screenshots.",
  },
  "/ride-history": {
    label: "Ride History",
    placements: ["header-right"],
    absentReason: {
      "header-left": "showMessages={false} — this screen opts the icon out entirely",
      "nav-tab": NO_NAV,
      "options-row": NOT_OPTIONS,
    },
  },
  "/incentives": {
    label: "Incentives",
    placements: ["header-right"],
    absentReason: { "header-left": BACK_WINS, "nav-tab": NO_NAV, "options-row": NOT_OPTIONS },
  },
  "/incentives/[id]/rides": {
    label: "Incentive Rides",
    placements: ["header-right"],
    absentReason: { "header-left": BACK_WINS, "nav-tab": NO_NAV, "options-row": NOT_OPTIONS },
  },
  "/messages": {
    label: "Messages",
    placements: [],
    absentReason: {},
    caveat: "The destination. Reachable by URL under every placement, including off.",
  },
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
  if (pathname.startsWith("/messages")) return "/messages";
  if (pathname.startsWith("/requests/")) return "/requests/[id]";
  if (pathname.endsWith("/no-show")) return "/my-rides/[id]/no-show";
  if (pathname.endsWith("/more")) return "/my-rides/[id]/more";
  if (pathname.startsWith("/incentives/")) return "/incentives/[id]/rides";
  if (pathname.startsWith("/my-rides/")) return "/my-rides/[id]";
  return null;
}

/** Does this route show the chat affordance under this placement? */
export function isChatVisible(pathname: string, placement: ChatPlacement): boolean {
  if (placement === "off") return false;
  const key = routeKeyFor(pathname);
  if (!key) return false;
  return ROUTE_COVERAGE[key].placements.includes(placement);
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
  if (coverage.placements.includes(placement)) return undefined;
  return coverage.absentReason[placement];
}
