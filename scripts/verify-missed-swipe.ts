/**
 * Missed Swipe (slice 03) checks.
 *
 * Run with `bun scripts/verify-missed-swipe.ts`.
 *
 * ⛔⛔ **Written behavioural on purpose.** The Cancel at Door gate was built out
 * of source greps and 8 of its 9 guard checks sat green through a deliberate
 * full reversal, because the branch had moved into a keyed record lookup the
 * regexes could not see. Everything here that can be asserted by CALLING the
 * rule is asserted that way; the handful of greps left carry positive controls
 * so a regex that matches nothing cannot pass as a regex that found nothing
 * wrong.
 *
 * Every check reports a DENOMINATOR, and every expectation is a literal
 * declared here — never derived from the subject.
 */
import { readFileSync } from "node:fs";
import {
  anchorMatched,
  departedAnchor,
  detectMissedSwipe,
  DEPARTURE_MARGIN_MILES,
  canSubmitUnedited,
  getMissingAnchors,
  getUnrecordedSwipes,
  matchAnchor,
  MARK_FOR_ANCHOR,
  MISSED_SWIPE_RADIUS_MILES,
  offeredSwipe,
  routeMissedSwipe,
  swipeClockFor,
  type SwipeAnchor,
} from "../lib/driver-data/missed-swipe-rules";
import {
  mockInProgressTrips,
  type LocationRecord,
  type Trip,
  type TripLeg,
} from "../lib/driver-data/mock-trips";
import { walkLocationRecords } from "../lib/driver-data/no-show-rules";
import {
  buildSupportFormCase,
  SWIPE_TIME_SEQUENCE,
  WAIT_TIME_SEQUENCE,
} from "../lib/support-data/case-registry";
import { ISSUE_MISSED_SWIPE, ISSUE_RIDER_NO_SHOW } from "../lib/support-data/issue-types";
import { buildPrefilledValues } from "../lib/support/prefill";
import { canSubmitCase, isFieldVisible } from "../lib/support/field-rules";
import { getTimeOrderWarnings } from "../lib/support/time-order";
import { getLegOptions } from "../lib/support-data/leg-options";
import {
  recordSessionSwipe,
  resetSessionSwipes,
  sessionSwipeCount,
  withSessionSwipes,
} from "../lib/driver-data/session-swipes";

let passed = 0;
const failures: string[] = [];
function check(label: string, condition: boolean, detail = "") {
  if (condition) passed += 1;
  else failures.push(`${label}${detail ? ` — ${detail}` : ""}`);
}

const section = (name: string) => console.log(`\n${name}`);

/** "11:20 AM" → minutes past midnight. -1 for anything unreadable. */
function toMinutes(clock: string): number {
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(clock.trim());
  if (!match) return -1;
  const [, h, m, meridiem] = match;
  return ((Number(h) % 12) + (meridiem.toUpperCase() === "PM" ? 12 : 0)) * 60 + Number(m);
}

/** The three seeded rides, declared by id so a rename or deletion fails here. */
const SEEDS = {
  postpone: "1049800381",
  bothConfirmed: "1049800382",
  dropoffUnconfirmable: "1049800383",
} as const;

function ride(id: string): Trip {
  const trip = mockInProgressTrips.find((t) => t.id === id);
  if (!trip) throw new Error(`seed ride ${id} is missing`);
  return trip;
}
function firstLeg(id: string): TripLeg {
  const leg = ride(id).legs.find((l) => l.progress);
  if (!leg) throw new Error(`seed ride ${id} has no swipe leg`);
  return leg;
}

// ═══════════════════════════════════════════════════════════════════
section("1. The seeds exist and are the states they claim");

check("three Missed Swipe rides are seeded",
  Object.values(SEEDS).every((id) => mockInProgressTrips.some((t) => t.id === id)),
  `${Object.values(SEEDS).length} ids across ${mockInProgressTrips.length} in-progress trips`);

/** What each seed's leg is MISSING — literals, not read off the seed. */
const EXPECTED_MISSING: Record<string, SwipeAnchor[]> = {
  [SEEDS.postpone]: ["pickup", "dropoff"],
  [SEEDS.bothConfirmed]: ["pickup", "dropoff"],
  [SEEDS.dropoffUnconfirmable]: ["dropoff"],
};
for (const [id, expected] of Object.entries(EXPECTED_MISSING)) {
  const actual = getMissingAnchors(firstLeg(id));
  check(`${id} is missing exactly ${expected.join("+")}`,
    actual.join(",") === expected.join(","), `got ${actual.join(",") || "none"}`);
}
check("every seeded ride was checked for its missing marks",
  Object.keys(EXPECTED_MISSING).length === 3, `${Object.keys(EXPECTED_MISSING).length}`);

// The en-route mark is never the missing one — the case depends on it.
check("every seed has the en-route mark",
  Object.values(SEEDS).every((id) => Boolean(firstLeg(id).progress?.startedAt)),
  `${Object.values(SEEDS).length} seeds`);
check("no seed is missing en-route",
  Object.values(SEEDS).every((id) => !getUnrecordedSwipes(firstLeg(id)).includes("startedAt")),
  `${Object.values(SEEDS).length} seeds`);

check("the anchor→mark map is the production sequence",
  MARK_FOR_ANCHOR.pickup === "pickedUpAt" && MARK_FOR_ANCHOR.dropoff === "droppedOffAt",
  `${MARK_FOR_ANCHOR.pickup} / ${MARK_FOR_ANCHOR.dropoff}`);

