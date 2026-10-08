/**
 * Gate 2 for `prototype/driver-app-base`.
 *
 * This repo has no test framework, so this script is the assertion gate. It
 * guards the two things the base exists to guarantee:
 *
 *   1. the base carries only SHIPPED behaviour — no feature namespace leaks in
 *   2. every Ride Details phase is reachable from the seed
 *
 * ⚠️ EVERY CHECK REPORTS A DENOMINATOR. A matcher that matches nothing and a
 * matcher that is merely rarely satisfied look identical from a pass/fail bit,
 * so a check that cannot say how many things it looked at is not evidence. Each
 * `check` below prints its own count, and a count of zero where one is expected
 * is itself a failure.
 *
 * Run: bun run verify
 */

import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  PLANNER_COPY, SEEDED_TRIP_DAY_OFFSET, addDays, axisLabel, axisTicks, blockWindow,
  dailySummary, dateNavState, formatClock, plannerDateLabel, plannerDayFor,
} from "../lib/driver-data/planner";
import {
  DEFAULT_RIDE_HISTORY_FILTER, RIDE_HISTORY_FILTERS, applyRideHistoryFilter,
  isLateTrip, isMissingSignature,
} from "../lib/driver-data/ride-history";
import {
  APP_VERSION, DRIVER_NAME, INSTALL_ID_PLACEHOLDER, OPTIONS_ROWS,
} from "../lib/driver-data/options-menu";
import {
  BANNER, DEFAULT_DETENT, EXPOSED_PCT, SORT_OPTIONS, countLine, groupByPickupDay,
  isWillCall, pinPosition, sortTrips, visibleTrips,
} from "../lib/driver-data/map-view";
import {
  getLegStage,
  getNextSwipe,
  mockRequestTrips,
  mockNeedsActionTrips,
  mockUpcomingTrips,
  mockInProgressTrips,
  mockCompletedTrips,
  type Trip,
  type LegSwipeStage,
} from "../lib/driver-data/mock-trips";

// ⚠️ fileURLToPath, not URL.pathname — the vault path contains spaces, which
// pathname percent-encodes into a directory that does not exist.
const SELF = fileURLToPath(import.meta.url);
const ROOT = dirname(dirname(SELF));
let failures = 0;

function check(label: string, detail: string, ok: boolean) {
  console.log(`${ok ? "  ok  " : "  FAIL"} ${label} — ${detail}`);
  if (!ok) failures++;
}

function sourceFiles(): string[] {
  const out: string[] = [];
  const skip = new Set(["node_modules", ".next", ".git", "references", "public"]);
  (function walk(dir: string) {
    for (const entry of readdirSync(dir)) {
      if (skip.has(entry)) continue;
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      // The verifier names every forbidden pattern, so scanning it finds itself.
      else if (/\.tsx?$/.test(entry) && full !== SELF) out.push(full);
    }
  })(ROOT);
  return out;
}

// ---------------------------------------------------------------------------
console.log("\n1. Feature-namespace boundary");
// ---------------------------------------------------------------------------
// ⚠️ INVERTED ON THIS BRANCH, deliberately.
//
// On `prototype/driver-app-base` the support namespaces are FORBIDDEN, because
// the base carries only shipped behaviour. This is the feature branch that OWNS
// them, so the check is turned around rather than weakened: namespaces belonging
// to OTHER branches stay banned, and ours must be PRESENT. Restore the base's
// lists at fold-in time.
const FORBIDDEN = [
  "@/lib/messages-data",
  "@/components/chat",
  "@/components/dev",
];
const files = sourceFiles();
check("source files scanned", `${files.length} .ts/.tsx files`, files.length > 50);

const offenders: string[] = [];
for (const f of files) {
  const text = readFileSync(f, "utf8");
  for (const ns of FORBIDDEN) {
    if (text.includes(ns)) offenders.push(`${relative(ROOT, f)} -> ${ns}`);
  }
}
check(
  "no other feature's namespace leaks in",
  offenders.length ? offenders.join("; ") : `0 hits across ${FORBIDDEN.length} namespaces`,
  offenders.length === 0,
);

const ORPHANS = ["lib/messages-data", "components/chat", "components/dev"];
const present = ORPHANS.filter((p) => existsSync(join(ROOT, p)));
check(
  "no other feature's directories on disk",
  present.length ? present.join(", ") : `0 of ${ORPHANS.length} present`,
  present.length === 0,
);

