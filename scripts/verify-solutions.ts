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
  COVERED_CALLS,
  findSolution,
  SOLUTION_HOME,
  SOLUTIONS,
  subjectAreaGroups,
  type SolutionClass,
} from "../lib/solutions/catalogue";
import { splitUseCase } from "../components/solutions-dev/use-case-flow";
import { mergedRunCounts, tableRows } from "../lib/solutions/table-shape";
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
  ISSUE_AUTO_ASSIGN_REQUEST,
  ISSUE_CANNOT_REACH_MEMBER,
  SUPPORT_ISSUE_TYPES,
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
  PREFERRED_DRIVER_SOLUTIONS,
  shouldAskPreferredDriver,
} from "../lib/driver-data/member-assignment";
import { buildAutoAssignRequest } from "../components/support/auto-assign-request-form";
import { buildSendBackReason } from "../components/support/send-back-reason-form";
import {
  CS_TOOL_DRIVER_INITIATED_REASONS,
  dedupedDriverInitiatedReasons,
  DRIVER_ANSWERABLE_REASONS,
  isShortNoticeSendBack,
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
  DEMO_MODES,
  demoFocus,
  showsProposal,
  type DemoFocus,
  type DemoMode,
} from "../lib/solutions/demo-mode";
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
const EXPECTED_ALTERNATES = 10;
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
  const fields = [s.problem, s.useCase, s.proposedFeature, s.noSurfaceReason ?? "", s.entry?.label ?? ""];
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
const EXPECTED_SCENARIO_RIDES = 20;
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
const EXPECTED_SURFACE_ROUTES = 3;
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
check(
  "...and the feed actually applies it",
  "filterRequestsByMember",
  ASSIGN_SOURCES.feed.includes("filterRequestsByMember(result, appliedFilters.member)"),
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
  `${sendBackSteps(SHORT).join(" → ")} | ${sendBackSteps(ADVANCE).join(" → ")}`,
  sendBackSteps(SHORT).includes("penalty") &&
    !sendBackSteps(ADVANCE).includes("penalty"),
);
check(
  "the reason step sits BEFORE the penalty step, not after it",
  sendBackSteps(SHORT).join(" → "),
  sendBackSteps(SHORT).indexOf("reason") < sendBackSteps(SHORT).indexOf("penalty"),
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
    [SHORT, ADVANCE, SO_RIDE].every((t) => sendBackSteps(t).includes("confirm")),
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
  const actual = sendBackSteps(row.trip);
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
  STEP_MATRIX.map((r) => `${r.name}:${sendBackSteps(r.trip)[0]}`).join(" "),
  STEP_MATRIX.every((r) => sendBackSteps(r.trip)[0] === "reason"),
);
const both = sendBackSteps({ ...SO_RIDE, sameDay: true });
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
  STEP_MATRIX.map((r) => sendBackSteps(r.trip).slice(0, 2).join("+")).join(" "),
  STEP_MATRIX.every(
    (r) =>
      sendBackSteps(r.trip)[0] === "reason" &&
      sendBackSteps(r.trip)[1] === "confirm",
  ),
);
check(
  "...and the penalty warning is always last when it appears",
  STEP_MATRIX.filter((r) => sendBackSteps(r.trip).includes("penalty"))
    .map((r) => sendBackSteps(r.trip).join(" → "))
    .join(" | "),
  STEP_MATRIX.filter((r) => sendBackSteps(r.trip).includes("penalty")).every(
    (r) => sendBackSteps(r.trip).at(-1) === "penalty",
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
check(
  "Send Back Trip is intercepted in the grid handler, and returns",
  `branch present: ${gridHandler.includes('if (id === "send-back")')}`,
  /if \(id === "send-back"\)[\s\S]{0,900}setSendBackReasonOpen\(true\);[\s\S]{0,60}return;/.test(
    gridHandler,
  ),
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
check(
  "...and row 15 no longer claims the sign-in route as a demo",
  `${ROW_15_ROUTES.length} route(s): ${ROW_15_ROUTES.join(", ")}`,
  ROW_15_ROUTES.length === 1 && ROW_15_ROUTES[0] === "/options/account",
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
  "row 15 is in the prototype, demonstrated from the signed-in half",
  `${ROW_15.buildState} · ${ROW_15.entry?.route}`,
  ROW_15.buildState === "in-prototype" &&
    ROW_15.entry?.route === "/options/account" &&
    (ROW_15.entry?.alternates ?? []).length === 0,
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
check(
  "the declined sheet renders the 2026 copy",
  "DECLINED_TITLE + DECLINED_BODY",
  /\{DECLINED_TITLE\}/.test(modalCode) && /\{DECLINED_BODY\}/.test(modalCode),
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
  `${DECLINED_WALK_BACK}`,
  /\{DECLINED_WALK_BACK\}/.test(modalCode) &&
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
const MOVED_OFF_STRIP = ["clear", "alternates", "noSurfaceReason", "entry.label"] as const;
const notMoved = MOVED_OFF_STRIP.filter((needle) =>
  needle === "entry.label" ? !tableSrc.includes("entry.label") : !tableSrc.includes(needle),
);
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
console.log("\n20. Now / Fixed — one rule, named once, and not yet reachable");
// ---------------------------------------------------------------------------
/**
 * B1 of the "what happens now" slice. The mode does not exist in the UI yet:
 * `solution-context.tsx` pins it to `"fixed"`, which is the side the app has
 * shown since Phase 1. So the claim these checks have to make falsifiable is a
 * narrow one — **the rule is named once, every gate reads that one name, and
 * nothing the driver sees has moved.**
 *
 * ⛔ The 290 checks above are the other half of that claim. They all run with
 * the mode pinned to `"fixed"` via `FIXED()`, so any behaviour that shifted in
 * the refactor fails there, not here.
 */

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
/** ⛔ `"now"` is declared but deliberately unreachable until B2. Say so. */
check(
  "...and the mode the app will LAND on is declared but not yet wired",
  `DEFAULT_DEMO_MODE = ${DEFAULT_DEMO_MODE}, hardwired in the provider = fixed`,
  DEFAULT_DEMO_MODE === "now" && DEMO_MODES.length === 2,
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
    GATES.length === 12,
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
check(
  "with the mode pinned to fixed, every gate answers what it answered before B1",
  movedBehaviour.length
    ? `MOVED: ${movedBehaviour.join("; ")}`
    : `${PRE_B1.length * 3} of ${PRE_B1.length * 3} declared answer(s) unchanged`,
  movedBehaviour.length === 0 && PRE_B1.length === GATES.length,
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
  "the app constructs a DemoFocus in exactly one place",
  `${focusBuilders.length} construction(s) across ${APP_FILES.length} file(s): ${[...new Set(focusBuilders)].join(", ") || "none"}`,
  focusBuilders.length === 1 &&
    focusBuilders[0] === join("lib", "solutions", "solution-context.tsx"),
);

// ---------------------------------------------------------------------------
console.log(
  failures === 0
    ? "\n✅ verify-solutions: all checks passed\n"
    : `\n❌ verify-solutions: ${failures} check(s) failed\n`,
);
process.exit(failures === 0 ? 0 : 1);