// ═══════════════════════════════════════════════════════════════════
section("2. Routing — the whole truth table, as literals");

const ROUTE_TABLE: Array<{
  missing: SwipeAnchor[];
  aboard: boolean | null;
  expect: string;
}> = [
  { missing: [], aboard: null, expect: "nothing-missing" },
  { missing: [], aboard: true, expect: "nothing-missing" },
  { missing: ["pickup", "dropoff"], aboard: true, expect: "postpone" },
  { missing: ["pickup", "dropoff"], aboard: false, expect: "form:pickup,dropoff" },
  { missing: ["pickup", "dropoff"], aboard: null, expect: "form:pickup,dropoff" },
  { missing: ["pickup"], aboard: true, expect: "postpone" },
  { missing: ["pickup"], aboard: false, expect: "form:pickup,dropoff" },
  { missing: ["pickup"], aboard: null, expect: "form:pickup,dropoff" },
  { missing: ["dropoff"], aboard: null, expect: "form:dropoff" },
  { missing: ["dropoff"], aboard: false, expect: "form:dropoff" },
  // ⚠️ A missed DROP-OFF with "member aboard" is nonsense the UI never asks,
  // and the rule must not quietly honour it — a postpone here would withhold a
  // swipe on a leg whose only missing mark is the last one.
  { missing: ["dropoff"], aboard: true, expect: "form:dropoff" },
];
function describe(route: ReturnType<typeof routeMissedSwipe>): string {
  return route.kind === "form" ? `form:${route.asks.join(",")}` : route.kind;
}
for (const row of ROUTE_TABLE) {
  const actual = describe(routeMissedSwipe({ missing: row.missing, memberAboard: row.aboard }));
  check(`[${row.missing.join("+") || "none"}] aboard=${row.aboard} → ${row.expect}`,
    actual === row.expect, `got ${actual}`);
}
check("the route table covers every case declared",
  ROUTE_TABLE.length === 11, `${ROUTE_TABLE.length} rows`);
// The three outcomes must all be reachable, or the table is testing one branch.
const outcomes = new Set(ROUTE_TABLE.map((r) => r.expect.split(":")[0]));
check("all three route kinds occur in the table",
  outcomes.size === 3, `${[...outcomes].join(", ")}`);
check("postpone and form genuinely disagree on the same missing set",
  describe(routeMissedSwipe({ missing: ["pickup"], memberAboard: true })) !==
    describe(routeMissedSwipe({ missing: ["pickup"], memberAboard: false })),
  "the member question changes nothing");

// ═══════════════════════════════════════════════════════════════════
section("3. The unblock — postponement moves the button, not the record");

const OFFERED: Array<[("start" | "pick-up" | "drop-off" | null), boolean, string | null]> = [
  ["pick-up", true, "drop-off"],
  ["pick-up", false, "pick-up"],
  ["drop-off", true, "drop-off"],
  ["drop-off", false, "drop-off"],
  ["start", true, "start"],
  ["start", false, "start"],
  [null, true, null],
  [null, false, null],
];
for (const [next, postponed, expected] of OFFERED) {
  check(`offeredSwipe(${next}, postponed=${postponed}) === ${expected}`,
    offeredSwipe(next, postponed) === expected, `got ${offeredSwipe(next, postponed)}`);
}
check("the offered-swipe table is complete",
  OFFERED.length === 8, `${OFFERED.length} rows`);
check("postponement changes exactly one of the eight",
  OFFERED.filter(([next, p]) => offeredSwipe(next, p) !== next).length === 1,
  `${OFFERED.filter(([next, p]) => offeredSwipe(next, p) !== next).length} changed`);

// ⛔⛔ The claim the whole slice rests on: unblocking must NOT fabricate a mark.
const postponedLeg = firstLeg(SEEDS.postpone);
check("postponing invents no pick-up time",
  postponedLeg.progress?.pickedUpAt === null,
  `seed holds ${String(postponedLeg.progress?.pickedUpAt)}`);
check("a postponed leg is still missing the pick-up",
  getMissingAnchors(postponedLeg).includes("pickup"), "pick-up no longer missing");

// ═══════════════════════════════════════════════════════════════════
section("3b. Detection — the app notices, the driver no longer has to");

/** A leg built from a trail, for exercising the departure rule directly. */
function legWithTrail(
  trail: Array<[number, number]>,
  progress: Partial<{ startedAt: string | null; pickedUpAt: string | null; droppedOffAt: string | null }> = {}
): TripLeg {
  const base = firstLeg(SEEDS.postpone);
  return {
    ...base,
    progress: {
      startedAt: "9:00 AM",
      pickedUpAt: null,
      droppedOffAt: null,
      ...progress,
    },
    locationRecords: trail.map(([age, miles]) => ({
      ageMinutes: age,
      distanceMiles: miles,
      at: "9:00 AM",
    })),
  };
}

