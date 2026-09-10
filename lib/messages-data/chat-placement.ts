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
      "Put in-app chat in the header top-left — the slot the Zendesk bubble occupies today.",
    tradeoff:
      "⛔ IMPOSSIBLE under two entry points: Zendesk already owns this slot, so the two cannot both sit here. Under one inbox it works and is invisible — the driver sees the same bubble in the same place, opening something new. Also unavailable on every stack-pushed screen, where the back chevron wins.",
  },
  "header-right": {
    label: "Header right",
    blurb:
      "A new in-app chat icon in the right cluster, before filter and refresh. Zendesk keeps its bubble top-left.",
    tradeoff:
      "The only placement that survives two entry points, because it does not fight Zendesk for the left slot. Cost is crowding: on Requests it makes a third icon beside filter and refresh.",
  },
  "nav-tab": {
    label: "Nav tab",
    blurb: "A sixth bottom-nav tab beside Home, Requests, Planner, My Rides, Options.",
    tradeoff:
      "⛔ BREAKS THE COVERAGE RULE. A tab renders on all five tab screens, so it puts chat on Planner and Options where the support box is not shown (c-01d, c-01e). It also never reaches a ride detail, where the nav does not mount. Separately: a sixth cell wraps \"My Rides\" onto two lines at 375px.",
  },
  "options-row": {
    label: "Options row",
    blurb:
      "No chrome change at all. The Options menu gets a Messages row.",
    tradeoff:
      "⛔ BREAKS THE COVERAGE RULE in the opposite direction — it puts chat ONLY on Options, the one tab screen with no support box and no header icon at all (c-01e). Also the least discoverable: an unread badge does no work if the driver has to go looking.",
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
  | "/incentives/[id]/rides";

export interface RouteCoverage {
  label: string;
  /** Placements that put a chat affordance on this route. */
  placements: ChatPlacement[];
  /** Why a placement is absent here. Rendered in the slot by `<ChatSlotNote>`. */
  absentReason: Partial<Record<ChatPlacement, string>>;
  /** An open question about this route, shown in the study strip. */
  caveat?: string;
  /**
   * Placements that DO render here but shouldn't under the coverage rule.
   * Distinct from `absentReason`: this is present-and-wrong, not absent.
   */
  violation?: Partial<Record<ChatPlacement, string>>;
}

const NO_NAV = "no bottom nav on this screen";
const BACK_WINS = "back chevron owns the left slot";
const NOT_OPTIONS = "reached from the Options menu, not from here";
const NO_BOX = "the Zendesk support box is not shown on this screen";

/**
 * Where the chat affordance may appear.
 *
 * ⭐ THE RULE, set by the user 2026-09-11: **chat shows only where the current
 * Zendesk support box is shown.** The production captures settle exactly where
 * that is — the header speech bubble appears on Home (`c-01a`), Requests
 * (`c-01b`) and My Rides (`c-01c`), and is absent from Planner (`c-01d`, which
 * has a date-picker header instead), Options (`c-01e`, no header icons at all)
 * and every stack-pushed screen, where the back chevron owns the left slot
 * (`c-01f`).
 *
 * ⛔ That rule eliminates two of the five placements rather than ranking them:
 * `nav-tab` renders on all five tab screens and `options-row` renders only on
 * Options. Both are kept selectable so the violation is visible on the screen
 * where it happens — see `violation` below.
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
  "/my-rides": {
    label: "My Rides",
    placements: ["header-left", "header-right", "nav-tab"],
    absentReason: { "options-row": NOT_OPTIONS },
  },

  /* Tab screens the support box does NOT reach. A nav tab still renders here,
   * which is the whole objection to that placement. */
  "/planner": {
    label: "Planner",
    placements: ["nav-tab"],
    absentReason: { "header-left": NO_BOX, "header-right": NO_BOX, "options-row": NOT_OPTIONS },
    violation: {
      "nav-tab":
        "a tab puts chat here, but c-01d shows no support box on Planner — and no standard header to put one in",
    },
  },
  "/options": {
    label: "Options",
    placements: ["nav-tab", "options-row"],
    absentReason: { "header-left": NO_BOX, "header-right": NO_BOX },
    violation: {
      "nav-tab": "a tab puts chat here, but c-01e shows no support box on Options",
      "options-row": "this places chat ONLY where the support box is not shown",
    },
  },

  /* Stack-pushed screens. The back chevron owns the left slot (c-01f) and the
   * support box is not shown on any of them. */
  "/requests/[id]": {
    label: "Ride Details (request)",
    placements: [],
    absentReason: { "header-left": BACK_WINS, "header-right": NO_BOX, "nav-tab": NO_NAV, "options-row": NOT_OPTIONS },
  },
  "/my-rides/[id]": {
    label: "Ride Details",
    placements: [],
    absentReason: { "header-left": BACK_WINS, "header-right": NO_BOX, "nav-tab": NO_NAV, "options-row": NOT_OPTIONS },
    caveat:
      "⚠️ The rule excludes this — but it is where Ops coordination happens, and the action row already carries a navy chat glyph for rider SMS.",
  },
  "/my-rides/[id]/more": {
    label: "More Options",
    placements: [],
    absentReason: { "header-left": BACK_WINS, "header-right": NO_BOX, "nav-tab": NO_NAV, "options-row": NOT_OPTIONS },
    caveat: "Holds today's Zendesk front doors: \"Call Member or Support\" and \"Email Support\".",
  },
  "/my-rides/[id]/no-show": {
    label: "Member No-Show",
    placements: [],
    absentReason: { "header-left": BACK_WINS, "header-right": NO_BOX, "nav-tab": NO_NAV, "options-row": NOT_OPTIONS },
    caveat: "✅ No longer provisional — the rule excludes it, and 4.5.1's overlay fix agrees.",
  },
  "/ride-history": {
    label: "Ride History",
    placements: [],
    absentReason: { "header-left": BACK_WINS, "header-right": NO_BOX, "nav-tab": NO_NAV, "options-row": NOT_OPTIONS },
  },
  "/incentives": {
    label: "Incentives",
    placements: [],
    absentReason: { "header-left": BACK_WINS, "header-right": NO_BOX, "nav-tab": NO_NAV, "options-row": NOT_OPTIONS },
  },
  "/incentives/[id]/rides": {
    label: "Incentive Rides",
    placements: [],
    absentReason: { "header-left": BACK_WINS, "header-right": NO_BOX, "nav-tab": NO_NAV, "options-row": NOT_OPTIONS },
  },
};

/**
 * Whether the two axes can coexist at all.
 *
 * ⛔ The one impossible combination: the Zendesk support box already occupies
 * the header top-left (`c-01a`/`c-01b`/`c-01c`), so under "two entry points"
 * in-app chat cannot also be placed there. Under "one inbox" it can, because
 * there is only one icon and it absorbs Zendesk.
 */
export function slotConflict(
  placement: ChatPlacement,
  coexistence: ChatCoexistence
): string | undefined {
  if (placement === "header-left" && coexistence === "separate") {
    return "Zendesk already owns the header top-left, so in-app chat cannot go there too. Pick a different slot, or merge them into one inbox.";
  }
  return undefined;
}

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