/**
 * ⭐ The inverse assertion, and the reason trimming the lists above is not a
 * weakening. These are THIS branch's own namespaces. The expectation is
 * DECLARED here as a literal rather than derived from what happens to sit on
 * disk — a set derived from the thing it checks cannot fail, and a namespace
 * that silently disappeared would otherwise pass vacuously.
 */
const REQUIRED = [
  "lib/support",
  "lib/support-data",
  "components/support",
  "types/support.ts",
  "lib/driver-data/no-show-rules.ts",
  "hooks/use-no-show-clock.ts",
  "app/my-rides/[id]/no-show",
  "lib/solutions",
  "components/solutions-dev",
];
const missingNs = REQUIRED.filter((p) => !existsSync(join(ROOT, p)));
check(
  "this branch's own namespaces are present",
  missingNs.length
    ? `MISSING: ${missingNs.join(", ")}`
    : `${REQUIRED.length} of ${REQUIRED.length} present`,
  missingNs.length === 0,
);

// ---------------------------------------------------------------------------
console.log("\n2. Seed integrity");
// ---------------------------------------------------------------------------
const pools: Array<[string, Trip[]]> = [
  ["requests", mockRequestTrips],
  ["needs-action", mockNeedsActionTrips],
  ["upcoming", mockUpcomingTrips],
  ["in-progress", mockInProgressTrips],
  ["completed", mockCompletedTrips],
];
const all = pools.flatMap(([, t]) => t);
check(
  "trip pools populated",
  pools.map(([n, t]) => `${n}=${t.length}`).join(" "),
  pools.every(([, t]) => t.length > 0),
);

const ids = all.map((t) => t.id);
const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
check("trip ids unique", dupes.length ? `dupes: ${[...new Set(dupes)].join(", ")}` : `${ids.length} ids, 0 duplicates`, dupes.length === 0);

const noLegs = all.filter((t) => t.legs.length === 0).map((t) => t.id);
check("every trip has legs", noLegs.length ? noLegs.join(", ") : `${all.length} trips, all with legs`, noLegs.length === 0);

// ---------------------------------------------------------------------------
console.log("\n3. Ride Details phases are reachable");
// ---------------------------------------------------------------------------
// The swipe stage is derived ENTIRELY from which marks a leg carries, so the
// seed is the only thing that makes a phase reachable. A stage missing here
// silently removes a screen from the app.
const STAGES: LegSwipeStage[] = ["not-started", "started", "picked-up", "completed"];
const swipeLegs = all.flatMap((t) => t.legs.filter((l) => l.progress));
check("legs carrying swipe progress", `${swipeLegs.length} legs`, swipeLegs.length > 0);

for (const stage of STAGES) {
  const n = swipeLegs.filter((l) => getLegStage(l) === stage).length;
  check(`stage "${stage}" seeded`, `${n} of ${swipeLegs.length} legs`, n > 0);
}

const missingNext = swipeLegs.filter(
  (l) => getLegStage(l) !== "completed" && getNextSwipe(l) === null,
);
check(
  "every unfinished leg has a next swipe",
  missingNext.length ? `${missingNext.length} without one` : `${swipeLegs.filter((l) => getLegStage(l) !== "completed").length} unfinished legs, all resolved`,
  missingNext.length === 0,
);

// marks must fill left to right — a leg cannot be picked up before it started
const outOfOrder = swipeLegs.filter((l) => {
  const p = l.progress!;
  return (p.pickedUpAt && !p.startedAt) || (p.droppedOffAt && !p.pickedUpAt);
});
check(
  "swipe marks fill in order",
  outOfOrder.length ? `${outOfOrder.length} out of order` : `${swipeLegs.length} legs, none out of order`,
  outOfOrder.length === 0,
);

// all four detail states must be produced by real seed data
const detailStates = new Set<string>();
for (const t of all) {
  if (t.status === "completed") detailStates.add("completed");
  else if (t.status === "upcoming") detailStates.add("before-taken");
  else if (t.status === "in-progress") detailStates.add("in-progress");
  else detailStates.add("needs-action");
}
for (const s of ["before-taken", "in-progress", "needs-action", "completed"]) {
  const n = all.filter((t) =>
    s === "completed" ? t.status === "completed"
    : s === "before-taken" ? t.status === "upcoming"
    : s === "in-progress" ? t.status === "in-progress"
    : !["completed", "upcoming", "in-progress"].includes(t.status),
  ).length;
  check(`detail state "${s}" reachable`, `${n} of ${all.length} trips`, n > 0);
}