/** [name, trail as (ageMinutes, miles from pick-up), expected kind, expected basis] */
const DEPARTURE_TABLE: Array<[string, Array<[number, number]>, string, string | null]> = [
  ["sitting at the pick-up", [[20, 0.1], [10, 0.08], [1, 0.05]], "still_there", null],
  ["wandered, then came back", [[20, 0.05], [10, 3.0], [1, 0.1]], "still_there", null],
  ["was there, then drove off", [[20, 0.05], [10, 2.0], [1, 8.0]], "left", "confirmed"],
  // ⛔ The case the whole margin exists for. A driver DRIVING TO a pick-up is
  // never at it, and without the recede test every en-route leg in the app
  // would raise a notice.
  ["still driving to it", [[20, 12.0], [10, 6.0], [1, 2.0]], "never_there", null],
  ["approached and receded", [[20, 12.0], [10, 1.5], [1, 5.0]], "left", "inferred"],
  ["receded, but inside the margin", [[20, 12.0], [10, 1.5], [1, 2.0]], "never_there", null],
  ["never anywhere near", [[20, 30.0], [10, 30.0], [1, 30.0]], "never_there", null],
  ["no trail at all", [], "never_there", null],
];
for (const [name, trail, kind, basis] of DEPARTURE_TABLE) {
  const actual = departedAnchor(legWithTrail(trail), "pickup");
  const actualBasis = actual.kind === "left" ? actual.basis : null;
  check(`departure: ${name} → ${kind}${basis ? `/${basis}` : ""}`,
    actual.kind === kind && actualBasis === basis,
    `got ${actual.kind}${actualBasis ? `/${actualBasis}` : ""}`);
}
check("the departure table is complete",
  DEPARTURE_TABLE.length === 8, `${DEPARTURE_TABLE.length} rows`);
check("all three departure kinds occur",
  new Set(DEPARTURE_TABLE.map(([, , k]) => k)).size === 3,
  `${[...new Set(DEPARTURE_TABLE.map(([, , k]) => k))].join(", ")}`);
check("both bases occur",
  new Set(DEPARTURE_TABLE.map(([, , , b]) => b).filter(Boolean)).size === 2,
  "only one basis is reachable");
check("the margin is the declared 1 mile",
  DEPARTURE_MARGIN_MILES === 1, `${DEPARTURE_MARGIN_MILES}`);
// ⛔ The margin must DECIDE: the same approach at either side of it.
check("the margin changes the answer on its own",
  departedAnchor(legWithTrail([[20, 12], [10, 1.5], [1, 2.0]]), "pickup").kind !==
    departedAnchor(legWithTrail([[20, 12], [10, 1.5], [1, 5.0]]), "pickup").kind,
  "the recede test is inert");

/** ⛔ A leg that has not started has no mark to have missed. */
check("a leg with no en-route mark is never detected",
  detectMissedSwipe(legWithTrail([[20, 0.05], [1, 8.0]], { startedAt: null })) === null,
  "a notice was raised on a leg that had not begun");
check("...while the same trail on a started leg IS detected",
  detectMissedSwipe(legWithTrail([[20, 0.05], [1, 8.0]])) !== null,
  "the started control does not detect, so the check above proves nothing");

/** ⛔ Marks fill left to right: never ask about the drop-off first. */
const bothMissing = detectMissedSwipe(legWithTrail([[20, 0.05], [1, 8.0]]));
check("a leg missing both marks is asked about the PICK-UP",
  bothMissing?.anchor === "pickup", `${bothMissing?.anchor}`);

/**
 * ⛔⛔ **The false-positive sweep, over EVERY in-progress ride.**
 *
 * The notice opens itself now, so a wrong one is not a dead link — it is a modal
 * on a ride that has nothing to do with this case. Two of these rides are the
 * Rider No-Show demos, and one of them (`1049800377`) is deliberately 0.6 miles
 * from a hospital pick-up with the pick-up unrecorded: the exact shape a careless
 * "is the driver at the pick-up?" rule would fire on.
 */
const EXPECTED_DETECTION: Record<string, string> = {
  "1049800371": "none",            // not started — no mark to have missed
  "1049800373": "none",            // at the pick-up right now (no-show demo)
  "1049800377": "none",            // 0.6 mi out and never nearer (no-show demo)
  "1049800376": "none",            // no trail
  "1049800379": "none",            // every mark recorded
  "1049800381": "pickup/confirmed",
  "1049800382": "pickup/confirmed",
  "1049800383": "dropoff/inferred",
};
let swept = 0;
for (const trip of mockInProgressTrips) {
  const leg = trip.legs.find((l) => l.progress);
  const found = leg ? detectMissedSwipe(leg) : null;
  const actual = found ? `${found.anchor}/${found.basis}` : "none";
  const expected = EXPECTED_DETECTION[trip.id];
  swept += 1;
  check(`detection on ${trip.id} → ${expected ?? "UNDECLARED"}`,
    actual === expected, `got ${actual}`);
}
check("every in-progress ride was swept",
  swept === Object.keys(EXPECTED_DETECTION).length && swept === mockInProgressTrips.length,
  `${swept} ridden of ${mockInProgressTrips.length} seeded, ${Object.keys(EXPECTED_DETECTION).length} declared`);
/** The sweep must contain both answers, or it only proves one of them. */
const fires = Object.values(EXPECTED_DETECTION).filter((v) => v !== "none").length;
check("the sweep covers rides that DO and DO NOT detect",
  fires === 3 && fires < swept, `${fires} fire, ${swept - fires} stay quiet`);

// ═══════════════════════════════════════════════════════════════════
section("4. Evidence — what the location trail can and cannot say");

