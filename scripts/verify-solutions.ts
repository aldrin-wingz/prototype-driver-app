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
import { ISSUE_SEND_BACK_REASON } from "../lib/support-data/issue-types";
import { getMemberOptions, MEMBER_WINDOW_DAYS } from "../lib/support-data/member-options";
import { areRequiredFieldsFilled, isFieldVisible } from "../lib/support/field-rules";
import { solutionHref } from "../lib/solutions/solution-context";
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
 */
const EXPECTED_ALTERNATES = 6;
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
const EXPECTED_SCENARIO_RIDES = 13;
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

/** Every row that claims to be built must be demonstrable from the ride list. */
const unbacked = builtRows.filter(
  (solution) => !tagged.some((trip) => isScenarioFor(trip, solution.id)),
);
check(
  "every in-prototype row has at least one scenario ride",
  `${unbacked.length} unbacked of ${builtRows.length} built row(s)`,
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
const EXPECTED_RIDE_ROUTES = 12;
const EXPECTED_SURFACE_ROUTES = 2;
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
};
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
check(
  "every built row's ride count was declared, in one tab or the other",
  `${declaredRows.size} declared of ${builtRows.length} built`,
  declaredRows.size === builtRows.length &&
    builtRows.every((row) => declaredRows.has(row.id)),
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
const standard = reachOptionsFor(false);
const sameDay = reachOptionsFor(true);
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
const PROPOSED_TILE_IDS = ["cannot-reach", "auto-assign"];
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
    // Nothing focused: no filtering, so both proposals show. Nine tiles — odd.
    focus: null,
    tiles: [
      "map-pickup", "map-dropoff", "call", "email-support", "calendar",
      "auto-assign", "no-show", "cannot-reach", "send-back",
    ],
    fullWidth: "send-back",
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
  const grid = buildGridTiles(focus);
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
  const grid = buildGridTiles(focus);
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
  EXPECTED_GRIDS.map((g) => `${g.focus ?? "none"}=${buildGridTiles(g.focus).length}`).join(" "),
  EXPECTED_GRIDS.some(({ focus }) => buildGridTiles(focus).length % 2 === 1) &&
    EXPECTED_GRIDS.some(({ focus }) => buildGridTiles(focus).length % 2 === 0),
);

/**
 * ⛔⛔ **A proposal never appears under another build's focus**, swept over
 * EVERY built row rather than the few declared above — that is the user's rule
 * and the sweep is what makes it a rule rather than four examples.
 */
let tileSweep = 0;
let tileLeaks = 0;
for (const row of builtRows) {
  const ids = buildGridTiles(row.id).map((t) => t.id);
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
  builtRows.some((r) => buildGridTiles(r.id).some((t) => PROPOSED_TILE_IDS.includes(t.id))) &&
    builtRows.some((r) => !buildGridTiles(r.id).some((t) => PROPOSED_TILE_IDS.includes(t.id))),
);
/**
 * ⚠️ Every production tile still appears under every focus. The superseded rule
 * protected their COLUMN; nothing ever licensed removing one.
 */
const droppedProduction = builtRows.filter(
  (row) =>
    !productionTileIds.every((id) => buildGridTiles(row.id).some((t) => t.id === id)),
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
const adoptGuarded = /if \(pendingFocus\.current\) return;/.test(CONTEXT_SRC);
const mirrorGuarded = /if \(pendingFocus\.current\) \{/.test(CONTEXT_SRC);
const focusClaims = focusBody.includes("pendingFocus.current =");
check(
  "the adopt effect stands down mid-switch",
  `guard present: ${adoptGuarded}`,
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
};
check(
  "every built row declares the tab it lands on",
  `${Object.keys(EXPECTED_LANDING_TAB).length} declared of ${built.length} built`,
  Object.keys(EXPECTED_LANDING_TAB).length === built.length &&
    built.every((row) => row.id in EXPECTED_LANDING_TAB),
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
    args: { trip: ASK_TRIP, activeSolutionId: "auto-assign-request", suppressedMembers: [] },
    expect: true,
  },
  {
    name: "row 10 focused — same build, so still asked",
    args: { trip: ASK_TRIP, activeSolutionId: "request-feed-member-filter", suppressedMembers: [] },
    expect: true,
  },
  {
    name: "nothing focused — the plain mirror filters nothing",
    args: { trip: ASK_TRIP, activeSolutionId: null, suppressedMembers: [] },
    expect: true,
  },
  {
    name: "another prototype focused — a proposal stays in its own build",
    args: { trip: ASK_TRIP, activeSolutionId: "missed-swipe", suppressedMembers: [] },
    expect: false,
  },
  {
    name: "the member opted out",
    args: { trip: ASK_TRIP, activeSolutionId: null, suppressedMembers: [ASK_TRIP.rider] },
    expect: false,
  },
  {
    name: "a DIFFERENT member opted out — this one is still asked",
    args: { trip: ASK_TRIP, activeSolutionId: null, suppressedMembers: ["SOMEONE ELSE"] },
    expect: true,
  },
  {
    name: "a multi-load — no one member to have a preference",
    args: { trip: GROUP_TRIP, activeSolutionId: null, suppressedMembers: [] },
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

// ---------------------------------------------------------------------------
console.log(
  failures === 0
    ? "\n✅ verify-solutions: all checks passed\n"
    : `\n❌ verify-solutions: ${failures} check(s) failed\n`,
);
process.exit(failures === 0 ? 0 : 1);