// ---------------------------------------------------------------------------
console.log("\n3b. Map View rules");
// ---------------------------------------------------------------------------
// Replicated from the prose contract + B2 captures, so the rules are the thing
// worth guarding — a renderer can drift from them silently.

const reqDays = groupByPickupDay(mockRequestTrips);
check("request trips group into pickup days", `${mockRequestTrips.length} trips -> ${reqDays.length} days`, reqDays.length > 0);

// The map is pointless with one pin per day; the canonical capture shows 16.
const biggest = reqDays.reduce((a, b) => (b.trips.length > a.trips.length ? b : a));
check("a day exists with enough trips to exercise the map", `busiest day ${biggest.key} has ${biggest.trips.length}`, biggest.trips.length >= 10);

// Count line format, exactly as capture 03-10 renders it.
const sample = countLine(16, 16, "Thu, Sep 24");
check("count line format", `"${sample}"`, sample === "16 of 16 trips shown · Thu, Sep 24");

/**
 * The two counts must be able to DIFFER. If visible always equalled total the
 * number would be decorative and the default-zoom control meaningless — so this
 * asserts the gap exists, not merely that the function returns something.
 */
const dayTrips = biggest.trips;
const vDown = visibleTrips(dayTrips, "down", 1).length;
const vHalf = visibleTrips(dayTrips, "halfway", 1).length;
const vZoom = visibleTrips(dayTrips, "halfway", 2).length;
check("visible count shrinks as the sheet rises", `down=${vDown} halfway=${vHalf} of ${dayTrips.length}`, vDown >= vHalf);
check("visible count shrinks as you zoom in", `halfway z1=${vHalf} z2=${vZoom}`, vZoom <= vHalf);
check("the two counts actually differ somewhere", `halfway shows ${vHalf} of ${dayTrips.length}`, vHalf < dayTrips.length);
check("default detent is halfway", DEFAULT_DETENT, DEFAULT_DETENT === "halfway");
check("exposed fraction falls as the sheet rises", `down=${EXPOSED_PCT.down} halfway=${EXPOSED_PCT.halfway} up=${EXPOSED_PCT.up}`,
  EXPOSED_PCT.down > EXPOSED_PCT.halfway && EXPOSED_PCT.halfway > EXPOSED_PCT.up);

// Pins: deterministic, in bounds, and actually spread out.
const positions = dayTrips.map((t) => pinPosition(t));
const stable = dayTrips.every((t) => {
  const a = pinPosition(t), b = pinPosition(t);
  return a.leftPct === b.leftPct && a.topPct === b.topPct;
});
check("pin positions are deterministic", `${dayTrips.length} pins re-derived identically`, stable);
const inBounds = positions.filter((p) => p.leftPct >= 0 && p.leftPct <= 100 && p.topPct >= 0 && p.topPct <= 100).length;
check("pin positions in bounds", `${inBounds} of ${positions.length}`, inBounds === positions.length);

/**
 * ⚠️ Pins legitimately OVERLAP (they never cluster into a numbered bubble), but
 * a weak hash makes ids sharing a prefix land on top of each other and 16 trips
 * render as 6 pins. This bounds accidental collisions without banning real ones.
 */
let collisions = 0;
for (let i = 0; i < positions.length; i++)
  for (let j = i + 1; j < positions.length; j++)
    if (Math.abs(positions[i].leftPct - positions[j].leftPct) < 4 &&
        Math.abs(positions[i].topPct - positions[j].topPct) < 4) collisions++;
const pairs = (positions.length * (positions.length - 1)) / 2;
check("pins are spread, not stacked by a weak hash", `${collisions} colliding pairs of ${pairs}`, collisions <= pairs * 0.05);

const willCall = mockRequestTrips.filter(isWillCall).length;
check("will-call trips exist to badge", `${willCall} of ${mockRequestTrips.length} request trips`, willCall > 0);

// Sort must be total and order-changing, not a no-op.
const orders = SORT_OPTIONS.map((o) => sortTrips(dayTrips, o.key).map((t) => t.id).join(","));
check("every sort returns every trip", `${SORT_OPTIONS.length} sorts x ${dayTrips.length} trips`,
  orders.every((o) => o.split(",").length === dayTrips.length));
check("sorts produce different orders", `${new Set(orders).size} distinct of ${orders.length}`, new Set(orders).size > 1);

check("both card banners defined", `${BANNER.standard.label} / ${BANNER["special-offers"].label}`,
  BANNER.standard.note === "Instant assignment" && BANNER["special-offers"].note === "Manual review");