/** Literal expectations, one per seed per anchor. */
const EXPECTED_EVIDENCE: Array<[string, SwipeAnchor, string]> = [
  [SEEDS.postpone, "pickup", "matched"],
  // ⚠️ Correct, and worth saying why: ride 381's driver is still DRIVING to the
  // drop-off with the member aboard, so no fix can place them there yet. The
  // postponed form asks only about the pick-up, which does match — the trail
  // catches up as the leg does.
  [SEEDS.postpone, "dropoff", "no_fix_near"],
  [SEEDS.bothConfirmed, "pickup", "matched"],
  [SEEDS.bothConfirmed, "dropoff", "matched"],
  [SEEDS.dropoffUnconfirmable, "pickup", "matched"],
  [SEEDS.dropoffUnconfirmable, "dropoff", "no_fix_near"],
];
for (const [id, anchor, expected] of EXPECTED_EVIDENCE) {
  const actual = matchAnchor(firstLeg(id), anchor).kind;
  check(`${id} ${anchor} → ${expected}`, actual === expected, `got ${actual}`);
}
check("every seed was checked at both ends",
  EXPECTED_EVIDENCE.length === 6, `${EXPECTED_EVIDENCE.length}`);

// Both answers must occur, or the seeds only demonstrate one half of the rule.
const kinds = new Set(EXPECTED_EVIDENCE.map(([, , k]) => k));
check("the seeds show a match AND a miss", kinds.size === 2, `${[...kinds].join(", ")}`);

// ⚠️ The third kind cannot come from a seeded ride (every one of them has a
// trail), so it is proven on a constructed leg instead — and on a REAL legacy
// leg, which is the case that actually ships.
const noTraceLeg: TripLeg = { ...firstLeg(SEEDS.postpone), locationRecords: [] };
check("a leg with no fixes reports no_trace",
  matchAnchor(noTraceLeg, "pickup").kind === "no_trace",
  matchAnchor(noTraceLeg, "pickup").kind);
const legacyLeg: TripLeg = {
  ...firstLeg(SEEDS.postpone),
  locationRecords: [{ ageMinutes: 5, distanceMiles: 0.05 }],
};
check("a record with no drop-off distance cannot speak to the drop-off",
  matchAnchor(legacyLeg, "dropoff").kind === "no_trace",
  matchAnchor(legacyLeg, "dropoff").kind);
check("...but still speaks to the pick-up",
  matchAnchor(legacyLeg, "pickup").kind === "matched",
  matchAnchor(legacyLeg, "pickup").kind);

// The radius is the thing that decides, so prove it decides.
const justInside: TripLeg = {
  ...firstLeg(SEEDS.postpone),
  locationRecords: [{ ageMinutes: 9, distanceMiles: MISSED_SWIPE_RADIUS_MILES, dropoffDistanceMiles: 9 }],
};
const justOutside: TripLeg = {
  ...firstLeg(SEEDS.postpone),
  locationRecords: [{ ageMinutes: 9, distanceMiles: MISSED_SWIPE_RADIUS_MILES + 0.01, dropoffDistanceMiles: 9 }],
};
check("a fix at exactly the radius matches",
  matchAnchor(justInside, "pickup").kind === "matched", matchAnchor(justInside, "pickup").kind);
check("a fix just outside it does not",
  matchAnchor(justOutside, "pickup").kind === "no_fix_near", matchAnchor(justOutside, "pickup").kind);
check("the radius is the measured 0.25 miles",
  MISSED_SWIPE_RADIUS_MILES === 0.25, `${MISSED_SWIPE_RADIUS_MILES}`);

// Arrival, not departure: the OLDEST near fix is the one reported.
const twoNear: TripLeg = {
  ...firstLeg(SEEDS.postpone),
  locationRecords: [
    { ageMinutes: 12, distanceMiles: 0.1, dropoffDistanceMiles: 9 },
    { ageMinutes: 47, distanceMiles: 0.2, dropoffDistanceMiles: 9 },
    { ageMinutes: 30, distanceMiles: 0.15, dropoffDistanceMiles: 9 },
  ],
};
const arrival = matchAnchor(twoNear, "pickup");
check("the reported time is the oldest near fix, i.e. arrival",
  arrival.kind === "matched" && arrival.arrivedAgoMinutes === 47,
  arrival.kind === "matched" ? `${arrival.arrivedAgoMinutes}` : arrival.kind);

// ⛔ The no-show rule must be untouched by the second anchor.
const dropoffOnly: LocationRecord[] = [{ ageMinutes: 2, distanceMiles: 9, dropoffDistanceMiles: 0.01 }];
check("a drop-off-only fix is still FAR for the no-show walk",
  walkLocationRecords(dropoffOnly).ok === false,
  "the second anchor leaked into the presence rule");

// ═══════════════════════════════════════════════════════════════════
section("5. The form asks for exactly what is missing and unknown");

function visibleFields(asks: SwipeAnchor[], leg: TripLeg): string[] {
  const supportCase = buildSupportFormCase({
    includeIssues: [ISSUE_MISSED_SWIPE],
    missedSwipe: asks.map((anchor) => ({ anchor, confirmed: anchorMatched(matchAnchor(leg, anchor)) })),
  });
  const values = { ...buildPrefilledValues(supportCase, ride(SEEDS.postpone), leg), issue: ISSUE_MISSED_SWIPE };
  return supportCase.fields
    .filter((field) => isFieldVisible(field, values))
    .map((field) => field.id);
}

