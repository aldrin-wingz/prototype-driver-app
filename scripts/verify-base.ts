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
  SWIPE_TOO_FAR_BODY, SWIPE_TOO_FAR_DISMISS, SWIPE_TOO_FAR_PHONE,
  SWIPE_TOO_FAR_TITLE, refusesDropOffSwipe,
} from "../lib/driver-data/swipe-refusal";
import {
  cancelAlertBody,
  isClientCancelled,
  listableRides,
  CANCEL_ALERT_DISMISS,
  CANCEL_ALERT_GO,
  CANCEL_ALERT_TITLE,
  CANCELLED_BANNER_BODY,
  CANCELLED_BANNER_TITLE,
  CANCELLED_SUBTITLE,
} from "../lib/driver-data/client-cancellation";
import {
  DECLINED_BODY, DECLINED_CHAT_SUPPORT, DECLINED_TITLE, DECLINED_WALK_BACK,
  ZENDESK_COMPOSER_PLACEHOLDER, ZENDESK_DECLINE_INTRO, ZENDESK_DECLINE_LABELS,
  ZENDESK_SENT_STATUS, declinableLegIds, zendeskDeclineMessage,
} from "../lib/driver-data/rider-declined";
import { reachOptionsFor } from "../components/driver/reach-rider-modal";
import {
  SEND_BACK_CONFIRM_BODY, SEND_BACK_CONFIRM_NO, SEND_BACK_CONFIRM_YES,
  SEND_BACK_DENIED_BODY, SEND_BACK_DENIED_DISMISS, SEND_BACK_DENIED_TITLE,
  sendBackOutcome,
} from "../lib/driver-data/send-back";
import {
  getLegStage,
  getNextSwipe,
  isSameDayPickup,
  tripDateParses,
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
// The failure this base exists to prevent: an unagreed feature arriving through
// a shared file. Anything importing these namespaces is not shipped behaviour.
const FORBIDDEN = [
  "@/lib/support",
  "@/lib/support-data",
  "@/components/support",
  "@/components/dev",
  "@/lib/messages-data",
  "@/components/chat",
  "no-show-rules",
  "use-no-show-clock",
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
  "no forbidden imports",
  offenders.length ? offenders.join("; ") : `0 hits across ${FORBIDDEN.length} namespaces`,
  offenders.length === 0,
);

const ORPHANS = [
  "lib/support", "lib/support-data", "components/support", "components/dev",
  "lib/messages-data", "components/chat", "lib/driver-data/no-show-rules.ts",
  "types/support.ts", "hooks/use-no-show-clock.ts", "app/my-rides/[id]/no-show",
];
const present = ORPHANS.filter((p) => existsSync(join(ROOT, p)));
check(
  "no feature directories on disk",
  present.length ? present.join(", ") : `0 of ${ORPHANS.length} present`,
  present.length === 0,
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
console.log("\n6. CAP ids are owned by the bytes");
// ---------------------------------------------------------------------------
/**
 * ⛔⛔ **CAP ids used to be POSITIONAL** — `i++` down the rendered table — while
 * the index's own field table called them a "stable id". Those two claims
 * cannot both hold, and on 2026-10-13 the contradiction bit on the sibling
 * clone: nine new captures filed into `04 My Rides` and `06 Chat` moved 248 of
 * 328 ids and silently invalidated every `CAP-###` citation in that repo's
 * source. Nothing errored; the comments simply began lying.
 *
 * The ledger fixes that by keying an id to a file's SHA. These checks are what
 * keep the ledger from quietly stopping doing its job — a ledger that lost a
 * row, or handed one id to two files, would renumber on the next shoot exactly
 * as the positional scheme did.
 */
const ledgerRaw = readFileSync(join(ROOT, "references/captures/cap-ids.json"), "utf8");
const capLedger = JSON.parse(ledgerRaw) as Record<string, string>;
const indexSrc = readFileSync(join(ROOT, "references/captures/INDEX.md"), "utf8");

/** ⚠️ The index row, not the Source-paths list — the row is what carries the SHA. */
const indexRows = [...indexSrc.matchAll(/^\| (CAP-\d{3}) \| `[^`]*` \| [^|]*\| `([0-9a-f]+)`/gm)]
  .map(([, cap, sha]) => ({ cap, sha }));
/**
 * ⛔⛔ **This started as `indexRows.length > 100` and a break test killed it.**
 * Corrupting one row's format dropped it from the parse and the section went on
 * reporting `339 of 339 rows agree` — green, over a set one row smaller than the
 * thing it claimed to check. A floor is not a denominator: a regex that quietly
 * stops matching reports `0 of 0` and passes.
 *
 * The index is GENERATED by handing every file on disk its ledger id, so the
 * two sets are the same set by construction. Asserting that equality is what
 * makes a parser that drifts — or an index that loses a row — fail here.
 */
check(
  "every ledger entry is parsed back out of the index",
  `${indexRows.length} rows parsed, ${Object.keys(capLedger).length} in the ledger`,
  indexRows.length === Object.keys(capLedger).length,
);

const unledgered = indexRows.filter((r) => capLedger[r.sha] !== r.cap);
check(
  "every indexed row's id comes from the ledger",
  unledgered.length
    ? unledgered.slice(0, 3).map((r) => `${r.cap}/${r.sha}`).join(", ")
    : `${indexRows.length} of ${indexRows.length} rows agree with ${Object.keys(capLedger).length} ledger entries`,
  unledgered.length === 0,
);

/** ⛔ Two files sharing an id is the renumbering bug wearing a ledger. */
const byId = new Map<string, string[]>();
for (const [sha, cap] of Object.entries(capLedger)) {
  byId.set(cap, [...(byId.get(cap) ?? []), sha]);
}
const doubled = [...byId].filter(([, shas]) => shas.length > 1);
check(
  "no id is held by two files",
  doubled.length ? doubled.slice(0, 3).map(([cap]) => cap).join(", ") : `${byId.size} distinct ids over ${Object.keys(capLedger).length} files`,
  doubled.length === 0,
);

// ---------------------------------------------------------------------------
console.log("\n7. Production's send-back refusal (CAP-330)");
// ---------------------------------------------------------------------------
/**
 * ⭐ The one place the base shows production REFUSING rather than simply not
 * being wired. Three things have to stay true, and each is checked against a
 * literal declared HERE rather than derived from the module — a validator that
 * reads its expectation off its own subject proves only that the subject equals
 * itself.
 */

/** Transcribed from `CAP-330` at fold-in. ⛔ Never re-derive this from the module. */
const CAP_330_TITLE = "Send-back request failed";
const CAP_330_BODY =
  "Standing Order Trips cannot be sent back via the Driver App. To send back this trip, please call into support for assistance.";
check(
  "the refusal is CAP-330 verbatim",
  `title ${SEND_BACK_DENIED_TITLE === CAP_330_TITLE ? "ok" : "DRIFTED"}, body ${SEND_BACK_DENIED_BODY.length} chars, dismiss "${SEND_BACK_DENIED_DISMISS}"`,
  SEND_BACK_DENIED_TITLE === CAP_330_TITLE &&
    SEND_BACK_DENIED_BODY === CAP_330_BODY &&
    SEND_BACK_DENIED_DISMISS === "OK",
);

/**
 * ⛔⛔ **`No` / `Yes`, not `Cancel` / `Continue`.** Production's two send-back
 * popups disagree with each other and both are reproduced as they are. A later
 * tidy-up that harmonised them would be this mirror redesigning production and
 * presenting the result as a replica.
 */
check(
  "the confirmation keeps production's own button names",
  `"${SEND_BACK_CONFIRM_NO}" / "${SEND_BACK_CONFIRM_YES}", body ${SEND_BACK_CONFIRM_BODY.length} chars`,
  SEND_BACK_CONFIRM_NO === "No" &&
    SEND_BACK_CONFIRM_YES === "Yes" &&
    SEND_BACK_CONFIRM_BODY.startsWith("Trip sendbacks are strongly discouraged"),
);

/**
 * ⛔ **Terminal.** One action, no cancel. A second button here would be the
 * mirror inventing a way out of a dead end that production does not offer — and
 * the dead end is the whole reason this screen is in the base.
 */
const deniedSrc = readFileSync(join(ROOT, "components/driver/send-back-denied-dialog.tsx"), "utf8");
const deniedActions = (deniedSrc.match(/<AlertDialogAction[\s/>]/g) ?? []).length;
const deniedCancels = (deniedSrc.match(/<AlertDialogCancel[\s/>]/g) ?? []).length;
check(
  "the refusal offers exactly one way out, and it is a dismissal",
  `${deniedActions} action(s), ${deniedCancels} cancel(s)`,
  deniedActions === 1 && deniedCancels === 0,
);

/**
 * The rule, over the whole seed.
 *
 * ⛔ **Both outcomes must be SEEN.** A rule that answered `proceeds` for every
 * trip would pass a "no trip is wrongly denied" check vacuously, and the
 * refusal would be unreachable in the app while every check stayed green. The
 * expectations are literals: exactly one standing order is seeded, on purpose.
 */
const EXPECTED_STANDING_ORDERS = 1;
const denied = all.filter((t) => sendBackOutcome(t) === "denied");
const proceeds = all.filter((t) => sendBackOutcome(t) === "proceeds");
check(
  "exactly one seeded trip is a standing order",
  `${denied.length} denied of ${all.length} trips (${denied.map((t) => t.id).join(", ") || "none"})`,
  denied.length === EXPECTED_STANDING_ORDERS,
);
check(
  "every other trip proceeds — both outcomes are reachable",
  `${proceeds.length} proceed, ${denied.length} denied, ${proceeds.length + denied.length} of ${all.length} classified`,
  proceeds.length === all.length - EXPECTED_STANDING_ORDERS && proceeds.length > 0,
);
check(
  "the refusal is keyed on the standing order, not on the trip id",
  `${denied.filter((t) => t.standingOrderId).length} of ${denied.length} denied trips carry a standing order id`,
  denied.every((t) => Boolean(t.standingOrderId)) &&
    proceeds.every((t) => !t.standingOrderId),
);

// ---------------------------------------------------------------------------
console.log("\n8. Every CAP id cited in the source resolves");
// ---------------------------------------------------------------------------
/**
 * ⛔⛔ The base cites capture ids in its comments as of the fold-ins. A citation
 * is evidence only while it resolves — and ids used to be positional, so they
 * moved under the code that cited them. The ledger stopped that; this is what
 * notices if it ever stops working.
 */
const indexedCaps = new Set(indexRows.map((r) => r.cap));
const citations: Array<{ file: string; cap: string }> = [];
for (const f of files) {
  for (const [, cap] of readFileSync(f, "utf8").matchAll(/\b(CAP-\d{3})\b/g)) {
    citations.push({ file: relative(ROOT, f), cap });
  }
}
const CITING_FILES_MIN = 3;
const citingFiles = new Set(citations.map((c) => c.file));
check(
  "the source actually cites captures",
  `${citations.length} citations across ${citingFiles.size} files`,
  citingFiles.size >= CITING_FILES_MIN,
);
const dangling = citations.filter((c) => !indexedCaps.has(c.cap));
check(
  "every cited CAP id resolves to an indexed capture",
  dangling.length
    ? dangling.slice(0, 5).map((c) => `${c.file}:${c.cap}`).join(", ")
    : `${citations.length} of ${citations.length} resolve against ${indexedCaps.size} indexed rows`,
  dangling.length === 0,
);

// ---------------------------------------------------------------------------
console.log("\n9. The rider-declined dead end (CAP-323 / CAP-327)");
// ---------------------------------------------------------------------------
/**
 * ⭐⭐ The flow this section guards does not END anywhere in the app: the driver
 * reports a decline, a ticket is auto-filed on their behalf, and the ride is
 * unchanged. Every check below is about keeping that honest — the copy, the
 * silence, and the fact that the driver typed nothing.
 */

/** Transcribed from `CAP-323` / `CAP-325` at fold-in. ⛔ Never re-derive. */
const CAP_323 = {
  title: "Rider declined the trip",
  body: "Please chat with support to remove it from your manifest.",
  primary: "Chat with Support",
  walkBack: "Rider Needs Transportation",
};
check(
  "the declined sheet is CAP-323 verbatim",
  `"${DECLINED_TITLE}" / "${DECLINED_CHAT_SUPPORT}" / "${DECLINED_WALK_BACK}", body ${DECLINED_BODY.length} chars`,
  DECLINED_TITLE === CAP_323.title &&
    DECLINED_BODY === CAP_323.body &&
    DECLINED_CHAT_SUPPORT === CAP_323.primary &&
    DECLINED_WALK_BACK === CAP_323.walkBack,
);

/**
 * ⛔⛔ **The 2021 sheet must not come back.** `CAP-090` is an iOS capture of a
 * 2021 ride offering one button, `Call Support`; the sibling prototype
 * replicated it for months and was arguing against a flow production had
 * already changed. Anyone reaching for an old screenshot reintroduces it, so
 * the words themselves are banned from the source.
 */
const SHEET_2021 = [
  "This is NOT a confirmation for the trip cancellation",
  "Call Support",
];
const revived = SHEET_2021.filter((phrase) =>
  files.some((f) => readFileSync(f, "utf8").includes(`"${phrase}`) || readFileSync(f, "utf8").includes(`>${phrase}<`)),
);
check(
  "the retired 2021 declined sheet has not come back",
  revived.length ? revived.join(" | ") : `0 of ${SHEET_2021.length} retired phrases across ${files.length} files`,
  revived.length === 0,
);

/**
 * Both captured variants of the Reach Rider sheet.
 *
 * ⛔ The same-day third option ADVANCES the trip; the standard one closes and
 * changes nothing. Two behaviours, so two lists — a single list with a swapped
 * label would make them look like one. Asserted as a DIFF rather than two
 * literals, because the first two options genuinely are identical and two
 * copies of them would be two chances to drift.
 */
const standard = reachOptionsFor(false);
const sameDayOpts = reachOptionsFor(true);
check(
  "both Reach Rider variants offer production's three options",
  `standard ${standard.length}, same-day ${sameDayOpts.length}`,
  standard.length === 3 && sameDayOpts.length === 3,
);
check(
  "the variants differ in the third option and nowhere else",
  `[0]/[1] same: ${standard[0].label === sameDayOpts[0].label && standard[1].label === sameDayOpts[1].label}; [2] "${standard[2].label}" vs "${sameDayOpts[2].label}"`,
  standard[0].label === sameDayOpts[0].label &&
    standard[1].label === sameDayOpts[1].label &&
    standard[2].label !== sameDayOpts[2].label,
);
check(
  "only the same-day variant carries the helper note",
  `standard notes ${standard.filter((o) => o.note).length}, same-day notes ${sameDayOpts.filter((o) => o.note).length}`,
  standard.filter((o) => o.note).length === 0 &&
    sameDayOpts.filter((o) => o.note).length === 1,
);
check(
  "the sheet names the decline exactly as production does",
  `"${standard[1].label}"`,
  standard[1].label === "Rider declined the trip",
);

/**
 * ⛔ The derived same-day rule, over the whole seed — and the parse it rests on.
 * A date that failed to parse would make every trip "not today" in silence, and
 * the app would quietly show the wrong variant of a captured screen.
 */
const unparsed = all.filter((t) => !tripDateParses(t));
check(
  "every seeded trip date parses",
  unparsed.length ? unparsed.map((t) => `${t.id}: ${t.date}`).join(", ") : `${all.length} of ${all.length}`,
  unparsed.length === 0,
);
const sameDayTrips = all.filter(isSameDayPickup);
check(
  "same-day is a real distinction in the seed, not everything or nothing",
  `${sameDayTrips.length} of ${all.length} trips are same-day`,
  sameDayTrips.length > 0 && sameDayTrips.length < all.length,
);
/**
 * ⚠️ The base seeds ONE unconfirmed ride and it is a same-day one, so tapping
 * through only ever reaches the same-day variant. Said here rather than left to
 * be discovered — and asserted, so a reseed that silently flipped it would have
 * to come and change this line.
 */
check(
  "the one unconfirmed ride is same-day, so that is the variant the app shows",
  `${mockNeedsActionTrips.length} unconfirmed ride(s), ${mockNeedsActionTrips.filter(isSameDayPickup).length} same-day`,
  mockNeedsActionTrips.length === 1 && mockNeedsActionTrips.every(isSameDayPickup),
);

/**
 * The auto-sent ticket, over every seeded trip.
 *
 * ⛔ **The Appointment Time row is a destination, not a leg.** Listing its id
 * would put a reference in front of Support that does not name a ride.
 */
check(
  "the ticket's intro and labels are CAP-327 / CAP-225 verbatim",
  `${ZENDESK_DECLINE_LABELS.join(" / ")} · "${ZENDESK_SENT_STATUS}" · "${ZENDESK_COMPOSER_PLACEHOLDER}"`,
  ZENDESK_DECLINE_INTRO ===
    "My member no longer needs transportation. I need help in removing the following rides from my manifest." &&
    ZENDESK_DECLINE_LABELS.join("|") === "Member Name|Trip Date|Trip ID|Leg IDs" &&
    ZENDESK_SENT_STATUS === "Sent · Just now" &&
    ZENDESK_COMPOSER_PLACEHOLDER === "Type a message",
);
/**
 * ⛔⛔ **Compared PER TRIP, and the first version of this check was not.** It
 * built one set of appointment-leg ids across the whole seed and asked whether
 * a ticket contained any of them — which failed three completed trips, because
 * **leg ids are not unique across trips**: `leg-2` is an appointment row on one
 * ride and an ordinary leg on another. The code was right and the check was
 * wrong, and a global id set is the shape that made it wrong.
 */
const apptRows = all.flatMap((t) => t.legs.filter((l) => l.type === "appointment"));
const ticketedAppts = all.filter((t) => {
  const listed = new Set(declinableLegIds(t));
  return t.legs.some((l) => l.type === "appointment" && listed.has(l.id));
});
check(
  "no ticket lists an appointment row as a leg",
  ticketedAppts.length
    ? ticketedAppts.slice(0, 3).map((t) => t.id).join(", ")
    : `0 of ${all.length} trips, over ${apptRows.length} appointment rows in the seed`,
  ticketedAppts.length === 0 && apptRows.length > 0,
);
const emptyTickets = all.filter((t) => declinableLegIds(t).length === 0);
check(
  "every trip still has a leg to name",
  emptyTickets.length ? emptyTickets.map((t) => t.id).join(", ") : `${all.length} of ${all.length} name at least one leg`,
  emptyTickets.length === 0,
);
const sampleTicket = zendeskDeclineMessage(mockNeedsActionTrips[0]);
check(
  "the ticket names the real trip",
  sampleTicket.lines.map((l) => `${l.label}=${l.value}`).join(" · "),
  sampleTicket.lines.length === ZENDESK_DECLINE_LABELS.length &&
    sampleTicket.lines.every((l) => l.value.length > 0),
);

/**
 * ⛔ **Read-only, and that IS the finding.** Nobody has captured what Support
 * says back. A composer that accepted text, or a thread that answered itself,
 * would be this mirror arguing the dead end is fine.
 */
const chatSrc = readFileSync(join(ROOT, "components/driver/zendesk-chat-screen.tsx"), "utf8");
const liveInputs = (chatSrc.match(/<(input|textarea|form)[\s/>]/g) ?? []).length;
check(
  "the support chat is read-only",
  `${liveInputs} input/textarea/form element(s) in the chat screen`,
  liveInputs === 0,
);

/**
 * ⛔ The sheet NAVIGATES to a route. A dangling push is the exact failure this
 * flow invites, and nothing else in the app would notice it.
 */
const modalSrc = readFileSync(join(ROOT, "components/driver/reach-rider-modal.tsx"), "utf8");
const pushed = [...modalSrc.matchAll(/router\.push\(`([^`$]*)\$/g)].map(([, prefix]) => prefix);
check(
  "the declined sheet pushes to a route that exists",
  `${pushed.length} push target(s): ${pushed.join(", ") || "none"}`,
  pushed.length === 1 &&
    pushed[0] === "/support-chat/" &&
    existsSync(join(ROOT, "app/support-chat/[id]/page.tsx")),
);

// ---------------------------------------------------------------------------
console.log("\n10. The swipe production refuses (CAP-326)");
// ---------------------------------------------------------------------------
/**
 * ⛔⛔ **A BLOCK, not a warning**, and the checks below are written to keep
 * that reading. The body's *"Trip payment may be denied"* invites the opposite
 * one — it is about having driven to the wrong place, not about the tap
 * succeeding. The title says the action did not happen.
 */

/** Transcribed from `CAP-326` at fold-in. ⛔ Never re-derive from the module. */
const CAP_326_TITLE = "Unable to complete action";
const CAP_326_BODY =
  "You are too far away from the scheduled drop-off location. Trip payment may be denied. " +
  "Please contact support if assistance is required. +1 (888) 545-4309";
check(
  "the refusal is CAP-326 verbatim",
  `title ${SWIPE_TOO_FAR_TITLE === CAP_326_TITLE ? "ok" : "DRIFTED"}, body ${SWIPE_TOO_FAR_BODY.length} chars, phone ${SWIPE_TOO_FAR_PHONE}`,
  SWIPE_TOO_FAR_TITLE === CAP_326_TITLE &&
    SWIPE_TOO_FAR_BODY === CAP_326_BODY &&
    SWIPE_TOO_FAR_DISMISS === "OK",
);

/**
 * ⛔⛔ **The INFERRED pick-up wording must not arrive here.** The sibling branch
 * carries it — the same sentence with *drop-off* swapped for *pick-up*, on the
 * strength of "you can assume it will be the same error". That is an assumption
 * about wording, not a sighting of a screen, and this mirror admits neither
 * into its copy. One capture and the ban can be lifted deliberately.
 */
const swipeSrc = readFileSync(join(ROOT, "lib/driver-data/swipe-refusal.ts"), "utf8");
const pickupCopy = /too far away from the scheduled pick-?up/i.test(swipeSrc);
check(
  "the uncaptured pick-up refusal has not been written",
  pickupCopy ? "pick-up wording present in swipe-refusal.ts" : `0 hits, ${SWIPE_TOO_FAR_BODY.includes("drop-off") ? "drop-off only" : "NEITHER ANCHOR — check the copy"}`,
  !pickupCopy && SWIPE_TOO_FAR_BODY.includes("drop-off"),
);

/**
 * ⛔ **Terminal.** One action, no cancel. A second button would be this mirror
 * inventing a way out of a dead end that production does not offer.
 */
const tooFarSrc = readFileSync(join(ROOT, "components/driver/swipe-too-far-dialog.tsx"), "utf8");
const tooFarActions = (tooFarSrc.match(/<AlertDialogAction[\s/>]/g) ?? []).length;
const tooFarCancels = (tooFarSrc.match(/<AlertDialogCancel[\s/>]/g) ?? []).length;
check(
  "the swipe refusal offers exactly one way out, and it is a dismissal",
  `${tooFarActions} action(s), ${tooFarCancels} cancel(s)`,
  tooFarActions === 1 && tooFarCancels === 0,
);

/**
 * The rule, over every seeded leg.
 *
 * ⛔ **Both outcomes must be seen**, and the refusing leg must actually be
 * awaiting a drop-off — a flag on a leg whose next swipe is `start` would make
 * the dialog unreachable while every check stayed green.
 */
const EXPECTED_REFUSING_LEGS = 1;
const allLegs = all.flatMap((t) => t.legs);
const refusing = allLegs.filter(refusesDropOffSwipe);
check(
  "exactly one seeded leg is outside the drop-off geofence",
  `${refusing.length} of ${allLegs.length} legs (${refusing.map((l) => l.id).join(", ") || "none"})`,
  refusing.length === EXPECTED_REFUSING_LEGS,
);
check(
  "the refusing leg is actually awaiting its drop-off, so the dialog is reachable",
  refusing.map((l) => `${l.id}: next=${getNextSwipe(l)}`).join(", ") || "none",
  refusing.length > 0 && refusing.every((l) => getNextSwipe(l) === "drop-off"),
);
check(
  "every other leg still swipes without a refusal",
  `${allLegs.length - refusing.length} of ${allLegs.length} legs unrefused`,
  allLegs.length - refusing.length > 0,
);

/**
 * ⛔ The CTA must consult the rule. A refusal that exists in `lib/` and is never
 * read is a dialog nobody can reach — the failure the reachability check above
 * guards from the data side, and this one from the wiring side.
 */
const detailSrc = readFileSync(join(ROOT, "components/driver/ride-detail-layout.tsx"), "utf8");
check(
  "the swipe CTA consults the rule and mounts the dialog",
  `refusesDropOffSwipe ${(detailSrc.match(/refusesDropOffSwipe\(/g) ?? []).length}x, <SwipeTooFarDialog ${(detailSrc.match(/<SwipeTooFarDialog[\s/>]/g) ?? []).length}x`,
  /refusesDropOffSwipe\(/.test(detailSrc) && /<SwipeTooFarDialog[\s/>]/.test(detailSrc),
);

// ---------------------------------------------------------------------------
console.log("\n11. A ride Wingz cancelled (CAP-341 / CAP-342)");
// ---------------------------------------------------------------------------
/**
 * ⛔⛔ **Two captures, and the second only exists because of the first's second
 * button.** `CAP-341`'s alert offers `OK` and `Go to ride`; `Go to ride` opens
 * `CAP-342`. `OK` is terminal, and the ride is then in no tab at all — which is
 * the whole finding, and the thing these checks have to keep true.
 */

/** The one seeded cancellation, found through the rule rather than by id. */
const CANCELLED_RIDE = mockUpcomingTrips.find(isClientCancelled)!;

/** Transcribed from the captures at fold-in. ⛔ Never re-derive from the module. */
const CAP_341_TITLE = "Wingz Driver";
const CAP_341_BODY =
  "Trip: 20261013134622G scheduled for 2026-10-18 at 01:46 PM was canceled.";
const CAP_342_TITLE = "Cancelled by Wingz";
const CAP_342_BODY = "This ride was cancelled by Wingz. No action is required.";

/**
 * ⛔⛔ **Production spells it BOTH ways.** The alert has one L, the banner two.
 * The obvious improvement is to normalise them, and that would be this mirror
 * quietly disagreeing with the photographs it is derived from.
 */
check(
  "the alert keeps production's one-L spelling, the banner its two",
  `alert "…${CAP_341_BODY.slice(-14)}" / banner "${CANCELLED_BANNER_TITLE}"`,
  /\bcanceled\b/.test(CAP_341_BODY) &&
    !/\bcancelled\b/i.test(CAP_341_BODY) &&
    CANCELLED_BANNER_TITLE === CAP_342_TITLE &&
    CANCELLED_BANNER_BODY === CAP_342_BODY &&
    /\bcancelled\b/i.test(CANCELLED_BANNER_BODY),
);
check(
  "...and the alert's copy is CAP-341's, rendered for a seeded ride",
  `"${cancelAlertBody(CANCELLED_RIDE)}"`,
  CANCEL_ALERT_TITLE === CAP_341_TITLE &&
    CANCEL_ALERT_DISMISS === "OK" &&
    CANCEL_ALERT_GO === "Go to ride" &&
    // ⚠️ Compared as a SHAPE, not to the capture's own sentence — that one
    // names a trip this seed does not have, and copying its id in would put
    // test data in the mirror.
    /^Trip: \d+ scheduled for \d{4}-\d{2}-\d{2} at \d{2}:\d{2} (AM|PM) was canceled\.$/.test(
      cancelAlertBody(CANCELLED_RIDE),
    ),
);
/** ⛔ The subtitle is the capture's, not the `Will-Call Ride` this app hardcodes. */
check(
  "the cancelled ride's subtitle is CAP-342's",
  `"${CANCELLED_SUBTITLE}"`,
  CANCELLED_SUBTITLE === "Ride",
);

/**
 * ⛔⛔ **The ride is in NO tab**, and both halves are measured: it exists in the
 * seed, and every list leaves it out. A mirror that simply did not seed one
 * would pass a "not listed" check without demonstrating anything.
 */
const cancelledSeeded = mockUpcomingTrips.filter(isClientCancelled);
check(
  "a cancelled ride is seeded, and it is exactly one",
  `${cancelledSeeded.length} of ${mockUpcomingTrips.length} upcoming ride(s)`,
  cancelledSeeded.length === 1,
);
check(
  "...and no list shows it — which is the finding, not an omission",
  `upcoming lists ${listableRides(mockUpcomingTrips).length} of ${mockUpcomingTrips.length}; ` +
    `cancelled visible: ${listableRides(mockUpcomingTrips).filter(isClientCancelled).length}`,
  listableRides(mockUpcomingTrips).length === mockUpcomingTrips.length - 1 &&
    listableRides(mockUpcomingTrips).every((trip) => !isClientCancelled(trip)),
);
/** ⛔ ...and the page reads that rule, rather than the raw array. */
const MY_RIDES = readFileSync("app/my-rides/page.tsx", "utf8");
check(
  "...and My Rides counts and lists through the rule, not the seed",
  `listableRides used ${(MY_RIDES.match(/listableRides\(/g) ?? []).length}x; ` +
    `raw array returned ${/return mockUpcomingTrips;/.test(MY_RIDES)}`,
  (MY_RIDES.match(/listableRides\(/g) ?? []).length === 2 &&
    !/return mockUpcomingTrips;/.test(MY_RIDES) &&
    !/count: mockUpcomingTrips\.length/.test(MY_RIDES),
);
/**
 * ⛔⛔ **Nothing the sibling prototype proposes may arrive here.** Row 18 adds a
 * filter, a Needs Action entry and an Acknowledge button; production has none
 * of them, and this mirror's job is production.
 */
/**
 * ⚠️ **Comments stripped, and a break test is why.** This file documents the
 * things it forbids in comments right beside the code that avoids them — the
 * layout's no-footer branch literally says *"the Acknowledge button does NOT
 * belong here"*. A substring search cannot tell a USE from a MENTION, so the
 * first version of this check failed against correct code. Same shape as the
 * sibling's `entry.label` check passing on the comment explaining its deletion.
 */
function codeOnly(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
}
const CC_SRC = codeOnly(readFileSync("lib/driver-data/client-cancellation.ts", "utf8"));
const LAYOUT = codeOnly(readFileSync("components/driver/ride-detail-layout.tsx", "utf8"));
const MY_RIDES_CODE = codeOnly(MY_RIDES);
const PROPOSALS = ["Acknowledge", "acknowledg", "RidesFilter", "showsCancelledRides", "DemoFocus"];
const proposalLeaks = PROPOSALS.filter(
  (word) => CC_SRC.includes(word) || MY_RIDES_CODE.includes(word) || LAYOUT.includes(word),
);
check(
  "no part of the sibling's proposal came across with the replication",
  `${proposalLeaks.length} of ${PROPOSALS.length} proposal marker(s) present${proposalLeaks.length ? ": " + proposalLeaks.join(", ") : ""}`,
  proposalLeaks.length === 0,
);
/**
 * ⛔ And the two cancellation concepts stay apart. `rider-declined.ts` is the
 * driver REPORTING a decline nobody has acted on; this is Wingz having already
 * cancelled. Opposite directions, nearly the same words.
 */
check(
  "...and it never borrows the rider-declined flow's wording",
  `shared string: ${[CANCELLED_BANNER_TITLE, CANCELLED_BANNER_BODY].some((a) => a.includes(DECLINED_TITLE))}`,
  ![CANCELLED_BANNER_TITLE, CANCELLED_BANNER_BODY].some((a) =>
    a.includes(DECLINED_TITLE),
  ) &&
    !CC_SRC.includes("DECLINED_"),
);

// ---------------------------------------------------------------------------
console.log("\n12. The balance card has ONE action (CAP-329 / BAL-B2)");
// ---------------------------------------------------------------------------
/**
 * ⛔⛔ **The mirror was a capture batch out of date.** This card paired
 * `Weekly Earnings` with `Payout Activity` in a two-column grid, replicating
 * the `BAL-B1` shoot. Two LATER captures show a single full-width
 * `Payout Activity`:
 *
 * - `BAL-B2` — `01-08 - B2 Home - Positive Balance Friday Date.png`: a positive
 *   balance WITH a scheduled date.
 * - `CAP-329` — the 2026-10-14 production shot: a negative balance with NO
 *   scheduled line.
 *
 * ⭐ Two opposite states, one button in both, so this is not a control the
 * other state hides. (User direction, 2026-10-15.)
 */
const WALLET_CARD_SRC = readFileSync(
  join(ROOT, "components/driver/wallet-card.tsx"),
  "utf8",
);
const WALLET_CARD_CODE = codeOnly(WALLET_CARD_SRC);
const walletButtons = [...WALLET_CARD_CODE.matchAll(/<button/g)].length;
check(
  "the balance card offers exactly one action, and it is Payout Activity",
  `${walletButtons} button(s); Payout Activity ${WALLET_CARD_CODE.includes("Payout Activity")}; ` +
    `Weekly Earnings ${WALLET_CARD_CODE.includes("Weekly Earnings")}`,
  walletButtons === 1 &&
    WALLET_CARD_CODE.includes("Payout Activity") &&
    // ⛔ The removed one, in the CODE only — the comment above explains why it
    // went and names it, so an unstripped sweep would fail against correct code.
    !WALLET_CARD_CODE.includes("Weekly Earnings") &&
    !WALLET_CARD_CODE.includes("/weekly-earnings"),
);
/**
 * ⛔ Full width, not a lone cell in a two-column grid — a single button left in
 * the old grid sits in half the card with a gap beside it, which is neither
 * capture.
 */
check(
  "...drawn full width, not left in the two-column grid it shared",
  `w-full ${/className="[^"]*w-full/.test(WALLET_CARD_CODE)}; ` +
    `grid-cols-2 ${WALLET_CARD_CODE.includes("grid-cols-2")}`,
  /className="[^"]*w-full/.test(WALLET_CARD_CODE) &&
    !WALLET_CARD_CODE.includes("grid-cols-2") &&
    // ⛔ Positive control: the file really was read and really is the card.
    WALLET_CARD_CODE.includes("getBalanceSummary()"),
);
/**
 * ⚠️ **`/weekly-earnings` is now UNREACHABLE, and that is recorded rather than
 * tidied away.** This button was its only entry point anywhere in the app.
 * Deleting the screen as well would be a claim about production that no capture
 * supports — absence of a capture is not evidence — so the route stays until
 * someone shoots the released app. This check pins the state so it cannot be
 * forgotten: the page exists, and nothing links to it.
 */
const linksToWeekly = sourceFiles()
  // ⚠️ The page itself is not a link to itself.
  .filter((file) => !file.endsWith("app/weekly-earnings/page.tsx"))
  .filter((file) => codeOnly(readFileSync(file, "utf8")).includes("/weekly-earnings"));
check(
  "⚠️ the weekly-earnings screen still exists and nothing links to it",
  `page ${existsSync(join(ROOT, "app/weekly-earnings/page.tsx"))}; ` +
    `${linksToWeekly.length} link(s)` +
    (linksToWeekly.length ? `: ${linksToWeekly.map((f) => f.replace(ROOT + "/", "")).join(", ")}` : ""),
  existsSync(join(ROOT, "app/weekly-earnings/page.tsx")) && linksToWeekly.length === 0,
);

// ---------------------------------------------------------------------------
console.log(
  failures === 0
    ? "\n✅ verify-base: all checks passed\n"
    : `\n❌ verify-base: ${failures} check(s) failed\n`,
);
process.exit(failures === 0 ? 0 : 1);