// ---------------------------------------------------------------------------
console.log("\n3c. Options menu");
// ---------------------------------------------------------------------------
// Replicated from capture shoot DAB-2026-10-01 (`05-01`-`05-04`). This is the
// section the base got MOST wrong: the stub listed four invented rows and only
// one of them existed. These assertions are what stop it drifting back.

const CAPTURED_ORDER = [
  "Ride History", "Driver Dashboard", "ID Badge", "Contact Support",
  "Driver Notes", "Default Map Service", "Location", "Privacy Policy",
  "Driver Terms and Conditions", "Check for updates", "Logout",
];
const labels = OPTIONS_ROWS.map((r) => r.label);
check("Options row count", `${labels.length} rows`, labels.length === CAPTURED_ORDER.length);
check(
  "Options rows match the capture, in order",
  labels.join(" | ") === CAPTURED_ORDER.join(" | ") ? `all ${labels.length} in captured order` : `got: ${labels.join(", ")}`,
  labels.join(" | ") === CAPTURED_ORDER.join(" | "),
);

// The stub's invented rows must never come back.
const INVENTED = ["Settings", "Help & Support", "Log Out"];
const reintroduced = INVENTED.filter((i) => labels.includes(i));
check("no invented rows", reintroduced.length ? reintroduced.join(", ") : `0 of ${INVENTED.length} present`, reintroduced.length === 0);

/**
 * Exactly the destinations the 2026-10-01 shoot captured, and no others.
 * Wiring an uncaptured row means inventing a screen.
 */
const CAPTURED_DESTINATIONS = ["ride-history", "id-badge"];
const wired = OPTIONS_ROWS.filter((r) => r.href).map((r) => r.id).sort();
check(
  "only captured destinations are wired",
  `${wired.length} wired (${wired.join(", ") || "none"}) of ${OPTIONS_ROWS.length} rows`,
  wired.join(",") === CAPTURED_DESTINATIONS.slice().sort().join(","),
);

const destructive = OPTIONS_ROWS.filter((r) => r.destructive).map((r) => r.label);
check("Logout is the only destructive row", destructive.join(", ") || "none", destructive.length === 1 && destructive[0] === "Logout");

const noDesc = OPTIONS_ROWS.filter((r) => !r.description).map((r) => r.label);
check("every row but Logout has a sub-line", noDesc.join(", ") || "none", noDesc.length === 1 && noDesc[0] === "Logout");

/**
 * ⛔ The captured footer appends a real install UUID, and the captured account's
 * ID Badge carries a real person's photograph. Neither may be replicated.
 */
check("install id is a placeholder", INSTALL_ID_PLACEHOLDER, /^0{8}-0{4}-0{4}-0{4}-0{12}$/.test(INSTALL_ID_PLACEHOLDER));
check("app version matches the captured footer", APP_VERSION, APP_VERSION.startsWith("v6.0.537"));
check("driver name is the seeded test account", DRIVER_NAME, DRIVER_NAME.includes("Test Driver"));

// ---------------------------------------------------------------------------
console.log("\n3d. Ride History filter");
// ---------------------------------------------------------------------------
// Captures `04-02` / `04-03`. Only the LABELS are captured; the predicates are
// inferred and the data they match is seeded, so what is guarded here is that
// the control is real — three options, and each returning a DIFFERENT,
// non-empty set. A filter whose options all return everything is a dead
// control that still looks alive.

const rhLabels = RIDE_HISTORY_FILTERS.map((f) => f.label);
check("filter options match the capture", rhLabels.join(" | "),
  rhLabels.join(" | ") === "All | Missing Signatures | Late Trips");
check("default filter is All", DEFAULT_RIDE_HISTORY_FILTER, DEFAULT_RIDE_HISTORY_FILTER === "all");

const rhAll = applyRideHistoryFilter(mockCompletedTrips, "all").length;
const rhSig = applyRideHistoryFilter(mockCompletedTrips, "missing-signatures").length;
const rhLate = applyRideHistoryFilter(mockCompletedTrips, "late-trips").length;
check("All returns every completed trip", `${rhAll} of ${mockCompletedTrips.length}`, rhAll === mockCompletedTrips.length);
check("Missing Signatures is seeded and narrows", `${rhSig} of ${rhAll}`, rhSig > 0 && rhSig < rhAll);
check("Late Trips is seeded and narrows", `${rhLate} of ${rhAll}`, rhLate > 0 && rhLate < rhAll);
check("the two filters select different sets",
  `signatures=${rhSig} late=${rhLate}`,
  applyRideHistoryFilter(mockCompletedTrips, "missing-signatures").map((t) => t.id).join(",") !==
  applyRideHistoryFilter(mockCompletedTrips, "late-trips").map((t) => t.id).join(","));