/** Declared field sets. Change the form and these must change with it. */
const EXPECTED_FIELDS: Array<[string, SwipeAnchor[], string, string[]]> = [
  ["both ends confirmed", ["pickup", "dropoff"], SEEDS.bothConfirmed,
    ["issue", "legId", "enRouteTime", "pickupTime", "dropOffTime", "reason", "attachment"]],
  ["drop-off unconfirmable", ["dropoff"], SEEDS.dropoffUnconfirmable,
    ["issue", "legId", "enRouteTime", "pickupTime", "dropOffTime", "dropoffWhere", "reason", "attachment"]],
  ["postponed pick-up, confirmed", ["pickup"], SEEDS.postpone,
    ["issue", "legId", "enRouteTime", "pickupTime", "dropOffTime", "reason", "attachment"]],
];
for (const [name, asks, id, expected] of EXPECTED_FIELDS) {
  const actual = visibleFields(asks, firstLeg(id));
  check(`${name}: ${expected.length} fields`, actual.join(",") === expected.join(","),
    `got ${actual.join(",")}`);
}
check("every declared field set was built", EXPECTED_FIELDS.length === 3, `${EXPECTED_FIELDS.length}`);

// ⛔⛔ The claim: a "where were you" field exists ONLY where the app cannot say.
const unconfirmedPickup = visibleFields(["pickup", "dropoff"], firstLeg(SEEDS.dropoffUnconfirmable));
check("an unconfirmable drop-off is asked WHERE",
  unconfirmedPickup.includes("dropoffWhere"), unconfirmedPickup.join(","));
check("a confirmed pick-up is NOT asked where",
  !unconfirmedPickup.includes("pickupWhere"), unconfirmedPickup.join(","));
check("a confirmed drop-off is NOT asked where",
  !visibleFields(["pickup", "dropoff"], firstLeg(SEEDS.bothConfirmed)).includes("dropoffWhere"),
  "asked where it already knows");

// A time the driver supplies must stay editable; a recorded one must lock.
function field(asks: SwipeAnchor[], leg: TripLeg, id: string) {
  const supportCase = buildSupportFormCase({
    includeIssues: [ISSUE_MISSED_SWIPE],
    missedSwipe: asks.map((anchor) => ({ anchor, confirmed: anchorMatched(matchAnchor(leg, anchor)) })),
  });
  return supportCase.fields.find((f) => f.id === id);
}
check("an ASKED pick-up time never locks",
  field(["pickup"], firstLeg(SEEDS.postpone), "pickupTime")?.lockWhenPrefilled !== true,
  "a guess off the trail was locked");
check("an UNASKED pick-up time locks",
  field(["dropoff"], firstLeg(SEEDS.dropoffUnconfirmable), "pickupTime")?.lockWhenPrefilled === true,
  "a recorded swipe was left editable");
check("an asked time is required",
  field(["pickup"], firstLeg(SEEDS.postpone), "pickupTime")?.required === true, "not required");
check("an unasked time is not required",
  field(["dropoff"], firstLeg(SEEDS.dropoffUnconfirmable), "pickupTime")?.required !== true, "required");
check("the asked and unasked pick-up fields really differ",
  field(["pickup"], firstLeg(SEEDS.postpone), "pickupTime")?.prefillFrom !==
    field(["dropoff"], firstLeg(SEEDS.dropoffUnconfirmable), "pickupTime")?.prefillFrom,
  "both prefill from the same source");

// Help text must change with the evidence, or the form says the same thing either way.
check("confirmed and unconfirmed drop-offs carry different help text",
  field(["dropoff"], firstLeg(SEEDS.bothConfirmed), "dropOffTime")?.helpText !==
    field(["dropoff"], firstLeg(SEEDS.dropoffUnconfirmable), "dropOffTime")?.helpText,
  "same copy for both");

// ═══════════════════════════════════════════════════════════════════
section("6. Prefill — filled when known, blank when not");

function prefilled(asks: SwipeAnchor[], id: string): Record<string, string> {
  const leg = firstLeg(id);
  const supportCase = buildSupportFormCase({
    includeIssues: [ISSUE_MISSED_SWIPE],
    missedSwipe: asks.map((anchor) => ({ anchor, confirmed: anchorMatched(matchAnchor(leg, anchor)) })),
  });
  return { ...buildPrefilledValues(supportCase, ride(id), leg), issue: ISSUE_MISSED_SWIPE };
}

const both = prefilled(["pickup", "dropoff"], SEEDS.bothConfirmed);
check("a confirmed pick-up prefills a time", both.pickupTime !== "", `"${both.pickupTime}"`);
check("a confirmed drop-off prefills a time", both.dropOffTime !== "", `"${both.dropOffTime}"`);
check("prefilled times are HH:MM for a time input",
  /^\d{2}:\d{2}$/.test(both.pickupTime) && /^\d{2}:\d{2}$/.test(both.dropOffTime),
  `${both.pickupTime} / ${both.dropOffTime}`);
check("the en-route mark comes through recorded",
  /^\d{2}:\d{2}$/.test(both.enRouteTime), `"${both.enRouteTime}"`);

const unconf = prefilled(["dropoff"], SEEDS.dropoffUnconfirmable);
check("an unconfirmable drop-off prefills NOTHING", unconf.dropOffTime === "", `"${unconf.dropOffTime}"`);
check("...while its recorded pick-up still comes through",
  /^\d{2}:\d{2}$/.test(unconf.pickupTime), `"${unconf.pickupTime}"`);
check("a blank and a filled time really coexist",
  both.dropOffTime !== "" && unconf.dropOffTime === "", "prefill is constant across seeds");

