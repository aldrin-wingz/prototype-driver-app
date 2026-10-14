/**
 * Gate 3 for `prototype/support-solutions`.
 *
 * The prototype selector claims to be a faithful mirror of
 * `References/Support Call Volume by Subject Area - Problems and Proposed
 * Features.xlsx`. This is what makes that claim falsifiable.
 *
 * ⚠️ EVERY CHECK REPORTS A DENOMINATOR, matching `verify-base.ts`. A matcher
 * that matches nothing and a matcher that is merely rarely satisfied look
 * identical from a pass/fail bit.
 *
 * ⚠️ Expected values are DECLARED here as literals, never derived from the
 * catalogue they check. A total computed from the array it validates cannot
 * fail.
 *
 * Run: bun run verify:solutions
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  CATEGORIZED_CALLS,
  CLEAR_FOCUS_LABEL,
  COVERED_CALLS,
  demonstrableSides,
  entryRouteFor,
  findSolution,
  hasProposedSide,
  isDemonstrable,
  modeFor,
  SOLUTION_HOME,
  SOLUTIONS,
  subjectAreaGroups,
  type Solution,
  type SolutionClass,
} from "../lib/solutions/catalogue";
import { splitUseCase } from "../components/solutions-dev/use-case-flow";
import { mergedRunCounts, tableRows } from "../lib/solutions/table-shape";
import {
  OVER_CAPACITY_DISPATCH_PHONE,
  OVER_CAPACITY_PREFIX,
  OVER_CAPACITY_PROVENANCE,
  OVER_CAPACITY_SOLUTIONS,
  OVER_CAPACITY_SWIPE_LABEL,
  dispatchDialHref,
  isOverCapacity,
  overCapacityHeadline,
} from "../lib/driver-data/over-capacity";
import {
  COLUMN_MODE,
  columnModeFor,
  INERT_COLUMNS,
  SELECTING_COLUMNS,
  cellSelected,
  selectAction,
  type SelectAction,
  type SelectingColumn,
  type TableColumn,
} from "../lib/solutions/table-select";
import { adoptDecision, keepClearedMemory, type AdoptDecision, type AdoptInput } from "../lib/solutions/adopt-rules";
import {
  changeAnchors,
  editableAnchors,
  tripChanges,
  tripChangeRefusal,
  showsTripChangeEntry,
  CHANGE_NOTES_FIELD,
  CHANGE_SOURCE_FIELD,
  CHANGE_SOURCE_OPTIONS,
  PASSED_ANCHOR_BADGE,
  TRIP_CHANGE_LABEL,
  TRIP_CHANGE_REFUSAL,
  TRIP_CHANGE_REQUESTED_DETAIL,
  TRIP_CHANGE_REQUESTED_TITLE,
  TRIP_CHANGE_SUBMIT_TOAST,
  TRIP_CHANGE_TRACKED_BY_APP,
} from "../lib/driver-data/trip-change-request";
import { buildTripChange } from "../components/support/trip-change-form";
import {
  ACCOUNT_SOLUTION_ID,
  showsAccountProposals,
  ACCOUNT_ON_FILE,
  CODE_PURPOSE_FOR,
  CODE_PURPOSE_LABEL,
  CONTACT_FIELDS,
  OTP_CHANNELS,
  maskEmail,
  maskPhone,
  OTP_ERROR_INVALID,
  OTP_ERROR_RATE_LIMIT,
  OTP_LENGTH,
  OTP_RESEND_SECONDS,
  OTP_TITLE,
  PHONE_PLACEHOLDER,
  PRE_AUTH_RECOVERY_PARKED,
  PRODUCTION_LOGIN_STEPS,
  RESET_SUBTITLE,
  RESET_TITLE,
  SETTINGS_RULES,
  SIGN_IN_EMAIL_SUBTITLE,
  SIGN_IN_PHONE_SUBTITLE,
  SIGN_IN_TITLE,
  type CodePurpose,
} from "../lib/driver-data/account-self-service";
import { ACCOUNT_ROW, buildOptionsRows } from "../lib/driver-data/options-menu";
import {
  firstTabWithRides,
  isScenarioFor,
  pillsFor,
  ridesForSolution,
  scenarioRides,
} from "../lib/solutions/scenario-rides";
import {
  CANNOT_REACH_LEAVES_TRIP_UNCONFIRMED,
  CONTACT_CHANNELS,
  contactOptionsFor,
  MAX_OUTCOME_LABEL_CHARS,
  REACH_OUTCOMES,
} from "../lib/driver-data/reach-attempt";
import { reachOptionsFor } from "../components/driver/reach-rider-modal";
import { CANNOT_REACH_SOLUTIONS, showsCannotReachOption } from "../lib/driver-data/reach-attempt";
import { buildGridTiles } from "../components/driver/more-options-screen";
import { buildSupportFormCase } from "../lib/support-data/case-registry";
import {
  NOT_ON_THIS_TRIP,
  contextLegs,
  tripContextFor,
} from "../lib/support-data/trip-context";
import {
  ISSUE_AUTO_ASSIGN_REQUEST,
  ISSUE_CANNOT_REACH_MEMBER,
  SUPPORT_ISSUE_TYPES,
  SUPPORT_FORM_TITLE,
} from "../lib/support-data/issue-types";
import {
  ASSIGNMENT_SCOPE_ALL,
  ASSIGNMENT_SCOPE_SPECIFIC,
  ASSIGNMENT_SCOPE_STANDING,
  ASSIGNMENT_SCOPES,
  AUTO_ASSIGN_CHANGES_NOTHING,
  AUTO_ASSIGN_LABEL,
  filterRequestsByMember,
  GROUP_RIDER_PREFIX,
  isGroupRide,
  MAX_SCOPE_LABEL_CHARS,
  SCOPES_NEEDING_SCHEDULE,
  MAX_TILE_LABEL_CHARS,
  memberFilterOptions,
  showsMemberFilter,
  applicableFilters,
  PREFERRED_DRIVER_SOLUTIONS,
  shouldAskPreferredDriver,
} from "../lib/driver-data/member-assignment";
import { buildAutoAssignRequest } from "../components/support/auto-assign-request-form";
import { buildSendBackReason } from "../components/support/send-back-reason-form";
import { treatmentFor } from "../lib/driver-data/no-show-rules";
import { offeredSwipe, routeSwipeTap } from "../lib/driver-data/missed-swipe-rules";
import {
  CS_TOOL_DRIVER_INITIATED_REASONS,
  dedupedDriverInitiatedReasons,
  DRIVER_ANSWERABLE_REASONS,
  isShortNoticeSendBack,
  SEND_BACK_DENIED_BODY,
  SEND_BACK_DENIED_DISMISS,
  SEND_BACK_DENIED_TITLE,
  sendBackCompletes,
  MAX_SEND_BACK_LABEL_CHARS,
  isStandingOrder,
  SEND_BACK_CONFIRM_BUILT,
  SEND_BACK_PENALTY_USD,
  SEND_BACK_REASON_OTHER,
  sendBackReasonOptions,
  sendBackSteps,
  type SendBackStep,
} from "../lib/driver-data/send-back-reasons";
import {
  ISSUE_RIDER_DECLINED,
  ISSUE_SEND_BACK_REASON,
} from "../lib/support-data/issue-types";
import {
  ARTIFACT_CHANNELS,
  DECLINED_CHAT_SUPPORT,
  declinedSheetFor,
  zendeskDeclineMessage,
  CANCELLATION_REQUESTED_DETAIL,
  CANCELLATION_REQUESTED_PILL,
  CANCELLATION_REQUESTED_TITLE,
  CANCELLATION_TRACKED_BY_APP,
  DECLINE_CHANNELS,
  DECLINED_BODY,
  DECLINED_BODY_2021,
  DECLINED_BODY_2026,
  DECLINED_CONTINUE,
  DECLINED_LEGS_FIELD,
  DECLINED_TITLE,
  DECLINED_WALK_BACK,
  declineLegDefault,
  declineLegOptions,
  parseLegSelection,
  SECOND_HAND_CHANNELS,
  SHEET_SWAP_MS,
  toggleLegSelection,
  tripIdsForLegs,
} from "../lib/driver-data/rider-declined";
import { buildRiderDeclined } from "../components/support/rider-declined-form";
import { getMemberOptions, MEMBER_WINDOW_DAYS } from "../lib/support-data/member-options";
import {
  areRequiredFieldsFilled,
  canSubmitCase,
  hasRequiredChange,
  isFieldVisible,
} from "../lib/support/field-rules";
import { getTimeOrderWarnings } from "../lib/support/time-order";
import {
  ISSUE_ADD_LEG_REQUEST,
  ISSUE_TRIP_CHANGE_REQUEST,
} from "../lib/support-data/issue-types";
import {
  groupMembers,
  ALL_POOLS,
  LIVE_POOLS,
} from "../lib/driver-data/trip-groups";
import { legsInGroup } from "../lib/driver-data/rider-declined";
import {
  addLegRefusal,
  addLegTiming,
  allowedSlots,
  canRequestAddLeg,
  cascadeShifts,
  earliestSlot,
  estimateFromGroup,
  groupKey,
  groupLegs,
  isTripToday,
  minutesToClock,
  newLegMinutes,
  shiftFieldId,
  showsAddLegEntry,
  timeInputToMinutes,
  ADD_DROPOFF_ADDRESS_FIELD,
  ADD_DROPOFF_TIME_FIELD,
  ADD_LEG_LABEL,
  ADD_LEG_REFUSAL,
  ADD_LEG_REQUESTED_DETAIL,
  ADD_LEG_REQUESTED_TITLE,
  ADD_LEG_SUBMIT_TOAST,
  ADD_LEG_TRACKED_BY_APP,
  ADD_NOTES_FIELD,
  ADD_PICKUP_ADDRESS_FIELD,
  ADD_PICKUP_TIME_FIELD,
  ADD_SOURCE_FIELD,
  ADD_SOURCE_OPTIONS,
  ADD_TIMING_FIELD,
  ESTIMATE_HELP,
  LEG_TURNAROUND_MINUTES,
  NEW_LEG_DEFAULT_MINUTES,
  OVERNIGHT_WARNING,
  SLOT_BLOCKED_REASON,
  SLOT_FIELD,
  TIMING_LABEL,
} from "../lib/driver-data/add-leg-request";
import {
  addLegDerive,
  addLegPlan,
  buildAddLeg,
  buildAddLegCase,
  ADD_LEG_KEY_FIELDS,
} from "../components/support/add-leg-form";
import { solutionHref } from "../lib/solutions/solution-context";
import {
  DEFAULT_DEMO_MODE,
  DEMO_MODE_DESCRIPTION,
  DEMO_MODE_LABEL,
  DEMO_MODE_PARAM,
  DEMO_MODES,
  demoFocus,
  hasNowState,
  modeFromParam,
  ROWS_AWAITING_NOW,
  showsProposal,
  type DemoFocus,
  type DemoMode,
} from "../lib/solutions/demo-mode";
import { focusParams, SOLUTION_PARAM } from "../lib/solutions/solution-context";
import { getLegOptions } from "../lib/support-data/leg-options";
import {
  mockRequestTrips,
  type Trip,
  mockNeedsActionTrips,
  mockUpcomingTrips,
  mockInProgressTrips,
  mockCompletedTrips,
} from "../lib/driver-data/mock-trips";

// ⚠️ fileURLToPath, not URL.pathname — the vault path contains spaces.
const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
let failures = 0;

function check(label: string, detail: string, ok: boolean) {
  console.log(`${ok ? "  ok  " : "  FAIL"} ${label} — ${detail}`);
  if (!ok) failures++;
}

/**
 * A focus pinned to `"fixed"` — the side the app has shown since Phase 1.
 *
 * ⛔ Every check written BEFORE `DemoMode` existed uses this, and that is the
 * whole claim of B1: a pure refactor, so each of those checks must go on
 * asserting exactly what it asserted before. Anything whose answer moves under
 * `"fixed"` is a regression wearing a new signature.
 *
 * ⚠️ §20 below builds its own focuses and drives BOTH modes. If this helper
 * ever becomes the only way a focus is built in this file, the mode has stopped
 * being tested and every sweep over it passes vacuously.
 */
const FIXED = (solutionId: string | null): DemoFocus => ({ solutionId, mode: "fixed" });
/**
 * The plain mirror — no focus, so every proposal is visible. Pre-existing
 * send-back checks use this, because that is the path they were written to
 * describe.
 */
const PLAIN: DemoFocus = { solutionId: null, mode: "now" };

// ── Declared expectations ────────────────────────────────────────────────
const EXPECTED_ROWS = 26;
const EXPECTED_DENOMINATOR = 7483;
const EXPECTED_COVERED = 6665;
/** The 15 subject areas, in call order, exactly as the spreadsheet lists them. */
const EXPECTED_AREAS = [
  "Member / Rider No-Show",
  "Trip Data Update / Completion",
  "Trip Confirmation",
  "Trip-Related Questions",
  "Trip / Ride Assignment",
  "Send-back",
  "Other / not listed (catch-all)",
  "Trip / Ride Cancellation",
  "Trip / Ride Modification",
  "ETA Request",
  "Compliance Related",
  "Trip Requests",
  "Payment Issues",
  "Technical Issues",
  "OTP",
];

// ---------------------------------------------------------------------------
console.log("\n1. The catalogue matches the analysis");
// ---------------------------------------------------------------------------
check("row count", `${SOLUTIONS.length} of ${EXPECTED_ROWS}`, SOLUTIONS.length === EXPECTED_ROWS);

const orders = SOLUTIONS.map((s) => s.order).sort((a, b) => a - b);
const contiguous = orders.every((o, i) => o === i + 1);
check(
  "order is contiguous 1..n",
  contiguous ? `${orders.length} orders, no gaps` : `got ${orders.join(",")}`,
  contiguous,
);

const ids = SOLUTIONS.map((s) => s.id);
const dupeIds = ids.filter((id, i) => ids.indexOf(id) !== i);
check(
  "ids unique",
  dupeIds.length ? `dupes: ${[...new Set(dupeIds)].join(", ")}` : `${ids.length} ids, 0 duplicates`,
  dupeIds.length === 0,
);

check(
  "denominator is the categorised-call total",
  `${CATEGORIZED_CALLS} vs ${EXPECTED_DENOMINATOR}`,
  CATEGORIZED_CALLS === EXPECTED_DENOMINATOR,
);

const groups = subjectAreaGroups();
check(
  "subject-area count",
  `${groups.length} of ${EXPECTED_AREAS.length}`,
  groups.length === EXPECTED_AREAS.length,
);

const areaNames = groups.map((g) => g.subjectArea);
check(
  "subject areas match the spreadsheet, in call order",
  areaNames.join(" | ") === EXPECTED_AREAS.join(" | ")
    ? `all ${areaNames.length} in order`
    : `got: ${areaNames.join(" | ")}`,
  areaNames.join(" | ") === EXPECTED_AREAS.join(" | "),
);

/**
 * ⚠️ Summed across DISTINCT subject areas, not across rows. `calls` is the
 * area's total and several rows share one, so summing rows would multiply-count
 * — it would give 10,967 here rather than 6,665.
 */
const covered = groups.reduce((sum, g) => sum + g.calls, 0);
check(
  "covered calls reconcile with the spreadsheet",
  `${covered} vs declared ${EXPECTED_COVERED}`,
  covered === EXPECTED_COVERED && COVERED_CALLS === EXPECTED_COVERED,
);

const rowSum = SOLUTIONS.reduce((sum, s) => sum + s.calls, 0);
check(
  "summing rows would over-count, so the two differ",
  `rows=${rowSum} areas=${covered}`,
  rowSum > covered,
);

const areaConsistent = groups.every((g) => g.solutions.every((s) => s.calls === g.calls));
check(
  "every row carries its own area's call total",
  areaConsistent ? `${SOLUTIONS.length} rows consistent` : "a row disagrees with its area",
  areaConsistent,
);

// ---------------------------------------------------------------------------
console.log("\n2. Classification is complete and exclusive");
// ---------------------------------------------------------------------------
const CLASSES: SolutionClass[] = ["form", "surface", "no-app-surface"];
for (const k of CLASSES) {
  const n = SOLUTIONS.filter((s) => s.klass === k).length;
  check(`class "${k}" is used`, `${n} of ${SOLUTIONS.length}`, n > 0);
}

const noSurface = SOLUTIONS.filter((s) => s.klass === "no-app-surface");
const missingReason = noSurface.filter((s) => !s.noSurfaceReason);
check(
  "every no-app-surface row says why",
  missingReason.length ? missingReason.map((s) => s.id).join(", ") : `${noSurface.length} of ${noSurface.length} explained`,
  missingReason.length === 0,
);

const strayReason = SOLUTIONS.filter((s) => s.klass !== "no-app-surface" && s.noSurfaceReason);
check(
  "only no-app-surface rows carry that reason",
  strayReason.length ? strayReason.map((s) => s.id).join(", ") : `0 of ${SOLUTIONS.length - noSurface.length} buildable rows`,
  strayReason.length === 0,
);

const unbuildableWithEntry = noSurface.filter((s) => s.entry !== null);
check(
  "no-app-surface rows have no entry point",
  unbuildableWithEntry.length ? unbuildableWithEntry.map((s) => s.id).join(", ") : `${noSurface.length} of ${noSurface.length} null`,
  unbuildableWithEntry.length === 0,
);

const shared = SOLUTIONS.filter((s) => s.sharedBuildWith);
const brokenShare = shared.filter(
  (s) => s.sharedBuildWith === s.id || !ids.includes(s.sharedBuildWith as string),
);
check(
  "every shared build points at a real, different row",
  brokenShare.length ? brokenShare.map((s) => s.id).join(", ") : `${shared.length} shared reference(s) resolve`,
  brokenShare.length === 0,
);

// ---------------------------------------------------------------------------
console.log("\n3. Build state and entry points agree");
// ---------------------------------------------------------------------------
const built = SOLUTIONS.filter((s) => s.buildState === "in-prototype");
const pending = SOLUTIONS.filter((s) => s.buildState === "not-yet");
check("something is in the prototype", `${built.length} of ${SOLUTIONS.length}`, built.length > 0);
check("something is still to build", `${pending.length} of ${SOLUTIONS.length}`, pending.length > 0);

const builtWithoutEntry = built.filter((s) => !s.entry);
check(
  "every in-prototype row has an entry point",
  builtWithoutEntry.length ? builtWithoutEntry.map((s) => s.id).join(", ") : `${built.length} of ${built.length}`,
  builtWithoutEntry.length === 0,
);

const pendingWithEntry = pending.filter((s) => s.entry);
check(
  "nothing claims an entry point before it is built",
  pendingWithEntry.length ? pendingWithEntry.map((s) => s.id).join(", ") : `${pending.length} of ${pending.length} null`,
  pendingWithEntry.length === 0,
);

/**
 * Resolve a route against the App Router, so an entry point cannot name a
 * screen that does not exist. A literal segment must be a real directory; a
 * dynamic one falls back to the single `[param]` directory beside it.
 */
function routeExists(route: string): boolean {
  const segments = route.split("?")[0].split("/").filter(Boolean);
  let dir = join(ROOT, "app");
  for (const segment of segments) {
    if (existsSync(join(dir, segment))) {
      dir = join(dir, segment);
      continue;
    }
    const dynamic = readdirSync(dir, { withFileTypes: true }).find(
      (e) => e.isDirectory() && e.name.startsWith("[") && e.name.endsWith("]"),
    );
    if (!dynamic) return false;
    dir = join(dir, dynamic.name);
  }
  return existsSync(join(dir, "page.tsx"));
}

const allTripIds = new Set(
  [
    ...mockRequestTrips,
    ...mockNeedsActionTrips,
    ...mockUpcomingTrips,
    ...mockInProgressTrips,
    ...mockCompletedTrips,
  ].map((t) => t.id),
);

let routesChecked = 0;
let alternatesChecked = 0;

function checkEntry(id: string, what: string, route: string, label: string) {
  routesChecked++;
  check(`${id}: ${what} resolves to a page`, route, routeExists(route));

  // Any ride-scoped entry must name a ride the seed actually has, or the demo
  // lands on a 404 that looks like a broken feature.
  const rideId = /^\/my-rides\/([^/]+)/.exec(route)?.[1];
  if (rideId) {
    check(
      `${id}: ${what} ride is seeded`,
      `${rideId} ${allTripIds.has(rideId) ? "found" : "MISSING"} among ${allTripIds.size} trips`,
      allTripIds.has(rideId),
    );
  }
  check(`${id}: ${what} says what to do`, `${label.length} chars`, label.length > 20);
}

for (const s of built) {
  checkEntry(s.id, "entry", s.entry!.route, s.entry!.label);

  for (const alternate of s.entry!.alternates ?? []) {
    alternatesChecked++;
    checkEntry(s.id, "alternate", alternate.route, alternate.label);
    /**
     * An alternate pointing at the same screen as the primary is decorative —
     * it would look like a second branch and demonstrate the first one twice.
     */
    check(
      `${s.id}: alternate is a DIFFERENT state`,
      `${alternate.route} vs ${s.entry!.route}`,
      alternate.route !== s.entry!.route,
    );
  }
}
check("entry routes were actually checked", `${routesChecked} checked across ${built.length} built row(s)`, routesChecked >= built.length);
/**
 * ⚠️ Declared, not derived. TWO slices have two branches each and a selector
 * that reached only one branch would demonstrate half the case while looking
 * complete:
 *   - Rider No-Show — the driver is at the pick-up, or they are not.
 *   - Can't Reach Member (row 04) — the STANDARD confirmation modal, whose third
 *     option changes nothing, and the SAME-DAY one, whose third option advances
 *     the trip. Those are different alternatives for the proposal to beat.
 *   - Request Feed member filter (row 10) — a member WITH trips posted, and a
 *     member with none. A filter that can only be seen finding something cannot
 *     be told apart from one that ignores its argument.
 *   - Preferred driver (row 09) — the More Options tile, and the prompt raised
 *     at the end of the leg. The second is the one the case is really about and
 *     is on a different screen entirely.
 *   - Send-back (row 13) — THREE: a SHORT-NOTICE trip, which reaches
 *     production's penalty warning; an ADVANCE one, which reaches no warning at
 *     all; and a STANDING ORDER, which reaches the proposed one. A reason form
 *     only ever seen on the way to a warning cannot be told apart from part of
 *     that warning.
 *
 * ⏸️ Row 15 had a second branch — the LOCKED-OUT half at `/login` — until the
 * pre-auth flow was parked on 2026-10-13. It has one entry again, and the count
 * below went back to 6 rather than being left at 7 with a row quietly failing
 * to supply its alternate.
 */
const EXPECTED_ALTERNATES = 11;
check(
  "the multi-branch slice still exposes both branches",
  `${alternatesChecked} alternate(s), expected ${EXPECTED_ALTERNATES}`,
  alternatesChecked === EXPECTED_ALTERNATES,
);

// ---------------------------------------------------------------------------
console.log("\n4. Locked vocabulary");
// ---------------------------------------------------------------------------
/**
 * ⚠️ Project glossary, locked at scaffold.
 *
 * Drivers accept assigned trips from the Request Feed; they do not book, so
 * "booking" framing is banned outright. And build state is written "In
 * prototype" / "⚠️ Not in prototype yet", never the shouty pair.
 */
const BANNED = ["booking", "BUILT", "NOT-BUILT"];
const offenders: string[] = [];
let fieldsScanned = 0;
for (const s of SOLUTIONS) {
  const fields = [
    s.problem,
    s.useCase,
    s.proposedFeature,
    // ⭐ B6's two new strings. Both are driver-facing copy on the desktop
    // table, so the locked vocabulary applies to them exactly as it does to the
    // fields they shortened — and a field added without being added HERE is a
    // field the vocabulary rule silently stopped covering.
    s.tableSummary,
    s.noSurfaceReason ?? "",
    s.entry?.label ?? "",
    ...(s.entry?.alternates ?? []).flatMap((a) => [a.label, a.short]),
  ];
  for (const text of fields) {
    fieldsScanned++;
    for (const word of BANNED) {
      const hit = word === "booking" ? text.toLowerCase().includes(word) : text.includes(word);
      if (hit) offenders.push(`${s.id}: "${word}"`);
    }
  }
}
check(
  "no banned vocabulary in the catalogue",
  offenders.length ? offenders.join("; ") : `0 hits across ${BANNED.length} terms x ${fieldsScanned} fields`,
  offenders.length === 0,
);

// ---------------------------------------------------------------------------
console.log("\n5. Use cases are chains, not sentences");
// ---------------------------------------------------------------------------
/**
 * The selector renders each use case as its steps, split on the literal `→`.
 * That only works while the catalogue keeps writing them as chains — a row
 * reworded into prose would render as one undifferentiated step and look fine,
 * which is exactly the kind of silent flattening a denominator catches.
 */
const EXPECTED_MULTILINE_ROWS = 1; // the catch-all row carries three examples
const EXPECTED_LABELLED_LINES = 8; // "Ex 1" … across Trip Confirmation, Questions, catch-all

let lineCount = 0;
let stepCount = 0;
let labelledLines = 0;
let multiLineRows = 0;
const flattened: string[] = [];
const emptySteps: string[] = [];

for (const s of SOLUTIONS) {
  const lines = splitUseCase(s.useCase);
  if (lines.length > 1) multiLineRows++;
  for (const line of lines) {
    lineCount++;
    stepCount += line.steps.length;
    if (line.label) labelledLines++;
    if (line.steps.length < 2) flattened.push(s.id);
    if (line.steps.some((step) => step.trim() === "")) emptySteps.push(s.id);
  }
}

check(
  "every use case splits into at least two steps",
  flattened.length ? `flat: ${[...new Set(flattened)].join(", ")}` : `${stepCount} steps across ${lineCount} lines in ${SOLUTIONS.length} rows`,
  flattened.length === 0,
);
check(
  "no step is empty",
  emptySteps.length ? [...new Set(emptySteps)].join(", ") : `0 of ${stepCount} steps`,
  emptySteps.length === 0,
);
check(
  "the multi-example row survives",
  `${multiLineRows} of ${SOLUTIONS.length} rows carry several examples (expected ${EXPECTED_MULTILINE_ROWS})`,
  multiLineRows === EXPECTED_MULTILINE_ROWS,
);
check(
  "example labels survive",
  `${labelledLines} labelled lines of ${lineCount} (expected ${EXPECTED_LABELLED_LINES})`,
  labelledLines === EXPECTED_LABELLED_LINES,
);
/** A renderer that returned one step per line would satisfy the count checks. */
check(
  "steps genuinely outnumber lines",
  `${stepCount} steps vs ${lineCount} lines`,
  stepCount > lineCount * 1.5,
);

// ---------------------------------------------------------------------------
console.log("\n5b. The strip's controls are distinguishable");

const STRIP = readFileSync(join(ROOT, "components/solutions-dev/solution-strip.tsx"), "utf8");
check(
  "the strip source was read",
  `${STRIP.length} chars`,
  STRIP.length > 2000,
);
/**
 * ⛔⛔ The picker trigger is a full-width button sitting directly above the app.
 * Its affordance used to render only when NOTHING was focused — so on a deep
 * link, the commonest way anyone arrives, it was invisible, and the one visible
 * chevron beside it belonged to the briefing collapse. Two near-miss taps meant
 * for the ride opened the picker and then selected a row out of the demo.
 */
const hasSwitcher = STRIP.includes("<ChevronsUpDown");
const gatedOnActive = /\{!active && \(\s*<Chevron/.test(STRIP);
check(
  "the picker trigger carries an affordance in BOTH states",
  `switcher=${hasSwitcher}, gated-on-no-focus=${gatedOnActive}`,
  hasSwitcher && !gatedOnActive,
);
check(
  "...and it is not the same glyph as the briefing collapse",
  "switcher vs chevron",
  STRIP.includes("<ChevronsUpDown") && STRIP.includes("<ChevronDown"),
);
check(
  "the trigger is labelled for screen readers",
  "aria-label on the picker button",
  STRIP.includes('aria-label="Choose a solution to focus"'),
);

console.log("\n6. Scenario rides — every built row has one, and says which");

const builtRows = SOLUTIONS.filter((s) => s.buildState === "in-prototype");

const ALL_SEEDED = [
  ...mockInProgressTrips,
  ...mockNeedsActionTrips,
  ...mockUpcomingTrips,
  ...mockCompletedTrips,
  ...mockRequestTrips,
];
const tagged = scenarioRides(ALL_SEEDED);

/** Declared, never counted off the seed — a derived total cannot fail. */
const EXPECTED_SCENARIO_RIDES = 21;  // ⭐ +1 in B3f: rows 11/12's over-capacity request
check(
  "the seed carries the declared number of scenario rides",
  `${tagged.length} of ${ALL_SEEDED.length} seeded rides (expected ${EXPECTED_SCENARIO_RIDES})`,
  tagged.length === EXPECTED_SCENARIO_RIDES,
);

const codes = tagged.map((trip) => trip.scenario!.code);
check(
  "every scenario code is unique",
  `${new Set(codes).size} distinct of ${codes.length} — ${codes.join(", ")}`,
  new Set(codes).size === codes.length,
);
check(
  "every scenario carries a label",
  `${tagged.filter((t) => t.scenario!.label.trim()).length} of ${tagged.length}`,
  tagged.every((trip) => trip.scenario!.label.trim().length > 0),
);

/**
 * ⛔ A solution id that does not resolve would filter a ride out of its own
 * demo silently — the ride simply never appears, and nothing says why.
 */
const danglingIds = tagged.flatMap((trip) =>
  trip.scenario!.solutions.filter((id) => !SOLUTIONS.some((s) => s.id === id)),
);
const claimedIds = tagged.flatMap((trip) => trip.scenario!.solutions);
check(
  "every scenario names real catalogue rows",
  `${danglingIds.length} dangling of ${claimedIds.length} claim(s)`,
  danglingIds.length === 0,
);

/**
 * ⛔⛔ **A declared exemption, not a weakened check.**
 *
 * Catalogue row 15 is the first built row with no ride anywhere in its demo —
 * both of its entry points are account surfaces, and a driver changing their
 * password is not on a trip. The guarantee the check below defends ("a built
 * row can actually be demonstrated") still holds for it; it simply is not
 * demonstrated from the ride list.
 *
 * ⚠️ The exemption is NAMED and then itself checked, because the dangerous
 * version of this is a filter that quietly swallows a row which really should
 * have had rides. A row may only sit here if every one of its routes is a
 * surface route — assert that rather than trust it.
 */
const RIDELESS_ROWS = new Set(["account-self-service"]);
const wronglyExempt = [...RIDELESS_ROWS].filter((id) => {
  const row = SOLUTIONS.find((s) => s.id === id);
  if (!row || row.buildState !== "in-prototype") return true;
  const routes = [row.entry?.route, ...(row.entry?.alternates ?? []).map((a) => a.route)];
  return routes.some((route) => route?.startsWith("/my-rides/"));
});
check(
  "the rideless exemption covers only rows that genuinely have no ride route",
  `${wronglyExempt.length} wrongly exempt of ${RIDELESS_ROWS.size} exemption(s)`,
  wronglyExempt.length === 0 && RIDELESS_ROWS.size > 0,
);

/** Every row that claims to be built must be demonstrable from the ride list. */
const rideBackedRows = builtRows.filter((solution) => !RIDELESS_ROWS.has(solution.id));
const unbacked = rideBackedRows.filter(
  (solution) => !tagged.some((trip) => isScenarioFor(trip, solution.id)),
);
check(
  "every in-prototype row has at least one scenario ride",
  `${unbacked.length} unbacked of ${rideBackedRows.length} ride-backed row(s), ${RIDELESS_ROWS.size} exempt`,
  unbacked.length === 0,
);
check(
  "...and there were built rows to check",
  `${builtRows.length} built`,
  builtRows.length >= 3,
);

/** The entry route's own ride has to be one of them, or the link lands nowhere. */
let entryMismatches = 0;
let entryChecked = 0;
let rideRoutes = 0;
let surfaceRoutes = 0;
for (const solution of builtRows) {
  // ⚠️ `entry.alternates`, NOT `solution.alternates`. The first version read the
  // wrong level, found `undefined`, and quietly checked 3 routes instead of 4 —
  // a passing check with a denominator one short of the truth. The count below
  // is declared so that cannot recur silently.
  const routes = [
    solution.entry?.route,
    ...(solution.entry?.alternates ?? []).map((a) => a.route),
  ];
  for (const route of routes) {
    if (!route) continue;
    entryChecked += 1;
    /**
     * ⛔⛔ **Not every entry route is a ride route, and assuming so made this
     * check pass by accident for five slices.** It read `route.split("/")[2]`
     * — the id in `/my-rides/<id>` — and row 10's `/requests?member=…` yields
     * `undefined`, which then "mismatched" a tagged ride it was never about.
     *
     * So the two kinds are counted SEPARATELY, both with denominators. A ride
     * route must land on a ride tagged for its row. A surface route has no ride
     * to land on; what makes it honest is that the page exists, which
     * `checkEntry` above already asserted for every route including this one.
     */
    if (!route.startsWith("/my-rides/")) {
      surfaceRoutes += 1;
      continue;
    }
    rideRoutes += 1;
    const id = route.split("/")[2];
    const trip = ALL_SEEDED.find((t) => t.id === id);
    if (!trip || !isScenarioFor(trip, solution.id)) entryMismatches += 1;
  }
}
check(
  "every RIDE entry route lands on a ride tagged for that row",
  `${entryMismatches} mismatch(es) of ${rideRoutes} ride route(s)`,
  entryMismatches === 0,
);
/**
 * ⚠️ Declared separately, so a ride route that quietly became a surface route —
 * or the reverse — cannot keep the total intact while changing what was
 * actually tested. The first number is the one that carries the assertion above.
 */
const EXPECTED_RIDE_ROUTES = 19;
/** `/requests` (row 10) ×2, plus row 15's `/options/account`. */
const EXPECTED_SURFACE_ROUTES = 4;
check(
  "...and the two kinds of route were counted as declared",
  `${rideRoutes} ride (expected ${EXPECTED_RIDE_ROUTES}), ${surfaceRoutes} surface (expected ${EXPECTED_SURFACE_ROUTES})`,
  rideRoutes === EXPECTED_RIDE_ROUTES && surfaceRoutes === EXPECTED_SURFACE_ROUTES,
);
/** Declared, because a route silently skipped is a check that stops checking. */
const EXPECTED_ENTRY_ROUTES = EXPECTED_RIDE_ROUTES + EXPECTED_SURFACE_ROUTES;
check(
  "...and every declared route was reached",
  `${entryChecked} checked (expected ${EXPECTED_ENTRY_ROUTES})`,
  entryChecked === EXPECTED_ENTRY_ROUTES,
);

console.log("\n7. The scenario pill replaces, and status survives");

const scenarioRide = tagged[0];
const plainRide = ALL_SEEDED.find((t) => !t.scenario && t.pills.length > 0);
check(
  "a scenario ride shows exactly one pill — its identifier",
  `${pillsFor(scenarioRide).length} pill(s): ${pillsFor(scenarioRide).map((p) => p.label).join(" | ")}`,
  pillsFor(scenarioRide).length === 1 &&
    pillsFor(scenarioRide)[0].label.startsWith(scenarioRide.scenario!.code),
);
check(
  "a plain ride keeps its production pills",
  plainRide
    ? `${pillsFor(plainRide).length} of ${plainRide.pills.length}`
    : "no plain ride with pills in the seed",
  Boolean(plainRide) && pillsFor(plainRide!).length === plainRide!.pills.length,
);
/** ⛔ The Pending marker must outlive the swap, or the tab stops saying anything. */
check(
  "a render-time status pill survives on a scenario ride",
  pillsFor({ ...scenarioRide, statusPills: [{ label: "Waiting on Support", variant: "attention" }] })
    .map((p) => p.label)
    .join(" | "),
  pillsFor({
    ...scenarioRide,
    statusPills: [{ label: "Waiting on Support", variant: "attention" }],
  })[0].label === "Waiting on Support",
);

console.log("\n8. Focusing a solution narrows the ride list");

const inProgress = mockInProgressTrips;
check(
  "no focus hides nothing",
  `${ridesForSolution(inProgress, null).length} of ${inProgress.length}`,
  ridesForSolution(inProgress, null).length === inProgress.length,
);
/** Declared per row, so adding a scenario ride has to be a deliberate edit. */
const EXPECTED_IN_PROGRESS: Record<string, number> = {
  "rider-no-show": 2,
  "cancel-at-door": 1,
  // ⚠️ Two, not three. The third ride demonstrated a drop-off the trail could
  // not place — which 1b and ride 2 now cover between them, so it was removed
  // rather than left as a fourth card saying nothing new.
  "missed-swipe": 2,
  // Rows 09 and 10 are one build and ONE ride demonstrates both — AMARA
  // OKONKWO onboard, `09a`. Declared twice rather than once, because the two
  // rows land independently and a row that silently shared another's ride
  // would read as built while having nothing of its own to show.
  "auto-assign-request": 1,
  "request-feed-member-filter": 1,
  // Three: `13a` short-notice (penalty), `13b` advance (neither warning),
  // `13c` standing order. The second is the negative control for both.
  "send-back-reason-form": 3,
  // ⭐ ONE, and it is the `20b` ride with the pick-up already made — the only
  // demo of the passed-anchor rule. Row 20's OTHER ride is in Needs Action, so
  // this row is declared in BOTH maps: a row with rides in two tabs that named
  // only one would hide half its demo behind a number that still looked right.
  "change-pickup-dropoff": 1,
};
/**
 * ⚠️ A SECOND tab, declared separately rather than folded into the map above
 * with zeros.
 *
 * Can't Reach Member demos a trip that has not been confirmed yet, which lives
 * in Needs Action — it never appears in In Progress at all. Writing it as
 * `"cannot-reach-member": 0` in the map above would have satisfied the
 * completeness check below while saying the row has no rides, which is the exact
 * shape of a check that stops checking.
 */
const EXPECTED_NEEDS_ACTION: Record<string, number> = {
  "tag-number-invalid": 2,
  "cannot-reach-member": 2,
  // ⭐ TWO, and they are one round trip rather than two scenarios. `16a` is the
  // outbound and `16b` the return, sharing a `tripGroup` — which is the case:
  // production's own decline template removes several leg ids at once, so a
  // single seeded ride could not have shown the checklist doing anything.
  "rider-initiated-cancellation": 2,
  // ⭐ ONE here, the `20a` ride where nothing has started and both ends are
  // still editable. See the note beside its In Progress entry above.
  "change-pickup-dropoff": 1,
  /**
   * ⛔⛔ ONE of row 19's THREE scenario rides, and the other two are in a pool
   * no My Rides tab counts — see `EXPECTED_COMPLETED_SCENARIOS` below. Row 19 is
   * the first built row whose demo lives mostly outside the tabbed pools, so a
   * number here that looked right would be hiding two thirds of it.
   */
  "add-leg-request": 1,
};

/**
 * Scenario rides in the COMPLETED pool, which `tabCountsFor` cannot see.
 *
 * ⛔⛔ **A denominator the tab maps structurally cannot supply.** My Rides has
 * four tabs and none of them is "completed", so every count above is taken over
 * live pools only. Until row 19 that was harmless — no scenario ride was
 * finished. Row 19's entry point IS a finished ride, so without this a row could
 * declare "1 ride" while demonstrating three.
 */
const EXPECTED_COMPLETED_SCENARIOS: Record<string, number> = {
  // `19a` the finished leg of the group, and `19c` the solo finished leg.
  "add-leg-request": 2,
};
for (const [id, expected] of Object.entries(EXPECTED_COMPLETED_SCENARIOS)) {
  const shown = ridesForSolution(mockCompletedTrips, id);
  check(
    `focusing ${id} has ${expected} completed scenario ride(s)`,
    `${shown.length} of ${mockCompletedTrips.length} — ${shown.map((t) => t.scenario?.code).join(", ")}`,
    shown.length === expected,
  );
}
check(
  "no OTHER built row hides rides in the completed pool",
  `${scenarioRides(mockCompletedTrips).length} completed scenario ride(s), ${Object.values(EXPECTED_COMPLETED_SCENARIOS).reduce((a, b) => a + b, 0)} declared`,
  scenarioRides(mockCompletedTrips).length ===
    Object.values(EXPECTED_COMPLETED_SCENARIOS).reduce((a, b) => a + b, 0),
);
for (const [id, expected] of Object.entries(EXPECTED_IN_PROGRESS)) {
  const shown = ridesForSolution(inProgress, id);
  check(
    `focusing ${id} shows ${expected} In Progress ride(s)`,
    `${shown.length} of ${inProgress.length} — ${shown.map((t) => t.scenario?.code).join(", ")}`,
    shown.length === expected,
  );
}
for (const [id, expected] of Object.entries(EXPECTED_NEEDS_ACTION)) {
  const shown = ridesForSolution(mockNeedsActionTrips, id);
  check(
    `focusing ${id} shows ${expected} Needs Action ride(s)`,
    `${shown.length} of ${mockNeedsActionTrips.length} — ${shown.map((t) => t.scenario?.code).join(", ")}`,
    shown.length === expected,
  );
}
const declaredRows = new Set([
  ...Object.keys(EXPECTED_IN_PROGRESS),
  ...Object.keys(EXPECTED_NEEDS_ACTION),
]);
/** ⚠️ Same declared exemption as above — row 15's demo is not on a ride. */
const countableRows = builtRows.filter((row) => !RIDELESS_ROWS.has(row.id));
check(
  "every built row's ride count was declared, in one tab or the other",
  `${declaredRows.size} declared of ${countableRows.length} countable (${RIDELESS_ROWS.size} exempt)`,
  declaredRows.size === countableRows.length &&
    countableRows.every((row) => declaredRows.has(row.id)),
);
/**
 * ⛔ The Needs Action tab must still hold the base's own unconfirmed ride.
 * Both new scenario rides landed there, and a filter that swept the plain mirror
 * ride out of its own tab would be this slice quietly deleting a base demo.
 */
check(
  "the base's plain unconfirmed ride survives in Needs Action",
  `${mockNeedsActionTrips.filter((t) => !t.scenario).length} plain of ${mockNeedsActionTrips.length}`,
  mockNeedsActionTrips.filter((t) => !t.scenario).length === 1,
);
/** The filter must actually REMOVE something, or it is decorative. */
check(
  "focusing genuinely narrows the list",
  `${ridesForSolution(inProgress, "missed-swipe").length} of ${inProgress.length}`,
  ridesForSolution(inProgress, "missed-swipe").length < inProgress.length,
);
/** A row with no scenario ride shows an empty list rather than everything. */
/**
 * ⚠️ Was `tag-number-invalid`, which is now BUILT. An example row that quietly
 * became buildable would have gone on passing while testing nothing — it has to
 * name a row with genuinely no scenario ride, and the assertion below says so.
 */
const UNBUILT_EXAMPLE = "ai-assistant";
check(
  "the unbuilt example really is unbuilt",
  `${UNBUILT_EXAMPLE} buildState=${SOLUTIONS.find((s) => s.id === UNBUILT_EXAMPLE)?.buildState}`,
  SOLUTIONS.find((s) => s.id === UNBUILT_EXAMPLE)?.buildState === "not-yet",
);
check(
  "focusing an unbuilt row shows no rides, not all of them",
  `${ridesForSolution(inProgress, UNBUILT_EXAMPLE).length} of ${inProgress.length}`,
  ridesForSolution(inProgress, UNBUILT_EXAMPLE).length === 0,
);

// ---------------------------------------------------------------------------
console.log("\n9. Can't Reach Member — rows 04 and 05, one build, two doors");
// ---------------------------------------------------------------------------

const REACH_SOURCES = {
  modal: readFileSync(join(ROOT, "components/driver/reach-rider-modal.tsx"), "utf8"),
  more: readFileSync(join(ROOT, "components/driver/more-options-screen.tsx"), "utf8"),
  form: readFileSync(join(ROOT, "components/support/cannot-reach-member-form.tsx"), "utf8"),
};
for (const [name, src] of Object.entries(REACH_SOURCES)) {
  check(`the ${name} source was read`, `${src.length} chars`, src.length > 1500);
}

/**
 * ⛔⛔ **Neither entry point may assemble its own case.**
 *
 * Rows 04 and 05 are one build reached from two places, and the only thing
 * keeping them one form is that both go through `CannotReachMemberForm`. An
 * entry point that called `buildSupportFormCase` directly would render a form
 * that looked identical and could then drift a field at a time — which is
 * exactly what Missed Swipe's two entry points taught. Checked on the source
 * because there is no runtime moment at which the two can be compared.
 */
for (const [name, src] of [["modal", REACH_SOURCES.modal], ["more", REACH_SOURCES.more]] as const) {
  check(
    `the ${name} entry goes through the shared form`,
    "<CannotReachMemberForm",
    src.includes("<CannotReachMemberForm"),
  );
  check(
    `...and the ${name} entry builds no case of its own`,
    `buildSupportFormCase occurrences: ${(src.match(/buildSupportFormCase/g) ?? []).length}`,
    !src.includes("buildSupportFormCase"),
  );
}

/**
 * The trip is deliberately left alone. `appTracksStatus: false` is what keeps a
 * Pending pill off a request whose outcome never comes back to the app.
 */
check(
  "filing tracks no status, because there is none to track",
  "appTracksStatus: false",
  REACH_SOURCES.form.includes("appTracksStatus: false"),
);
check(
  "...and the decision is named in lib, not left implicit in the form",
  `CANNOT_REACH_LEAVES_TRIP_UNCONFIRMED=${CANNOT_REACH_LEAVES_TRIP_UNCONFIRMED}`,
  CANNOT_REACH_LEAVES_TRIP_UNCONFIRMED === true,
);
/**
 * ⛔ The modal must not confirm the trip on this option. `confirmTrip` is the
 * one call that moves Ride Details out of the unconfirmed phase, and it belongs
 * to options 1 and the same-day 3 only — a fourth option that reported a failure
 * to reach someone and then marked the trip confirmed would be the opposite of
 * what it says.
 */
const cannotReachAdvances = /case "cannot-reach":[\s\S]{0,240}onConfirmed\(\)/.test(
  REACH_SOURCES.modal,
);
check(
  "the proposed option does NOT confirm the trip",
  `onConfirmed() inside the cannot-reach branch: ${cannotReachAdvances}`,
  !cannotReachAdvances,
);

// ---- both modal variants carry the option ------------------------------
/** Declared: three production options plus one proposal, in both variants. */
const EXPECTED_REACH_OPTIONS = 4;
// ⚠️ Built for the row that OWNS the proposal. The fourth option is gated on
// the focused solution now, so a list built with no focus would also carry it
// and this check could not tell "shown to its owner" from "shown to everyone".
const standard = reachOptionsFor(false, FIXED("cannot-reach-member"));
const sameDay = reachOptionsFor(true, FIXED("cannot-reach-member"));
for (const [name, list] of [["standard", standard], ["same-day", sameDay]] as const) {
  check(
    `the ${name} modal offers ${EXPECTED_REACH_OPTIONS} options`,
    `${list.length} — ${list.map((o) => o.value).join(", ")}`,
    list.length === EXPECTED_REACH_OPTIONS,
  );
  check(
    `...and the ${name} modal carries the proposed option`,
    `${list.filter((o) => o.proposed).length} proposed of ${list.length}`,
    list.filter((o) => o.proposed).length === 1 &&
      list[list.length - 1].value === "cannot-reach",
  );
}
/**
 * ⛔⛔ **A proposal belongs to its own build — swept over every focus.**
 *
 * Found by the user, 2026-10-13: the fourth option rendered on EVERY focus, so
 * a reviewer walking row 16's decline met "I can't reach the member" on the way
 * past. `buildGridTiles` has enforced this on the More Options grid since
 * Phase 6; the modal was missed.
 *
 * ⚠️ Swept across every built row with a denominator, not spot-checked on one —
 * a rule proven on a single id cannot tell a gate from a coincidence. And both
 * directions: the owners must still SEE it, or this is just a deletion.
 */
const REACH_OWNERS = new Set(CANNOT_REACH_SOLUTIONS);
let focusesSwept = 0;
let wrongFocus: string[] = [];
for (const row of [...builtRows.map((r) => r.id), null]) {
  for (const variant of [false, true]) {
    focusesSwept += 1;
    const shown = reachOptionsFor(variant, FIXED(row)).some((o) => o.proposed);
    // `null` is the plain mirror and carries every proposal, the same rule
    // `ridesForSolution` and `buildGridTiles` use.
    const expected = row === null || REACH_OWNERS.has(row);
    if (shown !== expected) wrongFocus.push(`${row ?? "no focus"}/${variant ? "same-day" : "standard"}`);
  }
}
check(
  "the proposed option shows for its own rows and no others",
  `${wrongFocus.length} wrong of ${focusesSwept} focus/variant pair(s)${wrongFocus.length ? " — " + wrongFocus.join(", ") : ""}`,
  wrongFocus.length === 0,
);
check(
  "...and the sweep covered every built row, both variants, plus no focus",
  `${focusesSwept} pair(s) over ${builtRows.length} built row(s) + 1`,
  focusesSwept === (builtRows.length + 1) * 2,
);
/** ⛔ The three PRODUCTION options are never filtered — whatever is in focus. */
let productionSwept = 0;
const productionMissing = [...builtRows.map((r) => r.id), null].flatMap((row) =>
  [false, true].flatMap((variant) => {
    productionSwept += 1;
    const values: string[] = reachOptionsFor(variant, FIXED(row)).map((o) => o.value);
    return ["confirmed", "declined", "later"].every((v) => values.includes(v))
      ? []
      : [`${row ?? "no focus"}/${variant ? "same-day" : "standard"}`];
  }),
);
check(
  "...while the three production options survive every focus",
  `${productionMissing.length} incomplete of ${productionSwept} pair(s)`,
  productionMissing.length === 0 && productionSwept > 2,
);

/**
 * ⛔ The variants must genuinely differ. If the same-day third option ever
 * matched the standard one, both demos would show the same alternative and the
 * second scenario ride would be making an argument it no longer makes.
 */
check(
  "the two variants' third option really differs",
  `"${standard[2].label}" vs "${sameDay[2].label}"`,
  standard[2].label !== sameDay[2].label && Boolean(sameDay[2].note) && !standard[2].note,
);
check(
  "the same-day note is production's own wording",
  `${sameDay[2].note?.slice(0, 32)}…`,
  (sameDay[2].note ?? "").includes("you can still start the trip on the pickup day"),
);

// ---- the numbers offered are the trip's own ----------------------------
/**
 * ⚠️ Declared per ride. The stage map records the numbers as client-provided and
 * varying per trip, and `04b` exists to prove the form offers TWO when the trip
 * carries two. A single expected count would have let a hardcoded list of three
 * pass.
 */
const EXPECTED_CONTACTS: Record<string, number> = {
  "1049800391": 3,
  "1049800392": 2,
};
const reachRides = ALL_SEEDED.filter((t) => isScenarioFor(t, "cannot-reach-member"));
check(
  "every declared contact count names a scenario ride",
  `${Object.keys(EXPECTED_CONTACTS).length} declared of ${reachRides.length} scenario ride(s)`,
  Object.keys(EXPECTED_CONTACTS).length === reachRides.length &&
    reachRides.every((t) => t.id in EXPECTED_CONTACTS),
);
for (const [id, expected] of Object.entries(EXPECTED_CONTACTS)) {
  const ride = ALL_SEEDED.find((t) => t.id === id);
  const options = ride ? contactOptionsFor(ride) : [];
  check(
    `${id} offers ${expected} member number(s)`,
    `${options.length} — ${options.map((o) => o.value).join(", ")}`,
    options.length === expected,
  );
  check(
    `...and ${id}'s labels carry the number itself, not just its name`,
    options.map((o) => o.label).join(" | ") || "(none)",
    options.length > 0 && options.every((o) => /\d{3}\) 555-01\d{2}/.test(o.label)),
  );
}
/**
 * ⛔⛔ `Wingz Support` is the fourth entry in production's Phone Options popup
 * and must never be offered as proof of trying to reach the MEMBER. Checked
 * across every seeded ride, not just the two scenarios, so a later seed cannot
 * reintroduce it quietly.
 */
let contactOptionsScanned = 0;
const supportOffered: string[] = [];
for (const ride of ALL_SEEDED) {
  for (const option of contactOptionsFor(ride)) {
    contactOptionsScanned++;
    if (/support|wingz/i.test(option.label)) supportOffered.push(`${ride.id}: ${option.label}`);
  }
}
check(
  "calling Wingz Support is never offered as a member contact",
  supportOffered.length
    ? supportOffered.join("; ")
    : `0 hits across ${contactOptionsScanned} option(s) on ${ALL_SEEDED.length} ride(s)`,
  supportOffered.length === 0 && contactOptionsScanned > 0,
);
check(
  "the channel list itself is the three member-facing numbers",
  `${CONTACT_CHANNELS.length} — ${CONTACT_CHANNELS.map((c) => c.label).join(", ")}`,
  CONTACT_CHANNELS.length === 3,
);

// ---- the form the two doors share --------------------------------------
/**
 * Built here from the same two lib functions the wrapper uses. The grep above is
 * what ties this case to the one the app renders; this is what checks its shape.
 */
const reachRide = ALL_SEEDED.find((t) => t.id === "1049800391")!;
const reachCase = buildSupportFormCase({
  includeIssues: [ISSUE_CANNOT_REACH_MEMBER],
  cannotReach: { contactOptions: contactOptionsFor(reachRide) },
});
const reachFieldIds = reachCase.fields.map((f) => f.id);
/** Declared, in render order. */
const EXPECTED_REACH_FIELDS = [
  "contactNumber",
  "reachOutcome",
  "reachOutcomeOther",
  "reachNotes",
  "contactProof",
];
const missingFields = EXPECTED_REACH_FIELDS.filter((id) => !reachFieldIds.includes(id));
check(
  "the form asks every declared field",
  missingFields.length
    ? `missing: ${missingFields.join(", ")}`
    : `${EXPECTED_REACH_FIELDS.length} of ${EXPECTED_REACH_FIELDS.length} present, among ${reachFieldIds.length} total`,
  missingFields.length === 0,
);
const inOrder = EXPECTED_REACH_FIELDS.map((id) => reachFieldIds.indexOf(id));
check(
  "...in the declared order",
  inOrder.join(" < "),
  inOrder.every((pos, i) => i === 0 || pos > inOrder[i - 1]),
);
const numberField = reachCase.fields.find((f) => f.id === "contactNumber")!;
check(
  "the number question offers the trip's own numbers",
  `type=${numberField.type}, ${numberField.options?.length ?? 0} option(s)`,
  numberField.type === "select" && numberField.options?.length === 3,
);
const outcomeField = reachCase.fields.find((f) => f.id === "reachOutcome")!;
/** Declared: a driver cannot be made to pick between two answers. */
const EXPECTED_OUTCOMES = 6;
check(
  "the outcome question offers every declared answer",
  `${outcomeField.options?.length ?? 0} of ${EXPECTED_OUTCOMES} — ${(outcomeField.options ?? []).map((o) => o.value).join(", ")}`,
  outcomeField.options?.length === EXPECTED_OUTCOMES &&
    REACH_OUTCOMES.length === EXPECTED_OUTCOMES,
);
/**
 * ⛔ No answer may be longer than the select can draw. The shared primitive does
 * not wrap its items, so an over-long label is cut at the panel edge silently —
 * found by walking the app, not by any gate, which is why there is a gate now.
 */
const longLabels = REACH_OUTCOMES.filter(
  (o) => o.label.length > MAX_OUTCOME_LABEL_CHARS,
);
check(
  "every answer fits the select without clipping",
  longLabels.length
    ? longLabels.map((o) => `${o.label} (${o.label.length})`).join("; ")
    : `longest is ${Math.max(...REACH_OUTCOMES.map((o) => o.label.length))} of ${MAX_OUTCOME_LABEL_CHARS} max, across ${REACH_OUTCOMES.length} answers`,
  longLabels.length === 0,
);

/**
 * ⛔ The one answer catalogue row 04 is about. Without it the form collects
 * "I could not reach them" and an agent still has to call the number to find out
 * it is dead — which is the call row 04 exists to remove.
 */
check(
  "a disconnected number is one of the answers",
  (outcomeField.options ?? []).map((o) => o.value).join(", "),
  (outcomeField.options ?? []).some((o) => o.value === "disconnected"),
);
/**
 * ⛔⛔ **The prefilled leg must exist in the picker's OWN scope.**
 *
 * `legScope: "in-progress"` does not mean "a live trip" — it means one seed
 * array, `mockInProgressTrips`. Can't Reach Member is filed on a trip that is
 * merely UNCONFIRMED, which lives in Needs Action. With the narrow scope the
 * form prefilled a leg the picker could not resolve and rendered its empty
 * search box instead: a required, supposedly-locked field showing a placeholder.
 * Typecheck, every other gate and the build all passed with that on screen.
 *
 * Checked for every case that carries a leg picker, so the next one cannot
 * repeat it.
 */
const legField = reachCase.fields.find((f) => f.id === "legId")!;
const legChoices = getLegOptions(legField.legScope ?? "all");
check(
  "the leg picker's scope can see the ride the form opens on",
  `scope=${legField.legScope} · ${legChoices.length} leg(s) offered · looking for ${reachRide.legs[0].id}`,
  legChoices.some((option) => option.legId === reachRide.legs[0].id),
);
check(
  "...and for the other variant's ride too",
  `looking for 1049800392 among ${legChoices.length}`,
  legChoices.some((option) => option.legId === "1049800392"),
);
/**
 * The locked treatment is the point: the form is only ever opened FROM a ride,
 * so letting the driver repoint it at another one would let them file against a
 * trip they are not on.
 */
check(
  "the leg stays locked once it resolves",
  `lockWhenPrefilled=${legField.lockWhenPrefilled} badge="${legField.lockedBadge}"`,
  legField.lockWhenPrefilled === true,
);
/** And the narrow scope must still be narrow for the cases that need it. */
const noShowCase = buildSupportFormCase({ includeIssues: [ISSUE_CANNOT_REACH_MEMBER] });
const noShowLegField = noShowCase.fields.find((f) => f.id === "legId")!;
check(
  "widening the scope did NOT widen it for every other case",
  `cannotReach=${legField.legScope} vs default=${noShowLegField.legScope}`,
  noShowLegField.legScope === "in-progress" && legField.legScope === "all",
);

const proofField = reachCase.fields.find((f) => f.id === "contactProof")!;
check(
  "the photo proof keeps its asterisk without blocking the demo",
  `required=${proofField.required} requiredNotEnforced=${proofField.requiredNotEnforced}`,
  proofField.required === true && proofField.requiredNotEnforced === true,
);
check(
  "the case names no time sequence, because it asks no times",
  `timeSequence=${reachCase.timeSequence ?? "undefined"}`,
  reachCase.timeSequence === undefined,
);
/**
 * ⛔ A trip with no member number at all is a real case — and an empty required
 * select is a dead end no driver can submit past. The block has to degrade to a
 * notice instead.
 */
const noNumberCase = buildSupportFormCase({
  includeIssues: [ISSUE_CANNOT_REACH_MEMBER],
  cannotReach: { contactOptions: [] },
});
const noNumberField = noNumberCase.fields.find((f) => f.id === "contactNumber")!;
check(
  "a trip with no member number degrades to a notice, not an empty required select",
  `type=${noNumberField.type} required=${noNumberField.required ?? false}`,
  noNumberField.type === "notice" && !noNumberField.required,
);
/** And the block must be absent entirely when the case is not this one. */
const otherCase = buildSupportFormCase({ includeIssues: [ISSUE_CANNOT_REACH_MEMBER] });
check(
  "the block is absent when no contact options are passed",
  `${otherCase.fields.filter((f) => EXPECTED_REACH_FIELDS.includes(f.id)).length} of ${EXPECTED_REACH_FIELDS.length} leaked`,
  otherCase.fields.every((f) => !EXPECTED_REACH_FIELDS.includes(f.id)),
);

// ---- the More Options grid ---------------------------------------------
/**
 * ⚠️ The grid gained a tile, which Phase 3 explicitly refused to do. Declared
 * here so it stays a decision: seven production tiles, in capture order, plus
 * exactly one proposal.
 */
const EXPECTED_PRODUCTION_TILES = 7;
const productionTileIds = [
  "map-pickup",
  "map-dropoff",
  "call",
  "email-support",
  "calendar",
  "no-show",
  "send-back",
];
const tileBlock = REACH_SOURCES.more.slice(
  REACH_SOURCES.more.indexOf("const PRODUCTION_TILES"),
  REACH_SOURCES.more.indexOf("const CANNOT_REACH_TILE"),
);
const foundTiles = productionTileIds.filter((id) => tileBlock.includes(`id: "${id}"`));
check(
  "all seven production tiles survive, in the production list",
  `${foundTiles.length} of ${EXPECTED_PRODUCTION_TILES}`,
  foundTiles.length === EXPECTED_PRODUCTION_TILES,
);
/**
 * ⛔ All FOUR, not the two this list carried until B1. `PROPOSED_TILES` has had
 * `add-leg` and `trip-change` in it since rows 19 and 20 were built, and the
 * sweeps below silently covered half the grid — a denominator that looked like
 * a sweep and was a spot check.
 */
const PROPOSED_TILE_IDS = ["cannot-reach", "auto-assign", "add-leg", "trip-change"];
/**
 * Which catalogue rows each proposed tile belongs to — DECLARED here, not read
 * off the tile. Reading the tile's own `solutions` would make the sweep below
 * agree with whatever the tile says, which is a check validating its subject
 * against itself.
 *
 * Several ids each because a build spans rows: 04/05 are one build and so are
 * 09/10, exactly as their scenario rides are tagged.
 */
const PROPOSAL_OWNERS: Record<string, string[]> = {
  "cannot-reach": ["tag-number-invalid", "cannot-reach-member"],
  "auto-assign": ["auto-assign-request", "request-feed-member-filter"],
  "add-leg": ["add-leg-request"],
  "trip-change": ["change-pickup-dropoff"],
};
check(
  "...and every added tile sits OUTSIDE the production list",
  `${PROPOSED_TILE_IDS.filter((id) => tileBlock.includes(`id: "${id}"`)).length} of ${PROPOSED_TILE_IDS.length} leaked into it`,
  PROPOSED_TILE_IDS.every(
    (id) =>
      !tileBlock.includes(`id: "${id}"`) &&
      REACH_SOURCES.more.includes(`id: "${id}"`),
  ),
);

/**
 * ⛔⛔ **Read from the REAL array, not a regex over the file.**
 *
 * This check used to match the source text `[CANNOT_REACH_TILE, { ...tile,
 * fullWidth: true }]`. That proved one line was spelled a certain way; it could
 * not prove the grid that line builds is the grid on screen, and adding a
 * second proposal reshaped the insert and broke the regex while the rendered
 * grid was still correct. `buildGridTiles()` is exported precisely so this
 * reads the data — and it now takes a focus, so the grid is built per focus.
 */

/**
 * ⚠️ **The declared grid, per focus.** Written out rather than derived from
 * `PROPOSED_TILES`, because deriving it would make the check agree with
 * whatever the builder does. `null` is the plain mirror.
 *
 * ⛔ The Phase 4/5 rule — every proposal full-width so production tiles keep
 * their captured column — was SUPERSEDED by the user on 2026-10-12. Tiles now
 * pack two across and only a trailing odd tile is full-width.
 */
const EXPECTED_GRIDS: Array<{
  focus: string | null;
  tiles: string[];
  fullWidth: string | null;
}> = [
  {
    // Nothing focused: no filtering, so every proposal shows. TEN tiles now —
    // even, so nothing is full-width and `send-back` takes a column. ⚠️ That is
    // the packing rule working, not a regression: full-width is a function of
    // the COUNT, and row 20's tile changed the count's parity.
    focus: null,
    tiles: [
      "map-pickup", "map-dropoff", "call", "email-support", "calendar",
      "auto-assign", "add-leg", "trip-change", "no-show", "cannot-reach",
      "send-back",
    ],
    // ⚠️ ELEVEN now — odd again, so `send-back` is centred full-width exactly as
    // `s-03a` has it. The parity has flipped twice as proposals landed, which is
    // the packing rule working rather than a regression.
    fullWidth: "send-back",
  },
  {
    // Row 19 focused — its own tile and ⛔ no other proposal. Eight tiles.
    focus: "add-leg-request",
    tiles: [
      "map-pickup", "map-dropoff", "call", "email-support", "calendar",
      "add-leg", "no-show", "send-back",
    ],
    fullWidth: null,
  },
  {
    // Row 20 focused — its own tile and ⛔ no other proposal, after Add Event To
    // Calendar so No-Show and Send Back Trip still end the grid side by side.
    // Eight tiles, four clean rows of two.
    focus: "change-pickup-dropoff",
    tiles: [
      "map-pickup", "map-dropoff", "call", "email-support", "calendar",
      "trip-change", "no-show", "send-back",
    ],
    fullWidth: null,
  },
  {
    // Row 09 focused — the user's own worked example, in the order they asked
    // for 2026-10-12: the proposal follows Add Event To Calendar, so Member
    // No-Show and Send Back Trip end the grid side by side. Eight tiles, four
    // clean rows of two, and ⛔ NO `cannot-reach`: it belongs to another build.
    focus: "auto-assign-request",
    tiles: [
      "map-pickup", "map-dropoff", "call", "email-support", "calendar",
      "auto-assign", "no-show", "send-back",
    ],
    fullWidth: null,
  },
  {
    // Row 10 focused. Same build as 09, so the same tile — a build spans rows.
    focus: "request-feed-member-filter",
    tiles: [
      "map-pickup", "map-dropoff", "call", "email-support", "calendar",
      "auto-assign", "no-show", "send-back",
    ],
    fullWidth: null,
  },
  {
    // Row 05 focused: its own tile, and ⛔ not row 09's.
    focus: "cannot-reach-member",
    tiles: [
      "map-pickup", "map-dropoff", "call", "email-support", "calendar",
      "no-show", "cannot-reach", "send-back",
    ],
    fullWidth: null,
  },
  {
    // A built row with NO tile of its own: the captured seven, odd, so Send
    // Back Trip is centred exactly as it is in `s-03a`.
    focus: "missed-swipe",
    tiles: [
      "map-pickup", "map-dropoff", "call", "email-support", "calendar",
      "no-show", "send-back",
    ],
    fullWidth: "send-back",
  },
];
for (const { focus, tiles, fullWidth } of EXPECTED_GRIDS) {
  const grid = buildGridTiles(FIXED(focus));
  const ids = grid.map((t) => t.id);
  check(
    `grid for ${focus ?? "no focus"} is the declared ${tiles.length} tiles, in order`,
    `${ids.length}: ${ids.join(", ")}`,
    ids.length === tiles.length && tiles.every((id, i) => ids[i] === id),
  );
  const wide = grid.filter((t) => t.fullWidth).map((t) => t.id);
  check(
    `...and ${fullWidth ? `only ${fullWidth} is full-width` : "nothing is full-width"}`,
    `${wide.length} full-width: ${wide.join(", ") || "none"}`,
    fullWidth === null
      ? wide.length === 0
      : wide.length === 1 && wide[0] === fullWidth,
  );
}

/**
 * ⛔⛔ **The packing rule itself**, asserted over every focus rather than per
 * case: full-width is a function of parity and position and of nothing else.
 * A tile that authored its own `fullWidth` would pass the per-grid checks above
 * while leaving a hole the moment the count changed.
 */
for (const { focus } of EXPECTED_GRIDS) {
  const grid = buildGridTiles(FIXED(focus));
  const odd = grid.length % 2 === 1;
  check(
    `packing for ${focus ?? "no focus"}: ${grid.length} tiles, ${odd ? "odd" : "even"}`,
    `full-width count ${grid.filter((t) => t.fullWidth).length}, last=${grid[grid.length - 1]?.id}`,
    grid.every((t, i) => Boolean(t.fullWidth) === (odd && i === grid.length - 1)),
  );
  check(
    `...and Send Back Trip is still last for ${focus ?? "no focus"}`,
    `${grid[grid.length - 1]?.id}`,
    grid[grid.length - 1]?.id === "send-back",
  );
}
/** The rule has to actually fire both ways, or parity is untested. */
check(
  "the declared grids cover both an odd and an even count",
  EXPECTED_GRIDS.map((g) => `${g.focus ?? "none"}=${buildGridTiles(FIXED(g.focus)).length}`).join(" "),
  EXPECTED_GRIDS.some(({ focus }) => buildGridTiles(FIXED(focus)).length % 2 === 1) &&
    EXPECTED_GRIDS.some(({ focus }) => buildGridTiles(FIXED(focus)).length % 2 === 0),
);

/**
 * ⛔⛔ **A proposal never appears under another build's focus**, swept over
 * EVERY built row rather than the few declared above — that is the user's rule
 * and the sweep is what makes it a rule rather than four examples.
 */
let tileSweep = 0;
let tileLeaks = 0;
for (const row of builtRows) {
  const ids = buildGridTiles(FIXED(row.id)).map((t) => t.id);
  for (const proposal of PROPOSED_TILE_IDS) {
    tileSweep += 1;
    const belongs = PROPOSAL_OWNERS[proposal].includes(row.id);
    if (ids.includes(proposal) !== belongs) tileLeaks += 1;
  }
}
check(
  "no proposed tile shows under a build it does not belong to",
  `${tileLeaks} mismatch(es) of ${tileSweep} (row x proposal) pair(s)`,
  tileLeaks === 0,
);
check(
  "...and the sweep saw proposals both shown and hidden",
  `${builtRows.length} built row(s) x ${PROPOSED_TILE_IDS.length} proposal(s)`,
  builtRows.some((r) => buildGridTiles(FIXED(r.id)).some((t) => PROPOSED_TILE_IDS.includes(t.id))) &&
    builtRows.some((r) => !buildGridTiles(FIXED(r.id)).some((t) => PROPOSED_TILE_IDS.includes(t.id))),
);
/**
 * ⚠️ Every production tile still appears under every focus. The superseded rule
 * protected their COLUMN; nothing ever licensed removing one.
 */
const droppedProduction = builtRows.filter(
  (row) =>
    !productionTileIds.every((id) => buildGridTiles(FIXED(row.id)).some((t) => t.id === id)),
);
check(
  "every production tile survives every focus",
  `${droppedProduction.length} of ${builtRows.length} row(s) lost one`,
  droppedProduction.length === 0,
);

// ---------------------------------------------------------------------------
console.log("\n10. Switching solutions always lands somewhere that means something");
// ---------------------------------------------------------------------------

check(
  "the fallback landing route resolves to a real page",
  SOLUTION_HOME,
  routeExists(SOLUTION_HOME),
);
/**
 * ⛔⛔ **`focus()` must navigate on BOTH paths.**
 *
 * 21 of 26 rows have no entry point. That branch used to only rewrite the query
 * string, so switching while on a ride detail screen left you standing on the
 * PREVIOUS solution's ride, reading the new solution's briefing, with that ride
 * filtered out of its own list. Nothing errored and the briefing updated, which
 * is exactly why it survived a walk — the broken state looks like a working one.
 */
const CONTEXT_SRC = readFileSync(join(ROOT, "lib/solutions/solution-context.tsx"), "utf8");
check(
  "the solution context source was read",
  `${CONTEXT_SRC.length} chars`,
  CONTEXT_SRC.length > 1500,
);
const focusBody = CONTEXT_SRC.slice(
  CONTEXT_SRC.indexOf("const focus = useCallback"),
  CONTEXT_SRC.indexOf("const clear = useCallback"),
);
check(
  "focus() pushes a route rather than only rewriting the query string",
  `router.push occurrences in focus(): ${(focusBody.match(/router\.push/g) ?? []).length}`,
  (focusBody.match(/router\.push/g) ?? []).length === 1 &&
    focusBody.includes("SOLUTION_HOME"),
);
check(
  "...and focus() no longer has a branch that skips navigation",
  `writeParam inside focus(): ${focusBody.includes("writeParam")}`,
  !focusBody.includes("writeParam"),
);
/**
 * ⛔⛔ **BOTH effects must stand down while a switch is in flight.**
 *
 * `router.push` is async, so for a render or two the URL still describes the
 * old solution on the old screen. Each effect undoes the switch its own way —
 * the adopt effect reads the stale param and restores the old focus; the mirror
 * effect `replaceState`s over the pending push. Guarding only one leaves the
 * other: with just the mirror guarded, the app DID navigate to the new
 * solution's entry screen and arrived still wearing the old solution's id.
 * Half-switched looks like it worked, which is why this needs a check and not a
 * memory.
 */
/**
 * ⚠️ The adopt guard MOVED on 2026-10-14. It used to be a literal
 * `if (pendingFocus.current) return;` at the top of the effect; it is now one
 * input to `adoptDecision`, so the whole rule could be truth-tabled in §19
 * instead of grepped for. This check follows it rather than being relaxed:
 * it asserts the wiring is present AND runs the rule, which the old regex
 * could not do.
 */
const adoptGuarded =
  /navigating:\s*pendingFocus\.current !== null/.test(CONTEXT_SRC) &&
  adoptDecision({ paramId: "a", activeId: "b", clearedId: null, navigating: true }) ===
    "wait-for-navigation";
const mirrorGuarded = /if \(pendingFocus\.current\) \{/.test(CONTEXT_SRC);
const focusClaims = focusBody.includes("pendingFocus.current =");
check(
  "the adopt effect stands down mid-switch",
  `pendingFocus wired into the rule, and the rule waits: ${adoptGuarded}`,
  adoptGuarded,
);
check(
  "the mirror effect stands down mid-switch",
  `guard present: ${mirrorGuarded}`,
  mirrorGuarded,
);
check(
  "...and focus() claims the pending path before it pushes",
  `claim inside focus(): ${focusClaims}`,
  focusClaims &&
    focusBody.indexOf("pendingFocus.current =") < focusBody.indexOf("router.push"),
);

/** The rows that actually exercise the fallback — there must be some. */
const unbuilt = SOLUTIONS.filter((s) => !s.entry);
check(
  "the fallback is reached by most of the catalogue, not a corner case",
  `${unbuilt.length} of ${SOLUTIONS.length} rows have no entry point`,
  unbuilt.length > 0,
);

/**
 * ⛔⛔ **The "same build as NN" label was HARDCODED to 17.**
 *
 * Written when rows 17 and 18 were the only shared pair, so it printed the
 * right number by accident for a year. The moment rows 04 and 05 became a
 * shared build, the picker told you row 05 shared one with the requests tray.
 * A fact about one row, written as a literal in another row's JSX, is a fact
 * nothing can check — see the project's own rule about correctness rules in
 * JSX. It now resolves through `findSolution`, and this asserts no row's order
 * is written as a literal there.
 */
const PICKER_SRC = readFileSync(
  join(ROOT, "components/solutions-dev/solution-picker-sheet.tsx"),
  "utf8",
);
check(
  "the picker source was read",
  `${PICKER_SRC.length} chars`,
  PICKER_SRC.length > 2000,
);
check(
  "the shared-build label is resolved from data, not written as a literal",
  "findSolution(solution.sharedBuildWith)",
  PICKER_SRC.includes("findSolution(solution.sharedBuildWith") &&
    !/same build as \d/.test(PICKER_SRC),
);
/**
 * And the pairs must be symmetric, or one row names a partner that does not
 * name it back and the label contradicts itself depending which row you open.
 */
const asymmetric = SOLUTIONS.filter(
  (row) =>
    row.sharedBuildWith &&
    findSolution(row.sharedBuildWith)?.sharedBuildWith !== row.id,
);
check(
  "every shared build names a partner that names it back",
  asymmetric.length
    ? asymmetric.map((r) => `${r.id} → ${r.sharedBuildWith}`).join("; ")
    : `${shared.length} shared row(s), all symmetric`,
  asymmetric.length === 0 && shared.length > 0,
);
/** Declared, because a pair silently dropping out would pass everything above. */
const EXPECTED_SHARED_ROWS = 6;
check(
  "the declared number of rows share a build",
  `${shared.length} of ${EXPECTED_SHARED_ROWS} — ${shared.map((r) => r.order).join(", ")}`,
  shared.length === EXPECTED_SHARED_ROWS,
);

/**
 * The landing TAB has to follow the focus too, or the fallback lands on an empty
 * In Progress tab for a solution whose rides are in Needs Action — which reads
 * as "this solution has no demo" when it has two.
 */
const TAB_ORDER = ["in-progress", "needs-action", "upcoming", "pending"] as const;
function tabCountsFor(solutionId: string | null) {
  return [
    { value: TAB_ORDER[0], count: ridesForSolution(mockInProgressTrips, solutionId).length },
    { value: TAB_ORDER[1], count: ridesForSolution(mockNeedsActionTrips, solutionId).length },
    { value: TAB_ORDER[2], count: ridesForSolution(mockUpcomingTrips, solutionId).length },
    { value: TAB_ORDER[3], count: 0 },
  ];
}
/** Declared per built row — the tab each one's demo actually lives in. */
const EXPECTED_LANDING_TAB: Record<string, (typeof TAB_ORDER)[number]> = {
  "rider-no-show": "in-progress",
  "cancel-at-door": "in-progress",
  "missed-swipe": "in-progress",
  "tag-number-invalid": "needs-action",
  "cannot-reach-member": "needs-action",
  // Rows 09 and 10 share ride `09a`, which is In Progress. Row 10's own entry
  // is the Request Feed rather than My Rides — but a reviewer who switches to
  // it and then opens My Rides still has to land somewhere with its ride on it,
  // which is the whole point of this rule.
  "auto-assign-request": "in-progress",
  "request-feed-member-filter": "in-progress",
  "send-back-reason-form": "in-progress",
  // Row 16 is reached during member confirmation, which is the unconfirmed
  // phase — so both its rides are Needs Action, like rows 04 and 05.
  "rider-initiated-cancellation": "needs-action",
  /**
   * ⚠️ **In Progress, which is the ALTERNATE's tab and not the entry's.**
   *
   * Row 20 is the first built row with rides in two tabs, and `firstTabWithRides`
   * walks `TAB_ORDER` — In Progress first. So a reviewer who focuses row 20 and
   * then opens My Rides meets `20b`, the ride with its pick-up behind it, rather
   * than `20a`.
   *
   * Declared rather than fixed. The selector routes to `entry.route` directly,
   * so the entry is still what OPENS; this only decides which tab a later tap on
   * My Rides lands on, and both rides are row 20's. Changing the rule to prefer
   * the entry's tab would mean teaching `firstTabWithRides` about entries, which
   * is a bigger claim than this row has earned.
   */
  "change-pickup-dropoff": "in-progress",
  /**
   * ⚠️ Needs Action — its only TABBED ride is the group's live half. The entry
   * point and the second alternate are both completed rides, which no tab shows
   * at all, so a reviewer who focuses row 19 and then opens My Rides sees one
   * of its three demos. The selector routes to `entry.route` directly, so the
   * entry is still what opens.
   */
  "add-leg-request": "needs-action",
};
/**
 * ⚠️ Row 15 lands on no tab at all. Focused, My Rides is legitimately EMPTY —
 * which the catalogue already anticipates ("the solution's scenario rides or an
 * empty tab that says so by name"). Writing it in here as a tab it does not use
 * would be the `"cannot-reach-member": 0` mistake the comment above warns about.
 */
const tabbedRows = built.filter((row) => !RIDELESS_ROWS.has(row.id));
check(
  "every built row declares the tab it lands on",
  `${Object.keys(EXPECTED_LANDING_TAB).length} declared of ${tabbedRows.length} tabbed (${RIDELESS_ROWS.size} exempt)`,
  Object.keys(EXPECTED_LANDING_TAB).length === tabbedRows.length &&
    tabbedRows.every((row) => row.id in EXPECTED_LANDING_TAB),
);
for (const [id, expected] of Object.entries(EXPECTED_LANDING_TAB)) {
  const counts = tabCountsFor(id);
  const landed = firstTabWithRides(counts);
  check(
    `focusing ${id} lands on the ${expected} tab`,
    `${landed} — counts ${counts.map((t) => `${t.value}:${t.count}`).join(" ")}`,
    landed === expected,
  );
}
/**
 * ⛔ The rule must genuinely MOVE the tab for someone, or it is decorative. If
 * every built row landed on the first tab, the whole thing could be deleted and
 * every check above would still pass.
 */
const moved = Object.entries(EXPECTED_LANDING_TAB).filter(
  ([, tab]) => tab !== TAB_ORDER[0],
);
check(
  "the rule moves the tab for at least one row",
  `${moved.length} of ${Object.keys(EXPECTED_LANDING_TAB).length} land off the first tab — ${moved.map(([id]) => id).join(", ")}`,
  moved.length > 0,
);
/** An unbuilt row has rides nowhere, and must land on the mirror's own default. */
check(
  "an unbuilt row falls back to the first tab rather than picking at random",
  `${firstTabWithRides(tabCountsFor(UNBUILT_EXAMPLE))} for ${UNBUILT_EXAMPLE}`,
  firstTabWithRides(tabCountsFor(UNBUILT_EXAMPLE)) === TAB_ORDER[0],
);
/** Unfocused, nothing changes — the app is the plain mirror. */
check(
  "with nothing focused the first tab still wins",
  `${firstTabWithRides(tabCountsFor(null))} with counts ${tabCountsFor(null).map((t) => t.count).join("/")}`,
  firstTabWithRides(tabCountsFor(null)) === TAB_ORDER[0],
);

// ---------------------------------------------------------------------------
console.log("\n11. Trip / Ride Assignment — rows 09 and 10, one member, two surfaces");
// ---------------------------------------------------------------------------

const ASSIGN_SOURCES = {
  form: readFileSync(join(ROOT, "components/support/auto-assign-request-form.tsx"), "utf8"),
  more: readFileSync(join(ROOT, "components/driver/more-options-screen.tsx"), "utf8"),
  sheet: readFileSync(join(ROOT, "components/driver/filter-requests-modal.tsx"), "utf8"),
  feed: readFileSync(join(ROOT, "app/requests/page.tsx"), "utf8"),
};
for (const [name, src] of Object.entries(ASSIGN_SOURCES)) {
  check(`the ${name} source was read`, `${src.length} chars`, src.length > 1200);
}

// ---- the case ------------------------------------------------------------

const ASSIGN_CASE = buildSupportFormCase({
  includeIssues: [ISSUE_AUTO_ASSIGN_REQUEST],
  autoAssign: true,
});
/**
 * ⛔⛔ **Asserted on what RENDERS, not on `case.fields`.**
 *
 * The first version of this check read the raw array and failed with thirteen
 * fields — and it was the check that was wrong, not the case. The no-show core
 * block (`noShowType`, `legId`, the wait times, `knocked`, `spokeWith*`) is
 * emitted UNCONDITIONALLY by the builder and gated at RENDER time by `showIf`.
 * Every case therefore carries them in its array and shows almost none of them.
 * So the set that matters is the one `isFieldVisible` lets through for this
 * issue, which is also the set `areRequiredFieldsFilled` gates Submit on.
 */
const assignValues = { issue: ISSUE_AUTO_ASSIGN_REQUEST };
const assignVisible = ASSIGN_CASE.fields.filter((f) => isFieldVisible(f, assignValues));
const assignIds = assignVisible.map((f) => f.id);
const EXPECTED_ASSIGN_FIELDS = ["issue", "member", "assignmentScope", "assignmentNotes"];
check(
  "the case renders exactly the declared field set",
  `${assignIds.length} of ${ASSIGN_CASE.fields.length} field(s) visible: ${assignIds.join(", ")}`,
  assignIds.length === EXPECTED_ASSIGN_FIELDS.length &&
    EXPECTED_ASSIGN_FIELDS.every((id, i) => assignIds[i] === id),
);

/**
 * ⛔⛔ **No leg picker.** This is the first case that is not filed against a
 * leg — it names a MEMBER and asks about trips that do not exist yet. A locked
 * leg picker here would attach the request to whichever ride the driver
 * happened to be standing on, and Support would read that leg as its subject.
 *
 * ⚠️ Asserted twice on purpose: the field must not RENDER, and it must not be
 * gated by `ANY_LEG_CASE`. The first alone would pass if someone widened that
 * gate and then hid the field another way.
 */
check(
  "the case renders no leg picker",
  `legId visible: ${assignIds.includes("legId")}`,
  !assignIds.includes("legId"),
);
check(
  "...and this issue is not in the leg-case gate at all",
  `legId gate: ${JSON.stringify(ASSIGN_CASE.fields.find((f) => f.id === "legId")?.showIf?.equals)}`,
  !ASSIGN_CASE.fields
    .find((f) => f.id === "legId")
    ?.showIf?.equals.includes(ISSUE_AUTO_ASSIGN_REQUEST),
);
/**
 * ⛔ The whole no-show / missed-swipe core stays hidden — with a denominator, so
 * "nothing leaked" cannot mean "nothing was looked at".
 */
const OTHER_CASE_FIELDS = [
  "noShowType", "legId", "waitedFrom", "leftAt", "waitedWhere", "knocked",
  "spokeWithWho", "spokeWithRelation", "contactNumber", "reachOutcome",
];
const leakedOther = OTHER_CASE_FIELDS.filter((id) => assignIds.includes(id));
check(
  "no other case's field renders on this one",
  `${leakedOther.length} of ${OTHER_CASE_FIELDS.length} leaked${leakedOther.length ? `: ${leakedOther.join(", ")}` : ""}`,
  leakedOther.length === 0,
);
/**
 * ⛔⛔ And Submit must be reachable. A required field that is hidden but still
 * counted would disable the button forever — the `requireOneOf` landmine in
 * another spelling. Checked by filling only what renders.
 */
const filledAssign: Record<string, string> = {
  issue: ISSUE_AUTO_ASSIGN_REQUEST,
  member: "AMARA OKONKWO",
  assignmentScope: ASSIGNMENT_SCOPE_ALL,
};
check(
  "filling only the visible required fields enables Submit",
  `required visible: ${assignVisible.filter((f) => f.required && !f.requiredNotEnforced).map((f) => f.id).join(", ")}`,
  areRequiredFieldsFilled(ASSIGN_CASE.fields, filledAssign),
);
check(
  "...and leaving the scope empty still blocks it",
  "assignmentScope blank",
  !areRequiredFieldsFilled(ASSIGN_CASE.fields, {
    issue: ISSUE_AUTO_ASSIGN_REQUEST,
    member: "AMARA OKONKWO",
  }),
);
check(
  "...and names no time sequence, because it asks no times",
  `timeSequence=${JSON.stringify(ASSIGN_CASE.timeSequence)}`,
  ASSIGN_CASE.timeSequence === undefined,
);
check(
  "it maps to its own Zendesk equivalent",
  `${ASSIGN_CASE.zendeskEquivalent}`,
  ASSIGN_CASE.zendeskEquivalent === "Driver assignment request",
);
check(
  "it resolves in the CS queue, not by auto-resolve",
  `${ASSIGN_CASE.resolution}`,
  ASSIGN_CASE.resolution === "cs-queue",
);

/**
 * ⛔ The negative control: none of this block exists on any other case.
 *
 * ⚠️ Enumerated separately from `EXPECTED_ASSIGN_FIELDS`, because that list is
 * what RENDERS at rest and `assignmentReasonOther` is hidden until its answer
 * is picked. Deriving the denominator from the visible set would have left the
 * one conditional field unchecked for leakage — the exact way a denominator
 * goes quietly short.
 */
const PLAIN_CASE_IDS = buildSupportFormCase().fields.map((f) => f.id);
const ASSIGN_OWN_FIELDS = [
  "member",
  "assignmentReason",
  "assignmentReasonOther",
  "assignmentNotes",
];
const leaked = ASSIGN_OWN_FIELDS.filter((id) => PLAIN_CASE_IDS.includes(id));
check(
  "the block is absent when autoAssign is not passed",
  `${leaked.length} of ${ASSIGN_OWN_FIELDS.length} leaked`,
  leaked.length === 0,
);

const memberField = ASSIGN_CASE.fields.find((f) => f.id === "member")!;
check(
  "the member is a picker, prefilled from the ride and LOCKED",
  `type=${memberField.type} prefillFrom=${memberField.prefillFrom} locked=${memberField.lockWhenPrefilled}`,
  memberField.type === "member-picker" &&
    memberField.prefillFrom === "riderName" &&
    memberField.lockWhenPrefilled === true,
);

const scopeField = ASSIGN_CASE.fields.find((f) => f.id === "assignmentScope")!;
check(
  "the scope select offers the declared options, from lib",
  `${scopeField.options?.length} of ${ASSIGNMENT_SCOPES.length}`,
  scopeField.options?.length === ASSIGNMENT_SCOPES.length &&
    scopeField.required === true,
);
/**
 * ⚠️ The shared `select` primitive does not wrap and does not ellipsize — a
 * long option is cut mid-word. Learned on Can't Reach Member, re-asserted here
 * because the next person to add a scope will not have been there.
 */
const tooLong = ASSIGNMENT_SCOPES.filter((o) => o.label.length > MAX_SCOPE_LABEL_CHARS);
check(
  `every scope label fits the un-wrapping select (<=${MAX_SCOPE_LABEL_CHARS})`,
  tooLong.length
    ? tooLong.map((o) => `${o.label} (${o.label.length})`).join(" | ")
    : `longest ${Math.max(...ASSIGNMENT_SCOPES.map((o) => o.label.length))} of ${ASSIGNMENT_SCOPES.length}`,
  tooLong.length === 0,
);

/**
 * ⛔⛔ **Every scope that owes a schedule has a field to put one in, and the
 * one that owes nothing has none.**
 *
 * This is the point of the whole block. "All their future trips" needs no
 * schedule; a standing order and a specific trip each need a different kind.
 * The failure this guards is a scope with NO schedule field — Support gets
 * "set up a standing order" with nothing to match trips against — and it is
 * invisible on screen, because the form simply shows one field fewer.
 */
const SCHEDULE_FIELDS: Record<string, string> = {
  [ASSIGNMENT_SCOPE_STANDING]: "standingOrderSchedule",
  [ASSIGNMENT_SCOPE_SPECIFIC]: "specificTripWhen",
};
check(
  "the scopes owing a schedule are exactly the ones with a schedule field",
  `owing: ${SCOPES_NEEDING_SCHEDULE.join(", ")} | fields for: ${Object.keys(SCHEDULE_FIELDS).join(", ")}`,
  SCOPES_NEEDING_SCHEDULE.length === Object.keys(SCHEDULE_FIELDS).length &&
    SCOPES_NEEDING_SCHEDULE.every((scope) => SCHEDULE_FIELDS[scope]),
);
for (const scope of ASSIGNMENT_SCOPES) {
  const values = { issue: ISSUE_AUTO_ASSIGN_REQUEST, assignmentScope: scope.value };
  const visible = ASSIGN_CASE.fields
    .filter((f) => isFieldVisible(f, values))
    .map((f) => f.id);
  const owed = SCHEDULE_FIELDS[scope.value];
  check(
    `"${scope.label}" ${owed ? `reveals ${owed}` : "asks for no schedule"}`,
    `visible: ${visible.join(", ")}`,
    owed
      ? visible.includes(owed) &&
        // ...and ONLY its own. A standing order must not be asked for a
        // specific trip's date, or the form would ask the same question twice
        // in two shapes.
        Object.values(SCHEDULE_FIELDS)
          .filter((id) => id !== owed)
          .every((id) => !visible.includes(id))
      : Object.values(SCHEDULE_FIELDS).every((id) => !visible.includes(id)),
  );
  check(
    `...and Submit for "${scope.label}" needs ${owed ?? "no schedule"}`,
    `required visible: ${ASSIGN_CASE.fields
      .filter((f) => isFieldVisible(f, values) && f.required && !f.requiredNotEnforced)
      .map((f) => f.id)
      .join(", ")}`,
    owed
      ? !areRequiredFieldsFilled(ASSIGN_CASE.fields, {
          ...values,
          member: "AMARA OKONKWO",
        }) &&
        areRequiredFieldsFilled(ASSIGN_CASE.fields, {
          ...values,
          member: "AMARA OKONKWO",
          [owed]: "every Tue and Thu, 9:40 AM",
        })
      : areRequiredFieldsFilled(ASSIGN_CASE.fields, {
          ...values,
          member: "AMARA OKONKWO",
        }),
  );
}
/**
 * ⛔⛔ **Help text that quotes an option must quote one that EXISTS.**
 *
 * Found by walking: the scope field's help said Pick \u201cjust a specific trip\u201d
 * while the select offered \u201cOnly a specific trip\u201d. Help text pointing at a
 * choice that is not on the list is worse than no help — the driver looks for
 * it, does not find it, and distrusts the rest of the form. Swept over every
 * select on every case rather than this one field, because the next person to
 * write help text will not have been here.
 */
const QUOTED = /[\u201c\u201d"]([^\u201c\u201d"]{3,60})[\u201c\u201d"]/g;
let quotesChecked = 0;
const badQuotes: string[] = [];
for (const supportCase of [ASSIGN_CASE, buildSupportFormCase(), reachCase]) {
  for (const field of supportCase.fields) {
    if (field.type !== "select" || !field.options || !field.helpText) continue;
    for (const match of field.helpText.matchAll(QUOTED)) {
      quotesChecked += 1;
      const phrase = match[1];
      if (!field.options.some((o) => o.label === phrase)) {
        badQuotes.push(`${field.id}: \u201c${phrase}\u201d`);
      }
    }
  }
}
check(
  "every option quoted in a select's help text is a real option",
  badQuotes.length
    ? badQuotes.join(" | ")
    : `${quotesChecked} quoted phrase(s) across 3 case(s), all matched`,
  badQuotes.length === 0,
);
check(
  "...and the sweep found a quote to check, rather than passing on nothing",
  `${quotesChecked} quoted phrase(s)`,
  quotesChecked > 0,
);

/** The two schedule fields are different SHAPES, not one field copied. */
check(
  "a standing order's schedule is free text; a specific trip's is a datetime",
  `${ASSIGN_CASE.fields.find((f) => f.id === "standingOrderSchedule")?.type} / ${ASSIGN_CASE.fields.find((f) => f.id === "specificTripWhen")?.type}`,
  ASSIGN_CASE.fields.find((f) => f.id === "standingOrderSchedule")?.type === "text" &&
    ASSIGN_CASE.fields.find((f) => f.id === "specificTripWhen")?.type === "datetime",
);
/** And the scope that owes nothing really is reachable and really owes nothing. */
check(
  "the no-schedule scope is one of the offered answers",
  ASSIGNMENT_SCOPE_ALL,
  ASSIGNMENT_SCOPES.some((o) => o.value === ASSIGNMENT_SCOPE_ALL) &&
    !SCOPES_NEEDING_SCHEDULE.includes(ASSIGNMENT_SCOPE_ALL),
);

// ---- the entry point -----------------------------------------------------

check(
  "More Options opens the shared form",
  "<AutoAssignRequestForm",
  ASSIGN_SOURCES.more.includes("<AutoAssignRequestForm"),
);
check(
  "...and builds no case of its own",
  `buildSupportFormCase occurrences: ${(ASSIGN_SOURCES.more.match(/buildSupportFormCase/g) ?? []).length}`,
  !ASSIGN_SOURCES.more.includes("buildSupportFormCase"),
);
check(
  "the tile label comes from lib, not a string in the grid",
  AUTO_ASSIGN_LABEL,
  ASSIGN_SOURCES.more.includes("label: AUTO_ASSIGN_LABEL"),
);

/**
 * ⛔⛔ **Filing changes nothing.** No trip state, no confirmation, no Pending.
 * Checked three ways because each one alone is weak: the declared constant, the
 * absence of a tracked status, and the absence of any trip-context resolution —
 * that last one is what would silently attach the request to the ride it was
 * opened from.
 */
check(
  "the decision is named in lib, not left implicit in the form",
  `AUTO_ASSIGN_CHANGES_NOTHING=${AUTO_ASSIGN_CHANGES_NOTHING}`,
  AUTO_ASSIGN_CHANGES_NOTHING === true,
);
check(
  "filing tracks no status, because there is none to track",
  "appTracksStatus: false",
  ASSIGN_SOURCES.form.includes("appTracksStatus: false"),
);
/**
 * ⚠️ Matches a CALL — `resolveTripContext(` — not the bare name. The first
 * version grepped the name and failed on the form's own comment saying the
 * function is deliberately NOT called: the same trap `verify-base`'s FORBIDDEN
 * list carries, where a string in a comment fails the build.
 */
check(
  "...and the request is not attached to the ride it was opened from",
  `resolveTripContext( calls: ${(ASSIGN_SOURCES.form.match(/resolveTripContext\(/g) ?? []).length}`,
  !/resolveTripContext\(/.test(ASSIGN_SOURCES.form),
);
check(
  "...and nothing in the form confirms, advances or completes a trip",
  "confirmTrip / submitSwipe / postponePickup",
  !/confirmTrip|submitSwipe|postponePickup/.test(ASSIGN_SOURCES.form),
);

// ---- the prefill actually resolves ---------------------------------------

const ASSIGN_RIDE = mockInProgressTrips.find((t) => t.id === "1049800393");
check(
  "row 09's scenario ride is seeded and tagged",
  ASSIGN_RIDE ? `${ASSIGN_RIDE.id} — ${ASSIGN_RIDE.scenario?.code} — ${ASSIGN_RIDE.rider}` : "MISSING",
  Boolean(ASSIGN_RIDE) && isScenarioFor(ASSIGN_RIDE!, "auto-assign-request"),
);
const assignBuilt = buildAutoAssignRequest(ASSIGN_RIDE!);
check(
  "the form opens with the member already filled from that ride",
  `member=${assignBuilt.initialValues.member} issue=${assignBuilt.initialValues.issue}`,
  assignBuilt.initialValues.member === ASSIGN_RIDE!.rider &&
    assignBuilt.initialValues.issue === ISSUE_AUTO_ASSIGN_REQUEST,
);
/**
 * ⛔⛔ **The locked picker renders the member's RIDE COUNT, and that is the only
 * checkable evidence in the whole request.** If the member cannot be resolved
 * from `member-options`, the locked branch renders nothing and the field falls
 * through to an empty search box — a required, supposedly-locked field showing
 * a placeholder, which is precisely the defect the Can't Reach leg picker had
 * and which all four gates missed.
 */
const resolvedMember = getMemberOptions().find((m) => m.name === ASSIGN_RIDE!.rider);
check(
  "...and that member resolves in the picker, with history to show",
  resolvedMember
    ? `${resolvedMember.name} — ${resolvedMember.client} — ${resolvedMember.tripCount} trip(s) in ${MEMBER_WINDOW_DAYS}d`
    : "UNRESOLVED — the locked picker would render an empty search box",
  Boolean(resolvedMember) && resolvedMember!.tripCount >= 2,
);
/** The window has to exclude something real, or it is decorative. */
check(
  "the member window excludes a member the driver really drove",
  `${getMemberOptions().length} inside the ${MEMBER_WINDOW_DAYS}-day window of ${new Set(mockCompletedTrips.map((t) => t.rider)).size} driven`,
  getMemberOptions().length < new Set(mockCompletedTrips.map((t) => t.rider)).size,
);

// ---- row 10, the Request Feed member filter ------------------------------

check(
  "the filter sheet offers a Member row",
  'placeholder="Member"',
  ASSIGN_SOURCES.sheet.includes('placeholder="Member"') &&
    ASSIGN_SOURCES.sheet.includes("memberFilterOptions()"),
);
/**
 * ⛔ **The feed applies the GATED filters, not the raw ones.** B3d made the
 * member filter row 10's proposal, so the object the feed narrows by is
 * `applied` — `appliedFilters` run through `applicableFilters`. Reading the raw
 * object here would narrow the feed in `"now"` by a control that is not on
 * screen. §26 runs the rule itself; this asserts the feed is wired to it.
 */
check(
  "...and the feed actually applies it, through the gate",
  `filterRequestsByMember(result, applied.member): ${ASSIGN_SOURCES.feed.includes("filterRequestsByMember(result, applied.member)")}`,
  ASSIGN_SOURCES.feed.includes("filterRequestsByMember(result, applied.member)") &&
    ASSIGN_SOURCES.feed.includes("applicableFilters(appliedFilters, demo)"),
);
/**
 * ⛔ Both halves of the scenario read ONE member list. The form picks from
 * `member-options` and so does the filter; if they diverged, a driver could file
 * a request for a member the filter cannot find, or the reverse.
 */
const filterNames = memberFilterOptions().map((o) => o.value);
check(
  "the filter and the form draw on the same member list",
  `${filterNames.length} filter option(s) vs ${getMemberOptions().length} picker option(s)`,
  filterNames.length === getMemberOptions().length &&
    getMemberOptions().every((m) => filterNames.includes(m.name)),
);

/** Declared, because a filter that finds one trip is indistinguishable from a
 *  filter that ignores its argument. */
const EXPECTED_FEED_HITS: Record<string, number> = {
  "AMARA OKONKWO": 3,
  "THEODORE ASHBY": 0,
};
for (const [name, expected] of Object.entries(EXPECTED_FEED_HITS)) {
  const hits = filterRequestsByMember(mockRequestTrips, name);
  check(
    `filtering the feed to ${name} returns ${expected}`,
    `${hits.length} of ${mockRequestTrips.length} — ${hits.map((t) => t.scenario?.code ?? t.id).join(", ")}`,
    hits.length === expected,
  );
}
check(
  "the demo member's trips span more than one day, so the filter is not day-scoped by accident",
  `${new Set(filterRequestsByMember(mockRequestTrips, "AMARA OKONKWO").map((t) => t.date)).size} distinct day(s)`,
  new Set(filterRequestsByMember(mockRequestTrips, "AMARA OKONKWO").map((t) => t.date)).size >= 2,
);
check(
  "an empty result is a REAL case, so the filter can be seen finding nothing",
  `${Object.values(EXPECTED_FEED_HITS).filter((n) => n === 0).length} of ${Object.keys(EXPECTED_FEED_HITS).length} declared empty`,
  Object.values(EXPECTED_FEED_HITS).some((n) => n === 0) &&
    Object.values(EXPECTED_FEED_HITS).some((n) => n > 0),
);
check(
  "no filter returns the whole feed, which would be a filter doing nothing",
  `max hits ${Math.max(...Object.values(EXPECTED_FEED_HITS))} of ${mockRequestTrips.length}`,
  Math.max(...Object.values(EXPECTED_FEED_HITS)) < mockRequestTrips.length,
);

/** ⛔ A multi-load has no one member and must never match one. */
const groupRides = mockRequestTrips.filter(isGroupRide);
check(
  `group rides exist to be excluded (prefix "${GROUP_RIDER_PREFIX}")`,
  `${groupRides.length} of ${mockRequestTrips.length} — ${groupRides.map((t) => t.rider).join(", ")}`,
  groupRides.length > 0,
);
check(
  "...and no member filter ever returns one",
  `${memberFilterOptions().filter((o) => filterRequestsByMember(mockRequestTrips, o.value).some(isGroupRide)).length} of ${memberFilterOptions().length} member(s) matched a group ride`,
  memberFilterOptions().every(
    (o) => !filterRequestsByMember(mockRequestTrips, o.value).some(isGroupRide),
  ),
);
check(
  "an empty member leaves the feed untouched, rather than returning nothing",
  `${filterRequestsByMember(mockRequestTrips, "").length} of ${mockRequestTrips.length}`,
  filterRequestsByMember(mockRequestTrips, "").length === mockRequestTrips.length,
);

// ---- the deep link the catalogue points at -------------------------------

/**
 * ⛔⛔ Row 10 is the FIRST entry route carrying its own query string, and the
 * naive `${route}?solution=${id}` both call sites used would have produced a
 * second `?`. Checked on the helper, and then on the real catalogue routes.
 */
check(
  "solutionHref joins with & when the route already has a query",
  solutionHref("/requests?member=X", "row-10"),
  solutionHref("/requests?member=X", "row-10") === "/requests?member=X&solution=row-10",
);
check(
  "...and still joins with ? when it does not",
  solutionHref("/my-rides", "row-10"),
  solutionHref("/my-rides", "row-10") === "/my-rides?solution=row-10",
);
const everyRoute = SOLUTIONS.filter((s) => s.entry).flatMap((s) => [
  s.entry!.route,
  ...(s.entry!.alternates ?? []).map((a) => a.route),
]);
const doubleQuery = everyRoute.filter(
  (r) => (solutionHref(r, "x").match(/\?/g) ?? []).length !== 1,
);
check(
  "no catalogue route produces a second ? once the solution id is attached",
  doubleQuery.length ? doubleQuery.join(", ") : `${everyRoute.length} route(s), all single-query`,
  doubleQuery.length === 0,
);
check(
  "both call sites use the helper rather than building the href themselves",
  "solutionHref in context + strip",
  readFileSync(join(ROOT, "lib/solutions/solution-context.tsx"), "utf8").includes("solutionHref(target,") &&
    readFileSync(join(ROOT, "components/solutions-dev/solution-strip.tsx"), "utf8").includes("solutionHref(alternate.route,"),
);

/**
 * ⛔⛔ **A page that positions a child `absolute` must position ITSELF.**
 *
 * `app/requests/page.tsx` floats its filter button at `absolute right-14 top-2`.
 * With no positioned ancestor that resolved against the VIEWPORT, so the button
 * escaped the page entirely and landed inside the solutions strip's header row
 * — overlapping the strip's controls and swallowing the tap that opens the
 * solution picker. Typecheck, all four verify scripts and `next build` were
 * green with that on screen; it took trying to switch solutions FROM the
 * Request Feed to see it, which only became a thing anyone would do when row 10
 * made `/requests` an entry route.
 *
 * Scanned across every page with a denominator, because the next page to float
 * something will not remember this.
 */
const REQUESTS_PAGE = readFileSync(join(ROOT, "app/requests/page.tsx"), "utf8");
check(
  "the Request Feed anchors its floating filter button to the page",
  'root div carries "relative"',
  /<div className="relative flex h-screen/.test(REQUESTS_PAGE),
);
check(
  "...and it really does float that button, so the anchor matters",
  `absolute+top on the filter button: ${/aria-label="Filter Requests"[\s\S]{0,200}absolute/.test(REQUESTS_PAGE) || /absolute[\s\S]{0,200}aria-label="Filter Requests"/.test(REQUESTS_PAGE)}`,
  /className="absolute right-14 top-2/.test(REQUESTS_PAGE),
);
/**
 * ⚠️ **Scoped to this page, and that is a real limitation, not a choice.**
 *
 * A source regex cannot answer the question that matters — whether a given
 * `absolute` element has a positioned ANCESTOR — because that is a property of
 * the rendered tree, not of one file. A broad scan over `app/**\/page.tsx` finds
 * ten pages that float something and flags eight of them, nearly all because an
 * `absolute` badge sits inside its own `relative` button several levels down.
 * Asserting on that would be a check that fails for the wrong reason.
 *
 * So this asserts the one page this slice measured in the browser and fixed.
 * ⛔ The other nine floating pages have NOT been audited against the solutions
 * strip; `/requests` was found only because row 10 made it an entry route and
 * someone tried to switch solutions from it.
 */
// ---- the case says the MEMBER asked, not the driver ----------------------

/**
 * ⛔⛔ **The whole case turns on whose request this is.** User direction
 * 2026-10-12: *"I just want explicit that the member has agreed and it's not
 * just the driver asking."* A label saying "ask to be their regular driver"
 * describes a driver putting themselves forward, and Support would have had to
 * establish consent before acting on any of it.
 */
for (const [what, text] of [
  ["tile label", AUTO_ASSIGN_LABEL],
  ["issue label", SUPPORT_ISSUE_TYPES.find((i) => i.value === ISSUE_AUTO_ASSIGN_REQUEST)!.label],
] as const) {
  check(
    `the ${what} says the member requested, not that the driver is asking`,
    text,
    /member/i.test(text) && /request/i.test(text) && !/^ask\b/i.test(text),
  );
}
check(
  `the tile label fits three wrapped lines (<=${MAX_TILE_LABEL_CHARS})`,
  `${AUTO_ASSIGN_LABEL.length} chars`,
  AUTO_ASSIGN_LABEL.length <= MAX_TILE_LABEL_CHARS,
);
/**
 * ⛔⛔ **The field beneath the member has been rewritten twice, and the second
 * rewrite is the one that matters.**
 *
 * v1 asked why the DRIVER wanted it. v2, when the tile was renamed, asked WHO
 * had asked. Both described the request's provenance, and neither told Support
 * anything it could act on — once the case says the member requested this
 * driver, the next question is not who said so, it is **what to set up**.
 * Removed on user direction 2026-10-12: *"The options for who asked for you
 * doesn't make sense, please just remove."*
 *
 * ⛔ Asserted as an ABSENCE with the old ids named, because a field block that
 * is merely unreferenced still renders.
 */
const RETIRED_ASSIGN_FIELDS = ["assignmentReason", "assignmentReasonOther"];
const stillPresent = RETIRED_ASSIGN_FIELDS.filter((id) =>
  ASSIGN_CASE.fields.some((f) => f.id === id),
);
check(
  "the retired provenance fields are gone from the case",
  stillPresent.length
    ? stillPresent.join(", ")
    : `${RETIRED_ASSIGN_FIELDS.length} retired id(s), none present`,
  stillPresent.length === 0,
);
check(
  "...and nothing in the repo still reads them",
  RETIRED_ASSIGN_FIELDS.join(", "),
  !RETIRED_ASSIGN_FIELDS.some(
    (id) =>
      readFileSync(join(ROOT, "lib/support-data/case-registry.ts"), "utf8").includes(id) ||
      readFileSync(join(ROOT, "lib/driver-data/member-assignment.ts"), "utf8").includes(id),
  ),
);
/** What replaced them asks about the WORK, not the provenance. */
check(
  "the field beneath the member asks what to set up, not who asked or why",
  scopeField.label ?? "",
  /trips/i.test(scopeField.label ?? "") &&
    !/who|why/i.test(scopeField.label ?? ""),
);
check(
  "...and its three answers are three different pieces of work",
  ASSIGNMENT_SCOPES.map((o) => o.label).join(" | "),
  ASSIGNMENT_SCOPES.length === 3 &&
    ASSIGNMENT_SCOPES.some((o) => /all/i.test(o.label)) &&
    ASSIGNMENT_SCOPES.some((o) => /standing order/i.test(o.label)) &&
    ASSIGNMENT_SCOPES.some((o) => /specific/i.test(o.label)),
);

// ---- the end-of-leg prompt -----------------------------------------------

const PROMPT_SOURCE = readFileSync(
  join(ROOT, "components/driver/preferred-driver-prompt.tsx"),
  "utf8",
);
const DETAIL_SOURCE = readFileSync(
  join(ROOT, "components/driver/ride-detail-layout.tsx"),
  "utf8",
);
check("the prompt source was read", `${PROMPT_SOURCE.length} chars`, PROMPT_SOURCE.length > 1200);

/**
 * ⛔⛔ **It asks; it does not file.** Answering yes opens the same form the tile
 * opens, with the member locked. A one-tap yes that submitted on its own would
 * turn a prompt the driver barely read into a claim about what a member wanted.
 */
check(
  "answering yes opens the shared form rather than filing anything",
  "<AutoAssignRequestForm",
  DETAIL_SOURCE.includes("<AutoAssignRequestForm") &&
    !PROMPT_SOURCE.includes("submitForm"),
);
check(
  "...and the prompt builds no case of its own",
  `buildSupportFormCase occurrences: ${(PROMPT_SOURCE.match(/buildSupportFormCase/g) ?? []).length}`,
  !PROMPT_SOURCE.includes("buildSupportFormCase"),
);
/** It fires after the signature, not before — the member has to be done first. */
check(
  "the prompt is raised from the signature handler, after the mark lands",
  "handleSignatureSubmit -> recordSwipe -> setPreferredOpen",
  /handleSignatureSubmit[\s\S]{0,900}recordSwipe\(leg, "droppedOffAt"[\s\S]{0,900}setPreferredOpen\(true\)/.test(
    DETAIL_SOURCE,
  ),
);
/**
 * ⛔ And only once there is nothing left to reconstruct. A driver who still owes
 * a pick-up time is mid-correction; stacking an unrelated question on that is
 * how both get dismissed.
 */
check(
  "...and never while a missed-swipe form is still owed",
  "remaining.length > 0 returns before the ask",
  /if \(remaining\.length > 0\) \{[\s\S]{0,160}return;[\s\S]{0,400}setPreferredOpen\(true\)/.test(
    DETAIL_SOURCE,
  ),
);

/**
 * ⛔⛔ **The opt-out is per MEMBER, and applies on BOTH answers.** A standing
 * order is a weekly ride, so a per-trip flag would ask the same driver about
 * the same person every week. And a driver who ticks it then taps Yes has said
 * "I've told you, stop asking" just as much as one who taps No.
 */
check(
  "the opt-out is applied whichever way the driver answers",
  "optOut before the requested branch",
  /if \(optOut\) optOutOfPreferredDriverAsk\(trip\.rider\);[\s\S]{0,120}if \(!requested\) return;/.test(
    DETAIL_SOURCE,
  ),
);
check(
  "...and it is keyed by the member, not the trip or the leg",
  "optOutOfPreferredDriverAsk(trip.rider)",
  DETAIL_SOURCE.includes("optOutOfPreferredDriverAsk(trip.rider)") &&
    !/optOutOfPreferredDriverAsk\(trip\.id\)/.test(DETAIL_SOURCE),
);

/** The three conditions of the rule, as a table. */
const ASK_TRIP = mockInProgressTrips.find((t) => t.id === "1049800393")!;
const GROUP_TRIP = mockRequestTrips.find(isGroupRide)!;
const ASK_CASES: Array<{ name: string; args: Parameters<typeof shouldAskPreferredDriver>[0]; expect: boolean }> = [
  {
    name: "row 09 focused, member not opted out",
    args: { trip: ASK_TRIP, focus: FIXED("auto-assign-request"), suppressedMembers: [] },
    expect: true,
  },
  {
    name: "row 10 focused — same build, so still asked",
    args: { trip: ASK_TRIP, focus: FIXED("request-feed-member-filter"), suppressedMembers: [] },
    expect: true,
  },
  {
    name: "nothing focused — the plain mirror filters nothing",
    args: { trip: ASK_TRIP, focus: FIXED(null), suppressedMembers: [] },
    expect: true,
  },
  {
    name: "another prototype focused — a proposal stays in its own build",
    args: { trip: ASK_TRIP, focus: FIXED("missed-swipe"), suppressedMembers: [] },
    expect: false,
  },
  {
    name: "the member opted out",
    args: { trip: ASK_TRIP, focus: FIXED(null), suppressedMembers: [ASK_TRIP.rider] },
    expect: false,
  },
  {
    name: "a DIFFERENT member opted out — this one is still asked",
    args: { trip: ASK_TRIP, focus: FIXED(null), suppressedMembers: ["SOMEONE ELSE"] },
    expect: true,
  },
  {
    name: "a multi-load — no one member to have a preference",
    args: { trip: GROUP_TRIP, focus: FIXED(null), suppressedMembers: [] },
    expect: false,
  },
];
for (const c of ASK_CASES) {
  check(
    `ask the preferred-driver question — ${c.name}: ${c.expect}`,
    `got ${shouldAskPreferredDriver(c.args)}`,
    shouldAskPreferredDriver(c.args) === c.expect,
  );
}
check(
  "the ask table exercises both outcomes and all three conditions",
  `${ASK_CASES.filter((c) => c.expect).length} yes / ${ASK_CASES.filter((c) => !c.expect).length} no of ${ASK_CASES.length}`,
  ASK_CASES.some((c) => c.expect) && ASK_CASES.filter((c) => !c.expect).length >= 3,
);
/** The scope list is shared with the tile, not written out twice. */
check(
  "the prompt and the tile agree on which build this feature belongs to",
  PREFERRED_DRIVER_SOLUTIONS.join(", "),
  PREFERRED_DRIVER_SOLUTIONS.length === PROPOSAL_OWNERS["auto-assign"].length &&
    PROPOSAL_OWNERS["auto-assign"].every((id) => PREFERRED_DRIVER_SOLUTIONS.includes(id)),
);

// ---- the two rows are one build ------------------------------------------

const ROW_09 = SOLUTIONS.find((s) => s.id === "auto-assign-request")!;
const ROW_10 = SOLUTIONS.find((s) => s.id === "request-feed-member-filter")!;
check(
  "rows 09 and 10 point at each other as one build",
  `${ROW_09.order}->${ROW_09.sharedBuildWith} / ${ROW_10.order}->${ROW_10.sharedBuildWith}`,
  ROW_09.sharedBuildWith === ROW_10.id && ROW_10.sharedBuildWith === ROW_09.id,
);
check(
  "...and they share the subject area and its call total",
  `${ROW_09.subjectArea} ${ROW_09.calls} / ${ROW_10.subjectArea} ${ROW_10.calls}`,
  ROW_09.subjectArea === ROW_10.subjectArea && ROW_09.calls === ROW_10.calls,
);
/**
 * ⛔ Rows 11 and 12 are the same subject area and are NOT buildable — a one-off
 * data cleanse and a backend path, neither with a driver-facing surface. They
 * must stay `not-yet` with a null entry, or the catalogue would claim a
 * prototype demonstrates something that has no screen.
 */
const SAME_AREA_NO_SURFACE = ["vehicle-capacity-cleanse", "vehicle-capacity-backend"];
check(
  "the subject area's two no-surface rows stay unbuilt, with a reason",
  `${SAME_AREA_NO_SURFACE.length} row(s) checked`,
  SAME_AREA_NO_SURFACE.every((id) => {
    const row = SOLUTIONS.find((r) => r.id === id);
    return (
      row?.klass === "no-app-surface" &&
      row.buildState === "not-yet" &&
      row.entry === null &&
      Boolean(row.noSurfaceReason)
    );
  }),
);

/**
 * ⚠️ The scope boundary, asserted rather than only written down. Row 09 is the
 * support request that absorbs these calls today; `Project - Standing Order
 * Offers` is building the system that actually assigns. The catalogue has to
 * SAY so, or the next reader builds the second one here.
 */
check(
  "row 09 flags what it does NOT do, in the locked vocabulary",
  ROW_09.proposedFeature.slice(-90),
  ROW_09.proposedFeature.includes("⚠️ Not in prototype yet") &&
    ROW_09.proposedFeature.includes("Standing Order Offers"),
);

// ---------------------------------------------------------------------------
console.log("\n12. Send-back — row 13, a reason on every send-back");
// ---------------------------------------------------------------------------

const SB_SOURCES = {
  rules: readFileSync(join(ROOT, "lib/driver-data/send-back-reasons.ts"), "utf8"),
  form: readFileSync(join(ROOT, "components/support/send-back-reason-form.tsx"), "utf8"),
  penalty: readFileSync(join(ROOT, "components/driver/send-back-penalty-dialog.tsx"), "utf8"),
  more: readFileSync(join(ROOT, "components/driver/more-options-screen.tsx"), "utf8"),
  rides: readFileSync(join(ROOT, "app/my-rides/page.tsx"), "utf8"),
};
for (const [name, src] of Object.entries(SB_SOURCES)) {
  check(`the ${name} source was read`, `${src.length} chars`, src.length > 900);
}

// ---- the reason list is PRODUCTION'S, not invented -----------------------

/**
 * ⛔⛔ **The single most important check in this section.** The reasons are
 * production's own CS Tool `DRIVER INITIATED` strings, captured in
 * `Project - CS Tool React Migration/Phase 1/References/Screenshot Context
 * Log.md`. Every reason a driver is offered must appear in that array by EXACT
 * string — not paraphrased, not re-cased, not "close enough".
 */
const invented = DRIVER_ANSWERABLE_REASONS.filter(
  (r) => !CS_TOOL_DRIVER_INITIATED_REASONS.includes(r),
);
check(
  "every offered reason is a verbatim production string",
  invented.length
    ? `INVENTED: ${invented.join(", ")}`
    : `${DRIVER_ANSWERABLE_REASONS.length} of ${CS_TOOL_DRIVER_INITIATED_REASONS.length} captured strings offered`,
  invented.length === 0,
);
check(
  "...and the captured list is seeded WITH its duplication, as evidence",
  `${CS_TOOL_DRIVER_INITIATED_REASONS.length} captured, ${dedupedDriverInitiatedReasons().length} distinct`,
  CS_TOOL_DRIVER_INITIATED_REASONS.length === 22 &&
    // ⚠️ FOUR `OTHER`s in the DRIVER INITIATED list (entries 3, 9, 10, 11), so
    // 22 captured collapse to 19 distinct. The project's open question says
    // "`OTHER` ~6×" — that count is across ALL THREE categories; this list is
    // one of them. Both literals are declared so the pair cannot drift.
    CS_TOOL_DRIVER_INITIATED_REASONS.filter((r) => r === "OTHER").length === 4 &&
    dedupedDriverInitiatedReasons().length === 19,
);
/**
 * ⛔ The narrowing is the point, so it has to be visible. If the allow-list ever
 * equals the captured list, someone has quietly handed a driver an agent's
 * vocabulary — `DRIVER NO SHOW`, `vehicle shortage`, `REQUESTED BY VERIDA`.
 */
const AGENT_ONLY = [
  "TRANSFER TO ANOTHER DRIVER", "DRIVER NO SHOW", "DRIVER CANCELLED",
  "REQUESTED BY VERIDA", "MEDIFAM ER", "RidesCanceledbyTP",
  "vehicle shortage", "driver shortage", "too many trips",
  "too much volume with same time period", "wrong level of service assigned",
  "outside operational hours", "member no longer attends",
];
const leakedAgent = AGENT_ONLY.filter((r) => DRIVER_ANSWERABLE_REASONS.includes(r));
check(
  "no agent-only reason is offered to a driver",
  leakedAgent.length
    ? leakedAgent.join(", ")
    : `${AGENT_ONLY.length} agent-only string(s) withheld of ${CS_TOOL_DRIVER_INITIATED_REASONS.length} captured`,
  leakedAgent.length === 0,
);
check(
  "...and the narrowing actually narrows",
  `${DRIVER_ANSWERABLE_REASONS.length} offered of ${dedupedDriverInitiatedReasons().length} distinct`,
  DRIVER_ANSWERABLE_REASONS.length < dedupedDriverInitiatedReasons().length,
);
/** The driver-facing wording is a relabel; the VALUE stays production's. */
const opts = sendBackReasonOptions();
check(
  "the stored value is production's string even where the label is not",
  `${opts.filter((o) => o.label !== o.value).length} of ${opts.length} relabelled`,
  opts.every((o) => CS_TOOL_DRIVER_INITIATED_REASONS.includes(o.value)) &&
    opts.some((o) => o.label !== o.value),
);
const sbTooLong = opts.filter((o) => o.label.length > MAX_SEND_BACK_LABEL_CHARS);
check(
  `every reason label fits the un-wrapping select (<=${MAX_SEND_BACK_LABEL_CHARS})`,
  sbTooLong.length
    ? sbTooLong.map((o) => `${o.label} (${o.label.length})`).join(" | ")
    : `longest ${Math.max(...opts.map((o) => o.label.length))} of ${opts.length}`,
  sbTooLong.length === 0,
);

// ---- the field is not the warehouse's `sendback_calculation_reason` -------

/**
 * ⛔⛔ `sendback_calculation_reason` is the warehouse's PENALTY RULE, and the
 * Balance Dashboard already prints it as "the send-back reason". Naming this
 * field `sendBackReason` would invite someone to join two unrelated things.
 */
const SB_CASE = buildSupportFormCase({
  includeIssues: [ISSUE_SEND_BACK_REASON],
  sendBack: true,
});
const sbIds = SB_CASE.fields.map((f) => f.id);
check(
  "the driver's answer is `returnReason`, not `sendBackReason`",
  sbIds.filter((id) => /eason/i.test(id)).join(", "),
  sbIds.includes("returnReason") && !sbIds.some((id) => /sendBackReason/i.test(id)),
);
check(
  "...and the collision is written down where the field is defined",
  "sendback_calculation_reason named in lib",
  SB_SOURCES.rules.includes("sendback_calculation_reason"),
);

// ---- the copy does not claim the trip has gone -------------------------

/**
 * ⛔⛔ **Nothing on this form may speak in the past tense.** It is a STEP: the
 * driver is mid-send-back, the button says Continue, and a penalty warning
 * after it still asks whether they are sure. The first draft titled the sheet
 * "Why You Sent This Trip Back" — telling the driver it was already done, on
 * the one screen whose whole design says it is not. Found by walking; no gate
 * can see a tense.
 */
const SB_ISSUE = SUPPORT_ISSUE_TYPES.find((i) => i.value === ISSUE_SEND_BACK_REASON)!;
const PAST_TENSE = /\b(you sent|sent this trip|has been sent|was sent)\b/i;
const sbCopy = [
  ["issue label", SB_ISSUE.label],
  ["issue description", SB_ISSUE.description],
  ...SB_CASE.fields.flatMap((f) =>
    [
      ["field label", f.label],
      ["help text", f.helpText],
    ].filter((pair): pair is [string, string] => Boolean(pair[1])),
  ),
] as Array<[string, string]>;
const pastTense = sbCopy.filter(([, text]) => PAST_TENSE.test(text));
check(
  "no copy on the send-back form says the trip has already gone",
  pastTense.length
    ? pastTense.map(([what, text]) => `${what}: "${text}"`).join(" | ")
    : `${sbCopy.length} string(s) checked, all present-tense`,
  pastTense.length === 0,
);
check(
  "...and the sweep looked at a real number of strings",
  `${sbCopy.length} string(s)`,
  sbCopy.length >= 5,
);

// ---- the case ------------------------------------------------------------

const sbValues = { issue: ISSUE_SEND_BACK_REASON };
const sbVisible = SB_CASE.fields.filter((f) => isFieldVisible(f, sbValues)).map((f) => f.id);
const EXPECTED_SB_FIELDS = ["issue", "returnReason", "returnNotes"];
check(
  "the case renders exactly the declared field set",
  `${sbVisible.length} of ${SB_CASE.fields.length} visible: ${sbVisible.join(", ")}`,
  sbVisible.length === EXPECTED_SB_FIELDS.length &&
    EXPECTED_SB_FIELDS.every((id, i) => sbVisible[i] === id),
);
check(
  "the free-text escape hatch is gated on OTHER being picked",
  `visible with OTHER: ${isFieldVisible(SB_CASE.fields.find((f) => f.id === "returnReasonOther")!, { ...sbValues, returnReason: SEND_BACK_REASON_OTHER })}`,
  isFieldVisible(SB_CASE.fields.find((f) => f.id === "returnReasonOther")!, {
    ...sbValues,
    returnReason: SEND_BACK_REASON_OTHER,
  }) &&
    !isFieldVisible(SB_CASE.fields.find((f) => f.id === "returnReasonOther")!, {
      ...sbValues,
      returnReason: "weather",
    }),
);
/**
 * ⛔⛔ **"Continue", not "Submit".** This form is a STEP — the driver is
 * mid-send-back and the next screen asks whether they are sure. A button saying
 * Submit would tell them they had just sent something, on the one case where
 * they have not.
 */
check(
  "the send-back reason form says Continue, and every other case says Submit",
  `${SB_CASE.submitLabel} vs ${buildSupportFormCase().submitLabel}`,
  SB_CASE.submitLabel === "Continue" &&
    buildSupportFormCase().submitLabel === "Submit" &&
    ASSIGN_CASE.submitLabel === "Submit",
);
check(
  "...and the form files nothing itself — it hands its answers back",
  `submitForm in the reason form: ${SB_SOURCES.form.includes("submitForm")}`,
  !SB_SOURCES.form.includes("submitForm") &&
    SB_SOURCES.form.includes("onCollected"),
);

// ---- the flow ------------------------------------------------------------

const SHORT = mockInProgressTrips.find((t) => t.id === "1049800394")!;
const ADVANCE = mockInProgressTrips.find((t) => t.id === "1049800395")!;
const SO_RIDE = mockInProgressTrips.find((t) => t.id === "1049800396")!;
check(
  "row 13's two scenario rides are seeded and tagged",
  `${SHORT?.scenario?.code} short-notice=${isShortNoticeSendBack(SHORT)} | ${ADVANCE?.scenario?.code} short-notice=${isShortNoticeSendBack(ADVANCE)}`,
  isScenarioFor(SHORT, "send-back-reason-form") &&
    isScenarioFor(ADVANCE, "send-back-reason-form") &&
    isShortNoticeSendBack(SHORT) &&
    !isShortNoticeSendBack(ADVANCE),
);
/**
 * ⛔⛔ **The penalty warning is production's and appears ONLY for a short-notice
 * send-back** — "The popup appears only for short-notice trip send backs."
 * Without the advance branch, a reason form seen only on the way to a penalty
 * screen is indistinguishable from part of that screen.
 */
check(
  "a short-notice send-back reaches the penalty step; an advance one does not",
  `${sendBackSteps(SHORT, PLAIN).join(" → ")} | ${sendBackSteps(ADVANCE, PLAIN).join(" → ")}`,
  sendBackSteps(SHORT, PLAIN).includes("penalty") &&
    !sendBackSteps(ADVANCE, PLAIN).includes("penalty"),
);
check(
  "the reason step sits BEFORE the penalty step, not after it",
  sendBackSteps(SHORT, PLAIN).join(" → "),
  sendBackSteps(SHORT, PLAIN).indexOf("reason") < sendBackSteps(SHORT, PLAIN).indexOf("penalty"),
);
/**
 * ⭐ Production's own popup is built from the screenshot the user supplied on
 * 2026-10-13 — the only place its copy has ever been written down.
 *
 * ⚠️ **Unconditional**: every send-back raises it. Only the penalty warning and
 * the standing-order warning are conditional.
 */
check(
  "production's popup is built and raised on EVERY send-back",
  `SEND_BACK_CONFIRM_BUILT=${SEND_BACK_CONFIRM_BUILT}`,
  SEND_BACK_CONFIRM_BUILT === true &&
    [SHORT, ADVANCE, SO_RIDE].every((t) => sendBackSteps(t, PLAIN).includes("confirm")),
);

/**
 * ⛔⛔ **The whole step matrix**, declared rather than derived. Four screens are
 * possible and which ones appear turns on two independent properties of the
 * trip. A sequence assembled by three separate `if`s in a component is one
 * nobody can read; this is the table it has to agree with.
 *
 * ⚠️ **Order set by the user 2026-10-13.** Production raises its "strongly
 * discouraged" popup FIRST, before anything; here the reason form precedes it.
 * Still a deviation, and declared so a reader who knows the real app does not
 * assume a bug.
 */
const STEP_MATRIX: Array<{ trip: Trip; name: string; steps: SendBackStep[] }> = [
  {
    trip: ADVANCE,
    name: "plain advance trip",
    steps: ["reason", "confirm"],
  },
  {
    trip: SHORT,
    name: "short-notice",
    steps: ["reason", "confirm", "penalty"],
  },
  {
    trip: SO_RIDE,
    name: "standing order",
    steps: ["reason", "confirm", "standing-order"],
  },
  {
    // ⚠️ Not seeded — asserted. A ride raising BOTH warnings would let a
    // reviewer read them as one screen, so the seed demonstrates them apart
    // and the rule is checked on a trip built here.
    trip: { ...SO_RIDE, sameDay: true },
    name: "standing order AND short-notice",
    steps: ["reason", "confirm", "standing-order", "penalty"],
  },
];
for (const row of STEP_MATRIX) {
  const actual = sendBackSteps(row.trip, PLAIN);
  check(
    `send-back steps — ${row.name}: ${row.steps.join(" → ")}`,
    actual.join(" → "),
    actual.length === row.steps.length &&
      row.steps.every((step, i) => actual[i] === step),
  );
}
check(
  "the matrix covers both properties, on and off",
  `${STEP_MATRIX.length} row(s)`,
  STEP_MATRIX.some((r) => isStandingOrder(r.trip)) &&
    STEP_MATRIX.some((r) => !isStandingOrder(r.trip)) &&
    STEP_MATRIX.some((r) => isShortNoticeSendBack(r.trip)) &&
    STEP_MATRIX.some((r) => !isShortNoticeSendBack(r.trip)),
);
/**
 * ⛔⛔ **The reason is asked FIRST, before any warning.** Asking why after three
 * warnings would collect an answer from a driver who has been talked at twice
 * and is tapping through. First is the only point in the sequence where the
 * answer is theirs rather than a reaction.
 */
check(
  "the reason is the first step on every trip",
  STEP_MATRIX.map((r) => `${r.name}:${sendBackSteps(r.trip, PLAIN)[0]}`).join(" "),
  STEP_MATRIX.every((r) => sendBackSteps(r.trip, PLAIN)[0] === "reason"),
);
const both = sendBackSteps({ ...SO_RIDE, sameDay: true }, PLAIN);
/**
 * ⛔⛔ **General before specific.** Production's own "are you sure" — raised on
 * every send-back — comes before the warnings a trip has to EARN. A driver
 * sending back an ordinary advance trip sees two screens; the extra ones are
 * earned by something true about the trip.
 */
check(
  "production's popup comes before the warnings a trip has to earn",
  both.join(" → "),
  both.indexOf("confirm") < both.indexOf("standing-order") &&
    both.indexOf("confirm") < both.indexOf("penalty"),
);
check(
  "...and the standing-order warning comes before the penalty",
  both.join(" → "),
  both.indexOf("standing-order") < both.indexOf("penalty"),
);
/**
 * ⚠️ The unconditional steps are the first two, always — so the two extra
 * screens only ever appear at the END of the sequence, never interleaved.
 */
check(
  "every trip starts with the same two screens, whatever else follows",
  STEP_MATRIX.map((r) => sendBackSteps(r.trip, PLAIN).slice(0, 2).join("+")).join(" "),
  STEP_MATRIX.every(
    (r) =>
      sendBackSteps(r.trip, PLAIN)[0] === "reason" &&
      sendBackSteps(r.trip, PLAIN)[1] === "confirm",
  ),
);
check(
  "...and the penalty warning is always last when it appears",
  STEP_MATRIX.filter((r) => sendBackSteps(r.trip, PLAIN).includes("penalty"))
    .map((r) => sendBackSteps(r.trip, PLAIN).join(" → "))
    .join(" | "),
  STEP_MATRIX.filter((r) => sendBackSteps(r.trip, PLAIN).includes("penalty")).every(
    (r) => sendBackSteps(r.trip, PLAIN).at(-1) === "penalty",
  ),
);

/**
 * ⛔⛔ **Production's two popups disagree about their own buttons, and both are
 * reproduced exactly.** Step 1 says No/Yes; step 2 says Cancel/Continue, named
 * as such in the copy-update story's acceptance criteria. Harmonising them
 * would be this prototype quietly redesigning production and then presenting
 * the result as a replica.
 */
const CONFIRM_SOURCE = readFileSync(
  join(ROOT, "components/driver/send-back-confirm-dialog.tsx"),
  "utf8",
);
check(
  "production's popup carries its own copy, verbatim",
  "Trip sendbacks are strongly discouraged…",
  CONFIRM_SOURCE.replace(/\s+/g, " ").includes(
    "Trip sendbacks are strongly discouraged and may result in penalties. Do you want to proceed in sending back the trip?",
  ),
);
check(
  "...and production's popup says No/Yes while its penalty popup says Cancel/Continue",
  "production disagrees with itself; both reproduced",
  /<AlertDialogCancel[\s\S]{0,300}No\s*<\/AlertDialogCancel>/.test(CONFIRM_SOURCE) &&
    /<AlertDialogAction[\s\S]{0,300}Yes\s*<\/AlertDialogAction>/.test(CONFIRM_SOURCE) &&
    /<AlertDialogCancel[\s\S]{0,200}Cancel\s*<\/AlertDialogCancel>/.test(SB_SOURCES.penalty),
);

// ---- the standing-order warning ------------------------------------------

const SO_SOURCE = readFileSync(
  join(ROOT, "components/driver/standing-order-warning-dialog.tsx"),
  "utf8",
);
check(
  "row 13's standing-order ride is seeded and tagged",
  SO_RIDE ? `${SO_RIDE.scenario?.code} · ${SO_RIDE.standingOrderId}` : "MISSING",
  Boolean(SO_RIDE) &&
    isScenarioFor(SO_RIDE, "send-back-reason-form") &&
    isStandingOrder(SO_RIDE) &&
    !isShortNoticeSendBack(SO_RIDE),
);
check(
  "a standing order is identified by an ID, not a boolean flag",
  `standingOrderId=${SO_RIDE.standingOrderId}`,
  typeof SO_RIDE.standingOrderId === "string" &&
    SO_RIDE.standingOrderId.length > 0,
);
check(
  "...and no other seeded ride is a standing order, so the warning is specific",
  `${ALL_SEEDED.filter(isStandingOrder).length} of ${ALL_SEEDED.length} seeded rides`,
  ALL_SEEDED.filter(isStandingOrder).length === 1,
);
/**
 * ⛔⛔ **It warns; it does not BLOCK.** A driver who genuinely cannot do the
 * trip still has to be able to return it — a hard block is exactly what sends
 * them to Support, which is the traffic this row exists to absorb.
 */
check(
  "the standing-order warning offers a way through, not a dead end",
  "Cancel + Continue, and Continue completes the send-back",
  /<AlertDialogAction[\s\S]{0,300}Continue\s*<\/AlertDialogAction>/.test(SO_SOURCE) &&
    SB_SOURCES.more.includes("handleStandingOrderAccepted"),
);
const SO_PHRASES = [
  "the whole standing order",
  "reassign every future trip to another driver",
  "suspension",
];
const missingSo = SO_PHRASES.filter(
  (phrase) => !SO_SOURCE.replace(/\s+/g, " ").includes(phrase),
);
check(
  "it names both consequences — the order, and the account",
  missingSo.length ? `MISSING: ${missingSo.join(" | ")}` : SO_PHRASES.join(" · "),
  missingSo.length === 0,
);
/**
 * ⛔ And it says so: this copy is PROPOSED, unlike the penalty dialog's, whose
 * every phrase is production's. Nothing in the vault says what the app tells a
 * driver about sending back a standing order — because it tells them nothing.
 */
check(
  "the proposed copy is marked as proposed, where the penalty copy is not",
  "PROPOSED declared in the component",
  /PROPOSED, not production/i.test(SO_SOURCE) &&
    /verbatim/i.test(SB_SOURCES.penalty),
);

// ---- the penalty copy is production's, verbatim --------------------------

/**
 * ⭐⭐ Lifted from `Other/NEMT Driver App/Other - NEMT Driver App - Short-notice
 * sendback popup copy update.md`, the "Update (step 2)" block. Asserted
 * phrase-by-phrase because this is the one screen in the slice whose WORDS are
 * production's — the layout is not, since no screenshot of it exists anywhere.
 */
const PENALTY_PHRASES = [
  "If you send back this trip:",
  "penalty will be applied and will be offered as a bonus for another driver to accept the trip",
  "If the member ends up missing their appointment, your account may be subject to deactivation",
  "Trips sent back earlier are less likely to result in penalties",
  "Are you sure you want to proceed?",
];
const missingPhrases = PENALTY_PHRASES.filter(
  (phrase) => !SB_SOURCES.penalty.replace(/\s+/g, " ").includes(phrase),
);
check(
  "the penalty popup carries production's own copy, verbatim",
  missingPhrases.length
    ? `MISSING: ${missingPhrases.join(" | ")}`
    : `${PENALTY_PHRASES.length} of ${PENALTY_PHRASES.length} phrases present`,
  missingPhrases.length === 0,
);
check(
  "...and Cancel / Continue are the actions the story names",
  "AlertDialogCancel>Cancel + AlertDialogAction>Continue",
  /<AlertDialogCancel[\s\S]{0,200}Cancel\s*<\/AlertDialogCancel>/.test(SB_SOURCES.penalty) &&
    /<AlertDialogAction[\s\S]{0,300}Continue\s*<\/AlertDialogAction>/.test(SB_SOURCES.penalty),
);
check(
  "the penalty amount is seeded, not hardcoded into the copy",
  `$${SEND_BACK_PENALTY_USD}`,
  SB_SOURCES.penalty.includes("SEND_BACK_PENALTY_USD") &&
    !/\$25/.test(SB_SOURCES.penalty),
);

// ---- the trip actually leaves ---------------------------------------------

/**
 * ⛔⛔ **The first thing in this prototype that REMOVES a ride.** Every other
 * slice annotates a trip. A driver who sends one back is returned to My Rides,
 * and a trip still sitting there would read as the send-back having failed.
 */
check(
  "a sent-back trip is filtered out of My Rides",
  "sentBackTrips in the visibility filter",
  SB_SOURCES.rides.includes("sentBackTrips.includes(trip.id)"),
);
check(
  "...and it is filtered alongside pending, not instead of it",
  "both predicates in one filter",
  /!pendingIds\.has\(trip\.id\) &&\s*!sentBackTrips\.includes\(trip\.id\)/.test(
    SB_SOURCES.rides,
  ),
);
/**
 * ⛔⛔ `send-back` is a PRODUCTION tile, and every other production tile falls
 * through to a "not wired in the prototype" toast. This slice is the first to
 * REPLACE what a production control does, so the branch has to be inside
 * `handleGridTile` and has to RETURN — a branch that fell through would open
 * the flow and then toast over it.
 *
 * ⚠️ Asserted on the handler's own body, not on where the two functions sit in
 * the file. The first version compared `indexOf` positions and failed because
 * `handleProductionTile` happens to be declared first — a check failing on
 * source layout rather than behaviour.
 */
const gridHandler = SB_SOURCES.more.slice(
  SB_SOURCES.more.indexOf("function handleGridTile"),
  SB_SOURCES.more.indexOf("function handleProductionTile") > SB_SOURCES.more.indexOf("function handleGridTile")
    ? SB_SOURCES.more.indexOf("function handleProductionTile")
    : SB_SOURCES.more.length,
);
/**
 * ⚠️ Updated in B3b. It used to require `setSendBackReasonOpen(true)` directly
 * inside the branch — the proposal's first step, hard-wired. Production's path
 * does not collect a reason at all, so the branch now opens whichever step the
 * computed path starts with. The interception itself is what this asserts; §24
 * runs the two sequences.
 */
check(
  "Send Back Trip is intercepted in the grid handler, and returns",
  `branch present: ${gridHandler.includes('if (id === "send-back")')}; keyed on the path: ${/sendBackPath\[0\] === "reason"/.test(gridHandler)}`,
  /if \(id === "send-back"\)[\s\S]{0,1400}sendBackPath\[0\] === "reason"[\s\S]{0,400}return;/.test(
    gridHandler,
  ) &&
    /setSendBackReasonOpen\(true\)/.test(gridHandler) &&
    /setSendBackConfirmOpen\(true\)/.test(gridHandler),
);
check(
  "the send-back is recorded for Support but tracks no status",
  "appTracksStatus: false",
  /completeSendBack[\s\S]{0,900}appTracksStatus: false/.test(SB_SOURCES.more),
);
check(
  "...and cancelling the penalty warning abandons the answers",
  "setSendBackValues(null) on dismiss",
  /if \(!next\) setSendBackValues\(null\)/.test(SB_SOURCES.more),
);

/** ⛔ Out of scope by user direction, asserted as an ABSENCE. */
const ROW_13 = SOLUTIONS.find((s) => s.id === "send-back-reason-form")!;
check(
  "row 13 flags the two things it deliberately does NOT do",
  ROW_13.proposedFeature.slice(-120),
  ROW_13.proposedFeature.includes("⚠️ Not in prototype yet") &&
    /Standing Order block/i.test(ROW_13.proposedFeature) &&
    /row 14|scoring/i.test(ROW_13.proposedFeature),
);
check(
  "...and rows 14 and 19 stay unbuilt, still gated on the scoring policy",
  ["send-back-scoring", "eta-send-back-explicit"]
    .map((id) => `${id}=${SOLUTIONS.find((r) => r.id === id)?.buildState}`)
    .join(" "),
  ["send-back-scoring", "eta-send-back-explicit"].every(
    (id) => SOLUTIONS.find((r) => r.id === id)?.buildState === "not-yet",
  ),
);

console.log("\n13. Account self-service — catalogue row 15");

/**
 * ⛔ Reads the RULES module and the two pages, never the catalogue text. The
 * catalogue says what we propose; these say what the prototype does.
 */
/**
 * ⛔⛔ **A grep for a banned string matches this repo's own explanation of why
 * it is banned.** That happened THREE times building row 15 — on `111-1111`,
 * on `fill="white"`, and on `type="password"` — and each time the check failed
 * against correct code, which is the failure mode most likely to get a good
 * check deleted rather than fixed.
 *
 * A substring search cannot tell a USE from a MENTION, and this repo documents
 * its traps in comments right beside the code that avoids them. So any check
 * asserting a string is ABSENT reads the code with comments stripped.
 *
 * ⚠️ Deliberately crude — it is a gate helper, not a parser. It removes block
 * comments, line comments and the empty braces a JSX comment leaves behind,
 * which is every form this codebase writes.
 *
 * ⛔⛔ The first version matched JSX comments with `\{\s*\/\*[\s\S]*?\*\/\s*\}`
 * — and a lazy quantifier BACKTRACKS. When a `*​/` was not immediately followed
 * by `}` the engine simply ran on to the next one that was, deleting every line
 * in between. It removed a whole JSX element and then reported that element
 * missing: a helper written to stop checks failing against correct code, doing
 * exactly that. Stripping block comments FIRST cannot backtrack past one,
 * because each match ends at its own terminator.
 */
function codeOnly(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/\{\s*\}/g, "");
}

const A_SOURCES = {
  rules: readFileSync("lib/driver-data/account-self-service.ts", "utf8"),
  login: readFileSync("app/login/page.tsx", "utf8"),
  settings: readFileSync("app/options/account/page.tsx", "utf8"),
  /** ⭐ The one code screen every path uses, and the one password field. */
  code: readFileSync("components/driver/auth/verification-code-screen.tsx", "utf8"),
  secret: readFileSync("components/driver/auth/masked-password-input.tsx", "utf8"),
  options: readFileSync("app/options/page.tsx", "utf8"),
};

/* --- 13a. ⏸️ The pre-auth half is parked, and stays gone ----------------- */

/**
 * ⏸️ Account recovery from the sign-in screen was built and then removed on
 * 2026-10-13 by user direction. The eight-row truth table that lived here went
 * with it — an exhaustive check over a function no screen reaches is the exact
 * shape of a check that has stopped testing anything, and it would have stayed
 * green forever while the product it described did not exist.
 *
 * ⛔ What is checked instead is that it really is GONE, in both directions: no
 * recovery step survives in the route, and nothing re-introduces one quietly.
 */
const PARKED_RECOVERY_MARKERS = [
  "recover-identify", "recover-password", "recover-update",
  "RECOVERY_LINK_LABEL", "recoveryRouteFor", "RECOVERY_RULES",
];
const survivingRecovery = PARKED_RECOVERY_MARKERS.filter((marker) =>
  codeOnly(A_SOURCES.login).includes(marker),
);
check(
  "the parked recovery flow left nothing behind in the sign-in route",
  `${survivingRecovery.length} of ${PARKED_RECOVERY_MARKERS.length} marker(s) survive: ${survivingRecovery.join(", ") || "none"}`,
  survivingRecovery.length === 0 && PRE_AUTH_RECOVERY_PARKED,
);
/** ⛔⛔ And the dead end it answered is replicated WITHOUT the answer. */
check(
  "...so CAP-127's dead end is replicated with no way round it",
  "Reset Password present, recovery link absent",
  A_SOURCES.login.includes("RESET_SUBTITLE") &&
    !codeOnly(A_SOURCES.login).includes("No longer have access"),
);
/**
 * ⛔ `/login` is no longer row 15's entry. With the proposal gone it carries
 * nothing of the row's — it exists because the CAPTURED Logout row lands on a
 * sign-in screen in production. A catalogue entry pointing at it would claim a
 * demo that is not there.
 */
const ROW_15_ROUTES = [
  SOLUTIONS.find((s) => s.id === ACCOUNT_SOLUTION_ID)!.entry?.route,
  ...(SOLUTIONS.find((s) => s.id === ACCOUNT_SOLUTION_ID)!.entry?.alternates ?? []).map((a) => a.route),
];
/**
 * ⭐⭐ **The entry is `/options`, and the alternate is the Account screen** —
 * user direction, 2026-10-14. The comparison IS the `Account` row appearing in
 * the captured menu; landing on the Account screen skips past the only thing
 * this row argues for, and in Now it would land on a screen production does
 * not have.
 *
 * ⛔ `/login` still appears in neither. With the pre-auth proposal gone it
 * carries nothing of row 15's — it exists because the captured Logout row lands
 * on a sign-in screen in production.
 */
check(
  "...and row 15 demonstrates the MENU, with the Account screen as its alternate",
  `${ROW_15_ROUTES.length} route(s): ${ROW_15_ROUTES.join(", ")}`,
  ROW_15_ROUTES.length === 2 &&
    ROW_15_ROUTES[0] === "/options" &&
    ROW_15_ROUTES[1] === "/options/account" &&
    !ROW_15_ROUTES.includes("/login"),
);
/** ⚠️ Every step left in the route is replicated. None is a proposal. */
check(
  "...and every remaining sign-in step is one of the captured four",
  `${PRODUCTION_LOGIN_STEPS.length} step(s): ${PRODUCTION_LOGIN_STEPS.join(", ")}`,
  PRODUCTION_LOGIN_STEPS.length === 4 &&
    /type LoginStep =[\s\S]{0,400}"reset";/.test(A_SOURCES.rules),
);

/* --- 13b. Production's own strings, character for character -------------- */

/**
 * ⛔ The two OTP failures are DIFFERENT failures and production words them
 * differently. An error is the one string a driver reads under pressure, so
 * both are asserted verbatim against the capture index's record of them.
 */
const CAPTURED_STRINGS: Array<[string, string]> = [
  ["CAP-124", "Invalid or expired OTP."],
  ["CAP-125", "You must wait 90 seconds to request an OTP again."],
  ["CAP-127", "Enter the email associated with your account and we'll send reset instructions."],
  ["CAP-122", "Enter your phone number and we'll send you a verification code."],
  ["CAP-126", "Enter your email and password to sign in."],
];
const missingStrings = CAPTURED_STRINGS.filter(([, text]) => !A_SOURCES.rules.includes(text));
check(
  "every replicated string matches its capture, character for character",
  `${missingStrings.length} missing of ${CAPTURED_STRINGS.length} — ${CAPTURED_STRINGS.map(([c]) => c).join(", ")}`,
  missingStrings.length === 0,
);
/**
 * ⛔ The obvious version of this check — `OTP_ERROR_INVALID !==
 * OTP_ERROR_RATE_LIMIT` — CANNOT FAIL, and `tsc` said so: two string literal
 * types have no overlap, so the comparison is a tautology. What actually
 * matters is that the two screens raise them in different circumstances, which
 * is what the branch check below reads.
 */
check(
  "the two OTP failures are raised by different events",
  "wrong code → invalid; early resend → rate limit",
  /code !== OTP_DEMO_CODE[\s\S]{0,120}OTP_ERROR_INVALID/.test(A_SOURCES.code) &&
    /resendIn > 0[\s\S]{0,80}OTP_ERROR_RATE_LIMIT/.test(A_SOURCES.code),
);
/**
 * ⛔ Each message is bound to the CONDITION that shows it.
 *
 * The first version only asserted that both strings appeared somewhere in the
 * file — so replacing a guard with `false &&` left the check green while the
 * message became unreachable. A source-text check cannot see a dead branch on
 * its own; tying the string to its trigger is what makes it able to.
 */
const RENDERED_ERRORS: Array<[string, RegExp]> = [
  ["OTP_ERROR_INVALID", /error === OTP_ERROR_INVALID && \([\s\S]{0,160}\{OTP_ERROR_INVALID\}/],
  ["OTP_ERROR_RATE_LIMIT", /error === OTP_ERROR_RATE_LIMIT && \([\s\S]{0,160}\{OTP_ERROR_RATE_LIMIT\}/],
];
const unrendered = RENDERED_ERRORS.filter(([, pattern]) => !pattern.test(A_SOURCES.code));
check(
  "...and each is rendered under the condition that raises it",
  `${unrendered.length} of ${RENDERED_ERRORS.length} not bound to a guard: ${unrendered.map(([n]) => n).join(", ") || "none"}`,
  unrendered.length === 0,
);
/**
 * ⛔⛔ And NEITHER half may raise them itself. The screens were folded onto one
 * component precisely so the invalid-code message cannot end up worded five
 * slightly different ways, or one path quietly forget the rate limit — a
 * second implementation anywhere undoes that silently.
 */
const reimplemented = [["login", A_SOURCES.login], ["settings", A_SOURCES.settings]]
  .filter(([, src]) => /OTP_ERROR_(INVALID|RATE_LIMIT)/.test(codeOnly(src as string)));
check(
  "...and neither page raises an OTP error of its own",
  `${reimplemented.length} of 2 page(s) re-implement it: ${reimplemented.map(([n]) => n).join(", ") || "none"}`,
  reimplemented.length === 0,
);
check(
  "the six boxes and the 88s countdown are the captured ones",
  `OTP_LENGTH=${OTP_LENGTH} OTP_RESEND_SECONDS=${OTP_RESEND_SECONDS}`,
  OTP_LENGTH === 6 && OTP_RESEND_SECONDS === 88,
);

/* --- 13c. ⛔⛔ Identity is never proved by the new contact ---------------- */

/**
 * ⛔⛔ **The guard that keeps a contact change from being a takeover path.**
 *
 * A code to a NEW address or number proves it exists and someone is holding it.
 * It proves nothing about who. So `otp-to-new-contact` may appear as a VALUE
 * confirmation and never as an identity proof, and identity and value are never
 * the same factor.
 *
 * ⏸️ One table now, not two — the recovery table went with the parked pre-auth
 * half. The rule is unchanged and is what the remaining table is checked
 * against.
 */
const ALL_RULES = [...SETTINGS_RULES];
const identityByNewContact = ALL_RULES.filter((rule) =>
  rule.identityProofs.includes("otp-to-new-contact"),
);
check(
  "a code to the NEW contact never proves identity",
  `${identityByNewContact.length} of ${ALL_RULES.length} rule(s) misuse it`,
  identityByNewContact.length === 0,
);
const sameFactorTwice = ALL_RULES.filter((rule) =>
  rule.identityProofs.some((proof) => rule.valueConfirmations.includes(proof)),
);
check(
  "...and no rule uses one factor for both questions",
  `${sameFactorTwice.length} of ${ALL_RULES.length} rule(s) collapse them`,
  sameFactorTwice.length === 0,
);
/** ⚠️ Would pass vacuously on empty lists. Assert there is something to check. */
const emptyRules = ALL_RULES.filter(
  (rule) => rule.identityProofs.length === 0 || rule.valueConfirmations.length === 0,
);
check(
  "...and there were rules to check, one per field",
  `${ALL_RULES.length} rule(s), ${emptyRules.length} empty`,
  ALL_RULES.length === 3 && emptyRules.length === 0,
);

/**
 * ⭐ User direction, 2026-10-13: *"for email and phone, after confirming, ask
 * for OTP."*
 *
 * ⛔ Typing an address twice proves the driver typed the same thing twice; it
 * does not prove the address exists. An address mistyped identically twice is a
 * lockout the app confirmed on its way out. So every CONTACT change must END in
 * a code sent to the new value.
 */
const contactRules = ALL_RULES.filter((rule) => CONTACT_FIELDS.includes(rule.field));
const notEndingInCode = contactRules.filter(
  (rule) => rule.valueConfirmations.at(-1) !== "otp-to-new-contact",
);
check(
  "every contact change ends in a code sent to the new value",
  `${notEndingInCode.length} of ${contactRules.length} contact rule(s) do not`,
  notEndingInCode.length === 0 && contactRules.length === 2,
);
/** ⛔ And the typo guard comes BEFORE it on the field that is typed twice. */
const emailRule = ALL_RULES.find((rule) => rule.field === "email")!;
check(
  "...and the email's typo guard runs before its code, not instead of it",
  emailRule.valueConfirmations.join(" → "),
  emailRule.valueConfirmations.indexOf("typed-twice") <
    emailRule.valueConfirmations.indexOf("otp-to-new-contact"),
);
/** ⛔ A password has no new contact, so it cannot have that step. */
const passwordRule = ALL_RULES.find((rule) => rule.field === "password")!;
check(
  "a password change never sends a code to a new contact — there isn't one",
  passwordRule.valueConfirmations.join(" → "),
  !passwordRule.valueConfirmations.includes("otp-to-new-contact"),
);

/**
 * ⭐ User direction: *"if I change password confirm with Phone OTP or email
 * OTP."*
 *
 * ⛔⛔ And NOT with the current password. That was the first build, and it was
 * wrong in a way worth asserting against: it locked out the only driver who
 * needs the screen. Someone who remembers their password does not need to reset
 * it; someone who has forgotten it cannot answer.
 */
check(
  "changing the password is confirmed by a code to a contact on file",
  passwordRule.identityProofs.join("+"),
  passwordRule.identityProofs.includes("otp-to-contact-on-file"),
);
check(
  "...and never by the current password, which the driver may not have",
  `current-password present: ${passwordRule.identityProofs.includes("current-password")}`,
  !passwordRule.identityProofs.includes("current-password"),
);
check(
  "...and the driver picks which contact on file receives it",
  `${OTP_CHANNELS.length} channel(s): ${OTP_CHANNELS.join(", ")}`,
  OTP_CHANNELS.length === 2 &&
    OTP_CHANNELS.includes("phone") && OTP_CHANNELS.includes("email"),
);

/* --- 13d. Nothing whole is printed back ---------------------------------- */

check(
  "a masked email keeps the domain and loses the name",
  `${ACCOUNT_ON_FILE.email} → ${maskEmail(ACCOUNT_ON_FILE.email)}`,
  !maskEmail(ACCOUNT_ON_FILE.email).includes(ACCOUNT_ON_FILE.email.split("@")[0]) &&
    maskEmail(ACCOUNT_ON_FILE.email).includes("@"),
);
check(
  "a masked phone keeps four digits and loses the rest",
  `${ACCOUNT_ON_FILE.phone} → ${maskPhone(ACCOUNT_ON_FILE.phone)}`,
  maskPhone(ACCOUNT_ON_FILE.phone).replace(/\D/g, "").length === 4,
);
/**
 * ⛔ Seeded phones must sit in the `555-01xx` range reserved for fiction.
 * CAP-123's captured `+1 (111) 111-1111` is test data and must never be seeded;
 * CAP-122's `(555) 123-4567` is a PLACEHOLDER — nobody is reachable on it, so
 * it may be replicated verbatim, and it is excluded by name rather than by luck.
 */
check(
  "the seeded number is inside the fiction range",
  `${ACCOUNT_ON_FILE.phone}`,
  /^\(555\) 01\d{2}$/.test(ACCOUNT_ON_FILE.phone),
);
/**
 * ⛔ The first version of this grepped the whole rules FILE for `111-1111` and
 * failed — on the comment that documents why the number is banned. A check that
 * a file does not MENTION a value cannot tell documentation from use. Read the
 * seeded values instead; they are the only places a number can reach a screen.
 */
const SEEDED_NUMBERS = [ACCOUNT_ON_FILE.phone, PHONE_PLACEHOLDER];
check(
  "...and the captured test number was not seeded anywhere",
  `${SEEDED_NUMBERS.length} seeded value(s): ${SEEDED_NUMBERS.join(", ")}`,
  SEEDED_NUMBERS.every((value) => !value.replace(/\D/g, "").includes("1111111")),
);

/* --- 13e. The twelfth Options row is gated ------------------------------- */

/**
 * ⛔ Reads the ARRAY the page renders, not the page's source text. The More
 * Options grid taught this one: a check that matched source passed while the
 * array it claimed to describe said something else.
 */
const CAPTURED_OPTIONS_ROWS = 11;
check(
  "the Options menu is still the captured eleven when nothing is focused",
  `${buildOptionsRows(FIXED(null)).length} row(s), expected ${CAPTURED_OPTIONS_ROWS}`,
  buildOptionsRows(FIXED(null)).length === CAPTURED_OPTIONS_ROWS,
);
check(
  "...and it is still eleven under a DIFFERENT solution",
  `${buildOptionsRows(FIXED("rider-no-show")).length} row(s) focused on row 01`,
  buildOptionsRows(FIXED("rider-no-show")).length === CAPTURED_OPTIONS_ROWS,
);
check(
  "...and exactly one row appears when row 15 is focused",
  `${buildOptionsRows(FIXED(ACCOUNT_SOLUTION_ID)).length} row(s), expected ${CAPTURED_OPTIONS_ROWS + 1}`,
  buildOptionsRows(FIXED(ACCOUNT_SOLUTION_ID)).length === CAPTURED_OPTIONS_ROWS + 1,
);
const focusedRows = buildOptionsRows(FIXED(ACCOUNT_SOLUTION_ID));
check(
  "...and it is flagged as proposed, so it cannot be mistaken for captured",
  `${focusedRows.filter((r) => r.proposed).length} proposed of ${focusedRows.length}`,
  focusedRows.filter((r) => r.proposed).length === 1 &&
    buildOptionsRows(FIXED(null)).every((r) => !r.proposed),
);
check(
  "...and it sits where it was declared, not at the end",
  `after ${ACCOUNT_ROW.after} → index ${focusedRows.findIndex((r) => r.id === ACCOUNT_ROW.id)}`,
  focusedRows[focusedRows.findIndex((r) => r.id === ACCOUNT_ROW.after) + 1]?.id === ACCOUNT_ROW.id,
);
/**
 * ⏸️ The gate used to cover two things — this row and a proposed link on the
 * replicated Reset Password screen. With the pre-auth half parked it has one
 * subject, and the sign-in route must carry NO gated proposal at all.
 */
check(
  "the gate's only subject is the Options row now",
  `login references the gate: ${codeOnly(A_SOURCES.login).includes("showsAccountProposals")}`,
  !codeOnly(A_SOURCES.login).includes("showsAccountProposals") &&
    A_SOURCES.options.includes("buildOptionsRows"),
);

/* --- 13f. /login gates nothing ------------------------------------------- */

/**
 * ⛔⛔ `references/captures/INDEX.md` §07 recorded the auth screens as
 * deliberately NOT built. Building them reverses that knowingly — so the
 * boundary it protected is kept by SCOPE instead: this route signs nobody in.
 * A `/login` that started guarding the app would break every other solution's
 * entry route at once, and would do it silently.
 */
check(
  "/login redirects nothing and guards nothing",
  "no middleware, no redirect out of other routes",
  !existsSync("middleware.ts") && !existsSync("src/middleware.ts"),
);
check(
  "...and no other page imports the auth gate",
  "account-self-service is imported only by its own screens and the Options menu",
  ["app/page.tsx", "app/my-rides/page.tsx", "app/requests/page.tsx"].every(
    (file) => !readFileSync(file, "utf8").includes("account-self-service"),
  ),
);

/**
 * ⚠️ Logout is one of the CAPTURED eleven and in production it lands on the
 * sign-in screen. It toasted here only because no such screen existed until
 * row 15 built one, so wiring it is replication catching up — NOT a proposal,
 * and deliberately not gated. An unfocused run therefore lands on the plain
 * replicated sign-in with row 15's recovery link absent, which is what
 * production does.
 */
check(
  "Logout lands on the sign-in screen, as production does",
  "router.push(\"/login\") on the logout row",
  /row\.id === "logout"[\s\S]{0,80}router\.push\("\/login"\)/.test(A_SOURCES.options),
);
check(
  "...and it is still one of the captured eleven, not a proposal",
  `logout.proposed = ${buildOptionsRows(FIXED(null)).find((r) => r.id === "logout")?.proposed ?? false}`,
  buildOptionsRows(FIXED(null)).some((r) => r.id === "logout") &&
    !buildOptionsRows(FIXED(null)).find((r) => r.id === "logout")?.proposed,
);

/**
 * ⛔⛔ `TOAST_LIMIT` is 1 (`hooks/use-toast.ts`), so two toasts raised in one
 * handler show only the SECOND. A recovery flow that said "Email updated" and
 * then "Welcome back" told the driver nothing about the thing they came for —
 * two correct calls, one of them invisible, and nothing anywhere reports a
 * dropped toast.
 *
 * ⏸️ That flow is parked, so the rule now guards the settings half: a change
 * raises exactly one toast and does NOT navigate on top of it.
 */
check(
  "the toast limit is still 1, so this rule still applies",
  `TOAST_LIMIT = ${/TOAST_LIMIT = (\d+)/.exec(readFileSync("hooks/use-toast.ts", "utf8"))?.[1]}`,
  /const TOAST_LIMIT = 1;/.test(readFileSync("hooks/use-toast.ts", "utf8")),
);
const settingsToasts = codeOnly(A_SOURCES.settings).match(/toast\(\{/g) ?? [];
check(
  "...and a saved change raises exactly one toast, from one place",
  `${settingsToasts.length} toast call(s) in the settings half`,
  settingsToasts.length === 1 && /function finish\(title: string, description: string\)/.test(A_SOURCES.settings),
);
check(
  "...and it does not navigate out from under it",
  "finish() clears the step; no router push on save",
  !codeOnly(A_SOURCES.settings).includes("router.push"),
);

/* --- 13g. The two halves are one build ----------------------------------- */

/**
 * ⭐ The user asked for this in BOTH places. The OTP screen in settings and the
 * OTP screen at sign-in are the same component, not two that look alike — which
 * is what makes "both" literal rather than a coincidence maintained by hand.
 */
/**
 * ⭐ User direction, 2026-10-13: *"All cases the OTP should copy what we have in
 * sign up and be its own page with a resend option."*
 *
 * So the test is not that the two look alike — it is that there is only ONE of
 * them. Both halves must import the same screen, and nothing may hand-roll the
 * boxes beside it.
 */
const OTP_HOSTS = [["login", A_SOURCES.login], ["settings", A_SOURCES.settings]] as const;
/** ⚠️ The USAGE, not the import — an unused import is tsc's job, not this. */
const notUsingShared = OTP_HOSTS.filter(
  ([, src]) => !codeOnly(src).includes("<VerificationCodeScreen"),
);
check(
  "both halves render the one shared code screen",
  `${notUsingShared.length} of ${OTP_HOSTS.length} host(s) do not`,
  notUsingShared.length === 0,
);
const handRolled = OTP_HOSTS.filter(([, src]) => codeOnly(src).includes("AuthCodeBoxes"));
check(
  "...and neither builds its own set of boxes beside it",
  `${handRolled.length} of ${OTP_HOSTS.length} host(s) do`,
  handRolled.length === 0,
);
/** ⛔ It is a PAGE, not a panel — it renders the shell, so it takes the screen. */
check(
  "...and the code screen is its own page, with a resend on it",
  "AuthShell + Resend code in {n}s",
  A_SOURCES.code.includes("<AuthShell>") && /Resend code in \$\{resendIn\}s/.test(A_SOURCES.code),
);
check(
  "...and both read the rules from lib, not from their own JSX",
  `login=${A_SOURCES.login.includes("@/lib/driver-data/account-self-service")} settings=${A_SOURCES.settings.includes("@/lib/driver-data/account-self-service")}`,
  A_SOURCES.login.includes("@/lib/driver-data/account-self-service") &&
    A_SOURCES.settings.includes("@/lib/driver-data/account-self-service"),
);
/**
 * ⛔⛔ The three change components MUST sit at module scope. Declared inside the
 * page they were re-created each render, so React saw a new component type on
 * every keystroke, unmounted the subtree and remounted it — the field lost
 * focus and its own state after one character. It type-checked, built and
 * rendered; it was simply unusable. No other gate here can see that.
 */
const nestedComponent = /export default function AccountPage[\s\S]*?\n  function Change/.test(
  A_SOURCES.settings,
);
check(
  "the change screens are module-scope components, not re-created per render",
  `nested declaration present: ${nestedComponent}`,
  !nestedComponent,
);

/* --- 13g2. ⛔⛔ The brand wordmark on a light ground ---------------------- */

/**
 * ⛔⛔ **An asset that renders perfectly and says nothing.**
 *
 * `wingz-wordmark-dark.svg` is the wordmark FOR a dark background: its six
 * letter paths are `fill="white"`. Used on a white surface the word vanishes
 * and only the emblem's green paths survive, so the screen shows two emblems
 * stacked. Nothing throws, nothing logs, every other gate stays green.
 *
 * Found on the new login screens — and the SHIPPED ID Badge screen had been
 * doing it since it was built, on a screen that is supposed to be faithful to
 * capture `05-06`. Both now use a letters-only asset in their own sampled ink.
 *
 * ⚠️ Checked by reading the ASSETS, not by trusting the filenames.
 */
/**
 * ⚠️ TWO derived assets, because the two surfaces sampled two different inks:
 * the sign-in screens' wordmark is near-black (CAP-122/126/127), the ID Badge
 * card's is indigo (CAP-105). Declared per asset so a single "it is not white"
 * check cannot pass while both screens carry the wrong one.
 */
const LETTER_PATHS = 6;
const TEXT_WORDMARKS: Array<[string, string]> = [
  ["public/wingz-wordmark-text.svg", "#111111"],
  ["public/wingz-wordmark-navy.svg", "#303068"],
];
/**
 * ⛔ Reads the `<path>` ELEMENTS, not the file text. The first version matched
 * the whole file and failed on the asset's own comment, which has to write
 * `fill="white"` in order to explain why white is wrong. Second time in one
 * session that a check matched this repo's documentation of the thing it bans:
 * a grep for a string cannot tell a use from a mention.
 */
function letterFills(file: string): string[] {
  return (readFileSync(file, "utf8").match(/<path[^>]*?\/>/g) ?? [])
    .map((path) => /fill="([^"]+)"/.exec(path)?.[1] ?? "")
    .filter(Boolean);
}
const badWordmarks = TEXT_WORDMARKS.filter(([file, colour]) => {
  const fills = letterFills(file);
  return fills.length !== LETTER_PATHS || fills.some((fill) => fill !== colour);
});
check(
  "each text wordmark carries its own sampled ink, and no white letters",
  `${badWordmarks.length} wrong of ${TEXT_WORDMARKS.length} asset(s), ${LETTER_PATHS} letter path(s) each`,
  badWordmarks.length === 0,
);
/** ⛔ And they must differ, or one of the two captures is being ignored. */
check(
  "...and the two inks are actually different",
  TEXT_WORDMARKS.map(([, c]) => c).join(" vs "),
  new Set(TEXT_WORDMARKS.map(([, c]) => c)).size === 2,
);
/** The emblem must NOT be baked in, or the screen shows two emblems stacked. */
const withEmblem = TEXT_WORDMARKS.filter(([file]) =>
  letterFills(file).some((fill) => fill === "#00B692" || fill === "#00F9B8"),
);
check(
  "...and neither bakes the emblem in beside the word",
  `${withEmblem.length} of ${TEXT_WORDMARKS.length} still carry emblem paths`,
  withEmblem.length === 0,
);
const sourceWhite = letterFills("public/wingz-wordmark-dark.svg").filter((f) => f === "white");
check(
  "the source wordmark is untouched, so the two stay distinguishable",
  `${sourceWhite.length} white letter path(s) of ${LETTER_PATHS}`,
  sourceWhite.length === LETTER_PATHS,
);
/** Every screen whose wordmark sits on a white surface. Declared, not derived. */
const LIGHT_GROUND_SCREENS = [
  "components/driver/auth/auth-shell.tsx",
  "app/id-badge/page.tsx",
];
const wrongWordmark = LIGHT_GROUND_SCREENS.filter((file) =>
  codeOnly(readFileSync(file, "utf8")).includes("wingz-wordmark-dark.svg"),
);
check(
  "no light-ground screen uses the dark-ground wordmark",
  `${wrongWordmark.length} wrong of ${LIGHT_GROUND_SCREENS.length} screen(s)`,
  wrongWordmark.length === 0 && LIGHT_GROUND_SCREENS.length >= 2,
);

/* --- 13g3. The password field, and one step per page -------------------- */

/**
 * ⭐ User direction, 2026-10-13: *"For change PW have a show password to type.
 * And even if hidden show briefly the latest character typed."*
 *
 * ⛔ `type="password"` CANNOT do the flash — the browser decides what a masked
 * field shows. So the field is `type="text"` with a masked DISPLAY value and
 * the real password held in state. That makes the next check the important one.
 */
check(
  "the password field can reveal the whole value and flash the last character",
  "show/hide toggle + timed reveal",
  /aria-label=\{shown \? "Hide password" : "Show password"\}/.test(A_SOURCES.secret) &&
    /setRevealIndex\(index\);/.test(A_SOURCES.secret) &&
    /setTimeout\(\(\) => setRevealIndex\(-1\), REVEAL_MS\)/.test(A_SOURCES.secret),
);
/**
 * ⛔⛔ The real value is rebuilt from the CARET, not from the text.
 *
 * Two wrong versions came before the one this asserts. "Whatever is longer than
 * before is the new character" breaks on any edit that is not an append. A
 * prefix/suffix diff fixes insertions but **not deletions**: every masked
 * character is the same glyph, so deleting the 4th bullet of eight produces
 * exactly the string that deleting the 8th would, and the diff removes the LAST
 * character instead of the one under the caret. No diff can tell those apart —
 * `selectionStart` can.
 *
 * It fails SILENTLY either way: the field looks right and holds a different
 * password than it shows, on a screen whose whole job is to be typed blind.
 */
check(
  "...and it rebuilds the real value from the caret, not from the text",
  "selectionStart drives the splice; insert and delete handled apart",
  /selectionStart/.test(A_SOURCES.secret) &&
    /function handle\(nextDisplay: string, caret: number\)/.test(A_SOURCES.secret) &&
    /if \(delta > 0\)/.test(A_SOURCES.secret) && /if \(delta < 0\)/.test(A_SOURCES.secret),
);
/** ⛔ A deletion must splice at the caret — never trim the tail. */
check(
  "...and a deletion removes the run at the caret, not the last character",
  "value.slice(0, caret) + value.slice(caret - delta)",
  /onChange\(value\.slice\(0, caret\) \+ value\.slice\(caret - delta\)\);/.test(A_SOURCES.secret) &&
    !/value\.slice\(0, -1\)/.test(codeOnly(A_SOURCES.secret)),
);
/** ⛔ The masked display must never be a password input, or the flash shows a bullet. */
check(
  "...and the masked field is not itself a password input",
  'type="text" with a masked display value',
  /type="text"/.test(A_SOURCES.secret) && !/type="password"/.test(codeOnly(A_SOURCES.secret)),
);
/**
 * ⚠️ Used on the PROPOSED password screen only. ⏸️ There were two until the
 * recovery flow was parked. CAP-126's sign-in field was never one of them and
 * still keeps production's plain eye-only behaviour, because it is a replicated
 * screen and a capture cannot be improved quietly.
 *
 * ⚠️ `<MaskedPasswordInput`, the USAGE — the bare name also matches the import,
 * which survives the element being swapped out underneath it.
 */
const PROPOSED_PASSWORD_SCREENS = [["settings", A_SOURCES.settings]] as const;
const usingReveal = PROPOSED_PASSWORD_SCREENS.filter(
  ([, src]) => codeOnly(src).includes("<MaskedPasswordInput"),
);
check(
  "the reveal field is used on the proposed password screen",
  `${usingReveal.length} of ${PROPOSED_PASSWORD_SCREENS.length}`,
  usingReveal.length === PROPOSED_PASSWORD_SCREENS.length &&
    PROPOSED_PASSWORD_SCREENS.length > 0,
);
/** ⛔ And NOT on the replicated sign-in screen, which keeps production's eye. */
check(
  "...and CAP-126's sign-in field is left exactly as captured",
  "plain eye toggle, no reveal on the replicated screen",
  !codeOnly(A_SOURCES.login).includes("<MaskedPasswordInput") &&
    /type=\{showPassword \? "text" : "password"\}/.test(A_SOURCES.login),
);

/**
 * ⭐ User direction: *"make it a next page after clicking continue and then a
 * next page for the 6 digit code."* Three pages, not three sections of one.
 */
const SETTINGS_STEPS = ["form", "channel", "code"];
const missingSteps = SETTINGS_STEPS.filter(
  (step) => !A_SOURCES.settings.includes(`"${step}"`),
);
check(
  "the settings half is a step machine, one step per page",
  `${missingSteps.length} missing of ${SETTINGS_STEPS.length}: ${SETTINGS_STEPS.join(" → ")}`,
  missingSteps.length === 0 &&
    /type Step = "form" \| "channel" \| "code";/.test(A_SOURCES.settings),
);
/** ⛔ The password path, and only it, stops at the channel page on the way. */
const channelHops = codeOnly(A_SOURCES.settings).match(/setStep\("channel"\)/g) ?? [];
check(
  "...and only the password change passes through the channel page",
  `${channelHops.length} hop(s) into the channel page, expected 1`,
  channelHops.length === 1 &&
    /onContinue=\{\(\) => setStep\("channel"\)\}/.test(A_SOURCES.settings),
);
/** ⛔ And Back from the code screen returns to it, not past it. */
check(
  "...and Back from the code screen returns to the channel page",
  'onSecondary → "channel" when the field is the password',
  /setStep\(field === "password" \? "channel" : "form"\)/.test(A_SOURCES.settings),
);
/**
 * ⛔⛔ The draft has to live ABOVE the step. The code screen takes over the
 * viewport, so a form holding its own draft unmounts the moment the code is
 * sent and comes back EMPTY when the driver taps Back — the flow would lose
 * the new email on the way to confirming it.
 */
check(
  "...and the draft survives the page change, because it lives above it",
  "useState for every draft field sits in AccountPage",
  /export default function AccountPage[\s\S]{0,1200}const \[emailAgain, setEmailAgain\] = useState/.test(
    A_SOURCES.settings,
  ),
);

/* --- 13g4. Every code screen says what it is confirming ----------------- */

/**
 * ⭐ User direction, 2026-10-13: *"for these verification codes be explicit what
 * we are confirming — whether it is changing pw or changing email."*
 *
 * ⛔ The six boxes look identical whatever brought the driver there, and a code
 * arriving while two things are half-changed has no referent without this line.
 */
const PURPOSES: CodePurpose[] = ["sign-in", "change-email", "change-password", "change-phone"];
const unlabelled = PURPOSES.filter((purpose) => !CODE_PURPOSE_LABEL[purpose]?.trim());
check(
  "every code purpose has a label a driver can read",
  `${unlabelled.length} unlabelled of ${PURPOSES.length}`,
  unlabelled.length === 0,
);
/** ⛔ They must actually DIFFER, or the line says nothing. */
check(
  "...and no two purposes say the same thing",
  `${new Set(Object.values(CODE_PURPOSE_LABEL)).size} distinct of ${PURPOSES.length}`,
  new Set(Object.values(CODE_PURPOSE_LABEL)).size === PURPOSES.length,
);
/** Each field maps to its own purpose — three fields, three distinct purposes. */
const fieldPurposes = CONTACT_FIELDS.concat("password").map((f) => CODE_PURPOSE_FOR[f]);
check(
  "...and each changeable field names its own",
  `${new Set(fieldPurposes).size} distinct of ${fieldPurposes.length}: ${fieldPurposes.join(", ")}`,
  new Set(fieldPurposes).size === 3 && !fieldPurposes.includes("sign-in"),
);
check(
  "...and the screen renders the label, not just declares it",
  "CODE_PURPOSE_LABEL[purpose] in the code screen",
  /\{CODE_PURPOSE_LABEL\[purpose\]\}/.test(A_SOURCES.code),
);
/**
 * ⛔⛔ REQUIRED, not optional with a default. A caller that forgets to say what
 * it is confirming must not compile — a guarantee no check here can make, so
 * the check is that the TYPE still carries it.
 */
check(
  "...and a caller cannot omit it",
  "purpose: CodePurpose, no `?` and no default",
  /\n  purpose: CodePurpose;/.test(A_SOURCES.code) &&
    !/purpose\?/.test(A_SOURCES.code) && !/purpose = /.test(A_SOURCES.code),
);
const callers = [["settings", A_SOURCES.settings], ["login", A_SOURCES.login]] as const;
const silentCallers = callers.filter(
  ([, src]) => codeOnly(src).includes("<VerificationCodeScreen") && !/purpose=/.test(codeOnly(src)),
);
check(
  "...and every caller passes one",
  `${silentCallers.length} of ${callers.length} caller(s) do not`,
  silentCallers.length === 0,
);

/* --- 13g5. The channel is SELECTED, then confirmed ---------------------- */

/**
 * ⭐ User direction, 2026-10-13: *"make it click first to select before jumping
 * into the verification code."*
 *
 * ⛔ The first build sent the code on tap. A code cannot be un-sent: a mis-tap
 * put the driver on a screen waiting for something delivered to the wrong
 * place, with the rate limit (CAP-125) between them and a second try.
 */
check(
  "picking a channel selects it rather than sending the code",
  "onClick sets state; a separate button sends",
  /onClick=\{\(\) => setChosen\(option\)\}/.test(A_SOURCES.settings) &&
    /onClick=\{\(\) => onPick\(chosen!\)\}/.test(A_SOURCES.settings),
);
check(
  "...and that button is disabled until something is selected",
  "disabled={chosen === null}",
  /disabled=\{chosen === null\}/.test(A_SOURCES.settings),
);
/** ⚠️ And the selection is visible, or "selected" is a state only the code knows. */
check(
  "...and the selection is shown on screen",
  "aria-pressed + a selected style branch",
  /aria-pressed=\{selected\}/.test(A_SOURCES.settings) &&
    /const selected = chosen === option;/.test(A_SOURCES.settings),
);

/* --- 13h. Proposed copy is marked, production copy is not ---------------- */

const ROW_15 = SOLUTIONS.find((s) => s.id === ACCOUNT_SOLUTION_ID)!;
check(
  "row 15 is in the prototype, demonstrated from the Options menu",
  `${ROW_15.buildState} · ${ROW_15.entry?.route} + ${(ROW_15.entry?.alternates ?? []).length} alternate(s)`,
  ROW_15.buildState === "in-prototype" &&
    ROW_15.entry?.route === "/options" &&
    (ROW_15.entry?.alternates ?? []).length === 1 &&
    ROW_15.entry?.alternates?.[0].route === "/options/account",
);
/** ⛔ No ⛔ may reach anything a driver reads. Swept again for this slice. */
const DRIVER_FACING = [
  SIGN_IN_TITLE, SIGN_IN_PHONE_SUBTITLE, SIGN_IN_EMAIL_SUBTITLE, OTP_TITLE,
  RESET_TITLE, RESET_SUBTITLE, OTP_ERROR_INVALID, OTP_ERROR_RATE_LIMIT,
  ...Object.values(CODE_PURPOSE_LABEL),
  ACCOUNT_ROW.label, ACCOUNT_ROW.description ?? "",
];
const markerLeaks = DRIVER_FACING.filter((text) => /⛔|⚠️|⭐/.test(text));
check(
  "no internal marker reaches driver-facing copy",
  `${markerLeaks.length} leak(s) of ${DRIVER_FACING.length} string(s)`,
  markerLeaks.length === 0,
);


// ---------------------------------------------------------------------------
console.log("\n14. Rider declined the trip — catalogue row 16");
// ---------------------------------------------------------------------------

const D_SOURCES = {
  rules: readFileSync(join(ROOT, "lib/driver-data/rider-declined.ts"), "utf8"),
  modal: readFileSync(join(ROOT, "components/driver/reach-rider-modal.tsx"), "utf8"),
  form: readFileSync(join(ROOT, "components/support/rider-declined-form.tsx"), "utf8"),
  detail: readFileSync(join(ROOT, "components/driver/ride-detail-layout.tsx"), "utf8"),
};
for (const [name, src] of Object.entries(D_SOURCES)) {
  check(`the declined ${name} source was read`, `${src.length} chars`, src.length > 1200);
}

/* --- 14a. The catalogue row ---------------------------------------------- */

const ROW_16 = SOLUTIONS.find((s) => s.id === "rider-initiated-cancellation")!;
check(
  "row 16 is in the prototype, entered from a needs-action ride",
  `${ROW_16.buildState} · ${ROW_16.entry?.route} · ${(ROW_16.entry?.alternates ?? []).length} alternate(s)`,
  ROW_16.buildState === "in-prototype" &&
    ROW_16.entry?.route === "/my-rides/1049800398" &&
    (ROW_16.entry?.alternates ?? []).length === 1,
);

/* --- 14b. Both modal variants carry the declined option ------------------ */

/**
 * ⚠️ The Phase 5 lesson, applied to a second option on the same modal: the
 * standard and same-day variants are built per variant rather than patched, so
 * an option present on one and absent on the other is a one-line mistake that
 * nothing else would catch.
 */
for (const sameDay of [false, true]) {
  // ⚠️ Built under ROW 16's OWN focus, which is how a reviewer meets it — and
  // the list is three options there, not four: rows 04/05's proposal is gated
  // out. Checking under no focus would quietly test a different screen.
  const options = reachOptionsFor(sameDay, FIXED("rider-initiated-cancellation"));
  check(
    `the ${sameDay ? "same-day" : "standard"} modal offers "Rider declined the trip"`,
    `${options.filter((o) => o.value === "declined").length} of ${options.length} option(s)`,
    options.filter((o) => o.value === "declined").length === 1,
  );
  check(
    `...and row 16's focus carries no OTHER row's proposal`,
    `${options.filter((o) => o.proposed).length} proposal(s) of ${options.length}`,
    options.filter((o) => o.proposed).length === 0 && options.length === 3,
  );
}

/* --- 14c. The sheet is CAP-224, not CAP-090 ------------------------------ */

/**
 * ⛔⛔ The prototype replicated `CAP-090` — an iOS capture of a 2021 ride with
 * one button, `Call Support`. The current build (`CAP-224` / `s-04b`) is a
 * bottom sheet with TWO buttons, the second a walk-back. Both bodies stay
 * DECLARED in the rules module as a record of what changed; only one may be
 * rendered, which is why this reads the component through `codeOnly`.
 */
const modalCode = codeOnly(D_SOURCES.modal);
/**
 * ⚠️ Updated in B3c. It used to grep for `{DECLINED_TITLE}` and `{DECLINED_BODY}`
 * — the proposal's literals, hard-wired into the JSX. Both sides now come from
 * `declinedSheetFor`, so the component must render the RULE's fields and must
 * not reach past it for a constant of its own. §23 runs the rule itself.
 */
check(
  "the declined sheet takes its copy from the rule, not from a literal",
  /\{declinedSheet\.title\}/.test(modalCode) && /\{declinedSheet\.body\}/.test(modalCode)
    ? "declinedSheet.title + .body"
    : "HARD-WIRED — one side of the comparison could never show",
  /\{declinedSheet\.title\}/.test(modalCode) &&
    /\{declinedSheet\.body\}/.test(modalCode) &&
    !/\{DECLINED_BODY\}/.test(modalCode) &&
    !/\{DECLINED_CONTINUE\}/.test(modalCode),
);
check(
  "...and the 2021 copy is nowhere in the rendered component",
  `${DECLINED_BODY_2021.slice(0, 24)}…`,
  !modalCode.includes(DECLINED_BODY_2021) && !modalCode.includes("Call Support"),
);
check(
  "...and both captured bodies stay declared, so the change is recorded",
  `2021 ${DECLINED_BODY_2021.length} chars · 2026 ${DECLINED_BODY_2026.length} chars`,
  DECLINED_BODY_2021.length > 0 &&
    DECLINED_BODY_2026.length > 0 &&
    D_SOURCES.rules.includes(DECLINED_BODY_2021) &&
    D_SOURCES.rules.includes(DECLINED_BODY_2026),
);
check(
  "...and it is a sheet, not the AlertDialog it used to be",
  "Drawer + DrawerContent, no AlertDialog",
  /<Drawer\b/.test(modalCode) && !/<AlertDialog\b/.test(modalCode),
);
/** ⛔ The walk-back files nothing — it must not reach the form. */
check(
  "the walk-back returns to the options and opens no form",
  `${DECLINED_WALK_BACK} — via declinedSheet.walkBackLabel`,
  /\{declinedSheet\.walkBackLabel\}/.test(modalCode) &&
    /setChoice\(null\);\s*\n\s*setTimeout\(\(\) => onOpenChange\(true\), SHEET_SWAP_MS\);/.test(
      modalCode,
    ),
);
check(
  "Continue is what opens the form",
  "<RiderDeclinedForm",
  /setDeclineFormOpen\(true\)/.test(modalCode) &&
    /<RiderDeclinedForm/.test(modalCode),
);

/**
 * ⛔⛔ **Found by walking, and no gate could have seen it.** Rebuilding the
 * declined popup as a SHEET made it a second vaul drawer, and two drawers
 * opened in the same frame stack rather than hand over — the reach modal stayed
 * on screen with the declined sheet peeking out beneath it. Every handover in
 * this flow is therefore deferred by one named constant, and an immediate
 * `setTimeout(..., 0)` is the bug, not the fix.
 */
const handovers = [...modalCode.matchAll(/setTimeout\(\(\) => [^,]+, ([A-Za-z_0-9]+)\)/g)];
check(
  "every sheet handover waits for the close animation",
  `${handovers.length} handover(s), delays: ${handovers.map((m) => m[1]).join(", ")}`,
  handovers.length === 4 && handovers.every((m) => m[1] === "SHEET_SWAP_MS"),
);
/**
 * ⛔ Pinned to vaul's own `TRANSITIONS.DURATION`, read out of the installed
 * package. A delay tuned by eye passes on the machine it was tuned on — 250ms
 * looked right and the sheets still stacked.
 */
const VAUL_DURATION_MS =
  Number(
    /DURATION:\s*([0-9.]+)/.exec(
      readFileSync(join(ROOT, "node_modules/vaul/dist/index.mjs"), "utf8"),
    )?.[1] ?? "0",
  ) * 1000;
check(
  "...and the delay is vaul's own close duration, not a guess",
  `${SHEET_SWAP_MS}ms vs vaul ${VAUL_DURATION_MS}ms`,
  VAUL_DURATION_MS > 0 && SHEET_SWAP_MS >= VAUL_DURATION_MS,
);

/* --- 14d. The channel table, and why it cannot be one file field --------- */

check(
  "five channels are declared",
  `${DECLINE_CHANNELS.length} channel(s)`,
  DECLINE_CHANNELS.length === 5,
);
check(
  "exactly two can produce an artifact",
  `${ARTIFACT_CHANNELS.length} of ${DECLINE_CHANNELS.length} — ${ARTIFACT_CHANNELS.join(", ")}`,
  ARTIFACT_CHANNELS.length === 2 &&
    ARTIFACT_CHANNELS.includes("text") &&
    ARTIFACT_CHANNELS.includes("call"),
);
check(
  "exactly two are second-hand",
  `${SECOND_HAND_CHANNELS.length} of ${DECLINE_CHANNELS.length} — ${SECOND_HAND_CHANNELS.join(", ")}`,
  SECOND_HAND_CHANNELS.length === 2 &&
    SECOND_HAND_CHANNELS.includes("caregiver") &&
    SECOND_HAND_CHANNELS.includes("facility"),
);
/**
 * ⭐ The row that forces the conditional model. `in-person` is first-hand AND
 * has no artifact — so "ask for a file when it is second-hand" and "ask for a
 * file when there is an artifact" are NOT the same rule, and a build that
 * collapsed them would tell a driver at a doorstep to screenshot a face.
 */
check(
  "the two flags are genuinely independent",
  "in-person: first-hand with no artifact",
  DECLINE_CHANNELS.some((c) => !c.hasArtifact && !c.secondHand) &&
    DECLINE_CHANNELS.some((c) => c.hasArtifact && !c.secondHand) &&
    DECLINE_CHANNELS.some((c) => !c.hasArtifact && c.secondHand),
);

/**
 * ⛔ **Found by walking.** Three of the five help strings said "below" about
 * "Who told you?" and "What did they say?", both of which render ABOVE the
 * proof box. A help string cannot see the field order — that lives in the case
 * registry — so naming a position is a claim this table has no way to keep.
 */
const positional = DECLINE_CHANNELS.filter((c) =>
  /\b(above|below)\b/i.test(`${c.proofLabel} ${c.proofHelp}`),
);
check(
  "no proof copy points at where another field sits",
  `${positional.length} of ${DECLINE_CHANNELS.length} channel(s) name a position`,
  positional.length === 0,
);

/* --- 14e. The field set, over every channel ------------------------------ */

const declineRide = mockNeedsActionTrips.find((t) => t.id === "1049800398")!;
const declineReturn = mockNeedsActionTrips.find((t) => t.id === "1049800399")!;
const declineCase = buildRiderDeclined(declineRide, declineRide.legs[0]).supportCase;

const proofFields = declineCase.fields.filter((f) =>
  f.id.startsWith("declineProof-"),
);
check(
  "one proof field per channel, generated from the one table",
  `${proofFields.length} of ${DECLINE_CHANNELS.length} channel(s)`,
  proofFields.length === DECLINE_CHANNELS.length &&
    DECLINE_CHANNELS.every((c) =>
      proofFields.some((f) => f.id === `declineProof-${c.value}`),
    ),
);
/**
 * ⚠️ Visibility swept over ALL five channels with a denominator, because a
 * `showIf` that matches nothing and a `showIf` that matches rarely look
 * identical from a passing check.
 */
let proofVisibilityChecked = 0;
for (const channel of DECLINE_CHANNELS) {
  const values = { issue: ISSUE_RIDER_DECLINED, declineChannel: channel.value };
  const visible = proofFields.filter((f) => isFieldVisible(f, values));
  proofVisibilityChecked += 1;
  check(
    `channel ${channel.value} shows exactly its own proof field`,
    `${visible.length} visible — ${visible.map((f) => f.id).join(", ")}`,
    visible.length === 1 && visible[0]!.id === `declineProof-${channel.value}`,
  );
  check(
    `...and its asterisk follows whether an artifact can exist`,
    `hasArtifact=${channel.hasArtifact} required=${Boolean(visible[0]?.required)}`,
    Boolean(visible[0]?.required) === channel.hasArtifact,
  );
  /** ⚠️ Asked, never blocking — user direction, 2026-10-13. */
  check(
    `...and it never blocks Submit`,
    `requiredNotEnforced=${Boolean(visible[0]?.requiredNotEnforced)}`,
    !visible[0]?.required || Boolean(visible[0]?.requiredNotEnforced),
  );
}
check(
  "every declared channel was swept for proof visibility",
  `${proofVisibilityChecked} of ${DECLINE_CHANNELS.length}`,
  proofVisibilityChecked === DECLINE_CHANNELS.length,
);

/** The name is asked for exactly where no artifact can stand in for it. */
const toldBy = declineCase.fields.find((f) => f.id === "toldBy")!;
let toldByShown = 0;
for (const channel of DECLINE_CHANNELS) {
  const shown = isFieldVisible(toldBy, {
    issue: ISSUE_RIDER_DECLINED,
    declineChannel: channel.value,
  });
  if (shown) toldByShown += 1;
  check(
    `"who told you?" on ${channel.value} follows second-hand`,
    `secondHand=${channel.secondHand} shown=${shown}`,
    shown === channel.secondHand,
  );
}
check(
  "...and it is shown on exactly the two second-hand channels",
  `${toldByShown} of ${DECLINE_CHANNELS.length}`,
  toldByShown === SECOND_HAND_CHANNELS.length,
);

/* --- 14f. The gate actually gates, and actually lets go ------------------ */

/**
 * ⛔ Two directions, because a check that only ever sees a full form cannot
 * tell a working gate from an absent one.
 */
const filledNoProof: Record<string, string> = {
  issue: ISSUE_RIDER_DECLINED,
  [DECLINED_LEGS_FIELD]: declineLegDefault(declineRide),
  declineChannel: "in-person",
  toldAt: "10:12",
  declineSaid: "She said her daughter is taking her and she does not need us.",
  declineAttestation: "signed",
};
check(
  "a complete form with no attachment can be sent",
  "channel=in-person, no file",
  areRequiredFieldsFilled(declineCase.fields, filledNoProof),
);
check(
  "...and so can one on a channel whose proof IS asterisked",
  "channel=call, no file",
  areRequiredFieldsFilled(declineCase.fields, {
    ...filledNoProof,
    declineChannel: "call",
  }),
);
check(
  "...but not one with no legs ticked",
  "declinedLegs empty",
  !areRequiredFieldsFilled(declineCase.fields, {
    ...filledNoProof,
    [DECLINED_LEGS_FIELD]: "",
  }),
);
check(
  "...and not one that is unsigned",
  "declineAttestation empty",
  !areRequiredFieldsFilled(declineCase.fields, {
    ...filledNoProof,
    declineAttestation: "",
  }),
);
check(
  "...and not one where a second-hand channel names nobody",
  "channel=facility, toldBy empty",
  !areRequiredFieldsFilled(declineCase.fields, {
    ...filledNoProof,
    declineChannel: "facility",
  }),
);

/* --- 14g. The legs, and the group they come from ------------------------- */

check(
  "the scenario rides are one round trip",
  `${declineRide.tripGroup} === ${declineReturn.tripGroup}`,
  Boolean(declineRide.tripGroup) &&
    declineRide.tripGroup === declineReturn.tripGroup,
);
check(
  "the checklist offers both legs, from either end",
  `${declineLegOptions(declineRide).length} / ${declineLegOptions(declineReturn).length}`,
  declineLegOptions(declineRide).length === 2 &&
    declineLegOptions(declineReturn).length === 2,
);
check(
  "...and every leg starts ticked, per the captured template",
  declineLegDefault(declineRide),
  parseLegSelection(declineLegDefault(declineRide)).length === 2,
);
check(
  "...and unticking one leaves the other",
  "toggle leg A off",
  parseLegSelection(
    toggleLegSelection(declineLegDefault(declineRide), "1049800398"),
  ).join(",") === "1049800399",
);
/** ⚠️ A ride with no group answers with itself — the honest one-way case. */
const oneWay = mockNeedsActionTrips.find((t) => !t.tripGroup)!;
check(
  "a one-way ride offers exactly itself",
  `${oneWay.id} → ${declineLegOptions(oneWay).length} leg(s)`,
  declineLegOptions(oneWay).length === 1,
);
check(
  "the ticked legs resolve back to their rides",
  "both legs → both trip ids",
  tripIdsForLegs(declineRide, ["1049800398", "1049800399"]).join(",") ===
    "1049800398,1049800399" &&
    tripIdsForLegs(declineRide, ["1049800399"]).join(",") === "1049800399",
);

/* --- 14h. It is NOT a send-back, and NOT a cancellation ------------------ */

/**
 * ⛔⛔ The whole argument for row 16 is that a member's decline must not be
 * recorded as a driver send-back — the send-back is the charged route. A check
 * should say so in code, not only in prose.
 */
const formCode = codeOnly(D_SOURCES.form);
check(
  "the declined form never sends a trip back",
  "no sendBackTrip",
  !formCode.includes("sendBackTrip") && !modalCode.includes("sendBackTrip"),
);
check(
  "...and files a request the app does not claim to track",
  "appTracksStatus: false",
  /appTracksStatus: false/.test(formCode),
);
check(
  "...and the rules module exposes no way to remove a ride",
  "no sendBack / removeTrip / cancelTrip export",
  !/export function (sendBack|removeTrip|cancelTrip)/.test(D_SOURCES.rules),
);
check(
  "...and the request state annotates rather than removes",
  "CANCELLATION_TRACKED_BY_APP === false",
  CANCELLATION_TRACKED_BY_APP === false,
);

/* --- 14i. The ride says what happened, and stops contradicting itself ---- */

const detailCode = codeOnly(D_SOURCES.detail);
/**
 * ⛔ Bound to the CONDITION that renders it, not merely to the string being
 * present — a check asserting a banner's words appear cannot see a branch that
 * is never reached.
 */
check(
  'the red "Confirmation required" banner yields to the cancellation one',
  "!cancellationRequested in its gate",
  /state === "needs-action" && !pendingRequest && !cancellationRequested &&/.test(
    detailCode,
  ),
);
check(
  "...and the cancellation banner is bound to the same flag",
  "cancellationRequested && … CANCELLATION_REQUESTED_TITLE",
  /\{cancellationRequested && \([\s\S]{0,600}\{CANCELLATION_REQUESTED_TITLE\}/.test(
    detailCode,
  ),
);
check(
  "...and the confirmation CTA is replaced, not left to be tapped again",
  "cancellationRequested ? pill : …",
  /\{cancellationRequested \? \([\s\S]{0,600}\{CANCELLATION_REQUESTED_PILL\}/.test(
    detailCode,
  ),
);

/* --- 14i2. ...and in the smaller fonts too ------------------------------- */

/**
 * ⛔ **Found by walking, after the banner was already right.** The banner said
 * the cancellation was with Support while the chip beside the leg details still
 * said "Not Confirmed", and the My Rides card said nothing at all. One
 * contradiction fixed in a big font is not the contradiction fixed — a driver
 * scanning the list is exactly the one who rings back, which is row 17's whole
 * subject area.
 */
check(
  'the "Not Confirmed" chip yields to the cancellation one',
  "cancellationRequested ? amber chip : red chip",
  /\{cancellationRequested \? \([\s\S]{0,260}\{CANCELLATION_REQUESTED_TITLE\}[\s\S]{0,200}: \([\s\S]{0,260}Not Confirmed/.test(
    detailCode,
  ),
);
const ridesCode = codeOnly(
  readFileSync(join(ROOT, "app/my-rides/page.tsx"), "utf8"),
);
check(
  "...and the My Rides card carries it as a status pill",
  "withCancellation(currentTrips)",
  /isCancellationRequested\(trip\.id\)/.test(ridesCode) &&
    /statusPills: \[[\s\S]{0,200}CANCELLATION_REQUESTED_TITLE/.test(ridesCode) &&
    /withCancellation\(currentTrips\)/.test(ridesCode),
);

/* --- 14j. No internal markers in anything a driver reads ----------------- */

const DECLINE_DRIVER_FACING = [
  DECLINED_TITLE,
  DECLINED_BODY,
  DECLINED_CONTINUE,
  DECLINED_WALK_BACK,
  CANCELLATION_REQUESTED_TITLE,
  CANCELLATION_REQUESTED_DETAIL,
  CANCELLATION_REQUESTED_PILL,
  ...DECLINE_CHANNELS.map((c) => c.label),
];
const declineLeaks = DECLINE_DRIVER_FACING.filter((text) => /⛔|⭐/.test(text));
check(
  "no internal marker reaches row 16's driver-facing copy",
  `${declineLeaks.length} leak(s) of ${DECLINE_DRIVER_FACING.length} string(s)`,
  declineLeaks.length === 0,
);
/**
 * ⚠️ The proof help text is the ONE place a ⚠️ is allowed, because it carries
 * the project's locked flag wording — "⚠️ Not in prototype yet". Asserted
 * rather than exempted silently.
 */
const flagged = DECLINE_CHANNELS.filter((c) =>
  c.proofHelp.includes("⚠️ Not in prototype yet"),
);
check(
  "the unenforced proof asks carry the locked flag wording",
  `${flagged.length} of ${ARTIFACT_CHANNELS.length} artifact channel(s)`,
  flagged.length === ARTIFACT_CHANNELS.length &&
    flagged.every((c) => c.hasArtifact),
);


// ===========================================================================
console.log("\n15. Update Trip Details — catalogue row 20");

const TRIP_CHANGE_ENTRY_RIDE = "1049800400";
const TRIP_CHANGE_ALT_RIDE = "1049800401";
const change20a = ALL_SEEDED.find((t) => t.id === TRIP_CHANGE_ENTRY_RIDE)!;
const change20b = ALL_SEEDED.find((t) => t.id === TRIP_CHANGE_ALT_RIDE)!;
check(
  "both scenario rides are seeded",
  `${[change20a, change20b].filter(Boolean).length} of 2 — ${change20a?.scenario?.code}, ${change20b?.scenario?.code}`,
  Boolean(change20a) && Boolean(change20b),
);

// ---- 15a · The anchors, and what the ride has moved past -----------------
const anchors20a = changeAnchors(change20a);
const anchors20b = changeAnchors(change20b);
check(
  "the clean ride offers BOTH ends",
  `${anchors20a.length} anchor(s), ${editableAnchors(change20a).length} editable — ${anchors20a.map((a) => `${a.kind}:${a.passed ? "passed" : "open"}`).join(", ")}`,
  anchors20a.length === 2 && editableAnchors(change20a).length === 2,
);
/**
 * ⭐ The whole reason `20b` exists. Its pick-up has been swiped, so it is
 * `passed` and drops out of the editable set — asking to move a pick-up that
 * already happened is a correction, which is catalogue row 03's case.
 *
 * ⛔ A check that only ever saw `20a` would pass while `anchorPassed` returned
 * a constant `false`, which is the exact shape of a check that stops checking.
 */
check(
  "the ride with its pick-up behind it offers ONLY the drop-off",
  `${anchors20b.length} anchor(s), ${editableAnchors(change20b).length} editable — ${anchors20b.map((a) => `${a.kind}:${a.passed ? "passed" : "open"}`).join(", ")}`,
  anchors20b.length === 2 &&
    editableAnchors(change20b).length === 1 &&
    anchors20b[0].passed &&
    !anchors20b[1].passed,
);
check(
  "the two rides DISAGREE about the pick-up, so the rule is doing work",
  `20a pick-up passed=${anchors20a[0].passed}, 20b pick-up passed=${anchors20b[0].passed}`,
  anchors20a[0].passed !== anchors20b[0].passed,
);
/**
 * ⛔⛔ The anchor's label is the RIDE's own wording, never a fixed "Drop-off
 * time". The seed calls a destination `Appointment Time` on 24 trips and
 * `Scheduled Drop-off` on 2, and a form printing a third name beside it would
 * ask the driver to work out whether those are the same row.
 */
check(
  "each anchor label is the ride's own, verbatim",
  `${anchors20a.map((a) => a.label).join(" | ")}`,
  anchors20a.every((a, i) => a.label === change20a.legs[i].label),
);

// ---- 15b · The case the two entry points build ---------------------------
const built20a = buildTripChange(change20a, change20a.legs[0]);
const built20b = buildTripChange(change20b, change20b.legs[0]);
const ids20a = built20a.supportCase.fields
  .filter((f) => f.showIf?.equals.includes(ISSUE_TRIP_CHANGE_REQUEST))
  .map((f) => f.id);
const EXPECTED_CHANGE_FIELDS = [
  "changeTime0",
  "changeAddress0",
  "changeTime1",
  "changeAddress1",
  CHANGE_SOURCE_FIELD,
  CHANGE_NOTES_FIELD,
];
check(
  "a two-anchor ride builds the declared six fields, in order",
  `${ids20a.length}: ${ids20a.join(", ")}`,
  ids20a.length === EXPECTED_CHANGE_FIELDS.length &&
    EXPECTED_CHANGE_FIELDS.every((id, i) => ids20a[i] === id),
);
/**
 * ⛔⛔ **No `notice` field on this case.** `canSubmitCase` treats a visible
 * notice as an outright block, so one used as a section header would make the
 * form permanently unsubmittable — in a way that looks exactly like the diff
 * gate misfiring.
 */
check(
  "no notice field — one would block Submit forever",
  `${built20a.supportCase.fields.filter((f) => f.type === "notice" && f.showIf?.equals.includes(ISSUE_TRIP_CHANGE_REQUEST)).length} notice(s) of ${ids20a.length}`,
  built20a.supportCase.fields.every(
    (f) =>
      !(f.type === "notice" && f.showIf?.equals.includes(ISSUE_TRIP_CHANGE_REQUEST)),
  ),
);
/** Who asked is the one thing Support cannot proceed without. */
const sourceField = built20a.supportCase.fields.find(
  (f) => f.id === CHANGE_SOURCE_FIELD,
)!;
const notesField = built20a.supportCase.fields.find(
  (f) => f.id === CHANGE_NOTES_FIELD,
)!;
check(
  "who asked is required; the free-text box beside it is not",
  `source required=${sourceField.required === true} (${sourceField.options?.length} options), notes required=${notesField.required === true}`,
  sourceField.required === true &&
    sourceField.options?.length === CHANGE_SOURCE_OPTIONS.length &&
    notesField.required !== true,
);
/**
 * ⛔⛔ **The RENDERED field's label, not the helper's.**
 *
 * The check in 15a above asserts `changeAnchors` carries the ride's own wording
 * — and a break test proved that is not the same claim: hard-coding
 * `label: "Drop-off time"` in the case registry left every check green, because
 * nothing downstream of the helper was being read. A form is what the driver
 * sees, so the form is what has to be asserted.
 */
const timeLabels = built20a.supportCase.fields
  .filter((f) => f.id.startsWith("changeTime"))
  .map((f) => f.label);
check(
  "each TIME FIELD prints the anchor's own label, verbatim",
  `${timeLabels.join(" | ")}`,
  timeLabels.length === anchors20a.length &&
    timeLabels.every((label, i) => label === anchors20a[i].label),
);
check(
  "...and the two are genuinely different words, so the check can fail",
  `${new Set(timeLabels).size} distinct of ${timeLabels.length}`,
  new Set(timeLabels).size === timeLabels.length,
);

/**
 * ⛔ The locked badge must not claim the value beside it was RECORDED. A locked
 * field shows the ride's scheduled 1:20 PM while the swipe that passed it landed
 * at 1:22 PM — "Already happened" was shipped and caught in the walk.
 */
const passedBadges = built20b.supportCase.fields
  .filter((f) => f.lockWhenPrefilled && f.id.startsWith("change"))
  .map((f) => f.lockedBadge);
check(
  "the locked badge names the END, not a recorded value",
  `${passedBadges.length} badge(s): ${[...new Set(passedBadges)].join(", ")}`,
  passedBadges.length === 2 &&
    passedBadges.every((b) => b === PASSED_ANCHOR_BADGE) &&
    !/record|happened/i.test(PASSED_ANCHOR_BADGE),
);

/** Locked on the end that has happened, open on the end that has not. */
const lock20b = built20b.supportCase.fields
  .filter((f) => f.id.startsWith("changeTime") || f.id.startsWith("changeAddress"))
  .map((f) => `${f.id}:${f.lockWhenPrefilled ? "locked" : "open"}`);
check(
  "20b locks the pick-up's two fields and leaves the drop-off's open",
  lock20b.join(", "),
  lock20b.join(", ") ===
    "changeTime0:locked, changeAddress0:locked, changeTime1:open, changeAddress1:open",
);

// ---- 15c · ⛔⛔ The diff gate --------------------------------------------
/**
 * The form opens with every answer already filled in, so "can this be sent"
 * cannot mean "is it filled in". The two checks below are a PAIR and neither is
 * worth anything alone:
 *
 *   · `canSubmitCase` PASSES the untouched form — which is the proof that the
 *     existing rule would have let an empty request through.
 *   · `hasRequiredChange` REFUSES it — which is the proof that something else
 *     is now stopping it.
 */
const untouched = { ...built20a.initialValues, [CHANGE_SOURCE_FIELD]: "member" };
check(
  "the untouched form passes the ORDINARY submit rule — the gate it needed does not exist",
  `canSubmitCase=${canSubmitCase(built20a.supportCase.fields, untouched)}`,
  canSubmitCase(built20a.supportCase.fields, untouched) === true,
);
check(
  "...and the diff gate refuses it anyway",
  `hasRequiredChange=${hasRequiredChange(built20a.supportCase.requireChangedFrom, untouched, built20a.initialValues)}`,
  hasRequiredChange(
    built20a.supportCase.requireChangedFrom,
    untouched,
    built20a.initialValues,
  ) === false,
);
const movedTime = { ...untouched, changeTime1: "15:30" };
check(
  "...and admits it once one field actually differs",
  `hasRequiredChange=${hasRequiredChange(built20a.supportCase.requireChangedFrom, movedTime, built20a.initialValues)}`,
  hasRequiredChange(
    built20a.supportCase.requireChangedFrom,
    movedTime,
    built20a.initialValues,
  ) === true,
);
/**
 * ⚠️ Every OTHER case must be untouched by this. A rule that defaulted to
 * "nothing may be submitted" when no list was declared would silently disable
 * every Submit button in the app.
 */
check(
  "a case with no declared list is unaffected",
  `hasRequiredChange(undefined)=${hasRequiredChange(undefined, {}, {})}`,
  hasRequiredChange(undefined, {}, {}) === true,
);
check(
  "⛔ a LOCKED field is not in the gate's list — it could never satisfy it",
  `20b watches ${built20b.supportCase.requireChangedFrom?.join(", ")}`,
  (built20b.supportCase.requireChangedFrom ?? []).join(",") ===
    "changeTime1,changeAddress1",
);

// ---- 15d · What the request says ----------------------------------------
const diff = tripChanges(built20a.anchors, built20a.initialValues, {
  ...built20a.initialValues,
  changeTime1: "15:30",
  changeAddress0: "  2201 Glenwood Ave SE, Atlanta, GA 30316  ",
});
check(
  "the request is the DIFF — a retyped-identical address with stray spaces is not a change",
  `${diff.length} change(s): ${diff.map((c) => `${c.anchorLabel}/${c.what}`).join(", ")}`,
  diff.length === 1 && diff[0].what === "time",
);
check(
  "...and it carries BOTH values, since the ride goes on showing the old one",
  `${diff[0]?.was} → ${diff[0]?.asked}`,
  diff[0]?.was === "14:15" && diff[0]?.asked === "15:30",
);
check(
  "an untouched form produces no changes at all",
  `${tripChanges(built20a.anchors, built20a.initialValues, built20a.initialValues).length} change(s)`,
  tripChanges(built20a.anchors, built20a.initialValues, built20a.initialValues)
    .length === 0,
);

// ---- 15e · The times still have to be in order --------------------------
/**
 * ⭐ The one case whose `timeSequence` is derived, because its fields are. A
 * drop-off asked for before its own pick-up describes a ride that cannot happen.
 */
check(
  "the time sequence names every anchor, in timeline order",
  `${built20a.supportCase.timeSequence?.join(", ")}`,
  (built20a.supportCase.timeSequence ?? []).join(",") ===
    "changeTime0,changeTime1",
);
const backwards = getTimeOrderWarnings(
  built20a.supportCase.fields,
  { ...built20a.initialValues, changeTime1: "10:30" },
  built20a.supportCase.timeSequence ?? [],
);
check(
  "a drop-off asked for before its own pick-up warns",
  `${Object.keys(backwards).length} warning(s): ${Object.keys(backwards).join(", ")}`,
  Object.keys(backwards).length === 1 && "changeTime1" in backwards,
);
check(
  "...and the ride as it stands warns about nothing",
  `${Object.keys(getTimeOrderWarnings(built20a.supportCase.fields, built20a.initialValues, built20a.supportCase.timeSequence ?? [])).length} warning(s)`,
  Object.keys(
    getTimeOrderWarnings(
      built20a.supportCase.fields,
      built20a.initialValues,
      built20a.supportCase.timeSequence ?? [],
    ),
  ).length === 0,
);

// ---- 15f · Who can open it ----------------------------------------------
/**
 * ⛔ Three doors closed for three different reasons, and each refusal says
 * which. A `completed` ride is row 03's case; an unaccepted offer is row 21's.
 */
const REFUSAL_CASES: Array<[string, string | null]> = [
  ["needs-action", null],
  ["in-progress", null],
  ["before-taken", TRIP_CHANGE_REFUSAL.state],
  ["completed", TRIP_CHANGE_REFUSAL.state],
];
for (const [state, expected] of REFUSAL_CASES) {
  const actual = tripChangeRefusal(change20a, state, false);
  check(
    `a ${state} ride ${expected === null ? "opens the form" : "is refused"}`,
    actual === null ? "opens" : actual.slice(0, 40) + "…",
    actual === expected,
  );
}
check(
  "a ride that already has a request is refused, with its own reason",
  tripChangeRefusal(change20a, "needs-action", true)?.slice(0, 40) + "…",
  tripChangeRefusal(change20a, "needs-action", true) ===
    TRIP_CHANGE_REFUSAL.pending,
);
check(
  "the three refusals are three distinct strings",
  `${new Set(Object.values(TRIP_CHANGE_REFUSAL)).size} distinct of ${Object.values(TRIP_CHANGE_REFUSAL).length}`,
  new Set(Object.values(TRIP_CHANGE_REFUSAL)).size ===
    Object.values(TRIP_CHANGE_REFUSAL).length,
);
/**
 * ⛔⛔ **A proposal belongs to its own build**, and this row has a THIRD surface
 * carrying that obligation — the pencil on the ride's own anchor rows. The More
 * Options grid is covered by `EXPECTED_GRIDS`; this is the other one, and it is
 * the rule the Reach Rider modal escaped until the user caught it on 2026-10-13.
 */
const ENTRY_SCOPE: Array<[string | null, boolean]> = [
  [null, true],
  ["change-pickup-dropoff", true],
  ["rider-no-show", false],
  ["rider-initiated-cancellation", false],
];
for (const [focus, expected] of ENTRY_SCOPE) {
  check(
    `the ride's pencil ${expected ? "shows" : "is withheld"} with ${focus ?? "nothing"} focused`,
    `${showsTripChangeEntry(FIXED(focus))}`,
    showsTripChangeEntry(FIXED(focus)) === expected,
  );
}

// ---- 15g · Driver-facing copy -------------------------------------------
const TRIP_CHANGE_DRIVER_FACING = [
  TRIP_CHANGE_LABEL,
  TRIP_CHANGE_REQUESTED_TITLE,
  TRIP_CHANGE_REQUESTED_DETAIL,
  TRIP_CHANGE_SUBMIT_TOAST,
  ...Object.values(TRIP_CHANGE_REFUSAL),
  ...CHANGE_SOURCE_OPTIONS.map((o) => o.label),
  ...built20a.supportCase.fields
    .filter((f) => f.showIf?.equals.includes(ISSUE_TRIP_CHANGE_REQUEST))
    .flatMap((f) => [f.label, f.helpText ?? "", f.placeholder ?? ""]),
];
check(
  "no internal marker reaches row 20's driver-facing copy",
  `${TRIP_CHANGE_DRIVER_FACING.filter((t) => /⛔|⭐/.test(t)).length} leak(s) of ${TRIP_CHANGE_DRIVER_FACING.length} string(s)`,
  TRIP_CHANGE_DRIVER_FACING.every((t) => !/⛔|⭐/.test(t)),
);
/**
 * ⛔ Help text cannot see field ORDER — the copy lives in the registry's field
 * literals and the order lives in the array around them — so "the field above"
 * is a claim it is in no position to make. Row 16 shipped three of these.
 */
const placed = TRIP_CHANGE_DRIVER_FACING.filter((t) =>
  /\b(above|below)\b/i.test(t),
);
check(
  "no row 20 copy claims where another field sits",
  `${placed.length} of ${TRIP_CHANGE_DRIVER_FACING.length} string(s)`,
  placed.length === 0,
);
/**
 * ⚠️ The help on each address names its own anchor, which is the only thing
 * tying "Drop-off address" to a row the ride calls "Appointment Time".
 */
const addressHelp = built20a.supportCase.fields.filter(
  (f) => f.id.startsWith("changeAddress") && f.helpText,
);
check(
  "every address field names the anchor it belongs to",
  `${addressHelp.filter((f, i) => f.helpText!.includes(anchors20a[i].label)).length} of ${anchors20a.length}`,
  addressHelp.length === anchors20a.length &&
    addressHelp.every((f, i) => f.helpText!.includes(anchors20a[i].label)),
);
/**
 * ⛔ The app never learns the outcome — the client owns the manifest. Asserted
 * as a constant so a later slice that starts tracking a status has to change a
 * declared fact rather than a comment.
 */
check(
  "row 20 does NOT claim to track what happens next",
  `TRIP_CHANGE_TRACKED_BY_APP=${TRIP_CHANGE_TRACKED_BY_APP}`,
  TRIP_CHANGE_TRACKED_BY_APP === false,
);


// ===========================================================================
console.log("\n16. Add Leg to Trip — catalogue row 19");

const ADD_ENTRY = "1049800402";   // 19a — the FINISHED leg of the group
const ADD_LIVE = "1049800403";    // 19b — its live half
const ADD_SOLO = "1049800404";    // 19c — one finished leg, no group
const leg19a = ALL_SEEDED.find((t) => t.id === ADD_ENTRY)!;
const leg19b = ALL_SEEDED.find((t) => t.id === ADD_LIVE)!;
const leg19c = ALL_SEEDED.find((t) => t.id === ADD_SOLO)!;
check(
  "all three scenario rides are seeded",
  `${[leg19a, leg19b, leg19c].filter(Boolean).length} of 3 — ${[leg19a, leg19b, leg19c].map((t) => t?.scenario?.code).join(", ")}`,
  Boolean(leg19a) && Boolean(leg19b) && Boolean(leg19c),
);

// ---- 16a · ⛔⛔ Two pools, one matcher ------------------------------------
/**
 * The finding this whole slice turns on. Row 16 must NOT see a completed leg
 * (you cannot report that a member declined a ride they already took); row 19
 * must, because a finished leg is its commonest entry point. One function
 * serving both would be wrong for one of them.
 */
check(
  "the two declared pools genuinely differ",
  `live ${LIVE_POOLS.length}, all ${ALL_POOLS.length}`,
  ALL_POOLS.length > LIVE_POOLS.length,
);
check(
  "⛔ row 16 CANNOT see the finished half of the group",
  `legsInGroup(19b) → ${legsInGroup(leg19b).map((t) => t.id).join(", ")}`,
  legsInGroup(leg19b).length === 1 && legsInGroup(leg19b)[0].id === ADD_LIVE,
);
check(
  "⭐ ...and row 19 CAN",
  `groupLegs(19b) → ${groupLegs(leg19b).map((l) => `${l.letter}:${l.trip.id}`).join(", ")}`,
  groupLegs(leg19b).length === 2 &&
    groupLegs(leg19b).some((l) => l.trip.id === ADD_ENTRY),
);
check(
  "both ends of the group see the SAME order",
  `from 19a: ${groupLegs(leg19a).map((l) => l.letter).join("")} · from 19b: ${groupLegs(leg19b).map((l) => l.letter).join("")}`,
  groupLegs(leg19a).map((l) => l.trip.id).join() ===
    groupLegs(leg19b).map((l) => l.trip.id).join(),
);

// ---- 16b · The forbidden slot --------------------------------------------
const legs19 = groupLegs(leg19a);
check(
  "the finished leg is read as finished and the live one as pending",
  legs19.map((l) => `${l.letter}:${l.activity}`).join(", "),
  legs19[0].activity === "completed" && legs19[1].activity === "pending",
);
/**
 * ⛔ User direction: *"if one of the legs are already active/completed you can't
 * put it before it."* Slot 0 sits ahead of a finished leg, so it is closed.
 */
check(
  "nothing may go before the finished leg",
  `earliest slot ${earliestSlot(legs19)}, allowed ${allowedSlots(legs19).join(", ")} of 0..${legs19.length}`,
  earliestSlot(legs19) === 1 &&
    allowedSlots(legs19).join(",") === "1,2" &&
    !allowedSlots(legs19).includes(0),
);
/**
 * ⛔⛔ The floor is one past the LAST started leg, not the first. A group whose
 * second leg is under way must not accept an insertion between the two.
 */
const syntheticLegs = [
  { ...legs19[0], index: 0, activity: "pending" as const },
  { ...legs19[1], index: 1, activity: "active" as const },
];
check(
  "...and the floor follows the LAST started leg, not the first",
  `earliest ${earliestSlot(syntheticLegs)} with pending→active`,
  earliestSlot(syntheticLegs) === 2,
);
check(
  "a group with nothing started opens every slot",
  `allowed ${allowedSlots(legs19.map((l) => ({ ...l, activity: "pending" as const }))).join(", ")}`,
  allowedSlots(legs19.map((l) => ({ ...l, activity: "pending" as const })))
    .join(",") === "0,1,2",
);

// ---- 16c · ⭐ The estimate, and where it comes from -----------------------
/**
 * ⛔ NOT from location. There are no coordinates in the seed and no routing
 * engine, so a figure sold as distance-based would be invented. What the group
 * knows is how long its own legs are scheduled to take.
 */
check(
  "the estimate is the mean of the group's own legs, to 5 minutes",
  `${newLegMinutes(legs19).minutes} min from ${newLegMinutes(legs19).source} (legs: 45, 50)`,
  newLegMinutes(legs19).minutes === 50 &&
    newLegMinutes(legs19).source === "group",
);
/** ⭐ The commonest real case, and a different branch. */
const legsSolo = groupLegs(leg19c);
check(
  "a lone finished leg has no sample, so the declared default is used",
  `${newLegMinutes(legsSolo).minutes} min from ${newLegMinutes(legsSolo).source}, ${legsSolo.length} leg(s)`,
  legsSolo.length === 1 &&
    estimateFromGroup(legsSolo) === null &&
    newLegMinutes(legsSolo).minutes === NEW_LEG_DEFAULT_MINUTES &&
    newLegMinutes(legsSolo).source === "default",
);
check(
  "the two sources give genuinely different numbers and different help",
  `${newLegMinutes(legs19).minutes} vs ${newLegMinutes(legsSolo).minutes}`,
  newLegMinutes(legs19).minutes !== newLegMinutes(legsSolo).minutes &&
    // ⚠️ Widened to `string` on purpose. Both sides are `as const` literals, so
    // tsc proves the comparison can never be false and REJECTS it — while at
    // runtime it is the check that would catch someone making the two help
    // strings identical. The cast keeps the check and satisfies the compiler.
    (ESTIMATE_HELP.group as string) !== (ESTIMATE_HELP.default as string),
);
check(
  "⛔ neither help string claims the estimate came from a location",
  `${[ESTIMATE_HELP.group, ESTIMATE_HELP.default].filter((t) => /distance|location|route|miles/i.test(t)).length} of 2`,
  ![ESTIMATE_HELP.group, ESTIMATE_HELP.default].some((t) =>
    /distance|location|route|miles/i.test(t),
  ),
);

// ---- 16d · ⭐⭐ The cascade ------------------------------------------------
/**
 * The behaviour worth having: a leg with SLACK does not move. A driver
 * inserting a one o'clock leg must not be told the three o'clock return has
 * changed.
 *
 * ⚠️ The two cases below are a pair. One alone proves nothing — a cascade that
 * never fires and one that always fires both pass a single-case check.
 */
const estimate19 = newLegMinutes(legs19).minutes;
const early = timeInputToMinutes("13:00")!;
const slackCase = cascadeShifts(legs19, 1, early, early + estimate19);
check(
  "⭐ a leg with slack is NOT shifted",
  `new leg 1:00 PM → ${minutesToClock(early + estimate19)}, leg B stays at ${legs19[1].pickupLabel} — ${slackCase.shifts.length} shift(s)`,
  slackCase.shifts.length === 0,
);
const late = timeInputToMinutes("14:30")!;
const pushCase = cascadeShifts(legs19, 1, late, late + estimate19);
check(
  "...and a leg that no longer fits IS",
  `new leg 2:30 PM → ${minutesToClock(late + estimate19)}, then ${pushCase.shifts.map((s) => `${s.letter} ${s.fromLabel}→${s.toLabel}`).join(", ")}`,
  pushCase.shifts.length === 1 &&
    pushCase.shifts[0].tripId === ADD_LIVE &&
    pushCase.shifts[0].toLabel === "3:35 PM",
);
check(
  "...and the shift is exactly the turnaround past the new drop-off",
  `${minutesToClock(late + estimate19)} + ${LEG_TURNAROUND_MINUTES} min = ${pushCase.shifts[0]?.toLabel}`,
  pushCase.shifts[0]?.toMinutes === late + estimate19 + LEG_TURNAROUND_MINUTES,
);
check(
  "neither case runs past midnight",
  `${slackCase.overnight} / ${pushCase.overnight}`,
  !slackCase.overnight && !pushCase.overnight,
);
/** ⚠️ Single-day only, inherited — reported rather than printed as a wrong time. */
const lateNight = timeInputToMinutes("23:30")!;
check(
  "⛔ a cascade that would cross midnight is REPORTED, not printed",
  `11:30 PM + ${estimate19} min → overnight=${cascadeShifts(legs19, 2, lateNight, lateNight + estimate19).overnight}`,
  cascadeShifts(legs19, 2, lateNight, lateNight + estimate19).overnight === true,
);

// ---- 16e · The case the three entry points build -------------------------
const built19 = buildAddLeg(leg19a, leg19a.legs[0]);
const ids19 = built19.supportCase.fields
  .filter((f) => f.showIf?.equals.includes(ISSUE_ADD_LEG_REQUEST))
  .map((f) => f.id);
const EXPECTED_ADD_FIELDS = [
  SLOT_FIELD,
  ADD_PICKUP_TIME_FIELD,
  ADD_PICKUP_ADDRESS_FIELD,
  ADD_DROPOFF_ADDRESS_FIELD,
  ADD_DROPOFF_TIME_FIELD,
  ADD_TIMING_FIELD,
  ADD_SOURCE_FIELD,
  ADD_NOTES_FIELD,
];
check(
  "the case at rest builds the declared eight fields, in order",
  `${ids19.length}: ${ids19.join(", ")}`,
  ids19.length === EXPECTED_ADD_FIELDS.length &&
    EXPECTED_ADD_FIELDS.every((id, i) => ids19[i] === id),
);
/**
 * ⭐⭐ The field set FOLLOWS the answers — the only case in the registry that
 * does. A pick-up time that pushes leg B adds an editable time for leg B; one
 * that does not, does not.
 */
const pushedCase = buildAddLegCase(leg19a, {
  [SLOT_FIELD]: "1",
  [ADD_PICKUP_TIME_FIELD]: "14:30",
});
const slackCaseFields = buildAddLegCase(leg19a, {
  [SLOT_FIELD]: "1",
  [ADD_PICKUP_TIME_FIELD]: "13:00",
});
const shiftFieldsIn = (c: typeof pushedCase) =>
  c.fields.filter((f) => f.id.startsWith("addLegShift_")).map((f) => f.id);
check(
  "⭐⭐ a pick-up that pushes leg B ADDS an editable time for it",
  `2:30 PM → ${shiftFieldsIn(pushedCase).join(", ") || "none"}`,
  shiftFieldsIn(pushedCase).join(",") === shiftFieldId(ADD_LIVE),
);
check(
  "...and one that does not, does not",
  `1:00 PM → ${shiftFieldsIn(slackCaseFields).join(", ") || "none"}`,
  shiftFieldsIn(slackCaseFields).length === 0,
);
check(
  "...so the two field sets are genuinely different lengths",
  `${pushedCase.fields.length} vs ${slackCaseFields.fields.length}`,
  pushedCase.fields.length !== slackCaseFields.fields.length,
);
/** The time sequence follows the fields, so a backwards edit still warns. */
check(
  "the derived time sequence names the new leg's ends then every shifted leg",
  `${pushedCase.timeSequence?.join(", ")}`,
  (pushedCase.timeSequence ?? []).join(",") ===
    [ADD_PICKUP_TIME_FIELD, ADD_DROPOFF_TIME_FIELD, shiftFieldId(ADD_LIVE)].join(","),
);

// ---- 16f · The leg-order control's payload -------------------------------
const slotField = built19.supportCase.fields.find((f) => f.id === SLOT_FIELD)!;
check(
  "the slot field carries a typed payload, not options",
  `type=${slotField.type} legOrder=${Boolean(slotField.legOrder)} options=${slotField.options?.length ?? 0}`,
  slotField.type === "leg-order" &&
    Boolean(slotField.legOrder) &&
    !slotField.options,
);
/**
 * ⛔⛔ The control decides nothing — the blocked rows and their REASONS arrive
 * from `add-leg-request.ts`. A reorder list working out its own legal moves
 * would be a correctness rule inside JSX.
 */
const rows19 = slotField.legOrder!.rows;
check(
  "the finished row is blocked, with a reason, and the live one is not",
  rows19.map((r) => `${r.letter}:${r.blockedReason ? "locked" : "open"}`).join(", "),
  Boolean(rows19[0].blockedReason) && !rows19[1].blockedReason,
);
check(
  "...and the reason says WHY, not just that it cannot be done",
  `${rows19[0].blockedReason}`,
  rows19[0].blockedReason === SLOT_BLOCKED_REASON.completed,
);
check(
  "the two blocked reasons are distinct, so the activity is doing work",
  `${Object.values(SLOT_BLOCKED_REASON).join(" / ")}`,
  new Set(Object.values(SLOT_BLOCKED_REASON)).size === 2,
);
/**
 * ⛔⛔ Walk-found 2026-10-13. The list printed `New leg B` directly above
 * `Leg B`: the new leg took its post-insertion letter while every existing leg
 * kept its pre-insertion one. The letter is the question this control exists to
 * answer, and two adjacent rows claiming the same one answers it twice over.
 */
const rowsAtSlot1 = buildAddLegCase(leg19a, {
  [SLOT_FIELD]: "1",
  [ADD_PICKUP_TIME_FIELD]: "14:30",
}).fields.find((f) => f.id === SLOT_FIELD)!.legOrder!;
check(
  "⛔ placing at slot 1 renumbers the leg behind it, so no two rows share a letter",
  `${rowsAtSlot1.newLegLabel} · rows ${rowsAtSlot1.rows.map((r) => r.letter).join(", ")}`,
  rowsAtSlot1.newLegLabel === "New leg B" &&
    rowsAtSlot1.rows.map((r) => r.letter).join(",") === "A,C",
);
const rowsAtSlot2 = buildAddLegCase(leg19a, {
  [SLOT_FIELD]: "2",
}).fields.find((f) => f.id === SLOT_FIELD)!.legOrder!;
check(
  "...and placing it last leaves every existing letter alone",
  `${rowsAtSlot2.newLegLabel} · rows ${rowsAtSlot2.rows.map((r) => r.letter).join(", ")}`,
  rowsAtSlot2.newLegLabel === "New leg C" &&
    rowsAtSlot2.rows.map((r) => r.letter).join(",") === "A,B",
);
check(
  "⛔ ...and a SHIFTED leg is named by its new letter too — the second site",
  `${pushCase.shifts.map((s) => `Leg ${s.letter}`).join(", ")}`,
  pushCase.shifts.length === 1 && pushCase.shifts[0].letter === "C",
);
check(
  "the control is told which value fields to preview from",
  `${slotField.legOrder!.pickupTimeField} / ${slotField.legOrder!.dropoffTimeField}`,
  slotField.legOrder!.pickupTimeField === ADD_PICKUP_TIME_FIELD &&
    slotField.legOrder!.dropoffTimeField === ADD_DROPOFF_TIME_FIELD,
);
check(
  "the opening slot is an ALLOWED one, never 0 by default",
  `opens at ${built19.initialValues[SLOT_FIELD]}, allowed ${slotField.legOrder!.allowedSlots.join(", ")}`,
  slotField.legOrder!.allowedSlots.includes(
    Number(built19.initialValues[SLOT_FIELD]),
  ) && built19.initialValues[SLOT_FIELD] !== "0",
);

// ---- 16g · ⛔⛔ The recompute key cannot retrigger itself ------------------
/**
 * The sheet writes `derive(values).patch` in an effect keyed on
 * `derive(values).key`. If the patch could change the key, that effect would
 * write, re-key and write again — forever. They are disjoint by construction,
 * and this is where that is pinned.
 */
const planValues = {
  [SLOT_FIELD]: "1",
  [ADD_PICKUP_TIME_FIELD]: "14:30",
};
const planned = addLegPlan(leg19a, planValues);
/**
 * ⛔⛔ Reads the REAL function and the REAL key field list, not a restatement.
 * The first version of this check declared its own `keyIds` and `patchIds`
 * arrays and compared those — so a break that added a patched field to the
 * actual key produced NO failure. A check that compares two copies of a claim
 * is testing the copies.
 */
const realDerive = addLegDerive(leg19a, planValues);
const patchIds = Object.keys(realDerive.patch);
check(
  "the patch writes the fields it is supposed to",
  `${patchIds.join(", ")}`,
  patchIds.includes(ADD_DROPOFF_TIME_FIELD) &&
    planned.shifts.every((shift) => patchIds.includes(shiftFieldId(shift.tripId))),
);
check(
  "⛔⛔ nothing the patch writes appears in the key",
  `key reads ${ADD_LEG_KEY_FIELDS.join(", ")} · patch writes ${patchIds.join(", ")}`,
  patchIds.every((id) => !ADD_LEG_KEY_FIELDS.includes(id)),
);
/**
 * ⛔⛔ The direct proof, and the one a field-list comparison cannot give:
 * applying the patch must leave the key UNCHANGED. If it does not, the sheet's
 * effect writes, re-keys and writes again — forever.
 */
const afterPatch = addLegDerive(leg19a, { ...planValues, ...realDerive.patch });
check(
  "⛔⛔ ...so applying the patch leaves the key identical — the effect cannot retrigger",
  `"${realDerive.key}" → "${afterPatch.key}"`,
  afterPatch.key === realDerive.key,
);
/**
 * ⛔⛔ **Changing the pick-up must change what the patch proposes.** This is the
 * walk-found defect: the derive guarded on an empty drop-off, so after the first
 * write it never proposed again — 2:30 PM → 1:00 PM left the drop-off at 3:20 PM
 * and the knock-on for Leg C still on screen.
 *
 * ⚠️ Asserted of `addLegDerive`, NOT `addLegPlan`. The plan-level check below
 * passed throughout the defect, because the plan was never the broken part —
 * the third time in two slices that a check aimed one layer away from the fault.
 */
const atLate = addLegDerive(leg19a, {
  [SLOT_FIELD]: "1",
  [ADD_PICKUP_TIME_FIELD]: "14:30",
  [ADD_DROPOFF_TIME_FIELD]: "15:20",
});
const atEarly = addLegDerive(leg19a, {
  [SLOT_FIELD]: "1",
  [ADD_PICKUP_TIME_FIELD]: "13:00",
  // ⛔ The stale drop-off the app wrote a moment ago — the exact state the
  // defect left behind.
  [ADD_DROPOFF_TIME_FIELD]: "15:20",
});
check(
  "⛔⛔ moving the pick-up re-proposes the drop-off, even over an app-written one",
  `2:30 PM → ${atLate.patch[ADD_DROPOFF_TIME_FIELD]} · 1:00 PM → ${atEarly.patch[ADD_DROPOFF_TIME_FIELD]}`,
  atLate.patch[ADD_DROPOFF_TIME_FIELD] === "15:20" &&
    atEarly.patch[ADD_DROPOFF_TIME_FIELD] === "13:50",
);
check(
  "...and the knock-on goes with it — a shift at 2:30 PM, none at 1:00 PM",
  `${Object.keys(atLate.patch).length} field(s) at 2:30 PM, ${Object.keys(atEarly.patch).length} at 1:00 PM`,
  Object.keys(atLate.patch).includes(shiftFieldId(ADD_LIVE)) &&
    !Object.keys(atEarly.patch).includes(shiftFieldId(ADD_LIVE)),
);

/** ⚠️ A driver's own drop-off survives; without one, the estimate fills it. */
check(
  "the proposed drop-off follows the pick-up when the driver has not set one",
  `${minutesToClock(planned.proposedDropoff!)}`,
  planned.proposedDropoff === timeInputToMinutes("14:30")! + estimate19,
);
const overridden = addLegPlan(leg19a, {
  ...planValues,
  [ADD_DROPOFF_TIME_FIELD]: "16:00",
});
check(
  "⛔ ...and a drop-off the driver typed WINS over the estimate",
  `${minutesToClock(overridden.dropoffMinutes!)} vs proposed ${minutesToClock(overridden.proposedDropoff!)}`,
  overridden.dropoffMinutes === timeInputToMinutes("16:00") &&
    overridden.dropoffMinutes !== overridden.proposedDropoff,
);

// ---- 16h · The "tagged critical" clause ----------------------------------
/**
 * ⛔⛔ The catalogue asks for *"tagged critical"*. The prototype states the
 * CONDITION and never the verdict: "critical" is a promise about what Support
 * does with the request and nobody has agreed one.
 */
check(
  "⛔ no timing label promises a Support behaviour",
  `${Object.values(TIMING_LABEL).join(" / ")}`,
  !Object.values(TIMING_LABEL).some((t) =>
    /critical|urgent|priorit|escalat|immediat/i.test(t),
  ),
);
const TIMING_CASES: Array<[string, boolean, string]> = [
  ["a finished leg today", true, "today-under-way"],
  ["a trip on another day", false, "other-day"],
];
for (const [what, isToday, expected] of TIMING_CASES) {
  check(
    `timing for ${what}`,
    `${addLegTiming(legs19, isToday)} (expected ${expected})`,
    addLegTiming(legs19, isToday) === expected,
  );
}
check(
  "a same-day trip with nothing started is 'today', not 'under way'",
  `${addLegTiming(legs19.map((l) => ({ ...l, activity: "pending" as const })), true)}`,
  addLegTiming(
    legs19.map((l) => ({ ...l, activity: "pending" as const })),
    true,
  ) === "today",
);
check(
  "...so all three timing values are reachable",
  `${new Set([...TIMING_CASES.map(([, , e]) => e), "today"]).size} of ${Object.keys(TIMING_LABEL).length}`,
  new Set([...TIMING_CASES.map(([, , e]) => e), "today"]).size ===
    Object.keys(TIMING_LABEL).length,
);
check(
  "the seeded trips are read against MOCK_TODAY, not the real clock",
  `19a ${isTripToday(leg19a)} · 19c ${isTripToday(leg19c)}`,
  isTripToday(leg19a) && isTripToday(leg19c),
);

// ---- 16i · Entry points and copy -----------------------------------------
/**
 * ⭐ The completed state is included — user direction 1.1 — and it is the only
 * state in this app that offers a support action from a finished ride.
 * ⛔ Row 20 refuses `completed` for the opposite reason: that one would be
 * CORRECTING a finished leg, which is row 03's case.
 */
check(
  "⭐ row 19 accepts a COMPLETED ride and row 20 refuses one",
  `add-leg ${canRequestAddLeg("completed", false)} · trip-change ${tripChangeRefusal(change20a, "completed", false) === null}`,
  canRequestAddLeg("completed", false) === true &&
    tripChangeRefusal(change20a, "completed", false) !== null,
);
check(
  "⛔ an offer the driver has not accepted is refused",
  `${addLegRefusal("before-taken", false)?.slice(0, 40)}…`,
  addLegRefusal("before-taken", false) === ADD_LEG_REFUSAL.state,
);
check(
  "a group that already has a request is refused, with its own reason",
  `${addLegRefusal("completed", true)?.slice(0, 40)}…`,
  addLegRefusal("completed", true) === ADD_LEG_REFUSAL.pending,
);
/** ⛔ Keyed by GROUP, so the sibling leg shows it too. */
check(
  "⛔ the request is keyed by GROUP, so both legs resolve to one key",
  `19a ${groupKey(leg19a)} · 19b ${groupKey(leg19b)} · 19c ${groupKey(leg19c)}`,
  groupKey(leg19a) === groupKey(leg19b) && groupKey(leg19c) !== groupKey(leg19a),
);
/** ⛔⛔ A proposal belongs to its own build — row 19's THIRD surface. */
const ADD_ENTRY_SCOPE: Array<[string | null, boolean]> = [
  [null, true],
  ["add-leg-request", true],
  ["change-pickup-dropoff", false],
  ["rider-no-show", false],
];
for (const [focus, expected] of ADD_ENTRY_SCOPE) {
  check(
    `the completed ride's button ${expected ? "shows" : "is withheld"} with ${focus ?? "nothing"} focused`,
    `${showsAddLegEntry(FIXED(focus))}`,
    showsAddLegEntry(FIXED(focus)) === expected,
  );
}
/** ⛔ Four options, not row 20's five — nobody notices a leg that does not exist. */
check(
  "⛔ 'who asked' is its OWN field, with its own shorter list",
  `add-leg ${ADD_SOURCE_OPTIONS.length} vs trip-change ${CHANGE_SOURCE_OPTIONS.length}; ids ${ADD_SOURCE_FIELD} / ${CHANGE_SOURCE_FIELD}`,
  // ⚠️ Widened for the same reason as the help-string compare above.
  (ADD_SOURCE_FIELD as string) !== (CHANGE_SOURCE_FIELD as string) &&
    ADD_SOURCE_OPTIONS.length === 4 &&
    CHANGE_SOURCE_OPTIONS.length === 5,
);
const ADD_DRIVER_FACING = [
  ADD_LEG_LABEL,
  ADD_LEG_REQUESTED_TITLE,
  ADD_LEG_REQUESTED_DETAIL,
  ADD_LEG_SUBMIT_TOAST,
  OVERNIGHT_WARNING,
  ...Object.values(ADD_LEG_REFUSAL),
  ...Object.values(SLOT_BLOCKED_REASON),
  ...Object.values(TIMING_LABEL),
  ...Object.values(ESTIMATE_HELP),
  ...ADD_SOURCE_OPTIONS.map((o) => o.label),
  ...built19.supportCase.fields
    .filter((f) => f.showIf?.equals.includes(ISSUE_ADD_LEG_REQUEST))
    .flatMap((f) => [f.label, f.helpText ?? "", f.placeholder ?? ""]),
];
check(
  "no internal marker reaches row 19's driver-facing copy",
  `${ADD_DRIVER_FACING.filter((t) => /⛔|⭐/.test(t)).length} leak(s) of ${ADD_DRIVER_FACING.length} string(s)`,
  ADD_DRIVER_FACING.every((t) => !/⛔|⭐/.test(t)),
);
check(
  "no row 19 copy claims where another field sits",
  `${ADD_DRIVER_FACING.filter((t) => /\b(above|below)\b/i.test(t)).length} of ${ADD_DRIVER_FACING.length} string(s)`,
  !ADD_DRIVER_FACING.some((t) => /\b(above|below)\b/i.test(t)),
);
check(
  "row 19 does NOT claim to track what happens next",
  `ADD_LEG_TRACKED_BY_APP=${ADD_LEG_TRACKED_BY_APP}`,
  ADD_LEG_TRACKED_BY_APP === false,
);
/** ⛔ A notice would block Submit forever — the row 20 lesson, re-asserted. */
check(
  "no notice field on this case either",
  `${built19.supportCase.fields.filter((f) => f.type === "notice" && f.showIf?.equals.includes(ISSUE_ADD_LEG_REQUEST)).length} of ${ids19.length}`,
  !built19.supportCase.fields.some(
    (f) => f.type === "notice" && f.showIf?.equals.includes(ISSUE_ADD_LEG_REQUEST),
  ),
);
/**
 * ⛔⛔ The slot and the pick-up time are two separate answers and can contradict
 * each other. Walk-found: the new leg could be dropped LAST with a 1:00 PM
 * pick-up, behind a leg starting at 3:00 PM, and nothing said so —
 * `getTimeOrderWarnings` compares FIELDS and the leg in front has none unless
 * the insertion happened to shift it.
 */
const outOfOrder = buildAddLegCase(leg19a, {
  [SLOT_FIELD]: "2",
  [ADD_PICKUP_TIME_FIELD]: "13:00",
}).fields.find((f) => f.id === SLOT_FIELD)!;
check(
  "⛔ a new leg placed behind a later one warns on the SLOT",
  `${outOfOrder.warning ? outOfOrder.warning.slice(0, 64) + "…" : "no warning"}`,
  Boolean(outOfOrder.warning) &&
    outOfOrder.warning!.includes("3:00 PM") &&
    outOfOrder.warning!.includes("1:00 PM"),
);
const slotInOrder = buildAddLegCase(leg19a, {
  [SLOT_FIELD]: "2",
  [ADD_PICKUP_TIME_FIELD]: "16:00",
}).fields.find((f) => f.id === SLOT_FIELD)!;
check(
  "...and a consistent placement does not",
  `slot 2 at 4:00 PM → ${slotInOrder.warning ?? "no warning"}`,
  slotInOrder.warning === undefined,
);
check(
  "...and it WARNS rather than blocking, like every other time rule here",
  `canSubmitCase with the warning showing = ${canSubmitCase(
    buildAddLegCase(leg19a, { [SLOT_FIELD]: "2", [ADD_PICKUP_TIME_FIELD]: "13:00" }).fields,
    {
      ...built19.initialValues,
      [SLOT_FIELD]: "2",
      [ADD_PICKUP_TIME_FIELD]: "13:00",
      [ADD_PICKUP_ADDRESS_FIELD]: "x",
      [ADD_DROPOFF_ADDRESS_FIELD]: "y",
      [ADD_SOURCE_FIELD]: "member",
    },
  )}`,
  canSubmitCase(
    buildAddLegCase(leg19a, { [SLOT_FIELD]: "2", [ADD_PICKUP_TIME_FIELD]: "13:00" }).fields,
    {
      ...built19.initialValues,
      [SLOT_FIELD]: "2",
      [ADD_PICKUP_TIME_FIELD]: "13:00",
      [ADD_PICKUP_ADDRESS_FIELD]: "x",
      [ADD_DROPOFF_ADDRESS_FIELD]: "y",
      [ADD_SOURCE_FIELD]: "member",
    },
  ) === true,
);

/**
 * ⭐ The overnight notice, which is the ONE place a `notice` is the right answer
 * rather than row 20's trap. It blocks Submit, and here that is the behaviour
 * wanted: a schedule crossing midnight is one the app genuinely cannot work out.
 */
const overnightCase = buildAddLegCase(leg19a, {
  [SLOT_FIELD]: "2",
  [ADD_PICKUP_TIME_FIELD]: "23:30",
});
const overnightNotice = overnightCase.fields.find(
  (f) => f.type === "notice" && f.showIf?.equals.includes(ISSUE_ADD_LEG_REQUEST),
);
check(
  "⭐ a midnight-crossing schedule raises a notice...",
  `${overnightNotice ? overnightNotice.helpText : "none"}`,
  overnightNotice?.helpText === OVERNIGHT_WARNING,
);
check(
  "...which BLOCKS Submit, which is the point",
  `canSubmitCase=${canSubmitCase(overnightCase.fields, { ...built19.initialValues, [ADD_PICKUP_TIME_FIELD]: "23:30", [ADD_PICKUP_ADDRESS_FIELD]: "x", [ADD_DROPOFF_ADDRESS_FIELD]: "y", [ADD_SOURCE_FIELD]: "member" })}`,
  canSubmitCase(overnightCase.fields, {
    ...built19.initialValues,
    [ADD_PICKUP_TIME_FIELD]: "23:30",
    [ADD_PICKUP_ADDRESS_FIELD]: "x",
    [ADD_DROPOFF_ADDRESS_FIELD]: "y",
    [ADD_SOURCE_FIELD]: "member",
  }) === false,
);
check(
  "⚠️ ...and an ordinary schedule raises no notice, so the form still submits",
  `${pushedCase.fields.filter((f) => f.type === "notice").length} notice(s) at 2:30 PM`,
  !pushedCase.fields.some((f) => f.type === "notice"),
);

/** ⛔ No diff gate here — an added leg has no baseline to differ from. */
check(
  "⛔ row 19 declares NO diff gate — row 20's rule does not transfer",
  `requireChangedFrom=${built19.supportCase.requireChangedFrom ?? "undefined"}`,
  built19.supportCase.requireChangedFrom === undefined,
);


// ---------------------------------------------------------------------------
console.log("\n17. The desktop phone frame contains the app, and only the app");
// ---------------------------------------------------------------------------
/**
 * ⛔⛔ A portal escapes every ancestor, including the transform that makes the
 * phone frame a containing block. Measured before the fix: a support form
 * opened at `[0, 900, 1440, 792]` parented to `document.body` — the full window
 * width, lying across the feature table beside the app it belongs to.
 *
 * Five mirrored `components/ui/*` files now pass a container. That is a SHARED
 * FILE divergence to hand-reconcile at fold-in, so it is counted here with a
 * declared literal: fold-in greps the marker and the number says how many it
 * should find.
 */
const CONTAINED_UI = [
  "components/ui/drawer.tsx",
  "components/ui/alert-dialog.tsx",
  "components/ui/select.tsx",
  "components/ui/sheet.tsx",
  "components/ui/popover.tsx",
] as const;
const EXPECTED_CONTAINED = 5;

const uiMissing = CONTAINED_UI.filter((rel) => {
  const text = readFileSync(join(ROOT, rel), "utf8");
  return !(text.includes("usePhoneShell") && /container=\{shell\}|container=\{container\}/.test(text));
});
check(
  "every portalled UI surface is handed the phone frame",
  uiMissing.length ? `MISSING: ${uiMissing.join(", ")}` : `${CONTAINED_UI.length} of ${EXPECTED_CONTAINED} wired`,
  uiMissing.length === 0 && CONTAINED_UI.length === EXPECTED_CONTAINED,
);

/**
 * ⛔ Exactly ONE opt-out, and it must be tooling.
 *
 * The prototype selector lists all 26 proposed features and belongs to the
 * page, not to the phone — containing it would shrink the catalogue to 390px
 * and drop it on top of the app it exists to navigate. Every OTHER drawer is
 * the driver's. A second opt-out is almost certainly a driver surface escaping
 * by accident, which is the exact bug this section exists to stop.
 */
function walkSource(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(join(ROOT, dir))) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const rel = `${dir}/${entry}`;
    try {
      if (readdirSync(join(ROOT, rel)).length >= 0) walkSource(rel, out);
    } catch {
      if (/\.tsx?$/.test(entry)) out.push(rel);
    }
  }
  return out;
}
const sourceRels = ["app", "components", "lib"].flatMap((d) => walkSource(d));
const optOuts = sourceRels.filter((rel) =>
  readFileSync(join(ROOT, rel), "utf8").includes('portalTarget="viewport"'),
);
check(
  "exactly one surface opts out of the phone frame",
  `${optOuts.length} of ${sourceRels.length} source files — ${optOuts.join(", ") || "none"}`,
  optOuts.length === 1,
);
check(
  "...and the one that opts out is tooling, not a driver surface",
  optOuts[0] ?? "(none)",
  optOuts.length === 1 && optOuts[0].startsWith("components/solutions-dev/"),
);

/**
 * ⛔ Safari, and only Safari. vaul's `usePositionFixed` short-circuits
 * everywhere else, but on Safari it pins `document.body` while a drawer is
 * open — which in a two-pane layout yanks the page out from under the feature
 * table. The frame owns its own scroll, so the body never needed locking.
 * ⚠️ Tied to the container, not set unconditionally: below the breakpoint there
 * is no frame and the old behaviour is the correct one.
 */
const drawerSrc = readFileSync(join(ROOT, "components/ui/drawer.tsx"), "utf8");
check(
  "the body lock is disabled exactly when the drawer is contained",
  drawerSrc.includes("noBodyStyles={Boolean(container)}")
    ? "noBodyStyles={Boolean(container)}"
    : "NOT FOUND — vaul will body-lock Safari inside the frame",
  drawerSrc.includes("noBodyStyles={Boolean(container)}"),
);


/**
 * ⛔⛔ The strip and the table are ALTERNATIVES, and exactly one shows at any
 * width. Above the breakpoint the table carries the briefing against the row it
 * describes, so the strip would repeat it; below it, the strip is the only way
 * in and the table is hidden instead.
 *
 * Four rules, all in CSS, and a mistake in any one is invisible: drop the base
 * `display:none` on the table and 26 rows stack above the app on a phone; drop
 * the desktop `display:none` on the strip and the duplication is back; drop the
 * desktop `display:block` and the table never appears at all.
 */
const cssAll = readFileSync(join(ROOT, "app/globals.css"), "utf8");
const mediaAt = cssAll.indexOf("@media (min-width: 1280px)");
const cssBase = mediaAt > 0 ? cssAll.slice(0, mediaAt) : "";
const cssDesktop = mediaAt > 0 ? cssAll.slice(mediaAt) : "";
const hides = (css: string, sel: string) =>
  new RegExp(`\\${sel}\\s*\\{[^}]*display:\\s*none`).test(css);
const shows = (css: string, sel: string) =>
  new RegExp(`\\${sel}\\s*\\{[^}]*display:\\s*block`).test(css);

const visibilityRules: Array<[string, boolean]> = [
  ["below the breakpoint the table is hidden", hides(cssBase, ".solution-table-col")],
  ["below the breakpoint the strip is NOT hidden", !hides(cssBase, ".solution-strip")],
  ["above the breakpoint the table is shown", shows(cssDesktop, ".solution-table-col")],
  ["above the breakpoint the strip is hidden", hides(cssDesktop, ".solution-strip")],
];
const brokenRules = visibilityRules.filter(([, ok]) => !ok).map(([label]) => label);
check(
  "exactly one of the strip and the table is visible at any width",
  brokenRules.length ? `BROKEN: ${brokenRules.join("; ")}` : `${visibilityRules.length} of 4 rules hold`,
  brokenRules.length === 0,
);

/**
 * ⛔ Hiding the strip at desktop removes four affordances the table never had.
 * Each must have landed in the table, or focusing a row on a wide screen is a
 * one-way trip with no way back and no way to a slice's other states.
 */
const tableSrc = readFileSync(join(ROOT, "components/solutions-dev/solution-table.tsx"), "utf8");
/**
 * ⚠️ B6 dropped `entry.label` from this list — see §25, which asserts it is
 * GONE from the table's code rather than present in it. The other three are
 * still the only way out of a focus and into a slice's other states at desktop.
 */
const MOVED_OFF_STRIP = ["clear", "alternates", "noSurfaceReason"] as const;
const notMoved = MOVED_OFF_STRIP.filter((needle) => !codeOnly(tableSrc).includes(needle));
check(
  "everything the strip carried alone has a home in the table",
  notMoved.length ? `MISSING: ${notMoved.join(", ")}` : `${MOVED_OFF_STRIP.length} of ${MOVED_OFF_STRIP.length} moved`,
  notMoved.length === 0,
);

/** ⭐ The breakpoint is written twice — in TS and in CSS. Prove they agree. */
const shellSrc = readFileSync(join(ROOT, "components/solutions-dev/phone-shell.tsx"), "utf8");
const cssSrc = readFileSync(join(ROOT, "app/globals.css"), "utf8");
const tsPx = shellSrc.match(/DESKTOP_SHELL_MIN_PX = (\d+)/)?.[1];
const cssPx = cssSrc.match(/@media \(min-width: (\d+)px\)[\s\S]*?\.phone-shell/)?.[1];
check(
  "the breakpoint in TS and the one in CSS are the same number",
  `TS=${tsPx ?? "?"} CSS=${cssPx ?? "?"}`,
  Boolean(tsPx) && tsPx === cssPx,
);


// ---------------------------------------------------------------------------
console.log("\n18. The feature table reconstructs the spreadsheet's merged shape");
// ---------------------------------------------------------------------------
/**
 * ⭐ The source file merges cells; `catalogue.ts` stores a merged cell by
 * REPEATING its text on every row it covered. So the merges are recoverable by
 * grouping adjacent rows on string equality — and these checks prove the
 * reconstruction is faithful, not merely plausible.
 *
 * ⛔ Expectations are declared HERE as literals, never imported from the module
 * under test. A count exported beside the computation is a restatement of it,
 * and two restatements agreeing has already passed two break tests in this
 * repo while the code was wrong.
 */
const EXPECTED_MERGED_AREA = 7;
const EXPECTED_MERGED_PROBLEM = 4;
const EXPECTED_MERGED_USECASE = 2;
const EXPECTED_TABLE_ROWS = 26;

const tRows = tableRows();
check(
  "one table row per catalogue entry",
  `${tRows.length} of ${EXPECTED_TABLE_ROWS}`,
  tRows.length === EXPECTED_TABLE_ROWS,
);

const merged = mergedRunCounts(tRows);
check(
  "merged runs match the spreadsheet, column by column",
  `area ${merged.area}/${EXPECTED_MERGED_AREA} · problem ${merged.problem}/${EXPECTED_MERGED_PROBLEM} · use case ${merged.useCase}/${EXPECTED_MERGED_USECASE}`,
  merged.area === EXPECTED_MERGED_AREA &&
    merged.problem === EXPECTED_MERGED_PROBLEM &&
    merged.useCase === EXPECTED_MERGED_USECASE,
);

/**
 * ⛔ Every row is covered exactly once per column. A span that overshoots
 * pushes a cell into the run below; one that undershoots leaves a row with a
 * missing <td>, which silently shifts every cell after it one column left.
 * Neither throws, and both look like a styling bug.
 */
for (const [label, key] of [
  ["subject area", "areaSpan"],
  ["problem", "problemSpan"],
  ["use case", "useCaseSpan"],
] as const) {
  const total = tRows.reduce((sum, r) => sum + r[key], 0);
  check(
    `${label} spans cover every row exactly once`,
    `${total} of ${EXPECTED_TABLE_ROWS} rows covered`,
    total === EXPECTED_TABLE_ROWS,
  );
}

/**
 * ⭐ The one that proves the merge is CORRECT rather than merely well-shaped: a
 * covered row (span 0) must carry the same text as the row that covers it. If
 * it does not, the table is printing one row's Problem against another row's
 * Use Case — a wrong table that renders perfectly.
 */
let coveredRows = 0;
const mismatched: string[] = [];
for (let i = 1; i < tRows.length; i++) {
  for (const [key, field] of [
    ["areaSpan", "subjectArea"],
    ["problemSpan", "problem"],
    ["useCaseSpan", "useCase"],
  ] as const) {
    if (tRows[i][key] !== 0) continue;
    coveredRows++;
    if (tRows[i].solution[field] !== tRows[i - 1].solution[field]) {
      mismatched.push(`${tRows[i].solution.id}.${field}`);
    }
  }
}
check(
  "every covered cell repeats the value above it",
  mismatched.length ? `MISMATCH: ${mismatched.join(", ")}` : `0 wrong of ${coveredRows} covered cells`,
  mismatched.length === 0 && coveredRows > 0,
);

/**
 * ⛔⛔ No run may cross a subject-area boundary. Two areas can hold the same
 * Problem text, and keying on the problem alone would merge straight through
 * the boundary — a rowspan reaching into the next area, which the spreadsheet
 * never does.
 */
const crossings = tRows.filter(
  (r, i) =>
    i > 0 &&
    r.areaSpan > 0 && // a new area starts here...
    (r.problemSpan === 0 || r.useCaseSpan === 0), // ...but a run continues into it
);
check(
  "no problem or use-case run crosses a subject-area boundary",
  crossings.length ? `CROSSES: ${crossings.map((r) => r.solution.id).join(", ")}` : `0 crossings of ${merged.area} area runs`,
  crossings.length === 0,
);


// ---------------------------------------------------------------------------
console.log("\n19. Clearing the focus actually clears it");
// ---------------------------------------------------------------------------
/**
 * ⛔⛔ Regression guard for a bug that shipped unnoticed from the day the
 * selector was built. `writeParam` removes the query param with
 * `history.replaceState`, which Next's router never observes, so
 * `useSearchParams()` kept returning the id just deleted and the adopt effect
 * put the focus straight back — measured 2026-10-14: gone at t=0, back by
 * t≈100ms, on the strip's `×` and on the table's button alike.
 *
 * ⚠️ It survived because the only way back was an edge affordance. Hiding the
 * strip at desktop made it the one way out of a focus, which is what exposed it.
 */
const ADOPT_CASES: Array<[string, AdoptInput, AdoptDecision]> = [
  ["a navigation in flight outranks everything",
    { paramId: "a", activeId: "b", clearedId: null, navigating: true }, "wait-for-navigation"],
  ["...even when the param echoes a clear",
    { paramId: "a", activeId: null, clearedId: "a", navigating: true }, "wait-for-navigation"],
  ["⭐ the stale echo of our own clear is ignored",
    { paramId: "a", activeId: null, clearedId: "a", navigating: false }, "ignore-cleared-echo"],
  ["a deep link with nothing focused is adopted",
    { paramId: "a", activeId: null, clearedId: null, navigating: false }, "adopt"],
  ["a different solution in the URL is adopted",
    { paramId: "b", activeId: "a", clearedId: null, navigating: false }, "adopt"],
  ["⭐ clearing A then deep-linking B still adopts B",
    { paramId: "b", activeId: null, clearedId: "a", navigating: false }, "adopt"],
  ["a URL that already agrees changes nothing",
    { paramId: "a", activeId: "a", clearedId: null, navigating: false }, "nothing-to-do"],
  ["no param, nothing focused",
    { paramId: null, activeId: null, clearedId: null, navigating: false }, "nothing-to-do"],
  ["⭐ the app navigating away drops the param but keeps the focus",
    { paramId: null, activeId: "a", clearedId: null, navigating: false }, "nothing-to-do"],
];
const adoptWrong = ADOPT_CASES.filter(([, input, want]) => adoptDecision(input) !== want);
check(
  "the adopt rule's truth table",
  adoptWrong.length
    ? `WRONG: ${adoptWrong.map(([label, input, want]) => `${label} (wanted ${want}, got ${adoptDecision(input)})`).join("; ")}`
    : `${ADOPT_CASES.length} of ${ADOPT_CASES.length} cases correct`,
  adoptWrong.length === 0,
);
/** ⭐ All four outcomes must be reachable, or the table is testing fewer rules than it looks. */
const reachedDecisions = new Set(ADOPT_CASES.map(([, input]) => adoptDecision(input)));
check(
  "...and every outcome is actually exercised",
  `${reachedDecisions.size} of 4 — ${[...reachedDecisions].sort().join(", ")}`,
  reachedDecisions.size === 4,
);

/** ⚠️ The memory must be forgotten, or one clear poisons that id for the page. */
const MEMORY_CASES: Array<[string | null, string | null, boolean]> = [
  ["a", "a", true],
  ["a", "b", false],
  ["a", null, false],
  [null, "a", false],
  [null, null, false],
];
const memoryWrong = MEMORY_CASES.filter(([cleared, param, want]) => keepClearedMemory(cleared, param) !== want);
check(
  "the memory of a clear is forgotten as soon as the URL moves on",
  memoryWrong.length ? `WRONG: ${memoryWrong.length}` : `${MEMORY_CASES.length} of ${MEMORY_CASES.length} cases correct`,
  memoryWrong.length === 0,
);

/** ⛔ The provider must RECORD the cleared id, or the rule above never fires. */
const ctxSrc = readFileSync(join(ROOT, "lib/solutions/solution-context.tsx"), "utf8");
const clearSlice = ctxSrc.slice(ctxSrc.indexOf("const clear = useCallback"), ctxSrc.indexOf("const value = useMemo"));
check(
  "clear() records what it cleared, before it forgets it",
  clearSlice.includes("clearedId.current = activeId")
    ? "clearedId.current = activeId"
    : "NOT FOUND — clear() will be undone by the stale param within ~100ms",
  clearSlice.includes("clearedId.current = activeId") &&
    clearSlice.indexOf("clearedId.current = activeId") < clearSlice.indexOf("setActiveId(null)"),
);


// ---------------------------------------------------------------------------
console.log("\n20. Now / Fixed — one rule, named once, reached by one seam");
// ---------------------------------------------------------------------------
/**
 * The "what happens now" slice, B1 and B2.
 *
 * **B1** named the rule — `showsProposal` — and converted the five guards and
 * three builders to take a `DemoFocus`, with the mode pinned so nothing moved.
 * **B2** replaced the pin with state: `focus()` lands on `"now"`, `setMode`
 * flips without navigating, and `?mode=fixed` seeds and mirrors the other side.
 *
 * Three claims these have to make falsifiable:
 *
 * 1. **One rule.** Every gate answers what `showsProposal` answers, over the
 *    whole matrix — not just where `"fixed"` makes them agree.
 * 2. **Nothing moved at `"fixed"`.** The 290 checks above all run through
 *    `FIXED()`, so a behaviour change in the refactor fails there, not here.
 * 3. **One seam.** The mode is decided in the provider and read from the URL in
 *    exactly one place, which is what keeps the toggle in B4 a control rather
 *    than a fifth opinion about which side is showing.
 */

/** The provider, read once — §20 asserts four orderings inside it. */
const CTX_SRC = readFileSync(join(ROOT, "lib/solutions/solution-context.tsx"), "utf8");

/* --- 20a. The truth table ------------------------------------------------ */
/**
 * ⛔ Every case declared as a literal, including the answer. A table generated
 * from the function it tests is a restatement, not a test — this project has
 * shipped two of those and both passed while the code was wrong.
 */
const PROPOSAL_CASES: Array<{
  why: string;
  focus: DemoFocus;
  owners: readonly string[];
  inPlainMirror?: boolean;
  want: boolean;
}> = [
  // The plain mirror: no focus, so no side — and the mode must not be consulted.
  { why: "plain mirror, default reading", focus: { solutionId: null, mode: "fixed" }, owners: ["a"], want: true },
  { why: "plain mirror, default reading, mode now", focus: { solutionId: null, mode: "now" }, owners: ["a"], want: true },
  { why: "plain mirror, capture-locked surface", focus: { solutionId: null, mode: "fixed" }, owners: ["a"], inPlainMirror: false, want: false },
  { why: "plain mirror, capture-locked, mode now", focus: { solutionId: null, mode: "now" }, owners: ["a"], inPlainMirror: false, want: false },
  { why: "plain mirror with no owners at all", focus: { solutionId: null, mode: "fixed" }, owners: [], want: true },
  // Owned, and on the proposal side.
  { why: "owner focused, fixed", focus: { solutionId: "a", mode: "fixed" }, owners: ["a"], want: true },
  { why: "owner focused, fixed, second owner of two", focus: { solutionId: "b", mode: "fixed" }, owners: ["a", "b"], want: true },
  { why: "owner focused, capture-locked surface still shows", focus: { solutionId: "a", mode: "fixed" }, owners: ["a"], inPlainMirror: false, want: true },
  // Owned, but on production's side — the whole point of the slice.
  { why: "owner focused, now", focus: { solutionId: "a", mode: "now" }, owners: ["a"], want: false },
  { why: "owner focused, now, capture-locked", focus: { solutionId: "a", mode: "now" }, owners: ["a"], inPlainMirror: false, want: false },
  // Someone else's build: hidden on BOTH sides, so a stranger's row never sees it.
  { why: "stranger focused, fixed", focus: { solutionId: "z", mode: "fixed" }, owners: ["a"], want: false },
  { why: "stranger focused, now", focus: { solutionId: "z", mode: "now" }, owners: ["a"], want: false },
  { why: "stranger focused, empty owner list", focus: { solutionId: "z", mode: "fixed" }, owners: [], want: false },
];
const proposalWrong = PROPOSAL_CASES.filter(
  (c) => showsProposal(c.focus, c.owners, { inPlainMirror: c.inPlainMirror }) !== c.want,
);
check(
  "showsProposal answers its declared truth table",
  proposalWrong.length
    ? `WRONG: ${proposalWrong.map((c) => c.why).join("; ")}`
    : `${PROPOSAL_CASES.length} of ${PROPOSAL_CASES.length} case(s) correct`,
  proposalWrong.length === 0,
);

/* --- 20b. ...and the table is not one-sided ------------------------------ */
/**
 * ⛔⛔ The companion that stops 20a passing vacuously. A truth table of
 * thirteen cases that all expect `false`, or that never varies the mode, is
 * indistinguishable from a working one by its pass/fail bit alone.
 */
const modesSeen = new Set(PROPOSAL_CASES.map((c) => c.focus.mode));
check(
  "...and that table exercises both modes, both readings, and both answers",
  `${modesSeen.size} of ${DEMO_MODES.length} mode(s); ` +
    `${PROPOSAL_CASES.filter((c) => c.want).length} true / ${PROPOSAL_CASES.filter((c) => !c.want).length} false; ` +
    `${PROPOSAL_CASES.filter((c) => c.inPlainMirror === false).length} capture-locked case(s)`,
  modesSeen.size === DEMO_MODES.length &&
    DEMO_MODES.every((m) => modesSeen.has(m)) &&
    PROPOSAL_CASES.some((c) => c.want) &&
    PROPOSAL_CASES.some((c) => !c.want) &&
    PROPOSAL_CASES.some((c) => c.inPlainMirror === false) &&
    PROPOSAL_CASES.some((c) => c.inPlainMirror === undefined),
);
/**
 * ⛔ Until B2 this read *"declared but not yet wired"*, and its detail line said
 * the provider pinned `"fixed"`. B2 wired it, which made the label and the
 * detail describe a provider that no longer exists while the assertion went on
 * passing — a check that had stopped testing anything and still printed `ok`.
 */
check(
  "...and the mode the app LANDS on is the declared default, with no pin left",
  `DEFAULT_DEMO_MODE = ${DEFAULT_DEMO_MODE}; HARDWIRED_MODE in the provider: ` +
    `${/HARDWIRED_MODE/.test(CTX_SRC) ? "STILL THERE" : "gone"}`,
  DEFAULT_DEMO_MODE === "now" &&
    DEMO_MODES.length === 2 &&
    !/HARDWIRED_MODE/.test(CTX_SRC),
);

/* --- 20c. Every gate reads the one rule ---------------------------------- */
/**
 * ⛔⛔ **The check that makes this a refactor rather than a rename.** Each gate
 * is driven over the FULL focus matrix — every catalogue row plus the plain
 * mirror, on both sides — and compared against `showsProposal` with its owners
 * declared here as literals. A gate that kept its own `=== null ||` spelling
 * would agree on `"fixed"` and diverge the moment `"now"` became reachable,
 * which is precisely the drift that would ship silently in B4.
 *
 * ⚠️ Owners are LITERAL ids here, not the modules' own constants. Importing
 * `CANNOT_REACH_SOLUTIONS` and comparing the gate to itself would pass whatever
 * that array said.
 */
const GATES: Array<{
  name: string;
  owners: readonly string[];
  inPlainMirror?: boolean;
  shown: (focus: DemoFocus) => boolean;
}> = [
  { name: "showsAddLegEntry", owners: ["add-leg-request"], shown: (f) => showsAddLegEntry(f) },
  { name: "showsCannotReachOption", owners: ["tag-number-invalid", "cannot-reach-member"], shown: (f) => showsCannotReachOption(f) },
  { name: "showsTripChangeEntry", owners: ["change-pickup-dropoff"], shown: (f) => showsTripChangeEntry(f) },
  { name: "showsAccountProposals", owners: ["account-self-service"], inPlainMirror: false, shown: (f) => showsAccountProposals(f) },
  {
    name: "shouldAskPreferredDriver",
    owners: ["auto-assign-request", "request-feed-member-filter"],
    // ⚠️ A trip chosen so the OTHER two conditions are satisfied — not a group
    // ride, member not opted out — leaving the focus gate as the only variable.
    shown: (f) => shouldAskPreferredDriver({ trip: ASK_TRIP, focus: f, suppressedMembers: [] }),
  },
  /**
   * ⭐ Added in B3d. Owned by BOTH rows 09 and 10 — one build, one owner list,
   * the same one `shouldAskPreferredDriver` above reads. The owners are written
   * out here as literals rather than imported, so this compares the gate to the
   * declaration and not to itself.
   */
  { name: "showsMemberFilter", owners: ["auto-assign-request", "request-feed-member-filter"], shown: (f) => showsMemberFilter(f) },
  { name: "buildOptionsRows", owners: ["account-self-service"], inPlainMirror: false, shown: (f) => buildOptionsRows(f).some((r) => r.proposed) },
  { name: "reachOptionsFor/standard", owners: ["tag-number-invalid", "cannot-reach-member"], shown: (f) => reachOptionsFor(false, f).some((o) => o.proposed) },
  { name: "reachOptionsFor/same-day", owners: ["tag-number-invalid", "cannot-reach-member"], shown: (f) => reachOptionsFor(true, f).some((o) => o.proposed) },
  ...PROPOSED_TILE_IDS.map((tile) => ({
    name: `buildGridTiles/${tile}`,
    owners: PROPOSAL_OWNERS[tile],
    shown: (f: DemoFocus) => buildGridTiles(f).some((t) => t.id === tile),
  })),
];
const FOCUS_IDS: Array<string | null> = [...SOLUTIONS.map((s) => s.id), null];
let gateSweep = 0;
const gateDisagreements: string[] = [];
for (const gate of GATES) {
  for (const id of FOCUS_IDS) {
    for (const mode of DEMO_MODES) {
      gateSweep += 1;
      const focus = demoFocus(id, mode);
      const want = showsProposal(focus, gate.owners, { inPlainMirror: gate.inPlainMirror });
      if (gate.shown(focus) !== want) {
        gateDisagreements.push(`${gate.name}@${id ?? "no focus"}/${mode}`);
      }
    }
  }
}
check(
  "every gate answers exactly what the one rule answers",
  `${gateDisagreements.length} disagreement(s) of ${gateSweep} (gate x focus x mode)` +
    (gateDisagreements.length ? ` — ${gateDisagreements.slice(0, 6).join(", ")}` : ""),
  gateDisagreements.length === 0,
);
check(
  "...and the sweep is the size it claims",
  `${GATES.length} gate(s) x ${FOCUS_IDS.length} focus(es) x ${DEMO_MODES.length} mode(s)`,
  gateSweep === GATES.length * FOCUS_IDS.length * DEMO_MODES.length &&
    FOCUS_IDS.length === EXPECTED_ROWS + 1 &&
    GATES.length === 13,
);
/**
 * ⛔ Non-vacuity: a sweep where every gate said `false` everywhere would agree
 * with a `showsProposal` that was also broken to return `false`. Both outcomes
 * have to be observed, per gate.
 */
const flatGates = GATES.filter(
  (g) =>
    !FOCUS_IDS.some((id) => DEMO_MODES.some((m) => g.shown(demoFocus(id, m)))) ||
    !FOCUS_IDS.some((id) => DEMO_MODES.some((m) => !g.shown(demoFocus(id, m)))),
);
check(
  "...and every gate was seen both open and shut",
  flatGates.length ? `FLAT: ${flatGates.map((g) => g.name).join(", ")}` : `${GATES.length} of ${GATES.length} gate(s) varied`,
  flatGates.length === 0,
);

/* --- 20d. Nothing the driver sees has moved ------------------------------ */
/**
 * ⛔⛔ **The zero-behaviour-change claim, as literals.** What each gate
 * answered BEFORE `DemoMode` existed, for the three focuses that matter, with
 * the mode pinned to `"fixed"`. Written out rather than computed, because a
 * table derived from the new code cannot detect that the new code is wrong.
 *
 * Four of the five guards read "no focus" as *no filtering*; the account slice
 * reads it as *show nothing*, because its Options menu is capture-locked at
 * eleven rows. That asymmetry is the one thing a careless refactor would have
 * flattened, and it is spelled out here.
 */
const PRE_B1: Array<{ gate: string; plainMirror: boolean; owner: boolean; stranger: boolean }> = [
  { gate: "showsAddLegEntry", plainMirror: true, owner: true, stranger: false },
  { gate: "showsCannotReachOption", plainMirror: true, owner: true, stranger: false },
  { gate: "showsTripChangeEntry", plainMirror: true, owner: true, stranger: false },
  { gate: "showsAccountProposals", plainMirror: false, owner: true, stranger: false },
  { gate: "shouldAskPreferredDriver", plainMirror: true, owner: true, stranger: false },
  { gate: "buildOptionsRows", plainMirror: false, owner: true, stranger: false },
  { gate: "reachOptionsFor/standard", plainMirror: true, owner: true, stranger: false },
  { gate: "reachOptionsFor/same-day", plainMirror: true, owner: true, stranger: false },
  { gate: "buildGridTiles/cannot-reach", plainMirror: true, owner: true, stranger: false },
  { gate: "buildGridTiles/auto-assign", plainMirror: true, owner: true, stranger: false },
  { gate: "buildGridTiles/add-leg", plainMirror: true, owner: true, stranger: false },
  { gate: "buildGridTiles/trip-change", plainMirror: true, owner: true, stranger: false },
];
/** ⛔ A row 03 is nobody's owner here — it is the stranger every gate refuses. */
const STRANGER = "missed-swipe";
const movedBehaviour: string[] = [];
for (const want of PRE_B1) {
  const gate = GATES.find((g) => g.name === want.gate);
  if (!gate) { movedBehaviour.push(`${want.gate}: GATE MISSING`); continue; }
  const got = {
    plainMirror: gate.shown(demoFocus(null, "fixed")),
    owner: gate.shown(demoFocus(gate.owners[0], "fixed")),
    stranger: gate.shown(demoFocus(STRANGER, "fixed")),
  };
  for (const key of ["plainMirror", "owner", "stranger"] as const) {
    if (got[key] !== want[key]) movedBehaviour.push(`${want.gate}.${key}: ${got[key]} (was ${want[key]})`);
  }
}
/**
 * ⛔⛔ **Gates added AFTER B1 have no "before", and must not be given a
 * fabricated one.** `showsMemberFilter` did not exist at B1 — the Request Feed
 * filter was ungated, so the honest "before" for it is *true everywhere*, which
 * is not a baseline worth asserting. Naming it here keeps the denominator
 * honest: `PRE_B1` covers the gates it can speak for, this list covers the
 * rest, and together they have to account for every gate. A gate in NEITHER is
 * a gate whose behaviour nothing here describes.
 */
const ADDED_AFTER_B1 = ["showsMemberFilter"];
check(
  "with the mode pinned to fixed, every gate answers what it answered before B1",
  movedBehaviour.length
    ? `MOVED: ${movedBehaviour.join("; ")}`
    : `${PRE_B1.length * 3} of ${PRE_B1.length * 3} declared answer(s) unchanged; ` +
      `${ADDED_AFTER_B1.length} gate(s) added since — ${ADDED_AFTER_B1.join(", ")}`,
  movedBehaviour.length === 0 &&
    PRE_B1.length + ADDED_AFTER_B1.length === GATES.length &&
    // ⛔ Each named one must be a real gate, and must NOT also claim a baseline.
    ADDED_AFTER_B1.every((n) => GATES.some((g) => g.name === n)) &&
    ADDED_AFTER_B1.every((n) => !PRE_B1.some((b) => b.gate === n)),
);
/** ⚠️ The stranger must really be a stranger, or the third column is free. */
check(
  "...and the stranger row is owned by none of them",
  `${STRANGER} appears in ${GATES.filter((g) => g.owners.includes(STRANGER)).length} of ${GATES.length} owner list(s)`,
  GATES.every((g) => !g.owners.includes(STRANGER)) &&
    SOLUTIONS.some((s) => s.id === STRANGER),
);

/**
 * ⛔⛔ **One seam.** A `DemoFocus` is constructed in exactly ONE place in the
 * app, and that is what makes B2 a one-line change rather than a hunt. A screen
 * that built its own focus would pin its own mode, and the toggle would do
 * nothing on that screen — a switch that works everywhere except the one flow
 * being demonstrated.
 */
const APP_DIRS = ["lib", "components", "app"];
const FOCUS_BUILDER = /\bmode:\s*"(now|fixed)"|\bdemoFocus\(/g;
function walk(dir: string): string[] {
  return readdirSync(join(ROOT, dir), { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? walk(join(dir, e.name))
      : /\.tsx?$/.test(e.name)
        ? [join(dir, e.name)]
        : [],
  );
}
const APP_FILES = APP_DIRS.flatMap(walk).filter((f) => f !== join("lib", "solutions", "demo-mode.ts"));
const focusBuilders = APP_FILES.flatMap((f) => {
  const hits = readFileSync(join(ROOT, f), "utf8").match(FOCUS_BUILDER) ?? [];
  return hits.map(() => f);
});
check(
  "no screen builds its own DemoFocus — every one is made in the provider",
  `${focusBuilders.length} construction(s) across ${APP_FILES.length} file(s): ${[...new Set(focusBuilders)].join(", ") || "none"}`,
  focusBuilders.length > 0 &&
    focusBuilders.every((f) => f === join("lib", "solutions", "solution-context.tsx")),
);

/* --- 20e. What a URL is asking for --------------------------------------- */
/**
 * ⛔ Absence means `"now"`, in both directions — see `DEMO_MODE_PARAM`. The two
 * failure directions are not symmetrical, which is why the fallback is declared
 * rather than left to a cast: falling back to `"now"` shows production, which
 * is merely early; falling back to `"fixed"` would answer "what happens now?"
 * with the thing we are proposing.
 */
const PARAM_CASES: Array<[string | null, DemoMode]> = [
  [null, "now"],
  ["", "now"],
  ["now", "now"],
  ["fixed", "fixed"],
  ["Fixed", "now"],
  ["FIXED", "now"],
  [" fixed", "now"],
  ["fixed ", "now"],
  ["proposal", "now"],
  ["true", "now"],
];
const paramWrong = PARAM_CASES.filter(([raw, want]) => modeFromParam(raw) !== want);
check(
  "a URL only gets the proposal side by asking for it exactly",
  paramWrong.length
    ? `WRONG: ${paramWrong.map(([raw]) => JSON.stringify(raw)).join(", ")}`
    : `${PARAM_CASES.length} of ${PARAM_CASES.length} case(s) correct`,
  paramWrong.length === 0,
);
check(
  "...and that table has something to fall back FROM",
  `${PARAM_CASES.filter(([, m]) => m === "fixed").length} fixed / ` +
    `${PARAM_CASES.filter(([, m]) => m === "now").length} now`,
  PARAM_CASES.some(([, m]) => m === "fixed") &&
    // ⛔ A non-empty raw value that is not a mode name — a typo or a casing
    // slip, not just `null` and `""`. A break test removed the six real
    // fallback cases and this still passed on `""` alone.
    PARAM_CASES.some(
      ([raw, m]) => m === "now" && raw !== null && raw !== "" && raw !== "now",
    ) &&
    PARAM_CASES.some(([raw]) => raw !== null && raw !== "" && /fixed/i.test(raw) ),
);

/* --- 20f. What the URL is told ------------------------------------------- */
/**
 * ⛔⛔ Two rules, declared as literals: **`"now"` is never written**, and **the
 * mode param never appears without a solution**. The second matters because
 * `?mode=fixed` with no focus describes a state the app cannot be in — a URL
 * that lies to whoever it is sent to.
 */
const WRITE_CASES: Array<{ focus: DemoFocus; solution: string | null; mode: string | null }> = [
  { focus: { solutionId: null, mode: "now" }, solution: null, mode: null },
  { focus: { solutionId: null, mode: "fixed" }, solution: null, mode: null },
  { focus: { solutionId: "rider-no-show", mode: "now" }, solution: "rider-no-show", mode: null },
  { focus: { solutionId: "rider-no-show", mode: "fixed" }, solution: "rider-no-show", mode: "fixed" },
];
const writeWrong = WRITE_CASES.filter((c) => {
  const got = focusParams(c.focus);
  return got[SOLUTION_PARAM] !== c.solution || got[DEMO_MODE_PARAM] !== c.mode;
});
check(
  "the URL is written with fixed spelled out and now left unsaid",
  writeWrong.length
    ? `WRONG: ${writeWrong.map((c) => `${c.focus.solutionId ?? "none"}/${c.focus.mode}`).join(", ")}`
    : `${WRITE_CASES.length} of ${WRITE_CASES.length} case(s) correct`,
  writeWrong.length === 0,
);
/** ⛔ Round trip: what is written has to read back as what was meant. */
const roundTripWrong = FOCUS_IDS.flatMap((id) =>
  DEMO_MODES.filter((m) => {
    const written = focusParams({ solutionId: id, mode: m });
    const readBack = modeFromParam(written[DEMO_MODE_PARAM]);
    // With no focus the mode is not carried at all, so it reads back as the
    // default — which is correct, because there is no side to be on.
    return id === null ? readBack !== DEFAULT_DEMO_MODE : readBack !== m;
  }).map((m) => `${id ?? "no focus"}/${m}`),
);
check(
  "...and every focus survives the round trip through the URL",
  `${roundTripWrong.length} lost of ${FOCUS_IDS.length * DEMO_MODES.length} (focus x mode)` +
    (roundTripWrong.length ? ` — ${roundTripWrong.slice(0, 5).join(", ")}` : ""),
  roundTripWrong.length === 0,
);

/* --- 20g. The provider's four orderings ---------------------------------- */
/**
 * ⚠️ Greps, because there is no renderer here — but greps on CODE, with the
 * comments stripped, and each one asserting an ORDER rather than the presence
 * of a line. A check that merely finds `setModeState` somewhere in the file
 * would pass with the call in the wrong place, which is the only way any of
 * these four can actually be wrong.
 */
const CTX_CODE = codeOnly(CTX_SRC);
function between(haystack: string, from: string, to: string): string {
  const a = haystack.indexOf(from);
  const b = haystack.indexOf(to, a);
  return a < 0 || b < 0 ? "" : haystack.slice(a, b);
}

/**
 * The `{ … }` that follows `marker`, brace-balanced.
 *
 * ⛔ Found by a break test: slicing "from the `if` to the end of the effect"
 * includes everything AFTER the branch closes, so moving a statement out of the
 * branch left it inside the slice and the check went on passing. A block has to
 * be read as a block.
 */
function balancedBlock(src: string, marker: string): string {
  const start = src.indexOf(marker);
  if (start < 0) return "";
  const open = src.indexOf("{", start);
  if (open < 0) return "";
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}" && --depth === 0) return src.slice(open, i + 1);
  }
  return "";
}

const ctxFocusBody = between(CTX_CODE, "const focus = useCallback", "const clear = useCallback");
/**
 * ⛔⛔ **The side is an ARGUMENT, and the argument has a DEFAULT.**
 *
 * Until B6 this read `setModeState(DEFAULT_DEMO_MODE)` with no parameter at
 * all. B6 gave the desktop table two columns that each ask for a side, so the
 * constant moved into the signature — and the property that mattered is
 * unchanged BECAUSE of the default: every call sets the mode, so no switch can
 * carry the previous row's over. A parameter with NO default would lose that
 * silently, on exactly the call sites that omit it, which is why the default
 * is asserted here and not merely assumed.
 */
const FOCUS_DEFAULTED_PARAM = /mode: DemoMode = DEFAULT_DEMO_MODE/;
const focusOrdering =
  ctxFocusBody.includes("setModeState(mode)") &&
  ctxFocusBody.includes("pendingFocus.current =") &&
  ctxFocusBody.indexOf("setModeState(mode)") < ctxFocusBody.indexOf("pendingFocus.current =");
check(
  "focus() sets the mode from a defaulted argument, BEFORE it claims the navigation",
  FOCUS_DEFAULTED_PARAM.test(ctxFocusBody)
    ? `(mode: DemoMode = DEFAULT_DEMO_MODE); set at ${ctxFocusBody.indexOf("setModeState(mode)")}, pendingFocus at ${ctxFocusBody.indexOf("pendingFocus.current =")}`
    : "NO DEFAULTED PARAMETER — a switch that omits the side would inherit the previous row's",
  FOCUS_DEFAULTED_PARAM.test(ctxFocusBody) && focusOrdering,
);
/**
 * ⛔ Non-vacuity for the line above: the default has to BE the production
 * side. A signature defaulting to `"fixed"` would satisfy "every call sets the
 * mode" and would answer "what happens now?" with the thing we are proposing.
 */
check(
  "...and the side it defaults to is the one that shows production",
  `DEFAULT_DEMO_MODE = ${DEFAULT_DEMO_MODE}`,
  DEFAULT_DEMO_MODE === "now",
);

const clearBody = between(CTX_CODE, "const clear = useCallback", "const value = useMemo");
check(
  "...and clear() puts the mode back too, so no path skips the reset",
  clearBody.includes("setModeState(DEFAULT_DEMO_MODE)") ? "setModeState(DEFAULT_DEMO_MODE)" : "NOT FOUND",
  clearBody.includes("setModeState(DEFAULT_DEMO_MODE)"),
);

const setModeBody = between(CTX_CODE, "const setMode = useCallback", "const value = useMemo");
check(
  "...and setMode sets state without navigating",
  setModeBody.includes("router") ? "NAVIGATES — the ride under the toggle would remount" : "state only",
  setModeBody.length > 0 && !setModeBody.includes("router"),
);

/**
 * ⛔⛔ The D80 trap, in its second incarnation. `writeParams` mirrors with
 * `history.replaceState`, which Next's router never observes — so an effect
 * that re-read the mode param on every render would see the pre-flip value a
 * tick after `setMode` and put it back. The mode may be read from the URL in
 * exactly one place: inside the branch that is already adopting a new id.
 */
const adoptBranch = balancedBlock(CTX_CODE, 'if (decision === "adopt" && paramId)');
const modeReads = (CTX_CODE.match(/setModeState\(modeFromParam\(/g) ?? []).length;
check(
  "the mode is adopted only alongside an id, never re-read on its own",
  `${modeReads} place(s) read the mode param into state; ` +
    `${adoptBranch.includes("setModeState(modeFromParam(") ? "inside" : "OUTSIDE"} the adopt branch`,
  modeReads === 1 && adoptBranch.includes("setModeState(modeFromParam("),
);


// ---------------------------------------------------------------------------
console.log("\n21. The toggle — the one control the whole slice turns on");
// ---------------------------------------------------------------------------
/**
 * B4. Without this control the production side is reachable only by hand-
 * editing a query string, which is not a thing anyone does in front of an
 * audience.
 *
 * ⛔⛔ The failure mode worth guarding is a toggle that LOOKS like it works.
 * Four of the twelve built rows have no production screen yet; a switch that
 * silently does nothing on a third of the catalogue would be demonstrated as an
 * answer. So the gap is named on screen, and these checks assert the naming is
 * honest in both directions.
 */
const TOGGLE_SRC = readFileSync(join(ROOT, "components/solutions-dev/demo-mode-toggle.tsx"), "utf8");
const TOGGLE_CODE = codeOnly(TOGGLE_SRC);
const STRIP_SRC = readFileSync(join(ROOT, "components/solutions-dev/solution-strip.tsx"), "utf8");
const TABLE_SRC = readFileSync(join(ROOT, "components/solutions-dev/solution-table.tsx"), "utf8");

/* --- 21a. One mount, and it is the one that is always reachable ---------- */
/**
 * ⚠️ **B6 moved this.** The toggle used to be mounted twice — in the strip
 * and in the focused table row. B6 made the table's Use Case and Proposed
 * Feature columns the desktop control, so that second mount is gone and §25
 * is what asserts its replacement works.
 *
 * ⛔⛔ The strip's mount is NOT optional and never becomes so. Below 1280px
 * there is no table at all, so this is the only control at that width —
 * deleting it would leave the production side reachable only by hand-editing a
 * query string on a phone.
 */
const MOUNTS: Array<[string, string]> = [
  ["the briefing strip (every width)", STRIP_SRC],
];
const missingMount = MOUNTS.filter(([, src]) => !src.includes("<DemoModeToggle"));
check(
  "the toggle is mounted where it is the only control — the strip, at every width",
  missingMount.length
    ? `MISSING: ${missingMount.map(([name]) => name).join(", ")}`
    : `${MOUNTS.length} of ${MOUNTS.length} — ${MOUNTS.map(([n]) => n).join("; ")}`,
  missingMount.length === 0,
);
/**
 * ⛔ And the table does NOT mount it. Two controls for one mode is fine —
 * both go through the provider — but two controls in the same place, one of
 * them a segmented switch sitting above the two columns that do the same job,
 * is a reviewer asking which one is real.
 */
check(
  "...and the desktop table no longer mounts it, because its columns replaced it",
  TABLE_SRC.includes("<DemoModeToggle")
    ? "STILL MOUNTED — two controls for one mode, in one place"
    : "the two columns are the desktop control",
  !TABLE_SRC.includes("<DemoModeToggle"),
);
/**
 * ⛔⛔ **But it must not hand-roll one either.** The real risk B6 introduced
 * is a second segmented switch spelled out in the table rather than imported.
 * The table legitimately calls `setMode` now — that is how a cell flips the
 * side in place — so the guard moved to the MARKUP: a control built from
 * `DEMO_MODES` is the toggle, and there may be only one of those.
 */
check(
  "...and neither surface hand-rolls a second copy of the control",
  `DEMO_MODES.map in the strip: ${/DEMO_MODES\.map/.test(codeOnly(STRIP_SRC))}; in the table: ${/DEMO_MODES\.map/.test(codeOnly(TABLE_SRC))}`,
  !/DEMO_MODES\.map/.test(codeOnly(STRIP_SRC)) &&
    !/DEMO_MODES\.map/.test(codeOnly(TABLE_SRC)) &&
    !codeOnly(STRIP_SRC).includes("setMode"),
);

/* --- 21b. No focus, no side ---------------------------------------------- */
/**
 * ⛔ The plain mirror shows every proposal at once, so it is not on either
 * side. A control offering to pick one would describe a state the app cannot be
 * in — and would be the one place a reviewer could set a mode that then applies
 * to nothing.
 */
check(
  "the toggle refuses to render without a focus",
  /if \(!active\) return null;/.test(TOGGLE_CODE)
    ? "if (!active) return null"
    : "NOT FOUND — a mode control would render over the plain mirror",
  /if \(!active\) return null;/.test(TOGGLE_CODE),
);
/**
 * ⛔⛔ Both ancestors are clickable. Without `stopPropagation` the tap
 * re-focuses the row, `focus()` resets the mode to "now", and "Proposed" would
 * visibly fail to stick — on the one control the demo turns on.
 */
check(
  "...and a tap on it does not re-focus the row underneath",
  TOGGLE_CODE.includes("event.stopPropagation()") ? "stopPropagation()" : "MISSING",
  TOGGLE_CODE.includes("event.stopPropagation()"),
);
/**
 * ⛔ It must not navigate either — see `setMode`.
 *
 * ⚠️ Case-INSENSITIVE, and covering every way out of a page. A break test
 * adding `import { useRouter }` sailed past an `includes("router")`, because
 * the only spelling in the file was the capital `R` in `useRouter`.
 */
const NAVIGATES = /\buseRouter\b|\brouter\s*\.|\bredirect\b|location\s*\.\s*(href|assign|replace)/i;
check(
  "...and it never navigates",
  NAVIGATES.test(TOGGLE_CODE)
    ? `NAVIGATES (${TOGGLE_CODE.match(NAVIGATES)?.[0]}) — the ride under the toggle would remount`
    : "state only",
  !NAVIGATES.test(TOGGLE_CODE),
);

/* --- 21c. One segment per mode, both labelled ---------------------------- */
const labelled = DEMO_MODES.filter(
  (m) => DEMO_MODE_LABEL[m]?.length > 0 && DEMO_MODE_DESCRIPTION[m]?.length > 0,
);
check(
  "every mode has a segment label and an accessible description",
  `${labelled.length} of ${DEMO_MODES.length} — ${DEMO_MODES.map((m) => `${m}=${DEMO_MODE_LABEL[m]}`).join(", ")}`,
  labelled.length === DEMO_MODES.length,
);
/** ⚠️ Built from `DEMO_MODES`, so a third mode could never be unreachable. */
check(
  "...and the segments are built from the mode list, not written out twice",
  /DEMO_MODES\.map/.test(TOGGLE_CODE) ? "DEMO_MODES.map" : "HARD-CODED",
  /DEMO_MODES\.map/.test(TOGGLE_CODE),
);
/** ⛔ The two labels must differ, or the control is a single button twice. */
check(
  "...and the two sides are not called the same thing",
  `${DEMO_MODE_LABEL.now} / ${DEMO_MODE_LABEL.fixed}`,
  DEMO_MODE_LABEL.now !== DEMO_MODE_LABEL.fixed &&
    DEMO_MODE_DESCRIPTION.now !== DEMO_MODE_DESCRIPTION.fixed,
);

/* --- 21d. The gap is named, and named honestly --------------------------- */
/**
 * ⛔⛔ `ROWS_AWAITING_NOW` is the SHRINKING list — rows whose production screen
 * is still to be built. Declared that way on purpose: a list of rows that work
 * is wrong by omission and silently, while this one is wrong by commission and
 * stays on screen until someone deletes the line.
 *
 * ⚠️ These checks assert it is well-formed. **B5's check 12 is what measures
 * the running app against it** — that is the one that can prove the toggle is
 * not decorative, and it is deliberately not claimed here.
 */
const awaitingRows = ROWS_AWAITING_NOW.map((id) => SOLUTIONS.find((s) => s.id === id));
check(
  "every row awaiting a production screen is a real catalogue row",
  `${awaitingRows.filter(Boolean).length} of ${ROWS_AWAITING_NOW.length} resolve — ${ROWS_AWAITING_NOW.join(", ")}`,
  awaitingRows.every(Boolean),
);
/**
 * ⛔ And a BUILT one. A row with no proposal has no second side to compare
 * against, so listing it here would be claiming a gap that cannot exist — and
 * would quietly inflate the list that B5 measures against.
 */
const awaitingNotBuilt = awaitingRows.filter((row) => row && row.buildState !== "in-prototype");
check(
  "...and every one of them is a row with a proposal to compare against",
  awaitingNotBuilt.length
    ? `NOT BUILT: ${awaitingNotBuilt.map((r) => r!.id).join(", ")}`
    : `${awaitingRows.length} of ${awaitingRows.length} are in prototype`,
  awaitingNotBuilt.length === 0,
);
/**
 * ⛔⛔ **Declared membership, not a count against itself.** The first version
 * compared `builtRows.filter(hasNowState).length` with `ROWS_AWAITING_NOW.length`
 * — and `hasNowState` is derived from that very list, so the two could never
 * disagree. A break test deleting row 16 from the list passed cleanly: the app
 * would have claimed a production screen it does not have, and said so on
 * screen, with the gate green.
 *
 * ⚠️ These ids are written out HERE. Finishing a row means deleting it from
 * `demo-mode.ts` and from this line, and the second edit is the one that makes
 * a reviewer look at whether the first was true. B3d deleted row 10 from both.
 */
/**
 * ⭐⭐ **Empty as of B3e.** Every built row has a production side.
 *
 * ⛔⛔ An empty expectation makes three of the checks above VACUOUS — "every
 * awaiting row resolves", "every one is built", and the drift comparison all
 * pass over nothing. So the claim moves to the other side of the ledger below:
 * all twelve built rows are measured as HAVING a Now, from `hasNowState`, and
 * the two numbers are declared literals. A row silently re-added here would
 * fail that, not this.
 */
const EXPECTED_AWAITING: string[] = [];
const awaitingDrift = [
  ...EXPECTED_AWAITING.filter((id) => !ROWS_AWAITING_NOW.includes(id)).map((id) => `-${id}`),
  ...ROWS_AWAITING_NOW.filter((id) => !EXPECTED_AWAITING.includes(id)).map((id) => `+${id}`),
];
check(
  "...and the rows awaiting a production screen are exactly the ones declared here",
  awaitingDrift.length
    ? `DRIFT: ${awaitingDrift.join(" ")}`
    : `${ROWS_AWAITING_NOW.length} of ${EXPECTED_AWAITING.length} — ${ROWS_AWAITING_NOW.join(", ")}`,
  awaitingDrift.length === 0,
);
/**
 * ⛔⛔ **The claim, now that the list is empty: all twelve built rows have a
 * production side.** Measured through `hasNowState` over the catalogue rather
 * than read off the list, and both numbers are declared literals — so a row
 * quietly re-added to `ROWS_AWAITING_NOW` fails here, which is the check that
 * stays meaningful when the expectation above has nothing left to say.
 *
 * ⚠️ When a row IS next built without its Now, this literal goes to 11 and the
 * one above stops being empty. Both edits, or the pair disagrees.
 */
const builtWithNow = builtRows.filter((row) => hasNowState(row.id));
const EXPECTED_WITH_NOW = 12;
const EXPECTED_BUILT = 12;
check(
  "...and every built row has a production side to compare against",
  `${builtWithNow.length} with a production screen, ${builtRows.length - builtWithNow.length} awaiting, of ${builtRows.length} built`,
  builtWithNow.length === EXPECTED_WITH_NOW &&
    builtRows.length === EXPECTED_BUILT &&
    // ⛔ ...and the two agree: nothing is awaiting, and nothing claims to be.
    builtWithNow.length === builtRows.length - ROWS_AWAITING_NOW.length,
);
/** ⚠️ `hasNowState(null)` is false — the plain mirror is on no side at all. */
check(
  "...and the plain mirror is never claimed to have a production screen",
  `hasNowState(null) = ${hasNowState(null)}`,
  hasNowState(null) === false,
);
/**
 * ⛔ The note has to use the project's own not-built wording, and must say the
 * two sides look the same — a reviewer who reads "not in prototype yet" and
 * still sees the toggle move would reasonably assume it worked.
 */
/**
 * ⚠️ The wording AND the guard. A break test switching the block off with
 * `{false && awaiting && (` left both strings in the file, so a check that only
 * grepped for the copy went on passing over a note that never rendered.
 */
const NOTE_RENDERED = /\{awaiting && \(/;
check(
  "the gap is named on screen in the locked vocabulary",
  TOGGLE_SRC.includes("⚠️ Not in prototype yet") &&
    /look the same/.test(TOGGLE_SRC) &&
    NOTE_RENDERED.test(TOGGLE_CODE)
    ? "⚠️ Not in prototype yet … look the same here — rendered on {awaiting}"
    : "MISSING, off-vocabulary, or behind another condition",
  TOGGLE_SRC.includes("⚠️ Not in prototype yet") &&
    /look the same/.test(TOGGLE_SRC) &&
    NOTE_RENDERED.test(TOGGLE_CODE),
);
/** ⛔ Named, not disabled — all four rows HAVE production behaviour. */
check(
  "...and the awaiting rows are told about, not greyed out",
  /disabled/.test(TOGGLE_CODE) ? "DISABLED — reads as 'no production behaviour'" : "the control stays live",
  !/disabled/.test(TOGGLE_CODE),
);


/* --- 21e. The third state's control names where it lands ---------------- */
/**
 * ⭐⭐ The toggle created a third state, and leaving a focus was the only one
 * whose name did not say where you would land. "Clear the focus" reads as
 * "reset to reality" — but with no focus the app shows EVERY proposal at once,
 * so it moves you to the state with the most features on screen. A reviewer who
 * had just looked at Now and tapped it got four proposed tiles.
 *
 * ⛔ Named once in `catalogue.ts` because TWO affordances say it — the strip's
 * `×` below the breakpoint and the table's button above it — and two copies of
 * a label are two chances to disagree about what the control does.
 */
check(
  "leaving a focus names the state it lands in",
  `CLEAR_FOCUS_LABEL = "${CLEAR_FOCUS_LABEL}"`,
  /proposal/i.test(CLEAR_FOCUS_LABEL) && !/^clear/i.test(CLEAR_FOCUS_LABEL),
);
const CLEAR_AFFORDANCES: Array<[string, string]> = [
  ["the briefing strip (every width)", STRIP_SRC],
  ["the focused table row (desktop)", TABLE_SRC],
];
/**
 * ⛔ The MARKUP, not the file. The first version grepped the whole source, so
 * swapping the strip's `aria-label` for a hand-written "Dismiss" passed — the
 * import line was still there, satisfying the check on its own.
 */
const withoutImports = (src: string) =>
  src.replace(/^import[\s\S]*?from\s+["'][^"']+["'];?$/gm, "");
const handWritten = CLEAR_AFFORDANCES.filter(
  ([, src]) => !withoutImports(src).includes("CLEAR_FOCUS_LABEL"),
);
check(
  "...and both affordances read that one name",
  handWritten.length
    ? `HAND-WRITTEN: ${handWritten.map(([n]) => n).join(", ")}`
    : `${CLEAR_AFFORDANCES.length} of ${CLEAR_AFFORDANCES.length} — ${CLEAR_AFFORDANCES.map(([n]) => n).join("; ")}`,
  handWritten.length === 0,
);
/** ⛔ And the superseded wording is gone from the surfaces, not merely unused. */
const BANNED_CLEAR = /Clear the focus|Clear the focused/;
const stillBanned = CLEAR_AFFORDANCES.filter(([, src]) => BANNED_CLEAR.test(src));
check(
  "...and the superseded wording survives nowhere on either surface",
  stillBanned.length
    ? `STILL THERE: ${stillBanned.map(([n]) => n).join(", ")}`
    : `0 of ${CLEAR_AFFORDANCES.length} carry it`,
  stillBanned.length === 0,
);

// ---------------------------------------------------------------------------
console.log("\n22. Nothing invisible in the source");
// ---------------------------------------------------------------------------
/**
 * \u26d4\u26d4 **Twice now, a control character has reached a TypeScript file from a
 * generated edit, and both times it made a check pass while testing nothing.**
 *
 * 2026-10-14, the first: a string-joined merge key whose separator became a
 * real **NUL** (`\\x00`). Invisible in every editor, unmatched by every search,
 * and the reason a break test patched nothing and reported success.
 *
 * 2026-10-14, the second: `\\b` written inside a non-raw Python string became a
 * real **backspace** (`\\x08`), so `/\\buseRouter\\b/` shipped as `/<BS>useRouter<BS>/`
 * and the check that was supposed to prove the toggle never navigates matched
 * nothing. It printed `ok` with a `useRouter` import sitting in the file.
 *
 * Neither was findable by reading. So the gate reads the bytes.
 *
 * \u26a0\ufe0f Tab and the two newline characters are legal; everything else below 0x20
 * is not, and nor is a lone 0x7F.
 */
const SOURCE_DIRS = ["lib", "components", "app", "scripts"];
const LEGAL_CONTROLS = new Set([0x09, 0x0a, 0x0d]);
function sourceFiles(dir: string): string[] {
  return readdirSync(join(ROOT, dir), { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? sourceFiles(join(dir, e.name))
      : /\.tsx?$/.test(e.name)
        ? [join(dir, e.name)]
        : [],
  );
}
const SCANNED = SOURCE_DIRS.flatMap(sourceFiles);
const invisible: string[] = [];
for (const file of SCANNED) {
  const bytes = readFileSync(join(ROOT, file));
  const found = new Map<number, number>();
  for (const byte of bytes) {
    if ((byte < 0x20 && !LEGAL_CONTROLS.has(byte)) || byte === 0x7f) {
      found.set(byte, (found.get(byte) ?? 0) + 1);
    }
  }
  if (found.size) {
    invisible.push(
      `${file}: ${[...found].map(([b, n]) => `0x${b.toString(16)}x${n}`).join(" ")}`,
    );
  }
}
check(
  "no control character has slipped into a TypeScript source file",
  invisible.length
    ? `FOUND in ${invisible.length}: ${invisible.slice(0, 4).join("; ")}`
    : `0 of ${SCANNED.length} file(s) carry one`,
  invisible.length === 0,
);
/** \u26d4 Non-vacuity: a scan that read no files would also report zero. */
check(
  "...and the scan actually read the source tree",
  `${SCANNED.length} file(s) across ${SOURCE_DIRS.join(", ")}`,
  SCANNED.length > 150 &&
    SOURCE_DIRS.every((dir) => SCANNED.some((f) => f.startsWith(dir + "/"))),
);


// ---------------------------------------------------------------------------
console.log("\n23. Row 16 — what happens when the rider declines");
// ---------------------------------------------------------------------------
/**
 * B3c. ⛔⛔ Until this, the declined sheet was the PROPOSAL unconditionally —
 * our body, our `Continue`, our form — including in Now. It is the sheet a
 * reviewer is most likely to open, so the prototype was demonstrating its own
 * proposal as the status quo on its most visible surface.
 *
 * ⭐ The two sides differ in where the next tap GOES, not only in wording.
 * Production opens a Zendesk chat and auto-sends a ticket; the proposal opens a
 * form. These checks assert the pairing, because a `Chat with Support` button
 * that opened the form would read as production and behave as the proposal.
 */
const DECLINED_SRC = readFileSync(join(ROOT, "components/driver/reach-rider-modal.tsx"), "utf8");
const ZENDESK_SRC = readFileSync(join(ROOT, "components/driver/zendesk-chat-screen.tsx"), "utf8");
const ZENDESK_ROUTE_SRC = readFileSync(join(ROOT, "app/support-chat/[id]/page.tsx"), "utf8");
const ZENDESK_CODE = codeOnly(ZENDESK_SRC);

/* --- 23a. The sheet, on both sides, as declared literals ----------------- */
/**
 * ⛔ Expectations written out HERE, never read back from the module. The point
 * is that production's copy is `CAP-325` verbatim and ours is not, and a table
 * derived from `rider-declined.ts` would agree with whatever it said.
 */
const SHEET_CASES: Array<{
  why: string;
  focus: DemoFocus;
  body: string;
  primaryLabel: string;
  goesTo: "zendesk" | "form";
}> = [
  {
    why: "row 16 focused, Now",
    focus: demoFocus("rider-initiated-cancellation", "now"),
    body: "Please chat with support to remove it from your manifest.",
    primaryLabel: "Chat with Support",
    goesTo: "zendesk",
  },
  {
    why: "row 16 focused, Proposed",
    focus: demoFocus("rider-initiated-cancellation", "fixed"),
    body: "Support needs a few details before we can remove it from your manifest.",
    primaryLabel: "Continue",
    goesTo: "form",
  },
  {
    // ⚠️ The plain mirror shows every proposal, so it keeps the form.
    why: "the plain mirror",
    focus: demoFocus(null, "now"),
    body: "Support needs a few details before we can remove it from your manifest.",
    primaryLabel: "Continue",
    goesTo: "form",
  },
  {
    // ⛔ A proposal belongs to its own build: row 04's reviewer meets production.
    why: "another row's focus",
    focus: demoFocus("cannot-reach-member", "fixed"),
    body: "Please chat with support to remove it from your manifest.",
    primaryLabel: "Chat with Support",
    goesTo: "zendesk",
  },
];
const sheetWrong = SHEET_CASES.filter((c) => {
  const got = declinedSheetFor(c.focus);
  return (
    got.body !== c.body ||
    got.primaryLabel !== c.primaryLabel ||
    got.primaryGoesTo !== c.goesTo
  );
});
check(
  "the declined sheet says and does the right thing on each side",
  sheetWrong.length
    ? `WRONG: ${sheetWrong.map((c) => c.why).join("; ")}`
    : `${SHEET_CASES.length} of ${SHEET_CASES.length} case(s) correct`,
  sheetWrong.length === 0,
);
/** ⛔ Non-vacuity: both destinations and both bodies must actually appear. */
check(
  "...and that table covers both destinations",
  `${SHEET_CASES.filter((c) => c.goesTo === "zendesk").length} zendesk / ` +
    `${SHEET_CASES.filter((c) => c.goesTo === "form").length} form`,
  SHEET_CASES.some((c) => c.goesTo === "zendesk") &&
    SHEET_CASES.some((c) => c.goesTo === "form"),
);
/**
 * ⛔⛔ **The label and the destination are one decision.** A sheet saying
 * `Chat with Support` that opened the form would pass every copy check in this
 * file and lie about the very next tap.
 */
const labelDestinationMismatch = (["now", "fixed"] as const).flatMap((mode) =>
  SOLUTIONS.map((row) => declinedSheetFor(demoFocus(row.id, mode)))
).filter(
  (sheet) =>
    (sheet.primaryLabel === DECLINED_CHAT_SUPPORT) !== (sheet.primaryGoesTo === "zendesk"),
);
check(
  "...and the button's words and its destination never disagree",
  `${labelDestinationMismatch.length} mismatch(es) of ${SOLUTIONS.length * 2} (row x mode)`,
  labelDestinationMismatch.length === 0,
);
/** ⛔ Production's title is shared, so only the BODY may differ. */
check(
  "...and the headline is the same on both sides, as both captures have it",
  `${DECLINED_TITLE}`,
  SHEET_CASES.every((c) => declinedSheetFor(c.focus).title === DECLINED_TITLE),
);

/* --- 23b. The component obeys the rule ----------------------------------- */
check(
  "the primary button's destination comes from the rule, not a branch of its own",
  /declinedSheet\.primaryGoesTo === "zendesk"/.test(codeOnly(DECLINED_SRC))
    ? "declinedSheet.primaryGoesTo"
    : "NOT FOUND — the button could open the form on both sides",
  /declinedSheet\.primaryGoesTo === "zendesk"/.test(codeOnly(DECLINED_SRC)),
);
/**
 * ⛔⛔ **Production NAVIGATES; the proposal opens a sheet.** The Zendesk chat was
 * first built as a third drawer and that was wrong — user-corrected. A sheet
 * leaves the ride visible behind it, which reads as *"you are still on your
 * trip, just talking to someone"*. Production takes the driver off the ride
 * entirely, and that departure IS the dead end.
 *
 * So the two destinations are not the same KIND of thing, and the check says so:
 * one is a `router.push` to a route, the other is a mounted sheet.
 */
check(
  "...and production navigates to a route while the proposal opens a sheet",
  `${/router\.push\(`\/support-chat\//.test(codeOnly(DECLINED_SRC)) ? "push(/support-chat/…)" : "NO NAVIGATION"} + ${/<RiderDeclinedForm/.test(DECLINED_SRC) ? "form sheet" : "—"}`,
  /router\.push\(`\/support-chat\//.test(codeOnly(DECLINED_SRC)) &&
    /<RiderDeclinedForm/.test(DECLINED_SRC) &&
    // ⛔ And the Zendesk screen is NOT mounted here — a sheet left behind would
    // render the dead end over the ride after all.
    !/<ZendeskChat/.test(DECLINED_SRC),
);
/**
 * ⛔ The handover delay still applies to BOTH. Two vaul drawers in one frame do
 * not hand over (see `SHEET_SWAP_MS`), and a navigation fired while the sheet is
 * still on screen leaves it mid-exit over the new route.
 */
check(
  "...and both destinations wait for the sheet handover",
  /setTimeout\(\(\) => \{[\s\S]{0,400}\}, SHEET_SWAP_MS\)/.test(codeOnly(DECLINED_SRC))
    ? `inside the ${SHEET_SWAP_MS}ms handover`
    : "NOT DEFERRED",
  /setTimeout\(\(\) => \{[\s\S]{0,400}router\.push\(`\/support-chat\/[\s\S]{0,300}\}, SHEET_SWAP_MS\)/.test(codeOnly(DECLINED_SRC)),
);
/** ⚠️ The route has to resolve the trip, or the ticket opens blank. */
check(
  "...and the route names the trip in its path",
  /params: Promise<\{ id: string \}>/.test(ZENDESK_ROUTE_SRC) && /notFound\(\)/.test(ZENDESK_ROUTE_SRC)
    ? "/support-chat/[id], 404 on an unknown trip"
    : "MISSING",
  /params: Promise<\{ id: string \}>/.test(ZENDESK_ROUTE_SRC) &&
    /notFound\(\)/.test(ZENDESK_ROUTE_SRC) &&
    /<ZendeskChatScreen trip=/.test(ZENDESK_ROUTE_SRC),
);
/**
 * ⛔ A SCREEN, not a sheet. Asserted on the component itself, because the whole
 * correction is that this is a page the driver lands on rather than an overlay
 * over the ride they are still on.
 */
check(
  "...and the chat is a screen, with no drawer left in it",
  /<Drawer\b|DrawerContent/.test(ZENDESK_SRC) ? "STILL A DRAWER" : "min-h-screen + Header",
  !/<Drawer\b/.test(ZENDESK_SRC) &&
    /min-h-screen/.test(ZENDESK_SRC) &&
    /<Header\b/.test(ZENDESK_SRC),
);

/* --- 23c. The auto-sent template ----------------------------------------- */
/**
 * ⭐⭐ **The driver types nothing.** `CAP-327` shows this template above
 * `Sent · Just now` with an empty composer. Building it here rather than
 * grepping the component is the only way to know the real message carries the
 * real trip.
 */
const DECLINE_TRIP = mockNeedsActionTrips.find((t) => t.scenario?.solutions.includes("rider-initiated-cancellation"))
  ?? mockInProgressTrips.find((t) => t.scenario?.solutions.includes("rider-initiated-cancellation"));
check(
  "a row 16 scenario ride is seeded, so the template below is built on a real trip",
  DECLINE_TRIP ? `${DECLINE_TRIP.id} (${DECLINE_TRIP.scenario?.code})` : "NONE — the checks below are vacuous",
  DECLINE_TRIP !== undefined,
);
if (DECLINE_TRIP) {
  const message = zendeskDeclineMessage(DECLINE_TRIP);
  check(
    "the auto-sent message opens with production's sentence, verbatim",
    `${message.intro.slice(0, 44)}…`,
    message.intro ===
      "My member no longer needs transportation. I need help in removing the following rides from my manifest.",
  );
  /** ⛔ The four labels, in the captured order, declared here as literals. */
  const WANT_LABELS = ["Member Name", "Trip Date", "Trip ID", "Leg IDs"];
  check(
    "...and carries the four captured fields, in order",
    `${message.lines.map((l) => l.label).join(" / ")}`,
    message.lines.length === WANT_LABELS.length &&
      WANT_LABELS.every((label, i) => message.lines[i].label === label),
  );
  /** ⛔⛔ Every field filled from the trip — a template with a blank is a ticket
   *  Support cannot act on, and an empty string would pass a shape-only check. */
  const blanks = message.lines.filter((l) => l.value.trim().length === 0);
  check(
    "...and every field is filled from the trip",
    blanks.length ? `BLANK: ${blanks.map((b) => b.label).join(", ")}` : `${message.lines.length} of ${message.lines.length} filled`,
    blanks.length === 0,
  );
  check(
    "...and it names THIS trip, not a fixture",
    `rider=${message.lines[0].value} id=${message.lines[2].value}`,
    message.lines[0].value === DECLINE_TRIP.rider &&
      message.lines[2].value === DECLINE_TRIP.id,
  );
}

/* --- 23d. The chat is a dead end, and says so by saying nothing ---------- */
/**
 * ⛔⛔ No reply, no typing indicator, no agent. Nobody has captured what Support
 * says back, and the waiting IS the finding — a thread that answered itself
 * would be the prototype arguing the dead end is fine.
 */
const INVENTED_REPLY = /Thank you for contacting|typing|agent will|Sorry I couldn't|Rate your experience/i;
check(
  "the Zendesk thread invents no reply",
  INVENTED_REPLY.test(ZENDESK_CODE)
    ? `INVENTED: ${ZENDESK_CODE.match(INVENTED_REPLY)?.[0]}`
    : "one message, no answer",
  !INVENTED_REPLY.test(ZENDESK_CODE),
);
/** ⛔ And the composer does not work — it is a div, not an input. */
check(
  "...and the composer is dead, as it was when the driver never used it",
  /<input|<textarea|onSubmit|onChange/.test(ZENDESK_CODE) ? "INTERACTIVE" : "read-only",
  !/<input|<textarea|onSubmit|onChange/.test(ZENDESK_CODE),
);
/**
 * ⛔ `CAP-327` carries an agent's photograph and a real member's name. The
 * photograph is not replicated at all; the name comes from the seed, which
 * `verify-base.ts` §5 keeps invented.
 */
check(
  "...and it replicates no avatar from the capture",
  /<img|avatar|Avatar/.test(ZENDESK_CODE) ? "AVATAR PRESENT" : "no avatar",
  !/<img|avatar|Avatar/.test(ZENDESK_CODE),
);
/** ⚠️ Zendesk chat is not the in-app chat. The file must not claim otherwise. */
check(
  "...and it does not call itself the in-app chat",
  /in-app chat/i.test(ZENDESK_CODE) ? "CONFUSED" : "named as Zendesk support",
  !/in-app chat/i.test(ZENDESK_CODE) && /Support/.test(ZENDESK_CODE),
);

/* --- 23e. Now files nothing on the ride ---------------------------------- */
/**
 * ⛔ The banner, the pill and the My Rides status all hang off a submitted
 * request. Production's path never submits one — it hands the driver to Zendesk
 * — so Now leaves the ride exactly as it was. Asserted as the PAIRING rather
 * than by grepping the ride screen: the only route to the form is the proposal.
 */
const formReachable = (["now", "fixed"] as const).flatMap((mode) =>
  SOLUTIONS.map((row) => ({ row: row.id, mode, sheet: declinedSheetFor(demoFocus(row.id, mode)) }))
).filter((entry) => entry.sheet.primaryGoesTo === "form");
check(
  "the in-app form is reachable only from row 16's proposal",
  `${formReachable.length} of ${SOLUTIONS.length * 2} (row x mode) reach the form — ${formReachable.map((e) => `${e.row}/${e.mode}`).join(", ") || "none"}`,
  formReachable.length === 1 &&
    formReachable[0].row === "rider-initiated-cancellation" &&
    formReachable[0].mode === "fixed",
);


// ---------------------------------------------------------------------------
console.log("\n24. Row 13 — production refuses a Standing Order send-back");
// ---------------------------------------------------------------------------
/**
 * B3b, unblocked by `CAP-330`.
 *
 * ⭐⭐ Now is not "the proposal minus the reason form". For a standing order it
 * is a flow that **cannot succeed**: production refuses outright and the trip
 * stays on the manifest. The sentence ends at *call into support*, which is the
 * support call row 13 exists to absorb.
 *
 * ⚠️ The standing-order WARNING beside it is ours, not production's — the
 * component says so. Production warns about nothing; it says no, two taps in.
 */
const DENIED_SRC = readFileSync(join(ROOT, "components/driver/send-back-denied-dialog.tsx"), "utf8");
const MORE_SRC = readFileSync(join(ROOT, "components/driver/more-options-screen.tsx"), "utf8");
const NOW_13: DemoFocus = demoFocus("send-back-reason-form", "now");
const FIXED_13: DemoFocus = demoFocus("send-back-reason-form", "fixed");

/* --- 24a. The copy is production's, verbatim ---------------------------- */
check(
  "the refusal is CAP-330 word for word",
  `"${SEND_BACK_DENIED_TITLE}" / "${SEND_BACK_DENIED_BODY.slice(0, 40)}…"`,
  SEND_BACK_DENIED_TITLE === "Send-back request failed" &&
    SEND_BACK_DENIED_BODY ===
      "Standing Order Trips cannot be sent back via the Driver App. To send back this trip, please call into support for assistance.",
);
/** ⛔ One action, and no invented way forward. */
check(
  "...and it offers one dismissal and no way forward",
  `${SEND_BACK_DENIED_DISMISS} — ${(codeOnly(DENIED_SRC).match(/<AlertDialogAction/g) ?? []).length} action(s), ${(codeOnly(DENIED_SRC).match(/<AlertDialogCancel/g) ?? []).length} cancel(s)`,
  SEND_BACK_DENIED_DISMISS === "OK" &&
    (codeOnly(DENIED_SRC).match(/<AlertDialogAction/g) ?? []).length === 1 &&
    !/<AlertDialogCancel/.test(codeOnly(DENIED_SRC)),
);
/**
 * ⛔⛔ Production does not soften it, so neither may we. A "we can help" line
 * would be the prototype arguing with its own evidence on the screen that IS
 * the evidence.
 */
const SOFTENED = /we can help|don't worry|sorry|instead, try|alternatively/i;
check(
  "...and nothing is softened or added",
  SOFTENED.test(codeOnly(DENIED_SRC)) ? `SOFTENED: ${codeOnly(DENIED_SRC).match(SOFTENED)?.[0]}` : "production's words only",
  !SOFTENED.test(codeOnly(DENIED_SRC)),
);

/* --- 24b. The two paths, as declared literals --------------------------- */
/**
 * ⛔ Written out here, never read back from `sendBackSteps`. The whole claim is
 * that the two sides run DIFFERENT sequences, and a table derived from the
 * function would agree with whatever it produced.
 */
const STANDING = mockInProgressTrips.find(isStandingOrder)
  ?? mockNeedsActionTrips.find(isStandingOrder)
  ?? mockUpcomingTrips.find(isStandingOrder);
const PLAIN_SEND_BACK = [...mockInProgressTrips, ...mockNeedsActionTrips, ...mockUpcomingTrips]
  .find((t) => !isStandingOrder(t) && !isShortNoticeSendBack(t));
check(
  "a standing-order ride and an ordinary ride are both seeded",
  `standing=${STANDING?.scenario?.code ?? STANDING?.id ?? "NONE"} ordinary=${PLAIN_SEND_BACK?.id ?? "NONE"}`,
  STANDING !== undefined && PLAIN_SEND_BACK !== undefined,
);
if (STANDING && PLAIN_SEND_BACK) {
  const PATHS: Array<{ why: string; trip: Trip; focus: DemoFocus; want: string[] }> = [
    { why: "standing order, Now", trip: STANDING, focus: NOW_13, want: ["confirm", "denied"] },
    { why: "standing order, Proposed", trip: STANDING, focus: FIXED_13, want: ["reason", "confirm", "standing-order"] },
    { why: "ordinary ride, Now", trip: PLAIN_SEND_BACK, focus: NOW_13, want: ["confirm"] },
    { why: "ordinary ride, Proposed", trip: PLAIN_SEND_BACK, focus: FIXED_13, want: ["reason", "confirm"] },
    // ⚠️ The plain mirror shows every proposal, so it keeps the reason form.
    { why: "standing order, plain mirror", trip: STANDING, focus: PLAIN, want: ["reason", "confirm", "standing-order"] },
  ];
  const pathWrong = PATHS.filter(
    (c) => sendBackSteps(c.trip, c.focus).join(" → ") !== c.want.join(" → "),
  );
  check(
    "each side runs its declared sequence",
    pathWrong.length
      ? `WRONG: ${pathWrong.map((c) => `${c.why} = ${sendBackSteps(c.trip, c.focus).join("→")}`).join("; ")}`
      : `${PATHS.length} of ${PATHS.length} path(s) correct`,
    pathWrong.length === 0,
  );
  /**
   * ⛔⛔ **The refusal is terminal.** Nothing follows it — no penalty screen for
   * a send-back that is not happening — and the path cannot complete.
   */
  /**
   * ⛔⛔ Asserted on a trip that is BOTH a standing order AND short-notice —
   * the combination `sendBackSteps` says is real but is deliberately not
   * seeded, because a ride raising two warnings reads as one screen.
   *
   * ⚠️ A break test appending the penalty after the refusal PASSED when this
   * ran on the seeded `13c`, which is not short-notice: there was nothing for
   * the break to append, so the terminal claim was never exercised. The
   * synthesised trip is the only way to put a step after `denied` at all.
   */
  const STANDING_AND_SHORT: Trip = { ...STANDING, sameDay: true };
  check(
    "a standing order that is ALSO short-notice can be built, so 'terminal' is testable",
    `standingOrder=${isStandingOrder(STANDING_AND_SHORT)} shortNotice=${isShortNoticeSendBack(STANDING_AND_SHORT)}`,
    isStandingOrder(STANDING_AND_SHORT) && isShortNoticeSendBack(STANDING_AND_SHORT),
  );
  const nowStanding = sendBackSteps(STANDING_AND_SHORT, NOW_13);
  check(
    "...and the refusal ends the path, with nothing after it",
    `${nowStanding.join(" → ")}; completes=${sendBackCompletes(nowStanding)}`,
    nowStanding[nowStanding.length - 1] === "denied" &&
      nowStanding.length === 2 &&
      sendBackCompletes(nowStanding) === false,
  );
  /** ⚠️ ...while the PROPOSED path on that same trip raises all four screens. */
  check(
    "...and the proposal still raises both warnings on that same trip",
    `${sendBackSteps(STANDING_AND_SHORT, FIXED_13).join(" → ")}`,
    sendBackSteps(STANDING_AND_SHORT, FIXED_13).join(" → ") ===
      "reason → confirm → standing-order → penalty",
  );
  /**
   * ⛔ Every other path still completes, or this is a block not a gate.
   *
   * ⭐⭐ Including the PROPOSED standing-order path, and that is a recorded
   * decision rather than an accident: user direction, 2026-10-14, *"leave it,
   * the proposal is about reasons not permissions."* Row 13 proposes collecting
   * a reason, not lifting production's block. This check is what stops either
   * half of that being changed quietly.
   */
  const blocked = PATHS.filter((c) => !sendBackCompletes(sendBackSteps(c.trip, c.focus)));
  check(
    "...while every other path still finishes",
    `${blocked.length} of ${PATHS.length} blocked — ${blocked.map((c) => c.why).join(", ")}`,
    blocked.length === 1 && blocked[0].why === "standing order, Now",
  );
  /**
   * ⛔ The reason form is row 13's entire proposal, so it must appear on exactly
   * the sides that show proposals — and nowhere in production's path.
   */
  const reasonInNow = [STANDING, PLAIN_SEND_BACK].filter((t) =>
    sendBackSteps(t, NOW_13).includes("reason"),
  );
  check(
    "...and production's path never collects a reason",
    `${reasonInNow.length} of 2 ride(s) ask for one in Now`,
    reasonInNow.length === 0 &&
      sendBackSteps(STANDING, FIXED_13).includes("reason") &&
      sendBackSteps(PLAIN_SEND_BACK, FIXED_13).includes("reason"),
  );
  /**
   * ⚠️ **Our standing-order warning never shows in Now.** It is flagged in its
   * own component as proposed copy, and production warns about nothing — it
   * refuses. Showing it beside the refusal would read as production's.
   */
  check(
    "...and our standing-order warning stays out of production's path",
    `Now: ${sendBackSteps(STANDING, NOW_13).join(" → ")}`,
    !sendBackSteps(STANDING, NOW_13).includes("standing-order") &&
      sendBackSteps(STANDING, FIXED_13).includes("standing-order"),
  );
}

/* --- 24c. The screen reads the path, not the trip ----------------------- */
/**
 * ⛔ The handler must branch on the computed PATH. Branching on
 * `isStandingOrder(trip)` alone would show the refusal on both sides — the
 * proposal would stop working — or neither, depending which way it was written.
 */
check(
  "the send-back handler branches on the path, not on the trip",
  /sendBackPath\.includes\("denied"\)/.test(codeOnly(MORE_SRC))
    ? "sendBackPath.includes(\"denied\")"
    : "NOT FOUND — the refusal would key off the trip and ignore the side",
  /sendBackPath\.includes\("denied"\)/.test(codeOnly(MORE_SRC)) &&
    /sendBackSteps\(trip, demo\)/.test(codeOnly(MORE_SRC)),
);
/** ⛔ And the refusal is checked BEFORE our warning, or the warning wins. */
check(
  "...and it checks the refusal before reaching our warning",
  `denied at ${codeOnly(MORE_SRC).indexOf('sendBackPath.includes("denied")')}, warning at ${codeOnly(MORE_SRC).indexOf("setStandingOrderOpen(true)")}`,
  codeOnly(MORE_SRC).indexOf('sendBackPath.includes("denied")') > 0 &&
    codeOnly(MORE_SRC).indexOf('sendBackPath.includes("denied")') <
      codeOnly(MORE_SRC).indexOf("setStandingOrderOpen(true)"),
);
check(
  "...and the refusal dialog is mounted",
  /<SendBackDeniedDialog/.test(MORE_SRC) ? "mounted" : "MISSING",
  /<SendBackDeniedDialog/.test(MORE_SRC),
);

// ---------------------------------------------------------------------------
console.log("\n25. B6 — the table IS the selector");
// ---------------------------------------------------------------------------
/**
 * Four changes the user asked for on 2026-10-14, and the one risk each carries.
 *
 * 1. **The cells are the switch.** Use Case shows today, Proposed Feature shows
 *    the fix, the selected one is lit, and the other four columns are inert.
 *    ⛔ The risk: a row that can no longer be focused at all. The Use Case
 *    column MERGES, so a covered row has no use-case cell of its own — it stays
 *    reachable only because the Proposed Feature column never merges.
 * 2. **Only the body scrolls.** ⛔ The risk is the obvious implementation: a
 *    `<tbody>` with its own `overflow-y` must become a block box, and then it
 *    no longer shares the table's column widths.
 * 3. **A one-sentence feature column.** ⛔ The risk is editing `proposedFeature`
 *    to fit, which would stop the catalogue mirroring the spreadsheet § 1
 *    checks it against. A SECOND field instead.
 * 4. **No prose under the selection.** ⛔ The risk is deleting the alternates
 *    with the paragraphs attached to them — 11 buttons across 9 rows that are
 *    the only route to 11 demonstrable states.
 */
const B6_TABLE = readFileSync(join(ROOT, "components/solutions-dev/solution-table.tsx"), "utf8");
const B6_TABLE_CODE = codeOnly(B6_TABLE);

/* --- 25a. What a click on a cell means ----------------------------------- */
/**
 * ⛔ Declared as literals, answers included. The three outcomes are not
 * interchangeable: `"focus"` moves the app, `"set-mode"` deliberately does NOT,
 * and `"nothing"` exists so that clicking the lit cell three screens into a
 * demo does not yank you back to the entry route.
 */
const SELECT_CASES: Array<{
  why: string;
  runIds: string[];
  clickedId: string;
  column: SelectingColumn;
  activeId: string | null;
  activeMode: DemoMode;
  sides: readonly DemoMode[];
  want: SelectAction;
}> = [
  { why: "nothing focused, use case", runIds: ["a"], clickedId: "a", column: "use-case", activeId: null, activeMode: "now", sides: ["now", "fixed"], want: "focus" },
  { why: "nothing focused, proposed feature", runIds: ["a"], clickedId: "a", column: "proposed-feature", activeId: null, activeMode: "now", sides: ["now", "fixed"], want: "focus" },
  { why: "another row's use case", runIds: ["a"], clickedId: "a", column: "use-case", activeId: "b", activeMode: "now", sides: ["now", "fixed"], want: "focus" },
  { why: "another row's proposed feature", runIds: ["a"], clickedId: "a", column: "proposed-feature", activeId: "b", activeMode: "fixed", sides: ["now", "fixed"], want: "focus" },
  { why: "⭐ the focused row's use case, while showing the proposal", runIds: ["a"], clickedId: "a", column: "use-case", activeId: "a", activeMode: "fixed", sides: ["now", "fixed"], want: "set-mode" },
  { why: "⭐ the focused row's proposed feature, while showing today", runIds: ["a"], clickedId: "a", column: "proposed-feature", activeId: "a", activeMode: "now", sides: ["now", "fixed"], want: "set-mode" },
  { why: "⛔ the lit use-case cell, clicked again", runIds: ["a"], clickedId: "a", column: "use-case", activeId: "a", activeMode: "now", sides: ["now", "fixed"], want: "nothing" },
  { why: "⛔ the lit proposed-feature cell, clicked again", runIds: ["a"], clickedId: "a", column: "proposed-feature", activeId: "a", activeMode: "fixed", sides: ["now", "fixed"], want: "nothing" },
  /*
    ⛔⛔ The four that caught a shipped bug, 2026-10-14. A MERGED use-case cell
    is drawn by the first row of its run but speaks for all of them. Row 10's
    only use-case cell is the one row 09 draws — so while the cell compared
    against `clickedId`, clicking it with row 10 focused jumped the focus to
    row 09, and row 10's production side could not be reached from the table at
    all. The highlight was already lighting that cell, because IT compared
    against the run. Found by a walk; these are what would have found it here.
  */
  { why: "⭐⭐ a merged use case, clicked by the SECOND row of its run", runIds: ["a", "b"], clickedId: "a", column: "use-case", activeId: "b", activeMode: "fixed", sides: ["now", "fixed"], want: "set-mode" },
  { why: "⭐⭐ ...and clicked again once it is lit", runIds: ["a", "b"], clickedId: "a", column: "use-case", activeId: "b", activeMode: "now", sides: ["now", "fixed"], want: "nothing" },
  { why: "a merged use case with its FIRST row focused still flips", runIds: ["a", "b"], clickedId: "a", column: "use-case", activeId: "a", activeMode: "fixed", sides: ["now", "fixed"], want: "set-mode" },
  { why: "a merged use case with a stranger focused takes the focus", runIds: ["a", "b"], clickedId: "a", column: "use-case", activeId: "z", activeMode: "now", sides: ["now", "fixed"], want: "focus" },
  /* ⛔ And the run does NOT widen the proposed-feature column, which never merges. */
  { why: "the second row's own proposed feature is its own", runIds: ["b"], clickedId: "b", column: "proposed-feature", activeId: "a", activeMode: "fixed", sides: ["now", "fixed"], want: "focus" },
  /*
    ⛔⛔ B3f. A `no-app-surface` row has ONE side and both columns select it.
    Selecting `"fixed"` would offer a side that does not exist; selecting
    NOTHING would make row 12 unreachable, because its Use Case cell is merged
    into row 11's. That is the B3d bug again, from the other end.
  */
  { why: "⭐⭐ no proposal: the proposed-feature cell still focuses the row", runIds: ["a"], clickedId: "a", column: "proposed-feature", activeId: null, activeMode: "now", sides: ["now"], want: "focus" },
  { why: "⭐⭐ ...landing on the one side it has, so clicking again is a no-op", runIds: ["a"], clickedId: "a", column: "proposed-feature", activeId: "a", activeMode: "now", sides: ["now"], want: "nothing" },
  { why: "⭐ ...and its use-case cell means that same one side", runIds: ["a"], clickedId: "a", column: "use-case", activeId: "a", activeMode: "now", sides: ["now"], want: "nothing" },
];

const selectWrong = SELECT_CASES.filter(
  (c) =>
    selectAction({
      runIds: c.runIds,
      clickedId: c.clickedId,
      column: c.column,
      activeId: c.activeId,
      activeMode: c.activeMode,
      sides: c.sides,
    }) !== c.want,
);
check(
  "a click on a cell is decided by one rule, with a declared truth table",
  selectWrong.length
    ? `WRONG: ${selectWrong.map((c) => c.why).join("; ")}`
    : `${SELECT_CASES.length} of ${SELECT_CASES.length} case(s) correct`,
  selectWrong.length === 0,
);
/**
 * ⛔⛔ Non-vacuity. A table that only ever expected `"focus"` would pass over a
 * rule that had lost both of the other outcomes — and losing `"set-mode"` is
 * precisely the regression that would make every flip remount the ride the
 * comparison is being made against.
 */
const selectSeen = new Set(SELECT_CASES.map((c) => c.want));
const selectColumns = new Set(SELECT_CASES.map((c) => c.column));
const selectModes = new Set(SELECT_CASES.map((c) => c.activeMode));
check(
  "...and that table reaches all three outcomes, both columns and both modes",
  `${selectSeen.size} of 3 outcome(s) — ${[...selectSeen].sort().join(", ")}; ` +
    `${selectColumns.size} of ${SELECTING_COLUMNS.length} column(s); ${selectModes.size} of ${DEMO_MODES.length} mode(s)`,
  selectSeen.size === 3 &&
    selectSeen.has("focus") &&
    selectSeen.has("set-mode") &&
    selectSeen.has("nothing") &&
    selectColumns.size === SELECTING_COLUMNS.length &&
    selectModes.size === DEMO_MODES.length,
);
/**
 * ⛔⛔ The two columns must mean DIFFERENT sides, and between them cover both.
 * Mapped the same way, the table would still highlight, still focus, still
 * look like a selector — and both columns would show the proposal, which is
 * the one thing the whole slice exists not to do.
 */
const columnModes = SELECTING_COLUMNS.map((c) => COLUMN_MODE[c]);
check(
  "the two selecting columns mean the two different sides",
  `${SELECTING_COLUMNS.map((c) => `${c}=${COLUMN_MODE[c]}`).join(", ")}`,
  COLUMN_MODE["use-case"] === "now" &&
    COLUMN_MODE["proposed-feature"] === "fixed" &&
    new Set(columnModes).size === DEMO_MODES.length,
);
/**
 * ⛔ The six columns are partitioned: two select, four do not, none is both and
 * none is neither. A column dropped from both lists is a column whose
 * behaviour nothing here describes.
 */
const DECLARED_COLUMNS: TableColumn[] = [
  "subject-area",
  "calls",
  "share",
  "problem",
  "use-case",
  "proposed-feature",
];
const partitioned = [...SELECTING_COLUMNS, ...INERT_COLUMNS];
check(
  "every column is either a control or declared inert, and none is both",
  `${SELECTING_COLUMNS.length} selecting + ${INERT_COLUMNS.length} inert = ${partitioned.length} of ${DECLARED_COLUMNS.length}`,
  partitioned.length === DECLARED_COLUMNS.length &&
    new Set(partitioned).size === DECLARED_COLUMNS.length &&
    DECLARED_COLUMNS.every((c) => partitioned.includes(c)) &&
    (INERT_COLUMNS as readonly string[]).join(",") === "subject-area,calls,share,problem",
);

/* --- 25b. Which cell is lit ---------------------------------------------- */
/**
 * ⚠️ The merged case is the one worth writing down. Rows 09+10 and 11+12 share
 * one Use Case cell, drawn by the first row of the run — so focusing row 10 has
 * to light a cell that row 09 renders, or the selected row has no highlight.
 */
const LIT_CASES: Array<{ why: string; runIds: string[]; column: SelectingColumn; activeId: string | null; activeMode: DemoMode; want: boolean }> = [
  { why: "no focus at all", runIds: ["a"], column: "use-case", activeId: null, activeMode: "now", want: false },
  { why: "the focused row's use case, on now", runIds: ["a"], column: "use-case", activeId: "a", activeMode: "now", want: true },
  { why: "the focused row's use case, on fixed", runIds: ["a"], column: "use-case", activeId: "a", activeMode: "fixed", want: false },
  { why: "the focused row's proposed feature, on fixed", runIds: ["a"], column: "proposed-feature", activeId: "a", activeMode: "fixed", want: true },
  { why: "the focused row's proposed feature, on now", runIds: ["a"], column: "proposed-feature", activeId: "a", activeMode: "now", want: false },
  { why: "another row's cell", runIds: ["a"], column: "use-case", activeId: "z", activeMode: "now", want: false },
  { why: "⭐ a merged cell lit by the SECOND row of its run", runIds: ["a", "b"], column: "use-case", activeId: "b", activeMode: "now", want: true },
  { why: "⭐ ...and not lit when that row is on the other side", runIds: ["a", "b"], column: "use-case", activeId: "b", activeMode: "fixed", want: false },
];
const litWrong = LIT_CASES.filter(
  (c) => cellSelected({ runIds: c.runIds, column: c.column, activeId: c.activeId, activeMode: c.activeMode }) !== c.want,
);
check(
  "the highlight follows the focused row and the side it is on",
  litWrong.length ? `WRONG: ${litWrong.map((c) => c.why).join("; ")}` : `${LIT_CASES.length} of ${LIT_CASES.length} case(s) correct`,
  litWrong.length === 0,
);
check(
  "...and that table has a lit case, an unlit case and a merged one",
  `${LIT_CASES.filter((c) => c.want).length} lit / ${LIT_CASES.filter((c) => !c.want).length} unlit; ` +
    `${LIT_CASES.filter((c) => c.runIds.length > 1).length} merged`,
  LIT_CASES.some((c) => c.want) &&
    LIT_CASES.some((c) => !c.want) &&
    LIT_CASES.some((c) => c.runIds.length > 1 && c.want),
);

/* --- 25c. ⛔⛔ Every one of the 26 rows is still reachable ----------------- */
/**
 * **The check B6 exists to make.** Four of the six columns went inert, so the
 * only ways into a focus from the table are the two that did not. The Use Case
 * column merges, and a merged cell focuses the FIRST row of its run — so the
 * second row of a merged run has no use-case cell of its own and depends
 * entirely on its Proposed Feature cell, which never merges.
 *
 * ⛔ Counted from the rendered spans, not from the catalogue, so a merge that
 * grew would show up here as rows going dark.
 */
/**
 * The cells the table actually draws, as a model.
 *
 * ⛔⛔ **ONE model, read by both checks below.** There were two for a few
 * minutes — this one and a second `reachableBy` loop that re-derived the same
 * fact — and when greying stopped twelve rows from drawing cells, only one of
 * them learned about it. The other went on reporting `26 of 26 reachable` while
 * twelve rows were inert: a check asserting the opposite of what the table did,
 * still printing `ok`. Two models of one thing is two chances to disagree.
 *
 * ⛔ A row with nothing to show contributes NO cells — the table renders it as
 * plain `<td>`s with no handler.
 *
 * ⚠️ **What guards THIS model is the cell COUNT**, asserted in 25c's
 * reachability search, not the reachability checks themselves. Those filter
 * both of their inputs through `isDemonstrable`, so they can detect a row that
 * became unreachable and cannot detect a model that hands out cells the table
 * does not draw. Proven by a break test that deleted the guard above: the count
 * failed, the reachability labels did not.
 */
type SelectCellModel = {
  runIds: readonly string[];
  clickedId: string;
  column: SelectingColumn;
};
const TABLE_CELLS: SelectCellModel[] = tRows.flatMap((r) =>
  !isDemonstrable(r.solution)
    ? []
    : [
        // Never merges, so it always stands for its own row alone.
        { runIds: [r.solution.id], clickedId: r.solution.id, column: "proposed-feature" as SelectingColumn },
        // Drawn only at the head of its run, and speaking for the whole of it.
        ...(r.useCaseSpan > 0
          ? [{ runIds: r.useCaseRunIds, clickedId: r.solution.id, column: "use-case" as SelectingColumn }]
          : []),
      ],
);

/** Which columns can focus each row — read off the one model above. */
const reachableBy = new Map<string, Set<SelectingColumn>>(
  tRows.map((r) => [r.solution.id, new Set<SelectingColumn>()]),
);
for (const cell of TABLE_CELLS) {
  // ⚠️ A merged Use Case cell focuses the row it BELONGS to — the first of
  // its run — which is what `clickedId` already carries.
  reachableBy.get(cell.clickedId)!.add(cell.column);
}
const unreachable = [...reachableBy]
  .filter(([id, cols]) => cols.size === 0 && isDemonstrable(findSolution(id)!))
  .map(([id]) => id);
/**
 * ⛔⛔ The loop above seeds every row from its Proposed Feature cell, which
 * is only true while that column never merges. Asserted against the MARKUP, not
 * assumed: a `rowSpan` on that cell is the obvious tidy-up — rows 17 and 18 say
 * the same thing, so why draw it twice — and it would take the second row of
 * that pair out of the table entirely, with nothing to see.
 */
const PROPOSED_CELL_TAG = B6_TABLE_CODE.match(/<SelectCell[^>]*column="proposed-feature"[^>]*>/)?.[0] ?? "";
const proposedMerges = /rowSpan/.test(PROPOSED_CELL_TAG);
const liveRows = tRows.filter((r) => isDemonstrable(r.solution));
check(
  "every row with something to show can be focused from the table",
  proposedMerges
    ? "THE PROPOSED FEATURE CELL MERGES — a covered row would have no cell of its own"
    : unreachable.length
      ? `UNREACHABLE: ${unreachable.join(", ")}`
      : `${liveRows.length} of ${liveRows.length} live row(s) reachable, none merged away; ` +
        `${EXPECTED_TABLE_ROWS - liveRows.length} greyed`,
  unreachable.length === 0 &&
    reachableBy.size === EXPECTED_TABLE_ROWS &&
    // ⛔ Non-vacuity: the live set must not have quietly emptied.
    liveRows.length === 14 &&
    PROPOSED_CELL_TAG.length > 0 && !proposedMerges,
);
/**
 * ⛔ The rows that DRAW no Use Case cell of their own are named — rows 10 and
 * 12, the second row of each merged run. If that list grows, a merge grew with
 * it.
 *
 * ⚠️ This does NOT say they are reachable only one way. They share the cell
 * above them and it speaks for them, which is what `coversFocus` settles and
 * what the two checks below actually measure. Reading this line as a
 * reachability claim is the mistake that let row 10's production side ship
 * unreachable.
 */
const PROPOSED_ONLY = ["request-feed-member-filter", "vehicle-capacity-backend"];
const proposedOnly = [...reachableBy]
  .filter(([id, cols]) => isDemonstrable(findSolution(id)!) && !cols.has("use-case"))
  .map(([id]) => id)
  .sort();
const reachDrift = [
  ...PROPOSED_ONLY.filter((id) => !proposedOnly.includes(id)).map((id) => `-${id}`),
  ...proposedOnly.filter((id) => !PROPOSED_ONLY.includes(id)).map((id) => `+${id}`),
];
check(
  "...and exactly the two rows under a merged use case draw no cell of their own",
  reachDrift.length
    ? `DRIFT: ${reachDrift.join(" ")}`
    : `${proposedOnly.length} of ${EXPECTED_TABLE_ROWS} — ${proposedOnly.join(", ")}`,
  reachDrift.length === 0 &&
    // ⚠️ Non-vacuity: most LIVE rows must be reachable BOTH ways, or the
    // merged column has quietly stopped being a control at all.
    [...reachableBy].filter(([, cols]) => cols.size === 2).length ===
      liveRows.length - PROPOSED_ONLY.length,
);
/**
 * ⛔⛔⛔ **Every row reachable on BOTH sides, by table clicks alone.**
 *
 * The check above asks whether a row can be FOCUSED. That is not the question
 * — a row focused only ever on the proposal is a row whose production side the
 * desktop selector cannot show, and the whole slice is the comparison. B3d made
 * that live: row 10 gained a real Now (the unfiltered Request Feed) and there
 * was no way to reach it, because its only Use Case cell is the merged one row
 * 09 draws. Found by a walk, not by a check, which is why this one exists.
 *
 * ⭐ Modelled as a search over the state machine the table actually is: start
 * from the plain mirror, apply every cell click, follow where `selectAction`
 * says it goes, and see which of the 52 (row × side) states are ever entered.
 */
function clickCell(
  activeId: string | null,
  mode: DemoMode,
  cell: SelectCellModel,
): [string | null, DemoMode] {
  // ⛔ One rule about how many sides a row has.
  const sides = demonstrableSides(findSolution(cell.clickedId)!);
  const action = selectAction({
    runIds: cell.runIds,
    clickedId: cell.clickedId,
    column: cell.column,
    activeId,
    activeMode: mode,
    sides,
  });
  const side = columnModeFor(cell.column, sides);
  if (action === "focus") return [cell.clickedId, side];
  if (action === "set-mode") return [activeId, side];
  return [activeId, mode];
}
const START: [string | null, DemoMode] = [null, DEFAULT_DEMO_MODE];
const seen = new Set<string>([`${START[0]}/${START[1]}`]);
const queue: Array<[string | null, DemoMode]> = [START];
while (queue.length) {
  const [id, mode] = queue.shift()!;
  for (const cell of TABLE_CELLS) {
    const next = clickCell(id, mode, cell);
    const key = `${next[0]}/${next[1]}`;
    if (seen.has(key)) continue;
    seen.add(key);
    queue.push(next);
  }
}
/**
 * ⚠️ **Every row on every side IT HAS.** Three rows are `no-app-surface` — a
 * data cleanse, a backend path, and a subject area with no single cause — so
 * the comparison has one side for them, not two. They are named here as
 * literals, because "this row has only one side" is a claim worth making
 * explicitly rather than subtracting from a total.
 *
 * ⛔ Rows 11 and 12 still have a production SCREEN, reached through `nowEntry`.
 * One side is not no sides.
 */
/**
 * ⛔⛔ **The twelve rows the table greys, declared as literals.** User
 * direction 2026-10-14: *"anything we have not built in the prototype yet lets
 * not make it clickable and gray it. Gives me a sense of whats remaining."*
 * They keep their place — §1 mirrors the spreadsheet 1:1 — and carry no
 * handler at all.
 *
 * ⚠️ Rows 11 and 12 are NOT here, and that is the one judgement in this list.
 * They are `not-yet`, so their badge says *"⚠️ Not in prototype yet"* — their
 * PROPOSAL is a data cleanse and a backend path. But production's over-capacity
 * screen is real and B3f built it, so greying them would hide the thing they
 * exist to show. "Built" and "demonstrable" come apart on exactly these two.
 */
const INERT_ROWS = [
  "ai-assistant",
  "multiload-disclosure",
  "coded-term-definitions",
  "send-back-scoring",
  "requests-tray",
  "requests-tray-modifications",
  "eta-send-back-explicit",
  "compliance-status",
  "dispatch-chat",
  "distribution-restriction",
  "technical-issues",
  "otp-exclusion",
];
/** Rows with one side: production's screen, and no proposal built. */
const SINGLE_SIDED = ["vehicle-capacity-cleanse", "vehicle-capacity-backend"];
/**
 * ⛔ Both lists checked against the rule, in both directions. A list that
 * merely happened to match today would stop matching silently the first time a
 * row was built.
 */
const sidedDrift = [
  ...INERT_ROWS.filter((id) => isDemonstrable(findSolution(id)!)).map((id) => `inert+${id}`),
  ...SOLUTIONS.filter((row) => !isDemonstrable(row) && !INERT_ROWS.includes(row.id)).map(
    (row) => `inert-${row.id}`,
  ),
  ...SINGLE_SIDED.filter((id) => demonstrableSides(findSolution(id)!).length !== 1).map((id) => `one+${id}`),
  ...SOLUTIONS.filter(
    (row) => demonstrableSides(row).length === 1 && !SINGLE_SIDED.includes(row.id),
  ).map((row) => `one-${row.id}`),
];
const WANTED_STATES = tRows.flatMap((r) =>
  demonstrableSides(r.solution).map((m) => `${r.solution.id}/${m}`),
);
const EXPECTED_STATES =
  (EXPECTED_TABLE_ROWS - INERT_ROWS.length - SINGLE_SIDED.length) * DEMO_MODES.length +
  SINGLE_SIDED.length;
const unreachableStates = WANTED_STATES.filter((k) => !seen.has(k));
check(
  "every row is reachable on every side it has, using nothing but the table",
  unreachableStates.length
    ? `UNREACHABLE: ${unreachableStates.slice(0, 6).join(", ")}${unreachableStates.length > 6 ? ` (+${unreachableStates.length - 6})` : ""}`
    : `${WANTED_STATES.length} of ${EXPECTED_STATES} (row x side) reachable; ` +
      `${SINGLE_SIDED.length} row(s) have one side, ${INERT_ROWS.length} have none`,
  unreachableStates.length === 0 &&
    WANTED_STATES.length === EXPECTED_STATES &&
    // ⛔ The single-sided list is the catalogue's own, not a convenient subset.
    sidedDrift.length === 0 &&
    // ⛔ Non-vacuity: the search must really have had to walk, not start done.
    TABLE_CELLS.length ===
      tRows.filter((r) => isDemonstrable(r.solution)).length +
        tRows.filter((r) => isDemonstrable(r.solution) && r.useCaseSpan > 0).length,
);
/**
 * ⛔⛔ And the side they do NOT have is genuinely unreachable — not merely
 * unvisited by this search. `modeFor` normalises it away wherever the focus is
 * assembled, so a hand-edited `?mode=fixed` on one of these rows lands on the
 * one side it has.
 */
const forcedWrong = SINGLE_SIDED.filter(
  (id) => DEMO_MODES.some((m) => modeFor(findSolution(id), m) !== DEFAULT_DEMO_MODE),
);
check(
  "...and nothing can put a one-sided row on the side it does not have",
  forcedWrong.length
    ? `REACHABLE: ${forcedWrong.join(", ")}`
    : `${SINGLE_SIDED.length} row(s) pinned to ${DEFAULT_DEMO_MODE}; ` +
      `a two-sided row still moves: ${DEMO_MODES.map((m) => modeFor(findSolution("rider-no-show"), m)).join("/")}`,
  forcedWrong.length === 0 &&
    // ⚠️ Non-vacuity: `modeFor` must not simply pin EVERY row.
    DEMO_MODES.every((m) => modeFor(findSolution("rider-no-show"), m) === m) &&
    // ...and the plain mirror keeps whatever it was given, because it is inert.
    DEMO_MODES.every((m) => modeFor(undefined, m) === m),
);
/**
 * ⛔⛔ **And the two rules agree about whose cell it is.** The bug was not that
 * either one was wrong on its own — it was that `cellSelected` compared the
 * whole run and `selectAction` compared one id, so the highlight lit a cell the
 * click would not act on. Swept over every cell and every focus.
 */
let agreementSweep = 0;
/** ⛔⛔ The dangerous direction: lit, and clicking it MOVES you. */
const litButMoves: string[] = [];
/** ⚠️ The harmless one: a no-op that is not the lit cell. Declared below. */
const quietButUnlit: string[] = [];
for (const cell of TABLE_CELLS) {
  for (const row of tRows) {
    // ⚠️ Only the sides this row can be on — `modeFor` is what the provider
    // applies, so sweeping past it would test states the app cannot enter.
    for (const wanted of DEMO_MODES) {
      const mode = modeFor(row.solution, wanted);
      if (mode !== wanted) continue;
      agreementSweep += 1;
      const lit = cellSelected({
        runIds: cell.runIds,
        column: cell.column,
        activeId: row.solution.id,
        activeMode: mode,
      });
      const action = selectAction({
        runIds: cell.runIds,
        clickedId: cell.clickedId,
        column: cell.column,
        activeId: row.solution.id,
        activeMode: mode,
        sides: demonstrableSides(findSolution(cell.clickedId)!),
      });
      const key = `${cell.column}:${cell.clickedId}@${row.solution.id}/${mode}`;
      if (lit && action !== "nothing") litButMoves.push(key);
      if (!lit && action === "nothing") quietButUnlit.push(key);
    }
  }
}
/**
 * ⛔⛔ **No lit cell ever moves you.** This is the direction the B3d bug broke
 * — the highlight pointed at a control that jumped the focus elsewhere — and
 * it admits no exceptions.
 */
check(
  "...and no lit cell is one whose click moves the focus",
  litButMoves.length
    ? `LIT BUT MOVES: ${litButMoves.slice(0, 5).join(", ")} (${litButMoves.length} of ${agreementSweep})`
    : `0 of ${agreementSweep} (cell x focus x side) lit cells move`,
  litButMoves.length === 0 && agreementSweep > 0,
);
/**
 * ⚠️ The other direction has exactly three exceptions, and they are the
 * single-sided rows' own Proposed Feature cells. That cell focuses its row but
 * never lights — the Use Case cell is the lit one, because `cellSelected` reads
 * `COLUMN_MODE` while the CLICK reads `columnModeFor`. So on a row already
 * focused, it is a no-op that is not highlighted: harmless, and the price of
 * keeping row 12 reachable at all.
 *
 * ⛔ Declared as literals. If a fourth appears, a two-sided row has quietly
 * lost its second side.
 */
const EXPECTED_QUIET = SINGLE_SIDED.map(
  (id) => `proposed-feature:${id}@${id}/${DEFAULT_DEMO_MODE}`,
).sort();
const quietDrift = [
  ...EXPECTED_QUIET.filter((k) => !quietButUnlit.includes(k)).map((k) => `-${k}`),
  ...quietButUnlit.filter((k) => !EXPECTED_QUIET.includes(k)).map((k) => `+${k}`),
];
check(
  "...and the only unlit no-ops are the one-sided rows' own proposed-feature cells",
  quietDrift.length
    ? `DRIFT: ${quietDrift.slice(0, 5).join(" ")}`
    : `${quietButUnlit.length} of ${agreementSweep} — ${SINGLE_SIDED.length} one-sided row(s)`,
  quietDrift.length === 0 && quietButUnlit.length === SINGLE_SIDED.length,
);

/** ⛔ `useCaseRunIds` must describe the same merge the rowspan draws. */
const runIdDrift = tRows.filter(
  (r) =>
    r.useCaseRunIds.length !== r.useCaseSpan ||
    r.useCaseRunIds.some((id, i) => {
      const covered = tRows.find((x) => x.solution.id === id);
      return !covered || covered.solution.useCase !== r.solution.useCase || (i > 0 && covered.useCaseSpan !== 0);
    }),
);
check(
  "...and the ids a use-case cell covers are the rows its rowspan covers",
  runIdDrift.length
    ? `DRIFT: ${runIdDrift.map((r) => r.solution.id).join(", ")}`
    : `${tRows.reduce((n, r) => n + r.useCaseRunIds.length, 0)} id(s) across ${tRows.filter((r) => r.useCaseSpan > 0).length} cell(s)`,
  runIdDrift.length === 0 &&
    tRows.reduce((n, r) => n + r.useCaseRunIds.length, 0) === EXPECTED_TABLE_ROWS,
);

/* --- 25c-2. The greyed rows, and what they are greyed FOR ---------------- */
/**
 * ⭐⭐ **The greying is the answer to "what is left".** User direction
 * 2026-10-14: *"anything we have not built in the prototype yet lets not make
 * it clickable and gray it. Gives me a sense of whats remaining."* So the
 * count itself carries meaning — twelve greyed rows is twelve features to
 * build — and a row greyed for the wrong reason overstates or understates it.
 */
check(
  "the greyed rows are exactly the ones with nothing to demonstrate",
  sidedDrift.length
    ? `DRIFT: ${sidedDrift.join(" ")}`
    : `${INERT_ROWS.length} greyed, ${SINGLE_SIDED.length} one-sided, ` +
      `${SOLUTIONS.length - INERT_ROWS.length - SINGLE_SIDED.length} with both sides`,
  sidedDrift.length === 0 &&
    INERT_ROWS.length + SINGLE_SIDED.length + 12 === EXPECTED_TABLE_ROWS,
);
/**
 * ⛔⛔ **A greyed row really has nothing** — not an entry, not a `nowEntry`,
 * and not a build state that claims otherwise. The risk is the other direction
 * from drift: a row correctly ON the list whose state has since changed, so the
 * table greys something that is now demonstrable.
 */
const wronglyGreyed = INERT_ROWS.map((id) => findSolution(id)!).filter(
  (row) => row.buildState === "in-prototype" || row.entry !== null || row.nowEntry,
);
check(
  "...and each of them really has no screen of any kind",
  wronglyGreyed.length
    ? `HAS SOMETHING: ${wronglyGreyed.map((r) => `${r.order} ${r.id}`).join(", ")}`
    : `${INERT_ROWS.length} of ${INERT_ROWS.length} — no entry, no nowEntry, not in prototype`,
  wronglyGreyed.length === 0,
);
/**
 * ⚠️ ...while the rows that stay live are live for a stated reason. Rows 11
 * and 12 are `not-yet` and NOT greyed — the one place "built" and
 * "demonstrable" come apart — so the thing keeping them clickable is named
 * here rather than left as an exception someone later tidies away.
 */
const liveNotYet = SOLUTIONS.filter(
  (row) => row.buildState !== "in-prototype" && isDemonstrable(row),
);
check(
  "...and the only not-yet rows still clickable are the ones with a nowEntry",
  `${liveNotYet.map((r) => `${r.order} ${r.id}`).join(", ") || "none"}`,
  liveNotYet.length === SINGLE_SIDED.length &&
    liveNotYet.every((row) => Boolean(row.nowEntry)) &&
    liveNotYet.every((row) => SINGLE_SIDED.includes(row.id)),
);
/** ⛔ And a greyed row carries no handler in the markup at all. */
check(
  "...and a row with nothing to show renders plain cells, with no handler",
  `{!live && (<td` + `: ${/\{!live && \(\s*<td/.test(B6_TABLE_CODE)}; ` +
    `inert tone: ${/inert:\s*"[^"]*text-gray-400/.test(B6_TABLE_CODE)}`,
  /\{!live && \(\s*<td/.test(B6_TABLE_CODE) &&
    /inert:\s*"[^"]*text-gray-400/.test(B6_TABLE_CODE) &&
    // ⛔ ...and the live branch is still a SelectCell, or nothing selects.
    /\{live && \(\s*<SelectCell/.test(B6_TABLE_CODE),
);

/**
 * ⛔⛔ **And the drawer greys the same rows.** Below 1280px there is no table,
 * so the picker is the only way in — two surfaces with two opinions about
 * which rows are pickable would disagree at exactly 1279px.
 */
const PICKER_GREY_SRC = readFileSync(join(ROOT, "components/solutions-dev/solution-picker-sheet.tsx"), "utf8");
const PICKER_CODE = codeOnly(PICKER_GREY_SRC);
check(
  "the picker drawer greys the same rows the table does, by the same rule",
  `isDemonstrable: ${PICKER_CODE.includes("isDemonstrable(solution)")}; ` +
    `disabled: ${/disabled=\{!live\}/.test(PICKER_CODE)}; ` +
    `buildState branch: ${/buildState\s*===/.test(PICKER_CODE)}`,
  PICKER_CODE.includes("isDemonstrable(solution)") &&
    /disabled=\{!live\}/.test(PICKER_CODE) &&
    // ⛔ Not a second opinion written as a build-state test.
    !/buildState\s*===/.test(PICKER_CODE),
);

/* --- 25d. The table wires the rule, and the row itself is not a control --- */
check(
  "the table decides a click with the rule in lib/, not a ternary of its own",
  `selectAction: ${B6_TABLE_CODE.includes("selectAction(")}; cellSelected: ${B6_TABLE_CODE.includes("cellSelected(")}; COLUMN_MODE: ${B6_TABLE_CODE.includes("COLUMN_MODE[")}`,
  B6_TABLE_CODE.includes("selectAction(") &&
    B6_TABLE_CODE.includes("cellSelected(") &&
    B6_TABLE_CODE.includes("COLUMN_MODE["),
);
/**
 * ⛔⛔ **The four inert columns are inert because the ROW has no handler.** A
 * single `onClick` on the `<tr>` would restore all four by inheritance, and
 * nothing would look wrong — every cell would simply select again.
 */
const ROW_HANDLER = /<tr[^>]*\sonClick/;
check(
  "...and no handler on the row, which is what keeps the other four columns inert",
  ROW_HANDLER.test(B6_TABLE_CODE)
    ? "ROW IS CLICKABLE — all six columns select by inheritance"
    : "the two cells carry the only handlers",
  !ROW_HANDLER.test(B6_TABLE_CODE),
);
/**
 * ⛔ And the two that DO select each pass their OWN column, not one constant.
 * Two cells and two headers, one of each column — a `column` hard-coded on
 * both cells would make the table a two-column highlight of a single side,
 * which is a selector that always selects the same thing.
 */
function columnsPassedTo(tag: string): string[] {
  return [...B6_TABLE_CODE.matchAll(new RegExp(`<${tag}\\b[^>]*?column="([a-z-]+)"`, "gs"))].map(
    (m) => m[1],
  );
}
const cellColumns = columnsPassedTo("SelectCell").sort();
const headerColumns = columnsPassedTo("SideHeader").sort();
const WANT_COLUMNS = [...SELECTING_COLUMNS].sort().join(",");
check(
  "...and the two cells are wired to the two different columns, as are their headers",
  `cells: ${cellColumns.join(", ") || "none"}; headers: ${headerColumns.join(", ") || "none"}`,
  cellColumns.join(",") === WANT_COLUMNS && headerColumns.join(",") === WANT_COLUMNS,
);

/* --- 25e. The prose went, the buttons stayed ----------------------------- */
/**
 * ⛔⛔ Two different things lived in the focused cell and only one goes.
 * `entry.label` explained and controlled nothing. An alternate is a BUTTON —
 * the only route to a second or third state of its slice — and deleting it
 * with its paragraph would cost 11 reachable states across 9 rows.
 */
check(
  "the entry paragraph is gone from the table",
  B6_TABLE_CODE.includes("entry.label")
    ? "STILL RENDERED — the description B6 removed"
    : "gone from the table (the strip still carries it below 1280)",
  !B6_TABLE_CODE.includes("entry.label"),
);
check(
  "...and the strip, which is the only surface below 1280, still carries it",
  codeOnly(STRIP_SRC).includes("entry.label") ? "kept" : "DELETED — the briefing lost its entry note on a phone",
  codeOnly(STRIP_SRC).includes("entry.label"),
);
check(
  "...and the alternates kept their buttons, now reading the short label",
  `short: ${B6_TABLE_CODE.includes("alternate.short")}; label: ${B6_TABLE_CODE.includes("alternate.label")}`,
  B6_TABLE_CODE.includes("alternate.short") && !B6_TABLE_CODE.includes("alternate.label"),
);
const ALTERNATES = SOLUTIONS.flatMap((s) =>
  (s.entry?.alternates ?? []).map((a) => ({ id: s.id, ...a })),
);
const EXPECTED_SHORTS = 11;
const SHORT_MAX = 45;
const SHORT_MIN = 20;
const shortBad = ALTERNATES.filter(
  (a) => a.short.length < SHORT_MIN || a.short.length > SHORT_MAX || a.short.length >= a.label.length,
);
check(
  "every alternate carries a short label, and it is short",
  shortBad.length
    ? `BAD: ${shortBad.map((a) => `${a.id} (${a.short.length})`).join(", ")}`
    : `${ALTERNATES.length} of ${EXPECTED_SHORTS}, ${Math.min(...ALTERNATES.map((a) => a.short.length))}-${Math.max(...ALTERNATES.map((a) => a.short.length))} chars vs ${Math.min(...ALTERNATES.map((a) => a.label.length))}-${Math.max(...ALTERNATES.map((a) => a.label.length))}`,
  shortBad.length === 0 && ALTERNATES.length === EXPECTED_SHORTS,
);
/**
 * ⛔⛔ **Hand-written, never truncated.** A cut paragraph ends mid-word and a
 * derived label is the subject describing itself — both read as the prose this
 * field replaced. The falsifiable form of "hand-written" is that no short is a
 * PREFIX of its own label, which is what any truncation would be.
 */
const truncated = ALTERNATES.filter((a) =>
  a.label.toLowerCase().startsWith(a.short.toLowerCase().replace(/[…\s]+$/, "")),
);
check(
  "...and none of them is its label with the end cut off",
  truncated.length
    ? `TRUNCATED: ${truncated.map((a) => a.id).join(", ")}`
    : `0 of ${ALTERNATES.length} are a prefix of their label`,
  truncated.length === 0,
);
check(
  "...and no two alternates are named the same thing",
  `${new Set(ALTERNATES.map((a) => a.short)).size} distinct of ${ALTERNATES.length}`,
  new Set(ALTERNATES.map((a) => a.short)).size === ALTERNATES.length,
);

/* --- 25f. One sentence per row, beside an untouched audit trail ---------- */
/**
 * ⛔⛔ `proposedFeature` is the spreadsheet's own column and § 1 compares it to
 * the source. B6 adds a SECOND field rather than shortening it, so the table
 * can read as one sentence while the catalogue goes on mirroring the document
 * it claims to mirror.
 */
const SUMMARY_MAX = 95;
const SUMMARY_MIN = 45;
/** ⚠️ Row 25 has no proposal at all; both fields are an em dash. */
const NO_PROPOSAL_ID = "technical-issues";
const summaryBad = SOLUTIONS.filter((s) => {
  if (s.id === NO_PROPOSAL_ID) return s.tableSummary !== "—" || s.proposedFeature !== "—";
  return (
    s.tableSummary.length < SUMMARY_MIN ||
    s.tableSummary.length > SUMMARY_MAX ||
    s.tableSummary.length > s.proposedFeature.length ||
    !s.tableSummary.endsWith(".")
  );
});
const realSummaries = SOLUTIONS.filter((s) => s.id !== NO_PROPOSAL_ID);
check(
  "every row carries a one-sentence summary, shorter than the column it stands in for",
  summaryBad.length
    ? `BAD: ${summaryBad.map((s) => `${s.id} (${s.tableSummary.length})`).join(", ")}`
    : `${SOLUTIONS.length} of ${EXPECTED_TABLE_ROWS}, ${Math.min(...realSummaries.map((s) => s.tableSummary.length))}-${Math.max(...realSummaries.map((s) => s.tableSummary.length))} chars vs proposedFeature's ${Math.min(...realSummaries.map((s) => s.proposedFeature.length))}-${Math.max(...realSummaries.map((s) => s.proposedFeature.length))}`,
  summaryBad.length === 0 && SOLUTIONS.length === EXPECTED_TABLE_ROWS,
);
/**
 * ⛔ Non-vacuity: the bound only means something if `proposedFeature` really is
 * the wall of prose this replaced. Row 03's is 535 characters, which is why a
 * 95-character cap is a change and not a restatement.
 */
check(
  "...and the column it replaces really was too long to read in a cell",
  `longest proposedFeature ${Math.max(...SOLUTIONS.map((s) => s.proposedFeature.length))} chars; longest summary ${Math.max(...realSummaries.map((s) => s.tableSummary.length))}`,
  Math.max(...SOLUTIONS.map((s) => s.proposedFeature.length)) > 500 &&
    Math.max(...realSummaries.map((s) => s.tableSummary.length)) <= SUMMARY_MAX,
);
/**
 * ⛔⛔ Exactly one pair of rows says the same thing, and it is the pair that
 * says the same thing in the SOURCE — rows 17 and 18, one requests tray listed
 * twice. A second duplicate would mean a summary had been copied rather than
 * written, and a summary copied onto the wrong row is invisible.
 */
const DUPLICATE_PAIR = ["requests-tray", "requests-tray-modifications"];
const summaryGroups = new Map<string, string[]>();
for (const s of realSummaries) {
  summaryGroups.set(s.tableSummary, [...(summaryGroups.get(s.tableSummary) ?? []), s.id]);
}
const dupes = [...summaryGroups.values()].filter((ids) => ids.length > 1);
const summaryDuplicateIds = dupes.flat().sort();
check(
  "...and the only two rows that read alike are the two the source writes alike",
  dupes.length === 0
    ? "NONE — rows 17 and 18 should share one sentence, as they share one proposedFeature"
    : `${dupes.length} pair(s): ${dupes.map((ids) => ids.join(" + ")).join("; ")}`,
  dupes.length === 1 &&
    summaryDuplicateIds.join(",") === [...DUPLICATE_PAIR].sort().join(",") &&
    // ⭐ ...and they are alike because the SOURCE is, not because a summary slipped.
    DUPLICATE_PAIR.every(
      (id) =>
        findSolution(id)!.proposedFeature === findSolution(DUPLICATE_PAIR[0])!.proposedFeature,
    ),
);
/** ⛔ And the table renders the summary, not the prose it replaced. */
check(
  "the table's last column reads the summary, and the prose reaches it nowhere",
  `tableSummary: ${B6_TABLE_CODE.includes("solution.tableSummary")}; proposedFeature: ${B6_TABLE_CODE.includes("proposedFeature")}`,
  B6_TABLE_CODE.includes("solution.tableSummary") && !B6_TABLE_CODE.includes("proposedFeature"),
);
/** ⚠️ ...while the strip, the only surface below 1280, still shows the full text. */
check(
  "...and the strip still shows the spreadsheet's own wording below the breakpoint",
  codeOnly(STRIP_SRC).includes("proposedFeature") ? "kept" : "DELETED — the source wording reaches no surface at all",
  codeOnly(STRIP_SRC).includes("proposedFeature"),
);

/* --- 25g. Only the body scrolls ------------------------------------------ */
/**
 * ⛔⛔ The trap, named so it cannot be "fixed" back in. A `<tbody>` given its
 * own `overflow-y` has to become a block box, and a block `<tbody>` no longer
 * participates in the table's column sizing — header and body then line up by
 * coincidence and drift the moment any cell's content changes. Sticky `<th>`s
 * inside a scrolling wrapper keep ONE table layout.
 */
const SCROLL_RULES: Array<[string, boolean]> = [
  ["the wrapper is a scrollport", /\.solution-table-scroll\s*\{[^}]*overflow-y:\s*auto/.test(cssDesktop)],
  ["...and is capped, or it never scrolls", /\.solution-table-scroll\s*\{[^}]*max-height:/.test(cssDesktop)],
  ["the header cells stick to it", /\.solution-table-scroll thead th\s*\{[^}]*position:\s*sticky/.test(cssDesktop)],
  ["...at its top edge", /\.solution-table-scroll thead th\s*\{[^}]*top:\s*0/.test(cssDesktop)],
  ["⛔ and no tbody was made a block box", !/tbody\s*\{[^}]*display:\s*block/.test(cssAll)],
];
const scrollBroken = SCROLL_RULES.filter(([, ok]) => !ok).map(([label]) => label);
check(
  "the header stays while the body scrolls, and the table keeps one layout",
  scrollBroken.length ? `BROKEN: ${scrollBroken.join("; ")}` : `${SCROLL_RULES.length} of ${SCROLL_RULES.length} rules hold`,
  scrollBroken.length === 0,
);
/**
 * ⛔⛔ **A sticky CELL travels; the ROW it sits in does not.**
 *
 * A row's background is painted by the row, so a `<th>` that takes its colour
 * from `<tr class="bg-...">` is TRANSPARENT the moment it sticks — measured
 * `rgba(0, 0, 0, 0)` — and the body scrolls visibly under the header text.
 * Reported by the user 2026-10-14, after B6 made the header sticky.
 *
 * ⚠️ Invisible at rest, which is the one state a screenshot catches and the
 * reason this needs a check rather than a look. Asserted on the MARKUP in both
 * directions: the header cells carry a background, and the row does not, so
 * nobody can "tidy" it back onto the row and reintroduce it.
 */
const HEAD_BG = /const HEAD_CELL = "[^"]*bg-\[#[0-9A-Fa-f]{6}\]/;
const HEAD_ROW = B6_TABLE_CODE.match(/<tr className="[^"]*">\s*\n\s*<th/)?.[0] ?? "";
const headCells = (B6_TABLE_CODE.match(/<th className=\{cn\(HEAD_CELL/g) ?? []).length;
const EXPECTED_HEAD_CELLS = 5; // four written out here, plus SideHeader's one
check(
  "the sticky header cells carry their own background, not the row's",
  `HEAD_CELL has a background: ${HEAD_BG.test(B6_TABLE_CODE)}; ` +
    `${headCells} of ${EXPECTED_HEAD_CELLS} <th> use it; ` +
    `header row background: ${/bg-\[#/.test(HEAD_ROW) ? "STILL ON THE ROW" : "none"}`,
  HEAD_BG.test(B6_TABLE_CODE) &&
    headCells === EXPECTED_HEAD_CELLS &&
    HEAD_ROW.length > 0 &&
    // ⛔ And NOT on the row, where it would not travel with the cell.
    !/bg-\[#/.test(HEAD_ROW),
);
/** ⛔ Every header cell is one of them — none left behind with its own classes. */
const plainHeadCells = (B6_TABLE_CODE.match(/<th className="/g) ?? []).length;
check(
  "...and no header cell was left painting itself",
  `${plainHeadCells} hand-classed <th> of ${headCells + plainHeadCells}`,
  plainHeadCells === 0,
);

/** ⛔ The scroller is desktop-only, like everything else in that block. */
check(
  "...and none of it applies below the breakpoint, where there is no table",
  /\.solution-table-scroll/.test(cssBase)
    ? "LEAKED into the base stylesheet"
    : "desktop only",
  !/\.solution-table-scroll/.test(cssBase) && /\.solution-table-scroll/.test(cssDesktop),
);
/** ⛔ And the markup actually uses it, or the CSS is styling nothing. */
check(
  "...and the table is inside the scroller it declares",
  B6_TABLE_CODE.includes("solution-table-scroll") ? "solution-table-scroll" : "NOT MOUNTED",
  B6_TABLE_CODE.includes("solution-table-scroll"),
);

/* --- 25h. The two columns say which side they are --------------------- */
/**
 * ⭐ The headers read their names from `DEMO_MODE_LABEL` — the same two strings
 * the strip's toggle uses. Two controls for one mode is fine; two controls
 * calling the two sides different things is a reviewer asking which is which.
 */
check(
  "the column headers name the sides from the one place the sides are named",
  `DEMO_MODE_LABEL in the table: ${B6_TABLE_CODE.includes("DEMO_MODE_LABEL[")}; hand-written "Proposed": ${/>\s*Proposed\s*</.test(B6_TABLE_CODE)}`,
  B6_TABLE_CODE.includes("DEMO_MODE_LABEL[COLUMN_MODE[column]]") &&
    !/>\s*Proposed\s*</.test(B6_TABLE_CODE),
);
/** ⛔ Keyboard-reachable, or the only way into a focus at desktop is a mouse. */
check(
  "...and a cell can be reached and pressed without a mouse",
  `tabIndex: ${B6_TABLE_CODE.includes("tabIndex={0}")}; Enter/Space: ${B6_TABLE_CODE.includes('event.key !== "Enter"')}; aria-pressed: ${B6_TABLE_CODE.includes("aria-pressed=")}`,
  B6_TABLE_CODE.includes("tabIndex={0}") &&
    B6_TABLE_CODE.includes('event.key !== "Enter"') &&
    B6_TABLE_CODE.includes('event.key !== " "') &&
    B6_TABLE_CODE.includes("aria-pressed="),
);


// ---------------------------------------------------------------------------
console.log("\n26. Row 10 — the Request Feed member filter is ours, not production's");
// ---------------------------------------------------------------------------
/**
 * B3d. Until now row 10 sat in `ROWS_AWAITING_NOW`: focusing it on `"now"` hid
 * the More Options tile it shares with row 09, so *something* changed — but the
 * filter the row is actually about stayed put. A toggle that moves a tile while
 * the headline feature carries on working is a half-truth, and it was on screen
 * labelled as the gap it was.
 *
 * ⛔⛔ **Gating the dropdown would not have been enough**, and that is the whole
 * shape of this slice. Three things read the filters — the feed, the badge on
 * the filter icon, and the sheet's own initial values — so hiding the control
 * alone would leave a deep link narrowing the feed to one member, with a badge
 * counting a filter the driver cannot see, open or clear. One answer,
 * `applicableFilters`, and everything downstream reads it.
 */
const FEED_SRC = readFileSync(join(ROOT, "app/requests/page.tsx"), "utf8");
const FEED_CODE = codeOnly(FEED_SRC);
const SHEET_SRC = readFileSync(join(ROOT, "components/driver/filter-requests-modal.tsx"), "utf8");
const SHEET_CODE = codeOnly(SHEET_SRC);
const ROW_10_ID = "request-feed-member-filter";
const ROW_09_ID = "auto-assign-request";
/** ⚠️ A member with trips in the feed — row 10's own entry route names her. */
const FILTER_MEMBER = "AMARA OKONKWO";

/* --- 26a. What the feed shows, on each side ------------------------------ */
/**
 * ⭐⭐ **The check this slice exists for.** Not "is the gate wired" — that is
 * §20c — but *how many trips a driver is looking at*, driven end to end through
 * the same two functions the page calls.
 *
 * ⛔ Expectations declared as literals, including which side filters. A table
 * generated from the gate it tests is a restatement.
 */
const TOTAL_REQUESTS = mockRequestTrips.length;
const AMARA_REQUESTS = filterRequestsByMember(mockRequestTrips, FILTER_MEMBER).length;
function feedSize(id: string | null, mode: DemoMode): number {
  const applied = applicableFilters({ member: FILTER_MEMBER }, demoFocus(id, mode));
  return applied.member
    ? filterRequestsByMember(mockRequestTrips, applied.member).length
    : mockRequestTrips.length;
}
const FEED_CASES: Array<{ why: string; id: string | null; mode: DemoMode; narrowed: boolean }> = [
  { why: "⭐ row 10, now — the dead end", id: ROW_10_ID, mode: "now", narrowed: false },
  { why: "⭐ row 10, fixed — the proposal", id: ROW_10_ID, mode: "fixed", narrowed: true },
  { why: "row 09, now — one build, same two sides", id: ROW_09_ID, mode: "now", narrowed: false },
  { why: "row 09, fixed", id: ROW_09_ID, mode: "fixed", narrowed: true },
  { why: "the plain mirror shows every proposal", id: null, mode: "now", narrowed: true },
  { why: "...on either reading of the mode", id: null, mode: "fixed", narrowed: true },
  { why: "a stranger's row never borrows it", id: "rider-no-show", mode: "fixed", narrowed: false },
  { why: "...on either side", id: "rider-no-show", mode: "now", narrowed: false },
];
const feedWrong = FEED_CASES.filter(
  (c) => feedSize(c.id, c.mode) !== (c.narrowed ? AMARA_REQUESTS : TOTAL_REQUESTS),
);
check(
  "the same deep link lands on one member's trips, or on the whole feed",
  feedWrong.length
    ? `WRONG: ${feedWrong.map((c) => `${c.why} (${feedSize(c.id, c.mode)})`).join("; ")}`
    : `${FEED_CASES.length} of ${FEED_CASES.length} case(s) — narrowed ${AMARA_REQUESTS}, unfiltered ${TOTAL_REQUESTS}`,
  feedWrong.length === 0,
);
/**
 * ⛔⛔ Non-vacuity, and it is not optional here. If the seed happened to hold
 * only Amara's trips, "narrowed" and "unfiltered" would be the same number and
 * every case above would pass over a gate that did nothing at all.
 */
check(
  "...and those two are different feeds, so the comparison has something to show",
  `${AMARA_REQUESTS} of ${TOTAL_REQUESTS} request(s) are hers`,
  AMARA_REQUESTS > 0 && AMARA_REQUESTS < TOTAL_REQUESTS &&
    FEED_CASES.some((c) => c.narrowed) && FEED_CASES.some((c) => !c.narrowed),
);
/** ⚠️ And `"now"` is the WHOLE feed, not merely a different one. */
check(
  "...and production's side is the feed with nothing taken out of it",
  `now = ${feedSize(ROW_10_ID, "now")} of ${TOTAL_REQUESTS}`,
  feedSize(ROW_10_ID, "now") === TOTAL_REQUESTS,
);

/* --- 26b. The gate touches the member filter and nothing else ------------ */
/**
 * ⛔ `applicableFilters` strips ONE key. A version that returned `{}` in `"now"`
 * would also drop the incentive filter, which predates row 10 and is nobody's
 * proposal — production has it, so taking it away would make the Now side
 * wrong in the other direction.
 */
const ALL_FILTERS = {
  pickupLocation: "atlanta",
  day: "today",
  client: "verida",
  member: FILTER_MEMBER,
  sortBy: "expiration-date",
  mode: "full-trip",
  incentiveType: "early-bird",
};
const strippedNow = applicableFilters(ALL_FILTERS, demoFocus(ROW_10_ID, "now"));
const keptFixed = applicableFilters(ALL_FILTERS, demoFocus(ROW_10_ID, "fixed"));
const collateral = Object.keys(ALL_FILTERS).filter(
  (k) => k !== "member" && strippedNow[k as keyof typeof ALL_FILTERS] !== ALL_FILTERS[k as keyof typeof ALL_FILTERS],
);
check(
  "the gate takes out the member filter and leaves production's own alone",
  collateral.length
    ? `ALSO DROPPED: ${collateral.join(", ")}`
    : `member dropped; ${Object.keys(ALL_FILTERS).length - 1} of ${Object.keys(ALL_FILTERS).length} key(s) untouched`,
  strippedNow.member === undefined &&
    collateral.length === 0 &&
    // ⛔ ...and on the proposal side it changes nothing at all.
    keptFixed.member === FILTER_MEMBER &&
    Object.keys(ALL_FILTERS).every(
      (k) => keptFixed[k as keyof typeof ALL_FILTERS] === ALL_FILTERS[k as keyof typeof ALL_FILTERS],
    ),
);
/**
 * ⛔⛔ **The badge counts what is applied, not what was asked for.** In `"now"`
 * a member deep link would otherwise put a `1` on the filter icon for a filter
 * that is not narrowing anything and has no control in the sheet — visible,
 * unexplainable and unclearable. This is the count the page computes, run over
 * the same object.
 */
const badge = (id: string | null, mode: DemoMode) =>
  Object.values(applicableFilters({ member: FILTER_MEMBER }, demoFocus(id, mode))).filter(Boolean).length;
check(
  "...and the filter badge counts nothing in production, one in the proposal",
  `now ${badge(ROW_10_ID, "now")}, fixed ${badge(ROW_10_ID, "fixed")}`,
  badge(ROW_10_ID, "now") === 0 && badge(ROW_10_ID, "fixed") === 1,
);

/* --- 26c. One answer, and every reader reads it -------------------------- */
/**
 * ⛔⛔ **The raw object must be read by almost nothing.** `appliedFilters` is
 * the driver's intent; `applied` is what survives the gate. Every consumer that
 * reaches past the gate to the raw object re-opens the bug this slice closes,
 * and each one would look perfectly reasonable in a diff.
 *
 * ⚠️ Declared as a count with its sites named, not as "the string appears".
 * The three legitimate READS are the `useState` declaration, the one call that
 * builds `applied` from it, and that call's dependency array. Anything else
 * reaching for the raw object is a consumer that has gone round the gate.
 *
 * ⛔ The WRITES are counted separately and deliberately left alone. Recording
 * what the driver asked for is right, and all three writers — the initial
 * state, the deep-link effect and the sheet's Update — go on doing it. The
 * gate decides what is HONOURED, not what is stored.
 */
const RAW_READS = (FEED_CODE.match(/\bappliedFilters\b/g) ?? []).length;
const RAW_WRITES = (FEED_CODE.match(/\bsetAppliedFilters\b/g) ?? []).length;
const EXPECTED_RAW_READS = 3;
/** ⚠️ The declaration plus its three setters. */
const EXPECTED_RAW_WRITES = 4;
check(
  "the driver's raw filters are read only where they are declared and gated",
  `${RAW_READS} of ${EXPECTED_RAW_READS} read(s), ${RAW_WRITES} of ${EXPECTED_RAW_WRITES} write(s)`,
  RAW_READS === EXPECTED_RAW_READS &&
    RAW_WRITES === EXPECTED_RAW_WRITES &&
    FEED_CODE.includes("applicableFilters(appliedFilters, demo)"),
);
/** ⛔ And the three consumers each read the gated object. */
const READERS: Array<[string, boolean]> = [
  ["the feed narrows by it", FEED_CODE.includes("filterRequestsByMember(result, applied.member)")],
  ["...and its incentive filter too", FEED_CODE.includes("applied.incentiveType")],
  ["the badge counts it", FEED_CODE.includes("Object.values(applied)")],
  ["the sheet is seeded from it", FEED_CODE.includes("initialFilters={applied}")],
];
const notReading = READERS.filter(([, ok]) => !ok).map(([label]) => label);
check(
  "...and every surface downstream reads the gated object instead",
  notReading.length ? `READING THE RAW ONE: ${notReading.join("; ")}` : `${READERS.length} of ${READERS.length} readers`,
  notReading.length === 0,
);

/* --- 26d. The sheet is told, it does not ask ----------------------------- */
/**
 * ⛔⛔ The filter sheet is PRODUCTION's screen, replicated from a capture. It
 * has no business knowing which catalogue row the selector is focused on —
 * reading the focus there would make a mirrored screen depend on the tooling
 * that frames it, which the base contract forbids, and would put the decision
 * where no truth table can reach it.
 */
const SHEET_ASKS = /useSolution|demo-mode|DemoFocus|showsProposal/;
check(
  "the production filter sheet never asks which solution is focused",
  SHEET_ASKS.test(SHEET_CODE)
    ? `ASKS (${SHEET_CODE.match(SHEET_ASKS)?.[0]}) — a mirrored screen reading the tooling`
    : "told through a prop",
  !SHEET_ASKS.test(SHEET_CODE) && SHEET_CODE.includes("showMemberFilter"),
);
/**
 * ⛔ Required, with no default. A default would let the one call site be
 * converted wrongly and still compile — rendering a proposed control inside
 * production's own sheet, which is the single worst outcome available here.
 */
check(
  "...and the prop is required, so the one call site cannot omit it",
  /showMemberFilter\?:/.test(SHEET_CODE)
    ? "OPTIONAL — an omitted prop would read as false, or a default as true"
    : "showMemberFilter: boolean",
  /showMemberFilter: boolean/.test(SHEET_CODE) && !/showMemberFilter\?:/.test(SHEET_CODE),
);
/**
 * ⛔⛔ **Exactly ONE of the sheet's seven controls is gated.** Production
 * carries six — Pickup Location, Day and Client under "Filter by:", plus Sort
 * by, Incentive Filter and Mode. The Member row is the seventh, and ours.
 * Gating a second would delete a production control in `"now"`;
 * gating none would leave the proposal on screen in both modes. The count is
 * what tells those apart — a grep for the guard cannot.
 */
const SHEET_SELECTS = (SHEET_CODE.match(/<Select\b/g) ?? []).length;
const GATED_SELECTS = (SHEET_CODE.match(/\{showMemberFilter && \(\s*<Select\b/g) ?? []).length;
const EXPECTED_SHEET_SELECTS = 7;
check(
  "exactly one of the sheet's controls is ours, and it is the Member row",
  `${GATED_SELECTS} gated of ${SHEET_SELECTS} control(s), expected 1 of ${EXPECTED_SHEET_SELECTS}`,
  SHEET_SELECTS === EXPECTED_SHEET_SELECTS &&
    GATED_SELECTS === 1 &&
    // ⭐ ...and it is the Member one, not whichever happens to be first.
    /\{showMemberFilter && \(\s*<Select[\s\S]{0,400}?placeholder="Member"/.test(SHEET_CODE),
);
/** ⚠️ The page asks the gate by name, rather than re-deciding it. */
check(
  "...and the page asks the one rule, rather than deciding again",
  FEED_CODE.includes("showMemberFilter={showsMemberFilter(demo)}")
    ? "showMemberFilter={showsMemberFilter(demo)}"
    : "NOT FOUND — the sheet and the feed could disagree about the same mode",
  FEED_CODE.includes("showMemberFilter={showsMemberFilter(demo)}"),
);

/* --- 26e. The deep link still lands -------------------------------------- */
/**
 * ⭐ `applicableFilters` STRIPS, it does not refuse. Row 10's entry route and
 * its alternate both carry `?member=`, and in `"now"` they still land — on the
 * unfiltered feed, which is the dead end being demonstrated. A guard that
 * redirected instead would answer "what happens now?" with a 404.
 */
const ROW_10_ROUTES = [ROW_10.entry!.route, ...(ROW_10.entry!.alternates ?? []).map((a) => a.route)];
check(
  "row 10's routes still name a member, on both sides",
  `${ROW_10_ROUTES.filter((r) => r.includes("member=")).length} of ${ROW_10_ROUTES.length} carry ?member=`,
  ROW_10_ROUTES.length === 2 && ROW_10_ROUTES.every((r) => r.startsWith("/requests?member=")),
);

/* --- 26f. Row 10 is off the awaiting list, and has earned it ------------- */
/**
 * ⛔⛔ The list is the SHRINKING one — a row stays on it until someone deletes
 * the line. B3d deletes row 10's, so the claim this makes is that focusing row
 * 10 on `"now"` really does change what a driver sees. §26a is the evidence;
 * this is the bookkeeping that must agree with it.
 */
check(
  "row 10 now claims a production screen",
  `hasNowState(${ROW_10_ID}) = ${hasNowState(ROW_10_ID)}; on the awaiting list: ${ROWS_AWAITING_NOW.includes(ROW_10_ID)}`,
  hasNowState(ROW_10_ID) === true && !ROWS_AWAITING_NOW.includes(ROW_10_ID),
);
/**
 * ⛔ ...and the claim is backed by the feed, not by the deletion. These two
 * facts are computed from different places on purpose: one reads the list, the
 * other runs the rule over the seed. A row deleted from the list without being
 * built would pass the first and fail this.
 */
check(
  "...and the two sides of row 10 really do differ, which is what the list claims",
  `now ${feedSize(ROW_10_ID, "now")} trips, fixed ${feedSize(ROW_10_ID, "fixed")} trips`,
  hasNowState(ROW_10_ID) === (feedSize(ROW_10_ID, "now") !== feedSize(ROW_10_ID, "fixed")),
);


// ---------------------------------------------------------------------------
console.log("\n27. Rows 11 and 12 — over capacity is not a block, it is a phone number");
// ---------------------------------------------------------------------------
/**
 * B3f. D7 and the capture list both described this as *"trying to accept a trip
 * that exceeds vehicle capacity — the over-capacity block"*, i.e. an attempt met
 * with a refusal. `CAP-340` shows there is no attempt: the Request Details
 * screen simply **has no accept control**. Where `SWIPE TO ACCEPT` would be
 * there is a pink swipe reading `Over Capacity Trip # …` / `SWIPE TO CALL
 * DISPATCH`, and completing it dials.
 *
 * ⭐ A stronger finding than a block. A block at least says what went wrong;
 * this says only *over capacity* and a reference number, and hands the driver a
 * telephone. That call IS what rows 11 and 12 exist to remove.
 *
 * ⛔⛔ **Now-only.** Both rows are `no-app-surface`, so there is no proposed
 * side, no toggle and nothing to gate — which is why this is reached through
 * `nowEntry` rather than by weakening what `entry` means.
 */
const OC_LAYOUT = readFileSync(join(ROOT, "components/driver/ride-detail-layout.tsx"), "utf8");
const OC_CODE = codeOnly(OC_LAYOUT);
const OC_ROWS = ["vehicle-capacity-cleanse", "vehicle-capacity-backend"];
const OC_TRIP = mockRequestTrips.find((t) => t.id === "REQ-OVERCAP-001");

/* --- 27a. The two rows keep every claim they made before ---------------- */
/**
 * ⛔⛔ `nowEntry` was added rather than letting `entry` mean "wherever this row
 * is demonstrated". Weakening `entry` would have made *"⚠️ Not in prototype
 * yet"* false for two rows whose proposal genuinely is not built — a data
 * cleanse and a backend path are not in this prototype and never will be.
 */
const ocRows = OC_ROWS.map((id) => findSolution(id));
check(
  "rows 11 and 12 still say their proposal is not in the prototype",
  ocRows.every(
    (row) =>
      row &&
      row.klass === "no-app-surface" &&
      row.buildState === "not-yet" &&
      row.entry === null &&
      Boolean(row.noSurfaceReason),
  )
    ? `${ocRows.length} of 2 — no-app-surface, not-yet, entry null, reason given`
    : "a row changed its build claim to gain a production screen",
  ocRows.length === 2 &&
    ocRows.every(
      (row) =>
        row &&
        row.klass === "no-app-surface" &&
        row.buildState === "not-yet" &&
        row.entry === null &&
        Boolean(row.noSurfaceReason),
    ),
);
/** ⛔ ...and they BOTH gained a nowEntry, because they are one dead end. */
check(
  "...and both gained a production screen to land on",
  `${ocRows.filter((r) => r?.nowEntry).length} of 2 — ${ocRows.map((r) => r?.nowEntry?.route).join(", ")}`,
  ocRows.every((row) => row?.nowEntry?.route === "/requests/REQ-OVERCAP-001"),
);
/**
 * ⛔⛔ **Declared count.** `nowEntry` must stay rare and deliberate — it is the
 * field that says "production has a screen here and we propose nothing". A
 * third appearing silently would mean a row had been given a Now without anyone
 * deciding it should have one.
 */
const nowEntryRows = SOLUTIONS.filter((row) => row.nowEntry);
const EXPECTED_NOW_ENTRIES = 2;
check(
  "...and exactly the declared rows carry one",
  `${nowEntryRows.length} of ${EXPECTED_NOW_ENTRIES} — ${nowEntryRows.map((r) => r.order).join(", ")}`,
  nowEntryRows.length === EXPECTED_NOW_ENTRIES &&
    nowEntryRows.every((row) => OC_ROWS.includes(row.id)),
);
/**
 * ⛔ `entryRouteFor` must not have moved the other 24 rows. A rule that changed
 * every row while adding two would be a refactor wearing a feature's clothes.
 */
const movedRoutes = SOLUTIONS.filter(
  (row) =>
    !row.nowEntry &&
    DEMO_MODES.some(
      (m) => entryRouteFor(row, m) !== (row.entry?.route ?? SOLUTION_HOME),
    ),
);
check(
  "the new routing rule leaves every row without a nowEntry exactly where it was",
  movedRoutes.length
    ? `MOVED: ${movedRoutes.map((r) => r.id).join(", ")}`
    : `${SOLUTIONS.length - nowEntryRows.length} of ${SOLUTIONS.length} row(s) unchanged on both sides`,
  movedRoutes.length === 0,
);
/** ⭐ ...and the two that DO carry one land on it, on the side that has it. */
check(
  "...and rows 11 and 12 land on their production screen",
  ocRows.map((r) => entryRouteFor(r!, "now")).join(", "),
  ocRows.every((row) => entryRouteFor(row!, "now") === "/requests/REQ-OVERCAP-001") &&
    // ⛔ ...and never on SOLUTION_HOME, which is where they went before B3f.
    ocRows.every((row) => entryRouteFor(row!, "now") !== SOLUTION_HOME),
);

/* --- 27b. The screen, against the capture ------------------------------ */
check(
  "an over-capacity request is seeded, and only one",
  `${mockRequestTrips.filter(isOverCapacity).length} of ${mockRequestTrips.length} request(s)`,
  Boolean(OC_TRIP) &&
    isOverCapacity(OC_TRIP!) &&
    mockRequestTrips.filter(isOverCapacity).length === 1,
);
/**
 * ⛔ `CAP-340`'s own number is TEST data (`RiderFirst RiderLast`, `4567 Test
 * Dr`, `8552.7 mi away`). The shape is copied; the value is invented — the
 * same rule that keeps real members' names out of the seed.
 */
check(
  "...carrying a dispatch reference of the captured shape, not its value",
  `#${OC_TRIP?.overCapacityTripNumber}`,
  /^[0-9]{7}$/.test(OC_TRIP?.overCapacityTripNumber ?? "") &&
    OC_TRIP?.overCapacityTripNumber !== "2156877",
);
/**
 * ⚠️ The finding the capture carries, preserved: the number the driver reads
 * down the phone appears NOWHERE ELSE on the screen. Three identifiers, and the
 * one the call turns on is its own.
 */
check(
  "...and that reference is not the trip's own id, as the capture has it",
  `trip ${OC_TRIP?.id} vs dispatch #${OC_TRIP?.overCapacityTripNumber}`,
  OC_TRIP !== undefined &&
    !OC_TRIP.id.includes(OC_TRIP.overCapacityTripNumber ?? "x") &&
    !OC_TRIP.legs.some((leg) => leg.id.includes(OC_TRIP.overCapacityTripNumber ?? "x")),
);
check(
  "the swipe reads CAP-340's two lines, verbatim",
  `"${overCapacityHeadline(OC_TRIP!)}" / "${OVER_CAPACITY_SWIPE_LABEL}"`,
  OVER_CAPACITY_PREFIX === "Over Capacity Trip #" &&
    OVER_CAPACITY_SWIPE_LABEL === "SWIPE TO CALL DISPATCH" &&
    overCapacityHeadline(OC_TRIP!) === `Over Capacity Trip # ${OC_TRIP!.overCapacityTripNumber}`,
);
/**
 * ⛔⛔ **The accept control is ABSENT, not disabled.** That is the whole
 * finding: there is no attempt to refuse. A greyed-out SWIPE TO ACCEPT would
 * say the driver tried and was told no, which is not what happens.
 */
check(
  "an over-capacity request shows the dial swipe INSTEAD of the accept control",
  /state === "before-taken" && isOverCapacity\(trip\) \?/.test(OC_CODE)
    ? "the branch replaces the CTA"
    : "NOT FOUND — the accept control may still render",
  /state === "before-taken" && isOverCapacity\(trip\) \?/.test(OC_CODE) &&
    OC_CODE.includes("OVER_CAPACITY_SWIPE_LABEL") &&
    OC_CODE.includes("overCapacityHeadline(trip)") &&
    // ⛔ ...and the words are not hand-written beside the rule that names them.
    !/Over Capacity Trip/.test(OC_CODE) &&
    !/SWIPE TO CALL DISPATCH/.test(OC_CODE),
);
/** ⭐ And completing it dials — a real href, not a handler that says it would. */
check(
  "...and it dials, rather than describing dialling",
  `${dispatchDialHref()}`,
  /^tel:[0-9]+$/.test(dispatchDialHref()) &&
    OC_CODE.includes("href={dispatchDialHref()}"),
);
/**
 * ⛔⛔ The number is OURS — `CAP-340` shows the swipe, not the dial. Seeded
 * fiction in the reserved 555-01xx range, like every other number here, and
 * flagged so it is never presented as production's dispatch line.
 */
const SEEDED_PHONES = readdirSync(join(ROOT, "lib/driver-data"))
  .filter((f) => f.endsWith(".ts") && f !== "over-capacity.ts")
  .flatMap(
    (f) =>
      readFileSync(join(ROOT, "lib/driver-data", f), "utf8").match(
        /\(\d{3}\)\s?\d{3}-?\d{4}|\(555\)\s?\d{4}/g,
      ) ?? [],
  );
check(
  "the dialled number is seeded fiction, and says so",
  `${OVER_CAPACITY_DISPATCH_PHONE} — ${OVER_CAPACITY_PROVENANCE.dispatchNumber}`,
  /^\(\d{3}\) 555-01\d{2}$/.test(OVER_CAPACITY_DISPATCH_PHONE) &&
    OVER_CAPACITY_PROVENANCE.dispatchNumber === "ours",
);
/**
 * ⛔⛔ **And it is DISPATCH's number, not someone else's.** The first version
 * was `(555) 0142`, copied from `ACCOUNT_ON_FILE.phone` — the DRIVER's own
 * number on the Account screen. The swipe would have dialled the person holding
 * the phone, and nothing on screen would have looked wrong. Swept against every
 * number seeded anywhere else in `lib/driver-data`.
 */
check(
  "...and it belongs to nobody else in the seed",
  SEEDED_PHONES.includes(OVER_CAPACITY_DISPATCH_PHONE)
    ? `COLLIDES — ${OVER_CAPACITY_DISPATCH_PHONE} is already somebody's`
    : `0 collisions across ${SEEDED_PHONES.length} seeded number(s)`,
  !SEEDED_PHONES.includes(OVER_CAPACITY_DISPATCH_PHONE) && SEEDED_PHONES.length > 8,
);
/**
 * ⛔⛔ **And none of this folds into `driver-app-base` yet.** D2 admits
 * capture-backed or user-confirmed PRODUCTION only. `CAP-340` is full of
 * `Test Dr` with no footer version in frame, so it establishes the SHAPE of the
 * screen and not the build it came from. The flag is what keeps that honest
 * when someone later runs the fold-in audit.
 */
check(
  "the capture's environment is recorded as unestablished, so nothing folds yet",
  Object.entries(OVER_CAPACITY_PROVENANCE).map(([k, v]) => `${k}=${v}`).join(" "),
  OVER_CAPACITY_PROVENANCE.environment === "unestablished" &&
    OVER_CAPACITY_PROVENANCE.copy === "captured" &&
    OVER_CAPACITY_PROVENANCE.behaviour === "user-confirmed",
);

/* --- 27c. One side, and no control offering a second ------------------- */
/**
 * ⛔⛔ The toggle must not render for a row with no proposal. It would move and
 * change nothing — the "switch that does nothing" this project has shipped
 * twice and spent two slices removing.
 */
const TOGGLE_GUARD = /if \(demonstrableSides\(active\)\.length < DEMO_MODES\.length\) return null;/;
check(
  "the toggle refuses to render for a row that has fewer than two sides",
  TOGGLE_GUARD.test(codeOnly(TOGGLE_SRC))
    ? "if (demonstrableSides(active).length < DEMO_MODES.length) return null"
    : "NOT FOUND — a segmented control would offer a side that does not exist",
  TOGGLE_GUARD.test(codeOnly(TOGGLE_SRC)),
);
/**
 * ⛔⛔ **Two questions that must not be collapsed.** `hasProposedSide` asks
 * whether the CATALOGUE holds a proposal — row 06's AI assistant does, with a
 * real klass. `demonstrableSides` asks what the PROTOTYPE can show — row 06 is
 * nothing at all. Fourteen rows differ between the two, and keeping them apart
 * is what lets the table grey a row without the catalogue lying about what was
 * proposed.
 */
const proposalVsPrototype = SOLUTIONS.filter(
  (row) => hasProposedSide(row) !== demonstrableSides(row).includes("fixed"),
);
check(
  "...and 'has a proposal' is not the same question as 'can show one'",
  `${SOLUTIONS.filter(hasProposedSide).length} have a proposal, ` +
    `${SOLUTIONS.filter((r) => demonstrableSides(r).includes("fixed")).length} can show one, ` +
    `${proposalVsPrototype.length} row(s) differ`,
  SOLUTIONS.filter(hasProposedSide).length === SOLUTIONS.length - 3 &&
    SOLUTIONS.filter((r) => demonstrableSides(r).includes("fixed")).length === 12 &&
    // ⭐ They must genuinely differ, or one is the other under a new name.
    proposalVsPrototype.length === 11,
);
/**
 * ⛔ And the greying is driven by the rule, not by a second opinion in the
 * table. Both the inert cells and the live ones read `isDemonstrable` /
 * `demonstrableSides`; a `buildState === "not-yet"` written in the component
 * would grey rows 11 and 12 too, hiding the screen B3f built.
 */
const TABLE_GREY = codeOnly(B6_TABLE);
check(
  "...and the table greys on that rule, not on buildState",
  `isDemonstrable: ${TABLE_GREY.includes("isDemonstrable(solution)")}; ` +
    `buildState branch: ${/buildState\s*===/.test(TABLE_GREY)}`,
  TABLE_GREY.includes("isDemonstrable(solution)") &&
    TABLE_GREY.includes("demonstrableSides(solution)") &&
    !/buildState\s*===/.test(TABLE_GREY),
);
/**
 * ⛔ The over-capacity screen is NOT gated on a mode, because there is nothing
 * to gate. A `showsProposal` call reaching it would be a gate on a proposal
 * that does not exist, and would hide production's own screen on one side.
 */
/**
 * ⚠️ The whole file, not `codeOnly` — this asserts an ABSENCE, and the
 * comments here are about why there is no gate, so stripping them would be
 * stripping the thing most likely to mention one. It costs a false positive if
 * someone writes `showsProposal(` in prose; that is the right way round.
 */
const OC_RULES_SRC = readFileSync(join(ROOT, "lib/driver-data/over-capacity.ts"), "utf8");
const OC_GATE = /showsProposal\(|\bDemoFocus\b|\bDemoMode\b/;
check(
  "the over-capacity surface consults no proposal gate",
  OC_GATE.test(OC_RULES_SRC)
    ? `GATED (${OC_RULES_SRC.match(OC_GATE)?.[0]}) — a proposal that does not exist is being switched on`
    : "ungated, because there is no proposal",
  !OC_GATE.test(OC_RULES_SRC) &&
    // ⛔ Positive control: the file really was read, and really does hold the
    // surface. An empty string passes every absence test ever written.
    OC_RULES_SRC.includes("OVER_CAPACITY_SWIPE_LABEL"),
);
/** ⚠️ ...but the rows are still named, so the scenario ride can claim them. */
check(
  "...while the rows it belongs to are still declared, for the scenario ride",
  `${OVER_CAPACITY_SOLUTIONS.join(", ")}`,
  OVER_CAPACITY_SOLUTIONS.length === 2 &&
    OC_ROWS.every((id) => OVER_CAPACITY_SOLUTIONS.includes(id)) &&
    OC_TRIP?.scenario?.solutions.join(",") === OVER_CAPACITY_SOLUTIONS.join(","),
);


// ---------------------------------------------------------------------------
console.log("\n28. Check 12 — the toggle is not decorative, measured");
// ---------------------------------------------------------------------------
/**
 * B5, and the check the whole slice has been deferring to since B1.
 *
 * ⛔⛔ **`ROWS_AWAITING_NOW` is a hand-maintained list, and §21d only asserts it
 * is well-formed.** Nothing yet proved the thing it claims: that every row NOT
 * on it actually behaves differently on the two sides. A toggle that moved and
 * changed nothing on seven of twelve rows would pass every check written so far
 * and would be demonstrated as an answer.
 *
 * So: drive every mode-sensitive rule in the app over the whole seed, twice per
 * row — once on each side — and compare. The list and the fingerprint are
 * computed from completely different places: one is a line someone wrote, the
 * other is the rules themselves run over 63 seeded rides. They have to agree.
 *
 * ⭐ This is "the running app" as far as a gate can reach it: not greps, not
 * restatements, but the same functions the screens call, with the same inputs.
 */

/**
 * Every mode-sensitive surface, as one comparable string.
 *
 * ⚠️ `modeFor` is applied first, exactly as the provider does — a one-sided row
 * cannot be put on a side it does not have, and a fingerprint that ignored that
 * would be measuring a state the app cannot enter.
 */
function surfaceFingerprint(row: Solution, wanted: DemoMode): Record<string, string> {
  const focus = demoFocus(row.id, modeFor(row, wanted));
  const out: Record<string, string> = {};

  // The thirteen gates, by name.
  for (const gate of GATES) out[`gate:${gate.name}`] = String(gate.shown(focus));

  // Rows 01 and 02 — the no-show treatment of every seeded ride.
  out["no-show"] = ALL_SEEDED.map((trip) => {
    const t = treatmentFor(trip, focus);
    return `${t.copy}/${t.showTimer}/${t.offerForm}/${t.pickupTimeGate}`;
  }).join("|");

  // Row 13 — the send-back path of every seeded ride.
  out["send-back"] = ALL_SEEDED.map((trip) => sendBackSteps(trip, focus).join(">")).join("|");

  // Row 16 — the sheet production shows when the rider declines.
  const sheet = declinedSheetFor(focus);
  out["declined"] = `${sheet.primaryLabel}>${sheet.primaryGoesTo}`;

  // Row 10 — the Request Feed's member filter, and what survives it.
  out["member-filter"] =
    `${showsMemberFilter(focus)}/${applicableFilters({ member: "AMARA OKONKWO" }, focus).member ?? "none"}`;

  // Row 03 — where a swipe tap goes, and whether production's block is lifted.
  out["swipe"] = (["pick-up", "drop-off"] as const)
    .flatMap((nextSwipe) =>
      [true, false].map((challenged) =>
        JSON.stringify(
          routeSwipeTap({
            nextSwipe,
            pickupPostponed: false,
            trailChallengesPickup: challenged,
            trailChallengesDropOff: challenged,
            focus,
          }),
        ),
      ),
    )
    .join("|");
  out["unblock"] = String(offeredSwipe("pick-up", true, focus));

  // Row 15 — the Options menu, and rows 04/05 — the Reach Rider options.
  out["options"] = buildOptionsRows(focus).map((r) => `${r.label}:${r.proposed ?? false}`).join("|");
  out["reach"] = [true, false]
    .map((sameDay) => reachOptionsFor(sameDay, focus).map((o) => `${o.label}:${o.proposed ?? false}`).join(","))
    .join("|");

  // Rows 04/05/09/19/20 — the More Options grid.
  out["tiles"] = buildGridTiles(focus).map((t) => t.id).join(",");

  // Where focusing this row lands — rows 11 and 12's `nowEntry` lives here.
  out["route"] = entryRouteFor(row, modeFor(row, wanted));

  return out;
}

/** Which named surfaces differ between the two sides, for this row. */
function changedSurfaces(row: Solution): string[] {
  const now = surfaceFingerprint(row, "now");
  const fixed = surfaceFingerprint(row, "fixed");
  return Object.keys(now).filter((key) => now[key] !== fixed[key]);
}

const SURFACE_COUNT = Object.keys(surfaceFingerprint(SOLUTIONS[0], "now")).length;
const EXPECTED_SURFACES = GATES.length + 10;
check(
  "the fingerprint covers every mode-sensitive surface in the app",
  `${SURFACE_COUNT} surface(s) — ${GATES.length} gate(s) + 10 rule(s), over ${ALL_SEEDED.length} seeded ride(s)`,
  SURFACE_COUNT === EXPECTED_SURFACES && ALL_SEEDED.length > 50,
);

/* --- 28a. Every built row really does change ---------------------------- */
const rowChanges = new Map<string, string[]>(
  SOLUTIONS.map((row) => [row.id, changedSurfaces(row)]),
);
const builtUnchanged = builtRows.filter((row) => rowChanges.get(row.id)!.length === 0);
check(
  "⭐⭐ every built row behaves differently on the two sides",
  builtUnchanged.length
    ? `DECORATIVE on ${builtUnchanged.length} of ${builtRows.length}: ${builtUnchanged.map((r) => `${r.order} ${r.id}`).join(", ")}`
    : `${builtRows.length} of ${builtRows.length} built row(s) change something`,
  builtUnchanged.length === 0 && builtRows.length === 12,
);
/**
 * ⛔⛔ **The measurement against the list.** `ROWS_AWAITING_NOW` is a line
 * someone maintains by hand; this set is the rules run over the seed. The two
 * are computed from nothing in common, and they have to name the same rows.
 *
 * ⚠️ This is the direction §21d could not check. There it compared the list to
 * a literal copy of itself; here it is compared to the app's behaviour.
 */
const awaitingDrift12 = [
  ...ROWS_AWAITING_NOW.filter((id) => !builtUnchanged.some((r) => r.id === id)).map((id) => `-${id}`),
  ...builtUnchanged.map((r) => `+${r.id}`),
];
check(
  "...and the rows that do NOT are exactly the ones the app says are awaiting one",
  awaitingDrift12.length
    ? `DRIFT: ${awaitingDrift12.join(" ")}`
    : `${ROWS_AWAITING_NOW.length} awaiting, ${builtUnchanged.length} measured as unchanged — they agree`,
  awaitingDrift12.length === 0,
);

/* --- 28b. ...and the rows that should NOT change, don't ----------------- */
/**
 * ⛔⛔ **The non-vacuity half, and it is not optional.** A fingerprint that
 * changed for every row would pass 28a while proving nothing — it would mean
 * some gate was keyed on the mode rather than on the row, so picking ANY row
 * and flipping would move the app. Fourteen rows own no proposal that is built;
 * nothing may move for them.
 */
const unbuiltRows = SOLUTIONS.filter((row) => row.buildState !== "in-prototype");
const unbuiltThatMoved = unbuiltRows.filter((row) => rowChanges.get(row.id)!.length > 0);
check(
  "...while a row with nothing built changes nothing at all",
  unbuiltThatMoved.length
    ? `MOVED: ${unbuiltThatMoved.map((r) => `${r.order} ${r.id} (${rowChanges.get(r.id)!.join(", ")})`).join("; ")}`
    : `0 of ${unbuiltRows.length} unbuilt row(s) move`,
  unbuiltThatMoved.length === 0 && unbuiltRows.length === 14,
);
/**
 * ⛔ And the plain mirror is on no side at all, so it cannot move either. This
 * is the fifth guard's inversion, measured rather than argued: `null` means
 * "show everything", and it means that on both readings of the mode.
 */
const mirrorNow = GATES.map((g) => `${g.name}:${g.shown(demoFocus(null, "now"))}`).join("|");
const mirrorFixed = GATES.map((g) => `${g.name}:${g.shown(demoFocus(null, "fixed"))}`).join("|");
check(
  "...and the plain mirror is the same on both readings, because it is on neither side",
  mirrorNow === mirrorFixed
    ? `${GATES.length} gate(s) identical with no focus`
    : "THE MODE LEAKS INTO THE PLAIN MIRROR",
  mirrorNow === mirrorFixed,
);

/* --- 28c. What each row actually changes -------------------------------- */
/**
 * ⭐ The artifact. A row that changes exactly one thing is worth looking at —
 * it may be a tile moving while the feature it is about stays put, which is the
 * half-truth row 10 sat in until B3d. Printed rather than asserted, because the
 * right number varies by row; the ASSERTION is that none of them is zero.
 */
for (const row of builtRows) {
  const changed = rowChanges.get(row.id)!;
  check(
    `  row ${String(row.order).padStart(2, "0")} ${row.id}`,
    `${changed.length} surface(s): ${changed.join(", ")}`,
    changed.length > 0,
  );
}
/**
 * ⛔ Non-vacuity for the fingerprint itself: the surfaces have to be reached by
 * more than one row between them. If every built row moved the same single
 * surface, the fingerprint would be measuring one gate and calling it twelve.
 */
const surfacesTouched = new Set(builtRows.flatMap((row) => rowChanges.get(row.id)!));
check(
  "...and between them the built rows move many different surfaces, not one",
  `${surfacesTouched.size} of ${SURFACE_COUNT} surface(s) move for at least one row`,
  surfacesTouched.size >= 10,
);
/**
 * ⛔⛔ **And the surfaces that move for NOBODY are named.** A line in the
 * fingerprint that can never vary contributes nothing and quietly inflates the
 * denominator above — which is the shape of a check measuring less than it
 * says. There is exactly one, and it has a reason.
 *
 * `route` is `entryRouteFor`, which differs between the two sides only for a
 * row carrying BOTH an `entry` and a `nowEntry`. No row does today: rows 11 and
 * 12 have a `nowEntry` and no `entry`, so they land in the same place on either
 * reading. It stays in the fingerprint so that the first row to carry both is
 * measured rather than assumed — but it is declared inert until then.
 */
const INERT_SURFACES = ["route"];
const allSurfaces = Object.keys(surfaceFingerprint(SOLUTIONS[0], "now"));
const inertDrift = [
  ...INERT_SURFACES.filter((k) => surfacesTouched.has(k)).map((k) => `+${k}`),
  ...allSurfaces.filter((k) => !surfacesTouched.has(k) && !INERT_SURFACES.includes(k)).map((k) => `-${k}`),
];
check(
  "...and the one surface that moves for nobody is declared, with a reason",
  inertDrift.length
    ? `DRIFT: ${inertDrift.join(" ")}`
    : `${INERT_SURFACES.length} inert — ${INERT_SURFACES.join(", ")}; ` +
      `${surfacesTouched.size} live of ${allSurfaces.length}`,
  inertDrift.length === 0 &&
    // ⚠️ ...and `route` is inert for the reason claimed, not by accident.
    SOLUTIONS.filter((row) => row.entry && row.nowEntry).length === 0,
);


// ---------------------------------------------------------------------------
console.log("\n29. One heading, and the case is the first answer under it");
// ---------------------------------------------------------------------------
/**
 * ⛔⛔ **The sheet used to be named after the case it was showing.**
 *
 * It took the chosen issue's LABEL as its heading and printed that issue's
 * purpose line beneath it, then a tinted callout, and only then the first
 * question. So the driver read what the form was for three times before
 * answering anything — and the heading changed depending on which flow opened
 * the sheet, on a form that is always the same form.
 *
 * Which case this is, is an ANSWER. It is the first field. (User direction,
 * 2026-10-14.)
 */
const HEADING_SHEET_SRC = codeOnly(readFileSync(join(ROOT, "components/support/support-form-sheet.tsx"), "utf8"));
check(
  "the heading is one declared constant",
  `"${SUPPORT_FORM_TITLE}"`,
  SUPPORT_FORM_TITLE === "Wingz Support Form",
);
check(
  "...and the sheet takes it from there, not from the case or the issue",
  `SUPPORT_FORM_TITLE ${(HEADING_SHEET_SRC.match(/SUPPORT_FORM_TITLE/g) ?? []).length}x, getIssueLabel ${(HEADING_SHEET_SRC.match(/getIssueLabel/g) ?? []).length}x, activeCase.title ${(HEADING_SHEET_SRC.match(/activeCase\.title/g) ?? []).length}x`,
  /const title = SUPPORT_FORM_TITLE;/.test(HEADING_SHEET_SRC) &&
    !/getIssueLabel/.test(HEADING_SHEET_SRC) &&
    !/activeCase\.title/.test(HEADING_SHEET_SRC),
);
/**
 * ⛔ The preamble between the heading and the first question is gone — both
 * halves of it. Asserted as ABSENT from the code, with comments stripped,
 * because this file documents removals in comments right beside the code that
 * performs them.
 */
check(
  "nothing renders between the heading and the fields",
  `description ${/\{description\}/.test(HEADING_SHEET_SRC) ? "STILL THERE" : "gone"}, callout ${/callout/i.test(HEADING_SHEET_SRC) ? "STILL THERE" : "gone"}`,
  !/\{description\}/.test(HEADING_SHEET_SRC) && !/callout/i.test(HEADING_SHEET_SRC),
);

/**
 * ⭐ And the field that replaced it is FIRST, in every case the app can build.
 *
 * ⚠️ Driven over real cases rather than grepped: the field order is assembled
 * per case, so a case that quietly put something above the issue would read
 * fine in the registry and wrong on screen.
 */
const HEADING_CASES: Array<{ why: string; built: ReturnType<typeof buildSupportFormCase> }> = [
  { why: "cannot reach member", built: buildSupportFormCase({ includeIssues: [ISSUE_CANNOT_REACH_MEMBER] }) },
  { why: "auto-assign request", built: buildSupportFormCase({ includeIssues: [ISSUE_AUTO_ASSIGN_REQUEST], autoAssign: true }) },
  { why: "send-back reason", built: buildSupportFormCase({ includeIssues: [ISSUE_SEND_BACK_REASON], sendBack: true }) },
  { why: "rider no-show", built: buildSupportFormCase({ askNoShowType: true, askSignature: true }) },
  { why: "rider declined", built: buildSupportFormCase({ includeIssues: [ISSUE_RIDER_DECLINED], riderDeclined: { legOptions: [] } }) },
];
const notFirst = HEADING_CASES.filter((c) => c.built.fields[0]?.id !== "issue");
check(
  "Issue type is the first field of every case",
  notFirst.length
    ? notFirst.map((c) => `${c.why} → ${c.built.fields[0]?.id}`).join(", ")
    : `${HEADING_CASES.length} of ${HEADING_CASES.length} cases, each ${HEADING_CASES[0].built.fields.length}+ fields`,
  notFirst.length === 0 && HEADING_CASES.length === 5,
);

// ---------------------------------------------------------------------------
console.log("\n30. One context block — trip, then the leg being filed against");
// ---------------------------------------------------------------------------
/**
 * ⛔⛔ It was one flat card whose rows mixed the two — rider and client beside a
 * leg id and a pick-up time — so nothing said which facts belonged to the trip
 * and which to the leg being reported on. Two titled sections, trip first, the
 * same on every form. (User direction, 2026-10-14.)
 *
 * ⚠️ Driven over EVERY selectable leg, because the block is assembled per leg
 * and the interesting cases are the minority: 4 legs of 21 belong to a round
 * trip, and 3 have no drop-off stop at all.
 */
const CONTEXT_LEGS = getLegOptions("all");
const EXPECTED_CONTEXT_LEGS = 21;
check(
  "the context sweep covers every selectable leg",
  `${CONTEXT_LEGS.length} of ${EXPECTED_CONTEXT_LEGS}`,
  CONTEXT_LEGS.length === EXPECTED_CONTEXT_LEGS,
);

/** ⛔ The six rows the leg section carries, in order, on every leg. */
const EXPECTED_LEG_ROWS = 6;
const wrongShape = CONTEXT_LEGS.filter((option) => {
  const rows = tripContextFor(option).legRows;
  return (
    rows.length !== EXPECTED_LEG_ROWS ||
    rows[0].label !== "Leg ID" ||
    rows[1].label !== "Status" ||
    rows[3].label !== "Pick-up location" ||
    rows[5].label !== "Drop-off location"
  );
});
check(
  "every leg renders the same six rows, in the same order",
  wrongShape.length
    ? wrongShape.slice(0, 3).map((o) => o.legId).join(", ")
    : `${CONTEXT_LEGS.length} of ${CONTEXT_LEGS.length} legs, ${EXPECTED_LEG_ROWS} rows each`,
  wrongShape.length === 0,
);
/** ⛔ And no row is ever blank — an absent fact is SAID. */
const blanks = CONTEXT_LEGS.filter((option) =>
  tripContextFor(option).legRows.some((row) => !row.value.trim()),
);
check(
  "no row is ever empty",
  blanks.length ? blanks.slice(0, 3).map((o) => o.legId).join(", ") : `0 of ${CONTEXT_LEGS.length} legs`,
  blanks.length === 0,
);

/**
 * ⛔⛔ Three seeded trips have no drop-off stop. Those rows are marked absent
 * and say so; they are NOT dropped, or the block would stop being the same
 * block on every form — which is the whole point of standardising it.
 */
const EXPECTED_ABSENT_LEGS = 3;
const withAbsent = CONTEXT_LEGS.filter((option) =>
  tripContextFor(option).legRows.some((row) => row.absent),
);
check(
  "a trip with no drop-off stop says so, rather than rendering blank",
  `${withAbsent.length} of ${CONTEXT_LEGS.length} legs — ${withAbsent.map((o) => o.legId).join(", ")}`,
  withAbsent.length === EXPECTED_ABSENT_LEGS &&
    withAbsent.every((o) =>
      tripContextFor(o).legRows
        .filter((r) => r.absent)
        .every((r) => r.value === NOT_ON_THIS_TRIP),
    ),
);
/** ⚠️ ...and the majority do carry one, so the check above is not the rule. */
check(
  "...while most legs carry a real drop-off",
  `${CONTEXT_LEGS.length - withAbsent.length} of ${CONTEXT_LEGS.length} legs have both drop-off rows`,
  CONTEXT_LEGS.length - withAbsent.length > withAbsent.length,
);

/**
 * ⭐ The Legs list is the ROUND TRIP, which is the reading `trip-groups.ts`
 * settles: the "leg" that has its own id, revenue and swipe state is a separate
 * `Trip` sharing a `tripGroup`. The other reading — every row of `Trip.legs` —
 * would list the Appointment Time row as a leg, and `leg-options` is explicit
 * that a destination is not something a form can be filed against.
 */
const EXPECTED_GROUPED_LEGS = 4;
const grouped = CONTEXT_LEGS.filter((o) => contextLegs(o).length > 1);
check(
  "the Legs list shows the round trip, not just this record",
  `${grouped.length} of ${CONTEXT_LEGS.length} legs list a sibling — ${grouped.map((o) => o.legId).join(", ")}`,
  grouped.length === EXPECTED_GROUPED_LEGS,
);
/**
 * ⛔ **Sorted by leg letter.** Found by driving this: `groupMembers` returns
 * POOL order, so the round trip came back B then A — telling the driver the
 * return happened first.
 */
const misordered = grouped.filter((o) => {
  const codes = contextLegs(o).map((l) => l.legCode ?? "");
  return codes.join("") !== [...codes].sort().join("");
});
check(
  "...in leg order, not pool order",
  misordered.length
    ? misordered.map((o) => `${o.legId}: ${contextLegs(o).map((l) => l.legCode).join("")}`).join(", ")
    : grouped.map((o) => contextLegs(o).map((l) => l.legCode).join("")).join(" "),
  misordered.length === 0,
);
/** ⛔ Exactly one leg is marked current, on every leg, grouped or not. */
const badCurrent = CONTEXT_LEGS.filter(
  (o) => contextLegs(o).filter((l) => l.current).length !== 1,
);
check(
  "exactly one leg is marked as the one being filed against",
  badCurrent.length ? badCurrent.slice(0, 3).map((o) => o.legId).join(", ") : `${CONTEXT_LEGS.length} of ${CONTEXT_LEGS.length}`,
  badCurrent.length === 0,
);

/** ⛔ The component decides how it looks and nothing about what it says. */
const BANNER_SRC = codeOnly(readFileSync(join(ROOT, "components/support/trip-summary-banner.tsx"), "utf8"));
check(
  "the block reads every value from the rule",
  `tripContextFor ${(BANNER_SRC.match(/tripContextFor/g) ?? []).length}x`,
  /tripContextFor\(option\)/.test(BANNER_SRC) &&
    !/trip\.rider/.test(BANNER_SRC) &&
    !/leg\.address/.test(BANNER_SRC),
);

// ---------------------------------------------------------------------------
console.log(
  failures === 0
    ? "\n✅ verify-solutions: all checks passed\n"
    : `\n❌ verify-solutions: ${failures} check(s) failed\n`,
);
process.exit(failures === 0 ? 0 : 1);
