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

import { existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  CATEGORIZED_CALLS,
  COVERED_CALLS,
  SOLUTIONS,
  subjectAreaGroups,
  type SolutionClass,
} from "../lib/solutions/catalogue";
import { splitUseCase } from "../components/solutions-dev/use-case-flow";
import {
  isScenarioFor,
  pillsFor,
  ridesForSolution,
  scenarioRides,
} from "../lib/solutions/scenario-rides";
import {
  mockRequestTrips,
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
 * ⚠️ Declared, not derived. Rider No-Show is two branches of one check — the
 * driver is at the pick-up or they are not — and a selector that reached only
 * one of them would demonstrate half the case while looking complete.
 */
const EXPECTED_ALTERNATES = 1;
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
const EXPECTED_SCENARIO_RIDES = 4;
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
    const id = route.split("/")[2];
    const trip = ALL_SEEDED.find((t) => t.id === id);
    entryChecked += 1;
    if (!trip || !isScenarioFor(trip, solution.id)) entryMismatches += 1;
  }
}
check(
  "every entry route lands on a ride tagged for that row",
  `${entryMismatches} mismatch(es) of ${entryChecked} route(s)`,
  entryMismatches === 0,
);
/** Declared, because a route silently skipped is a check that stops checking. */
const EXPECTED_ENTRY_ROUTES = 4;
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
};
for (const [id, expected] of Object.entries(EXPECTED_IN_PROGRESS)) {
  const shown = ridesForSolution(inProgress, id);
  check(
    `focusing ${id} shows ${expected} In Progress ride(s)`,
    `${shown.length} of ${inProgress.length} — ${shown.map((t) => t.scenario?.code).join(", ")}`,
    shown.length === expected,
  );
}
check(
  "every built row's ride count was declared",
  `${Object.keys(EXPECTED_IN_PROGRESS).length} declared of ${builtRows.length} built`,
  Object.keys(EXPECTED_IN_PROGRESS).length === builtRows.length,
);
/** The filter must actually REMOVE something, or it is decorative. */
check(
  "focusing genuinely narrows the list",
  `${ridesForSolution(inProgress, "missed-swipe").length} of ${inProgress.length}`,
  ridesForSolution(inProgress, "missed-swipe").length < inProgress.length,
);
/** A row with no scenario ride shows an empty list rather than everything. */
check(
  "focusing an unbuilt row shows no rides, not all of them",
  `${ridesForSolution(inProgress, "tag-number-invalid").length} of ${inProgress.length}`,
  ridesForSolution(inProgress, "tag-number-invalid").length === 0,
);

// ---------------------------------------------------------------------------
console.log(
  failures === 0
    ? "\n✅ verify-solutions: all checks passed\n"
    : `\n❌ verify-solutions: ${failures} check(s) failed\n`,
);
process.exit(failures === 0 ? 0 : 1);