// absent must NOT read as missing — only an explicit false does
const absent = mockCompletedTrips.filter((t) => t.signatureCaptured === undefined);
check("absent signature is not 'missing'", `${absent.length} trips leave it unset, 0 counted as missing`,
  absent.every((t) => !isMissingSignature(t)));
check("late predicate needs an explicit true", `${mockCompletedTrips.filter(isLateTrip).length} late`,
  mockCompletedTrips.filter((t) => t.wasLate === undefined).every((t) => !isLateTrip(t)));

// ---------------------------------------------------------------------------
console.log("\n3e. Planner");
// ---------------------------------------------------------------------------
// Shoot `DAB-2026-10-01` (`03-01`-`03-08`). Planner is a TIME-AXIS SCHEDULE,
// which two earlier builds got wrong — one invented the whole screen, one
// guessed a card list. These assertions pin what the captures actually show.

const pToday = new Date(2026, 6, 31);
check("date label is the captured long form", plannerDateLabel(new Date(2026, 9, 1)),
  plannerDateLabel(new Date(2026, 9, 1)) === "Thu October 1, 2026");

const navToday = dateNavState(pToday, pToday);
const navAhead = dateNavState(addDays(pToday, 1), pToday);
check("on today: back and Today inert, forward live",
  `back=${navToday.canGoBack} today=${navToday.canGoToday}`,
  !navToday.canGoBack && !navToday.canGoToday && navToday.canGoForward);
check("off today: all three live (confirmed by `03-03`)",
  `back=${navAhead.canGoBack} today=${navAhead.canGoToday}`,
  navAhead.canGoBack && navAhead.canGoToday);
check("never pages before today", `back=${dateNavState(addDays(pToday, -1), pToday).canGoBack}`,
  !dateNavState(addDays(pToday, -1), pToday).canGoBack);

// The seeded populated day
const pDay = plannerDayFor(addDays(pToday, SEEDED_TRIP_DAY_OFFSET), pToday);
check("a populated day exists to render", pDay ? `${pDay.blocks.length} blocks` : "NONE", !!pDay && pDay.blocks.length > 0);
const emptyDay = plannerDayFor(addDays(pToday, SEEDED_TRIP_DAY_OFFSET + 1), pToday);
check("other days stay empty", emptyDay ? "populated" : "null", emptyDay === null);

const blocks = pDay!.blocks;
const travel = blocks.filter((b) => b.kind === "travel");
const trip = blocks.filter((b) => b.kind === "trip");
check("both captured block kinds are seeded", `${travel.length} travel, ${trip.length} trip`,
  travel.length > 0 && trip.length > 0);
check("the trip block carries what the capture shows",
  `fare=${trip[0].fare} otp=${trip[0].otp} pickup=${!!trip[0].pickupAddress} dropoff=${!!trip[0].dropoffAddress}`,
  trip[0].fare !== undefined && trip[0].otp === true && !!trip[0].pickupAddress && !!trip[0].dropoffAddress);
check("a trip block opens Ride Details", trip[0].tripId ?? "none", !!trip[0].tripId);

/**
 * ⭐ The block fare is the LEG fare; Daily Summary is the TRIP total. `03-03`
 * shows $92.70 on the block and $185.40 in the summary — both legs of one trip.
 * Summing the blocks would print half the real figure, so this asserts the two
 * are DIFFERENT rather than merely present.
 */
const pSum = dailySummary(pDay);
const blockFareTotal = trip.reduce((s2, b) => s2 + (b.fare ?? 0), 0);
check("Daily Summary counts trips, not blocks", `${pSum.totalTrips} trips vs ${blocks.length} blocks`,
  pSum.totalTrips === 1 && blocks.length > 1);
check("Daily Summary is the TRIP total, not the leg fare",
  `summary=$${pSum.potentialEarnings.toFixed(2)} block=$${blockFareTotal.toFixed(2)}`,
  pSum.potentialEarnings > blockFareTotal);
check("empty day summarises to zero", JSON.stringify(dailySummary(null)),
  dailySummary(null).totalTrips === 0 && dailySummary(null).potentialEarnings === 0);

