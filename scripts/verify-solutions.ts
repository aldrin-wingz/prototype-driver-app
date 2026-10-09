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
  CANNOT_REACH_LEAVES_TRIP_UNCONFIRMED,
  CONTACT_CHANNELS,
  contactOptionsFor,
  MAX_OUTCOME_LABEL_CHARS,
  REACH_OUTCOMES,
} from "../lib/driver-data/reach-attempt";
import { reachOptionsFor } from "../components/driver/reach-rider-modal";
import { buildSupportFormCase } from "../lib/support-data/case-registry";
import { ISSUE_CANNOT_REACH_MEMBER } from "../lib/support-data/issue-types";
import { getLegOptions } from "../lib/support-data/leg-options";
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
 * ⚠️ Declared, not derived. TWO slices have two branches each and a selector
 * that reached only one branch would demonstrate half the case while looking
 * complete:
 *   - Rider No-Show — the driver is at the pick-up, or they are not.
 *   - Can't Reach Member (row 04) — the STANDARD confirmation modal, whose third
 *     option changes nothing, and the SAME-DAY one, whose third option advances
 *     the trip. Those are different alternatives for the proposal to beat.
 */
const EXPECTED_ALTERNATES = 2;
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
const EXPECTED_SCENARIO_RIDES = 6;
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
const EXPECTED_ENTRY_ROUTES = 7;
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
check(
  "...and exactly one tile was added, outside that list",
  `cannot-reach in production list: ${tileBlock.includes('id: "cannot-reach"')}`,
  !tileBlock.includes('id: "cannot-reach"') &&
    REACH_SOURCES.more.includes('id: "cannot-reach"'),
);
/**
 * ⛔ Send Back Trip stays LAST and stays full-width. It is the destructive
 * action; a proposal that pushed it out of the position the capture gives it
 * would be this slice rearranging production to make room for itself.
 */
check(
  "Send Back Trip is still last and still full-width",
  "CANNOT_REACH_TILE inserted above send-back",
  /\[CANNOT_REACH_TILE, \{ \.\.\.tile, fullWidth: true \}\]/.test(REACH_SOURCES.more),
);

// ---------------------------------------------------------------------------
console.log(
  failures === 0
    ? "\n✅ verify-solutions: all checks passed\n"
    : `\n❌ verify-solutions: ${failures} check(s) failed\n`,
);
process.exit(failures === 0 ? 0 : 1);