// ⭐ "If everything is there all they need to do is click submit" — minus the
// reason, which is the one answer no trail can hold.
check("canSubmitUnedited is true where the trail covers both ends",
  canSubmitUnedited(firstLeg(SEEDS.bothConfirmed), ["pickup", "dropoff"]), "false");
check("canSubmitUnedited is false where it does not",
  !canSubmitUnedited(firstLeg(SEEDS.dropoffUnconfirmable), ["dropoff"]), "true");

function caseFor(asks: SwipeAnchor[], id: string) {
  const leg = firstLeg(id);
  return buildSupportFormCase({
    includeIssues: [ISSUE_MISSED_SWIPE],
    missedSwipe: asks.map((anchor) => ({ anchor, confirmed: anchorMatched(matchAnchor(leg, anchor)) })),
  });
}
const readyCase = caseFor(["pickup", "dropoff"], SEEDS.bothConfirmed);
check("the fully-prefilled form is blocked only by the reason",
  !canSubmitCase(readyCase.fields, both) &&
    canSubmitCase(readyCase.fields, { ...both, reason: "Phone died mid-trip." }),
  "submit does not hinge on the reason alone");

const gapCase = caseFor(["dropoff"], SEEDS.dropoffUnconfirmable);
check("the gapped form needs the time AND the place",
  !canSubmitCase(gapCase.fields, { ...unconf, reason: "x" }) &&
    !canSubmitCase(gapCase.fields, { ...unconf, reason: "x", dropOffTime: "14:30" }) &&
    canSubmitCase(gapCase.fields, { ...unconf, reason: "x", dropOffTime: "14:30", dropoffWhere: "rear entrance" }),
  "a missing answer did not block submit");

// ⛔⛔ Found by WALKING it. The prefill originally came off `ageMinutes`, which
// is relative to the REAL clock, while every other mark on the leg is a seeded
// clock face — so the form proposed a 3:19 AM pick-up for a leg that went
// en-route at 11:08 AM, and then warned the driver their own prefilled answer
// was impossible. A form that argues with itself is worse than a blank one.
for (const [name, asks, id] of EXPECTED_FIELDS) {
  const leg = firstLeg(id);
  const supportCase = caseFor(asks, id);
  const warnings = getTimeOrderWarnings(
    supportCase.fields,
    prefilled(asks, id),
    supportCase.timeSequence ?? []
  );
  check(`${name}: the prefill does not warn against itself`,
    Object.keys(warnings).length === 0,
    Object.entries(warnings).map(([k, v]) => `${k}: ${v.slice(0, 60)}`).join(" | "));
}
check("every seeded form was checked for self-contradiction",
  EXPECTED_FIELDS.length === 3, `${EXPECTED_FIELDS.length}`);
// The checker must be capable of firing, or the three above prove nothing.
const warnControl = getTimeOrderWarnings(
  readyCase.fields,
  { ...both, pickupTime: "00:01" },
  readyCase.timeSequence ?? []
);
check("...and the order checker fires when a time really is impossible",
  Object.keys(warnControl).length > 0, "the sequence checker is inert");

// ═══════════════════════════════════════════════════════════════════
section("7. The seeded trail is internally consistent");

let withClock = 0;
let totalFixes = 0;
let orderBreaks = 0;
for (const id of Object.values(SEEDS)) {
  const records = firstLeg(id).locationRecords ?? [];
  totalFixes += records.length;
  withClock += records.filter((r) => r.at).length;
  // Newest by clock must be newest by age. A seed that disagrees would make the
  // rule pick one fix and the form display another.
  const byAge = [...records].sort((a, b) => b.ageMinutes - a.ageMinutes);
  const clocks = byAge.map((r) => toMinutes(r.at ?? ""));
  for (let i = 1; i < clocks.length; i += 1) {
    if (clocks[i] <= clocks[i - 1]) orderBreaks += 1;
  }
}
check("every Missed Swipe fix carries a clock",
  withClock === totalFixes, `${withClock} of ${totalFixes}`);
check("there are fixes to check", totalFixes === 17, `${totalFixes}`);
check("clock order agrees with age order", orderBreaks === 0, `${orderBreaks} breaks`);

// Each matched arrival must fall AFTER the leg's own en-route mark.
let afterEnRoute = 0;
let arrivals = 0;
for (const [id, anchor, kind] of EXPECTED_EVIDENCE) {
  if (kind !== "matched") continue;
  arrivals += 1;
  const leg = firstLeg(id);
  const evidence = matchAnchor(leg, anchor);
  if (evidence.kind !== "matched" || !evidence.arrivedAt) continue;
  if (toMinutes(evidence.arrivedAt) > toMinutes(leg.progress?.startedAt ?? "")) {
    afterEnRoute += 1;
  }
}
check("every matched arrival is after the en-route mark",
  afterEnRoute === arrivals, `${afterEnRoute} of ${arrivals}`);
check("there were arrivals to check", arrivals === 4, `${arrivals}`);

// ═══════════════════════════════════════════════════════════════════
section("8. One source for a session swipe");

/**
 * ⛔⛔ Found by WALKING it, and the reason `session-swipes` exists.
 *
 * The overlay started in React state, so the leg-options registry — which
 * rebuilds from the seed arrays on every call — could not see it. The form's
 * own "re-derive when the leg changes" effect looked the leg up there, got the
 * pristine one, and wiped the drop-off the driver had just swiped.
 */