// Clock + axis
check("clock format", formatClock(21 * 60 + 38), formatClock(21 * 60 + 38) === "9:38 PM");
check("clock wraps past midnight", formatClock(24 * 60 + 78), formatClock(24 * 60 + 78) === "1:18 AM");
check("axis marks the next day (capture `03-06`)", axisLabel(25 * 60).replace("\n", " "),
  axisLabel(25 * 60).includes("(next day)") && !axisLabel(23 * 60).includes("(next day)"));
const ticks = axisTicks(blocks);
check("axis is half-hourly and spans the blocks",
  `${ticks.length} ticks, ${formatClock(ticks[0])} -> ${formatClock(ticks[ticks.length - 1])}`,
  ticks.length > 2 && ticks.every((t, i) => i === 0 || t - ticks[i - 1] === 30) &&
  ticks[0] <= Math.min(...blocks.map((b) => b.startMin)) &&
  ticks[ticks.length - 1] >= Math.max(...blocks.map((b) => b.endMin)));
check("block window reads as captured", blockWindow(trip[0]), blockWindow(trip[0]) === "10:40 PM - 1:18 AM");

// Copy, verbatim
check("captured copy is verbatim",
  `${PLANNER_COPY.tapToOpen} / ${PLANNER_COPY.schedule}`,
  PLANNER_COPY.emptyTitle === "No trips yet — but they're on the way!" &&
  PLANNER_COPY.tapToOpen === "Tap to Open Ride Details" &&
  PLANNER_COPY.schedule === "Schedule" &&
  PLANNER_COPY.earningsTooltip === "This is the potential earnings from accepted trips for this day.");

/** ⛔ Captured rider names and addresses are real. The seed invents its own. */
const CAPTURED_PII = ["JESSICA STRONG"];
const plannerLeaked = CAPTURED_PII.filter((n) => blocks.some((b) => b.rider === n));
check("no captured rider name in the Planner seed", plannerLeaked.join(", ") || `0 of ${CAPTURED_PII.length}`,
  plannerLeaked.length === 0);

// ---------------------------------------------------------------------------
console.log("\n4. Colour tokens are literal strings");
// ---------------------------------------------------------------------------
// A Tailwind colour utility built by interpolation compiles to nothing, with no
// build error. Tokens must be used as values (style/inline), never spliced into
// a class name.
const colorsSrc = readFileSync(join(ROOT, "constants/driver-app-colors.ts"), "utf8");
const tokens = [...colorsSrc.matchAll(/export const (\w+) = "(#[0-9A-Fa-f]{3,8})"/g)];
check("colour tokens declared", `${tokens.length} tokens`, tokens.length > 0);

const interpolated: string[] = [];
for (const f of files) {
  const text = readFileSync(f, "utf8");
  for (const [, name] of tokens) {
    // e.g. `bg-[${DRIVER_TEAL}]` — a class name built at runtime
    if (new RegExp(`(bg|text|border|ring|fill|stroke)-\\[\\$\\{${name}\\}\\]`).test(text)) {
      interpolated.push(`${relative(ROOT, f)}: ${name}`);
    }
  }
}
check(
  "no token interpolated into a class name",
  interpolated.length ? interpolated.join("; ") : `0 hits across ${tokens.length} tokens x ${files.length} files`,
  interpolated.length === 0,
);

// ---------------------------------------------------------------------------
console.log("\n5. Seeded rider names are invented");
// ---------------------------------------------------------------------------
// Names in the production captures belong to real members and must never reach
// the seed. This list is the set observed in captures; it is a floor, not a
// guarantee, and is why the seed header states the rule.
const CAPTURE_NAMES = [
  "KALLIYAH TYSON", "WINDY PRECISE", "STEPHANIE FIELDS", "MARCUS WHITFIELD",
  "HAROLD NIXON", "DENISE ALVARADO", "DOROTHY MASON", "Jackie Giese",
];
const seed = readFileSync(join(ROOT, "lib/driver-data/mock-trips.ts"), "utf8");
const leaked = CAPTURE_NAMES.filter((n) => seed.includes(n));
check(
  "no capture-derived rider names",
  leaked.length ? leaked.join(", ") : `0 of ${CAPTURE_NAMES.length} known names present`,
  leaked.length === 0,
);

// ---------------------------------------------------------------------------
console.log(
  failures === 0
    ? "\n✅ verify-base: all checks passed\n"
    : `\n❌ verify-base: ${failures} check(s) failed\n`,
);
process.exit(failures === 0 ? 0 : 1);