resetSessionSwipes();
check("the overlay starts empty", sessionSwipeCount() === 0, `${sessionSwipeCount()}`);
const beforeOption = getLegOptions("in-progress").find((o) => o.legId === SEEDS.postpone);
check("the seeded leg has no drop-off before the swipe",
  beforeOption?.leg.progress?.droppedOffAt == null,
  `${String(beforeOption?.leg.progress?.droppedOffAt)}`);
recordSessionSwipe(SEEDS.postpone, "droppedOffAt", "11:55 AM");
const afterOption = getLegOptions("in-progress").find((o) => o.legId === SEEDS.postpone);
check("the leg-options registry sees a session swipe",
  afterOption?.leg.progress?.droppedOffAt === "11:55 AM",
  `${String(afterOption?.leg.progress?.droppedOffAt)}`);
check("...and the SEED itself is untouched",
  firstLeg(SEEDS.postpone).progress?.droppedOffAt == null,
  "the overlay mutated the seed");
check("...while other legs are unaffected",
  getLegOptions("in-progress").find((o) => o.legId === SEEDS.bothConfirmed)?.leg.progress
    ?.droppedOffAt == null,
  "the overlay leaked across legs");
resetSessionSwipes();
check("resetting clears it", sessionSwipeCount() === 0, `${sessionSwipeCount()}`);

/**
 * ⛔⛔ Found by WALKING it, twice over. A session swipe stamped with the DEVICE
 * clock gave ride 381 an en-route of 11:08 AM and a drop-off of 3:59 AM, and the
 * form's own order checker then told the driver the swipe they had just made was
 * impossible. The clock has to come from the leg's trail, not the phone.
 */
for (const id of Object.values(SEEDS)) {
  const stamp = swipeClockFor(firstLeg(id));
  check(`${id} stamps a swipe from its own trail`,
    stamp !== null && toMinutes(stamp) > toMinutes(firstLeg(id).progress?.startedAt ?? ""),
    `${String(stamp)} vs en-route ${String(firstLeg(id).progress?.startedAt)}`);
}
check("every seed was checked for its stamp",
  Object.values(SEEDS).length === 3, `${Object.values(SEEDS).length}`);
check("a leg with no trail has no stamp to offer",
  swipeClockFor({ ...firstLeg(SEEDS.postpone), locationRecords: [] }) === null,
  "a stamp was invented from nothing");

// The postponed flow end to end: swipe the drop-off, then the pick-up form must
// not contradict it.
resetSessionSwipes();
const postponeLeg = firstLeg(SEEDS.postpone);
recordSessionSwipe(postponeLeg.id, "droppedOffAt", swipeClockFor(postponeLeg) ?? "");
const afterSwipe = withSessionSwipes(postponeLeg);
const postponeCase = buildSupportFormCase({
  includeIssues: [ISSUE_MISSED_SWIPE],
  missedSwipe: [{ anchor: "pickup", confirmed: anchorMatched(matchAnchor(afterSwipe, "pickup")) }],
});
const postponeValues: Record<string, string> = {
  ...buildPrefilledValues(postponeCase, ride(SEEDS.postpone), afterSwipe),
  issue: ISSUE_MISSED_SWIPE,
};
check("the swiped drop-off reaches the postponed form",
  /^\d{2}:\d{2}$/.test(postponeValues.dropOffTime), `"${postponeValues.dropOffTime}"`);
const postponeWarnings = getTimeOrderWarnings(
  postponeCase.fields, postponeValues, postponeCase.timeSequence ?? []
);
check("...in an order the form does not argue with",
  Object.keys(postponeWarnings).length === 0,
  Object.entries(postponeWarnings).map(([k, v]) => `${k}: ${v.slice(0, 60)}`).join(" | "));
resetSessionSwipes();

// ═══════════════════════════════════════════════════════════════════
section("9. Negative controls — the other cases are untouched");

const noShowCase = buildSupportFormCase({ includeIssues: [ISSUE_RIDER_NO_SHOW] });
const MISSED_ONLY = ["enRouteTime", "pickupTime", "dropOffTime", "pickupWhere", "dropoffWhere", "attachment"];
const leaked = MISSED_ONLY.filter((id) => noShowCase.fields.some((f) => f.id === id));
check("no Missed Swipe field reaches a no-show build",
  leaked.length === 0, `${leaked.join(",")} of ${MISSED_ONLY.length}`);
check("...and the no-show build is not simply empty",
  noShowCase.fields.length > 5, `${noShowCase.fields.length} fields`);

check("a no-show build declares the WAIT sequence",
  noShowCase.timeSequence === WAIT_TIME_SEQUENCE, `${noShowCase.timeSequence?.join(",")}`);
check("a Missed Swipe build declares the SWIPE sequence",
  readyCase.timeSequence === SWIPE_TIME_SEQUENCE, `${readyCase.timeSequence?.join(",")}`);
check("the two sequences are different",
  WAIT_TIME_SEQUENCE.join(",") !== SWIPE_TIME_SEQUENCE.join(","), "identical");
check("the swipe sequence is in swipe order",
  SWIPE_TIME_SEQUENCE.join(",") === "enRouteTime,pickupTime,dropOffTime",
  SWIPE_TIME_SEQUENCE.join(","));

// Every Missed Swipe field must be gated, or it appears on every other case.
const ungated = readyCase.fields
  .filter((f) => MISSED_ONLY.includes(f.id))
  .filter((f) => !f.showIf);
check("every Missed Swipe field is gated on the issue",
  ungated.length === 0, `${ungated.map((f) => f.id).join(",")}`);
check("...and there were some to check",
  readyCase.fields.filter((f) => MISSED_ONLY.includes(f.id)).length >= 4,
  `${readyCase.fields.filter((f) => MISSED_ONLY.includes(f.id)).length}`);

// ═══════════════════════════════════════════════════════════════════
section("10. Wiring — with positive controls on every read");

const LAYOUT = readFileSync("components/driver/ride-detail-layout.tsx", "utf8");
const FORM = readFileSync("components/support/missed-swipe-form.tsx", "utf8");
check("the ride detail source was actually read", LAYOUT.length > 2000, `${LAYOUT.length} chars`);

/**
 * The source with comments stripped.
 *
 * ⚠️ Needed because this file's own rules are written out in prose beside the
 * code that follows them, so a grep for a thing that must be ABSENT matches the
 * comment explaining why it is absent. `verify-base`'s FORBIDDEN list has the
 * same bug in the other direction — it is a raw `includes()` over whole files,
 * so a banned string in a comment fails the build.
 */
const CODE = LAYOUT.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
check("stripping comments left the code behind",
  CODE.length > LAYOUT.length * 0.4 && CODE.length < LAYOUT.length,
  `${CODE.length} of ${LAYOUT.length} chars`);
check("the form source was actually read", FORM.length > 1000, `${FORM.length} chars`);

check("the ride detail offers the swipe through the rule",
  LAYOUT.includes("offeredSwipe("), "offeredSwipe is not called");
check("the app raises the notice itself",
  LAYOUT.includes("detectMissedSwipe("), "detectMissedSwipe is not called");
/**
 * ⛔⛔ The whole point of this change: the driver is no longer asked to
 * remember that they forgot. If the old link ever comes back, it comes back
 * beside a notice that already says the same thing.
 */
check("...and the driver-initiated link is gone",
  !/I already made this swipe/.test(CODE),
  "the manual claim link is still rendered");
check("a request on the ride suppresses the notice",
  LAYOUT.includes("findAnyForTrip(submittedForms, trip.id)"),
  "a ride already with Support would still be asked");
check("the notice is raised once per mark",
  LAYOUT.includes("hasSeenDetection(") && LAYOUT.includes("markDetectionSeen("),
  "no seen-tracking — the prompt reopens on every visit");
check("a no-show answer is handed to the no-show flow",
  LAYOUT.includes('router.push(`/my-rides/${trip.id}/no-show`)'),
  "a member who never came out would be filed as a missed swipe");
check("session swipes are laid over the seed",
  LAYOUT.includes("applySessionSwipes("), "applySessionSwipes is not called");
check("the postponed drop-off records a mark",
  LAYOUT.includes('recordSwipe(activeLeg, "droppedOffAt")'), "no drop-off is recorded");
check("...and clears the postponement that produced it",
  LAYOUT.includes("clearPostponedPickup(activeLeg.id)"), "the leg stays postponed");
check("the form is remounted per question set",
  LAYOUT.includes("key={`missed-swipe-${missedSwipeAsks.join(\"-\")}`}"),
  "no key — the second form reuses the first form's values");

/**
 * ⛔⛔ Found by WALKING it, not by any check here.
 *
 * The entry link first chose its question set from the button's own label:
 * drop-off button → ask about the drop-off. Right on an ordinary leg, and wrong
 * on a postponed one, where the button reads DROP OFF MEMBER *because* the
 * pick-up is missing — so the driver who postponed and then missed the drop-off
 * too would have filed a form that never mentioned the pick-up. Both halves are
 * asserted: the rule is called, and the literal that bypassed it is gone.
 */
check("the entry link routes through the rule",
  LAYOUT.includes("routeMissedSwipe({"), "routeMissedSwipe is not called in the layout");
check("...and no question set is hardcoded beside it",
  !/setMissedSwipeAsks\(\s*\[\s*"/.test(LAYOUT),
  "a literal anchor list is still passed to setMissedSwipeAsks");
check("the missing anchors come from the leg, not the button",
  LAYOUT.includes("getMissingAnchors(leg)") || LAYOUT.includes("getMissingAnchors(activeLeg)"),
  "the layout never asks the leg what is missing");
// The behaviour itself, independent of the source: a postponed leg files BOTH.
const postponedRoute = routeMissedSwipe({
  missing: getMissingAnchors(firstLeg(SEEDS.postpone)),
  memberAboard: false,
});
check("a postponed leg filed late asks about both ends",
  postponedRoute.kind === "form" && postponedRoute.asks.join(",") === "pickup,dropoff",
  describe(postponedRoute));

// ⚠️ Pending is the ONE thing this case keeps that Rider No-Show lost.
check("Missed Swipe is tracked",
  FORM.includes("appTracksStatus: true"), "appTracksStatus is not true");
check("the no-show form still is not",
  !readFileSync("components/support/rider-no-show-form.tsx", "utf8").includes("appTracksStatus: true"),
  "Pending leaked back into Rider No-Show");

console.log(
  failures.length === 0
    ? `\n✓ ${passed} checks passed`
    : `\n✗ ${failures.length} failed of ${passed + failures.length}\n` +
      failures.map((f) => `  · ${f}`).join("\n")
);
process.exit(failures.length === 0 ? 0 : 1);
