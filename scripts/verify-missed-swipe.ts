/**
 * Missed Swipe (slice 03) checks.  Run: `bun scripts/verify-missed-swipe.ts`
 *
 * ⛔⛔ **Behavioural wherever it can be.** The Cancel at Door gate was built out
 * of source greps and 8 of its 9 guard checks sat green through a deliberate
 * full reversal, because the branch had moved into a keyed record lookup the
 * regexes could not see. Anything assertable by CALLING a rule is asserted that
 * way; the greps that remain carry positive controls and run against the source
 * with comments stripped, because a grep for an ABSENT string otherwise matches
 * the comment explaining its absence.
 *
 * Every check reports a DENOMINATOR, and every expectation is a literal declared
 * here — never derived from the subject.
 */
import { readFileSync } from "node:fs";
import {
  anchorMatched,
  getMissingAnchors,
  getUnrecordedSwipes,
  insideGeofence,
  leavesSignatureMissing,
  MARK_FOR_ANCHOR,
  MISSED_SWIPE_RADIUS_MILES,
  matchAnchor,
  offeredSwipe,
  routeMissedSwipe,
  swipeClockFor,
  swipeNeedsConfirming,
  type SwipeAnchor,
} from "../lib/driver-data/missed-swipe-rules";
import {
  mockInProgressTrips,
  type Trip,
  type TripLeg,
} from "../lib/driver-data/mock-trips";
import {
  buildSupportFormCase,
  SWIPE_TIME_SEQUENCE,
  WAIT_TIME_SEQUENCE,
} from "../lib/support-data/case-registry";
import { ISSUE_MISSED_SWIPE, ISSUE_RIDER_NO_SHOW } from "../lib/support-data/issue-types";
import { buildPrefilledValues, fromTimeInputValue } from "../lib/support/prefill";
import { canSubmitCase, isFieldVisible } from "../lib/support/field-rules";
import { getTimeOrderWarnings } from "../lib/support/time-order";
import { getLegOptions } from "../lib/support-data/leg-options";
import {
  isSignatureMissing,
  markSignatureMissing,
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

/** The two seeded rides, by id, so a rename or deletion fails here. */
const RIDE_1 = "1049800381";
const RIDE_2 = "1049800382";

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

/**
 * The three scenarios, as literals. Everything below is checked against THESE,
 * never against what the code happens to produce.
 *
 *   1a — missed the pick-up, member still in the car. The drop-off is swiped
 *        properly afterwards, so only the pick-up is confirmable.
 *   1b — missed the pick-up, member gone. Nothing was swiped live: both ends.
 *   2  — pick-up swiped properly, missed the drop-off. Only the drop-off.
 */
const SCENARIOS: Array<{
  name: string;
  rideId: string;
  asks: SwipeAnchor[];
  editable: string[];
  readOnly: string[];
  signatureMissing: boolean;
}> = [
  {
    name: "1a · pick-up only",
    rideId: RIDE_1,
    asks: ["pickup"],
    editable: ["pickupTime", "pickupOdometer"],
    readOnly: ["enRouteTime", "dropOffTime", "dropoffOdometer"],
    signatureMissing: false,
  },
  {
    name: "1b · both ends",
    rideId: RIDE_1,
    asks: ["pickup", "dropoff"],
    editable: ["pickupTime", "pickupOdometer", "dropOffTime", "dropoffOdometer"],
    readOnly: ["enRouteTime"],
    signatureMissing: true,
  },
  {
    name: "2 · drop-off only",
    rideId: RIDE_2,
    asks: ["dropoff"],
    editable: ["dropOffTime", "dropoffOdometer"],
    readOnly: ["enRouteTime", "pickupTime", "pickupOdometer"],
    signatureMissing: true,
  },
];

function caseFor(asks: SwipeAnchor[], rideId: string) {
  const leg = firstLeg(rideId);
  return buildSupportFormCase({
    includeIssues: [ISSUE_MISSED_SWIPE],
    missedSwipe: asks.map((anchor) => ({
      anchor,
      confirmed: anchorMatched(matchAnchor(leg, anchor)),
    })),
  });
}
function valuesFor(asks: SwipeAnchor[], rideId: string): Record<string, string> {
  const supportCase = caseFor(asks, rideId);
  return {
    ...buildPrefilledValues(supportCase, ride(rideId), firstLeg(rideId)),
    issue: ISSUE_MISSED_SWIPE,
  };
}

// ═══════════════════════════════════════════════════════════════════
section("1. Two seeded rides, in the states they claim");

check("exactly two Missed Swipe rides are seeded",
  mockInProgressTrips.filter((t) => t.scenario?.solutions.includes("missed-swipe")).length === 2,
  `${mockInProgressTrips.filter((t) => t.scenario?.solutions.includes("missed-swipe")).length}`);

/** Declared, never read off the seed. */
const EXPECTED_MISSING: Record<string, SwipeAnchor[]> = {
  [RIDE_1]: ["pickup", "dropoff"],
  [RIDE_2]: ["dropoff"],
};
for (const [id, expected] of Object.entries(EXPECTED_MISSING)) {
  const actual = getMissingAnchors(firstLeg(id));
  check(`${id} is missing exactly ${expected.join("+")}`,
    actual.join(",") === expected.join(","), `got ${actual.join(",") || "none"}`);
}
check("both seeds were checked", Object.keys(EXPECTED_MISSING).length === 2, "");

// ⛔ Ride 2's whole point: the pick-up was swiped PROPERLY — mark AND reading.
const leg2 = firstLeg(RIDE_2);
check("ride 2's pick-up carries a time",
  Boolean(leg2.progress?.pickedUpAt), `${String(leg2.progress?.pickedUpAt)}`);
check("ride 2's pick-up carries an odometer",
  typeof leg2.progress?.pickedUpOdometer === "number",
  `${String(leg2.progress?.pickedUpOdometer)}`);
check("...and its drop-off carries neither",
  leg2.progress?.droppedOffAt == null && leg2.progress?.droppedOffOdometer == null,
  "the drop-off is already recorded");

const leg1 = firstLeg(RIDE_1);
check("ride 1 has the en-route mark and nothing after it",
  Boolean(leg1.progress?.startedAt) &&
    leg1.progress?.pickedUpAt == null &&
    leg1.progress?.pickedUpOdometer == null,
  "ride 1 is not at the pick-up swipe");
check("neither seed is missing en-route",
  [RIDE_1, RIDE_2].every((id) => !getUnrecordedSwipes(firstLeg(id)).includes("startedAt")),
  "2 seeds");

// ═══════════════════════════════════════════════════════════════════
section("2. The trigger is the SWIPE, read against the geofence");

function legWithTrail(trail: Array<[number, number]>): TripLeg {
  return {
    ...leg1,
    locationRecords: trail.map(([age, miles]) => ({
      ageMinutes: age,
      distanceMiles: miles,
      at: "9:00 AM",
    })),
  };
}
/** [name, trail (age, miles from pick-up), insideGeofence, needsConfirming] */
const GEOFENCE_TABLE: Array<[string, Array<[number, number]>, boolean | null, boolean]> = [
  ["standing at the pick-up", [[9, 2.0], [1, 0.05]], true, false],
  ["exactly on the radius", [[1, MISSED_SWIPE_RADIUS_MILES]], true, false],
  ["just outside it", [[1, MISSED_SWIPE_RADIUS_MILES + 0.01]], false, true],
  ["a mile past it", [[9, 0.05], [1, 1.0]], false, true],
  // ⛔ Newest fix wins. Having been there earlier does not place you there now.
  ["was there, now gone", [[30, 0.02], [1, 8.0]], false, true],
  // ⛔ No trail = no contradiction. The app cannot say someone is outside a
  // fence it cannot see, and interrogating them anyway asserts a suspicion it
  // has no basis for.
  ["no trail at all", [], null, false],
];
for (const [name, trail, inside, needs] of GEOFENCE_TABLE) {
  const leg = legWithTrail(trail);
  check(`geofence: ${name} → inside=${inside}`,
    insideGeofence(leg, "pickup") === inside, `got ${insideGeofence(leg, "pickup")}`);
  check(`geofence: ${name} → confirm=${needs}`,
    swipeNeedsConfirming(leg, "pickup") === needs,
    `got ${swipeNeedsConfirming(leg, "pickup")}`);
}
check("the geofence table is complete", GEOFENCE_TABLE.length === 6, `${GEOFENCE_TABLE.length}`);
check("all three inside-answers occur",
  new Set(GEOFENCE_TABLE.map(([, , i]) => String(i))).size === 3,
  `${[...new Set(GEOFENCE_TABLE.map(([, , i]) => String(i)))].join(", ")}`);
check("the trigger fires on some and not others",
  GEOFENCE_TABLE.filter(([, , , n]) => n).length === 3 &&
    GEOFENCE_TABLE.filter(([, , , n]) => !n).length === 3,
  "the trigger is constant");

/**
 * ⛔⛔ **The false-trigger sweep, over every in-progress ride.** Two of these
 * are the Rider No-Show demos, and `1049800377` is deliberately 0.6 miles from a
 * hospital pick-up with the pick-up unrecorded — the exact shape a careless rule
 * fires on. A wrong trigger here hijacks the swipe on a ride that has nothing to
 * do with this case.
 */
const EXPECTED_TRIGGER: Record<string, string> = {
  "1049800371": "none",   // sitting at the pick-up
  "1049800373": "none",   // at the pick-up (no-show demo)
  // ⚠️ DOES trigger, and that is the rule working rather than a false fire. This
  // driver is 0.6 mi from the pick-up; tapping PICK UP MEMBER there is a claim
  // the app can see cannot be true where they are standing, so challenging it is
  // the whole point. It does not collide with the no-show demo: that slice is
  // entered from More Options → Member No-Show, never from the swipe.
  "1049800377": "pickup",
  "1049800376": "none",   // no trail
  "1049800379": "none",   // every mark recorded
  [RIDE_1]: "pickup",
  [RIDE_2]: "dropoff",
};
let swept = 0;
for (const trip of mockInProgressTrips) {
  const leg = trip.legs.find((l) => l.progress);
  const missing = leg ? getMissingAnchors(leg) : [];
  const next = missing[0];
  const fires = leg && next ? swipeNeedsConfirming(leg, next) : false;
  const actual = fires ? next! : "none";
  swept += 1;
  check(`swiping on ${trip.id} → ${EXPECTED_TRIGGER[trip.id] ?? "UNDECLARED"}`,
    actual === EXPECTED_TRIGGER[trip.id], `got ${actual}`);
}
check("every in-progress ride was swept",
  swept === mockInProgressTrips.length && swept === Object.keys(EXPECTED_TRIGGER).length,
  `${swept} ridden, ${Object.keys(EXPECTED_TRIGGER).length} declared`);
check("the sweep covers rides that DO and DO NOT trigger",
  Object.values(EXPECTED_TRIGGER).filter((v) => v !== "none").length === 3 &&
    Object.values(EXPECTED_TRIGGER).filter((v) => v === "none").length === 4,
  `${Object.values(EXPECTED_TRIGGER).filter((v) => v !== "none").length} fire of ${swept}`);

// ⛔ The two rides that stay quiet AT the pick-up must be quiet for the right
// reason — inside the fence, not merely untested.
for (const id of ["1049800371", "1049800373"]) {
  const quietLeg = ride(id).legs.find((l) => l.progress)!;
  check(`${id} is quiet because it is INSIDE its pick-up geofence`,
    insideGeofence(quietLeg, "pickup") === true,
    `inside=${insideGeofence(quietLeg, "pickup")}`);
}

// ═══════════════════════════════════════════════════════════════════
section("3. Routing — three scenarios, declared as literals");

const ROUTE_TABLE: Array<{ missing: SwipeAnchor[]; aboard: boolean | null; expect: string }> = [
  { missing: [], aboard: null, expect: "nothing-missing" },
  { missing: ["pickup", "dropoff"], aboard: true, expect: "postpone" },
  { missing: ["pickup", "dropoff"], aboard: false, expect: "form:pickup,dropoff" },
  { missing: ["pickup", "dropoff"], aboard: null, expect: "form:pickup,dropoff" },
  { missing: ["pickup"], aboard: true, expect: "postpone" },
  { missing: ["pickup"], aboard: false, expect: "form:pickup,dropoff" },
  { missing: ["dropoff"], aboard: null, expect: "form:dropoff" },
  { missing: ["dropoff"], aboard: false, expect: "form:dropoff" },
  // ⚠️ Nonsense the UI never asks — a missed drop-off cannot have the member
  // still aboard — and the rule must not quietly honour it.
  { missing: ["dropoff"], aboard: true, expect: "form:dropoff" },
];
const describe = (r: ReturnType<typeof routeMissedSwipe>) =>
  r.kind === "form" ? `form:${r.asks.join(",")}` : r.kind;
for (const row of ROUTE_TABLE) {
  const actual = describe(routeMissedSwipe({ missing: row.missing, memberAboard: row.aboard }));
  check(`[${row.missing.join("+") || "none"}] aboard=${row.aboard} → ${row.expect}`,
    actual === row.expect, `got ${actual}`);
}
check("the route table is complete", ROUTE_TABLE.length === 9, `${ROUTE_TABLE.length}`);
check("all three route kinds occur",
  new Set(ROUTE_TABLE.map((r) => r.expect.split(":")[0])).size === 3, "");
check("the member question changes the route",
  describe(routeMissedSwipe({ missing: ["pickup"], memberAboard: true })) !==
    describe(routeMissedSwipe({ missing: ["pickup"], memberAboard: false })),
  "asking is theatre");

// ⛔⛔ The signature outcome, per scenario.
for (const scenario of SCENARIOS) {
  check(`${scenario.name}: signature missing = ${scenario.signatureMissing}`,
    leavesSignatureMissing(scenario.asks) === scenario.signatureMissing,
    `got ${leavesSignatureMissing(scenario.asks)}`);
}
check("the signature outcome differs across the three",
  SCENARIOS.filter((s) => s.signatureMissing).length === 2,
  `${SCENARIOS.filter((s) => s.signatureMissing).length} of ${SCENARIOS.length}`);

// The unblock: it moves the BUTTON, never the record.
const OFFERED: Array<[("start" | "pick-up" | "drop-off" | null), boolean, string | null]> = [
  ["pick-up", true, "drop-off"], ["pick-up", false, "pick-up"],
  ["drop-off", true, "drop-off"], ["drop-off", false, "drop-off"],
  ["start", true, "start"], ["start", false, "start"],
  [null, true, null], [null, false, null],
];
for (const [next, postponed, expected] of OFFERED) {
  check(`offeredSwipe(${next}, postponed=${postponed}) === ${expected}`,
    offeredSwipe(next, postponed) === expected, `got ${offeredSwipe(next, postponed)}`);
}
check("postponement changes exactly one of the eight",
  OFFERED.filter(([n, p]) => offeredSwipe(n, p) !== n).length === 1, "");
check("postponing invents no pick-up time",
  leg1.progress?.pickedUpAt === null, `seed holds ${String(leg1.progress?.pickedUpAt)}`);

// ═══════════════════════════════════════════════════════════════════
section("4. Every field renders — only the confirmable ones are editable");

function fieldsOf(asks: SwipeAnchor[], rideId: string) {
  const supportCase = caseFor(asks, rideId);
  const values = valuesFor(asks, rideId);
  return supportCase.fields.filter((f) => isFieldVisible(f, values));
}

/** Declared: every scenario shows the whole record, however little is editable. */
const ALWAYS_SHOWN = [
  "enRouteTime", "pickupTime", "pickupOdometer", "dropOffTime", "dropoffOdometer",
];
for (const scenario of SCENARIOS) {
  const ids = fieldsOf(scenario.asks, scenario.rideId).map((f) => f.id);
  const absent = ALWAYS_SHOWN.filter((id) => !ids.includes(id));
  check(`${scenario.name}: the whole record renders`,
    absent.length === 0, `missing ${absent.join(",")} of ${ALWAYS_SHOWN.length}`);
}
check("every scenario was built", SCENARIOS.length === 3, `${SCENARIOS.length}`);

// ⛔⛔ The rule the user asked for, asserted both ways on every scenario.
for (const scenario of SCENARIOS) {
  const fields = fieldsOf(scenario.asks, scenario.rideId);
  const byId = new Map(fields.map((f) => [f.id, f]));

  const wronglyLocked = scenario.editable.filter(
    (id) => byId.get(id)?.lockWhenPrefilled === true
  );
  check(`${scenario.name}: ${scenario.editable.length} editable field(s) accept input`,
    wronglyLocked.length === 0, `locked: ${wronglyLocked.join(",")}`);

  const wronglyOpen = scenario.readOnly.filter(
    (id) => byId.get(id)?.lockWhenPrefilled !== true
  );
  check(`${scenario.name}: ${scenario.readOnly.length} settled field(s) are read-only`,
    wronglyOpen.length === 0, `open: ${wronglyOpen.join(",")}`);

  // Both sets must be non-empty, or one half of the rule is untested.
  check(`${scenario.name}: the split is real`,
    scenario.editable.length > 0 && scenario.readOnly.length > 0,
    `${scenario.editable.length} / ${scenario.readOnly.length}`);
}
// The three scenarios must genuinely differ, or one case is being tested thrice.
const signatures = SCENARIOS.map((s) => s.editable.join(","));
check("the three scenarios have three different editable sets",
  new Set(signatures).size === 3, signatures.join(" | "));

// Each odometer sits with its own time.
for (const scenario of SCENARIOS) {
  const ids = fieldsOf(scenario.asks, scenario.rideId).map((f) => f.id);
  check(`${scenario.name}: each odometer follows its own time`,
    ids.indexOf("pickupOdometer") === ids.indexOf("pickupTime") + 1 &&
      ids.indexOf("dropoffOdometer") === ids.indexOf("dropOffTime") + 1,
    ids.join(","));
}

// ═══════════════════════════════════════════════════════════════════
section("5. Prefill — times proposed, odometers never invented");

for (const scenario of SCENARIOS) {
  const values = valuesFor(scenario.asks, scenario.rideId);

  // ⛔⛔ The one thing that cannot be prefilled. A reading exists only because a
  // swipe captured it; on a missed swipe that is exactly what did not happen.
  const invented = scenario.editable
    .filter((id) => id.endsWith("Odometer"))
    .filter((id) => (values[id] ?? "") !== "");
  check(`${scenario.name}: no confirmable odometer is invented`,
    invented.length === 0, `${invented.join(",")} came prefilled`);

  // ...while a RECORDED one must come through, or a fact is being hidden.
  const recorded = scenario.readOnly
    .filter((id) => id.endsWith("Odometer"))
    .filter((id) => {
      const anchor = id.startsWith("pickup") ? "pickedUpOdometer" : "droppedOffOdometer";
      return typeof firstLeg(scenario.rideId).progress?.[anchor] === "number";
    });
  const dropped = recorded.filter((id) => (values[id] ?? "") === "");
  check(`${scenario.name}: ${recorded.length} recorded odometer(s) come through`,
    dropped.length === 0, `blank: ${dropped.join(",")}`);

  // The en-route mark is always a fact and always present.
  check(`${scenario.name}: the en-route mark prefills`,
    /^\d{2}:\d{2}$/.test(values.enRouteTime ?? ""), `"${values.enRouteTime}"`);

  // ⛔ Found by walking: a prefill that warns against itself.
  const supportCase = caseFor(scenario.asks, scenario.rideId);
  const warnings = getTimeOrderWarnings(supportCase.fields, values, supportCase.timeSequence ?? []);
  check(`${scenario.name}: the prefill does not warn against itself`,
    Object.keys(warnings).length === 0,
    Object.entries(warnings).map(([k, v]) => `${k}: ${v.slice(0, 50)}`).join(" | "));
}
/** At least one recorded odometer must exist across the three, or that half is vacuous. */
check("a recorded odometer is actually exercised",
  typeof leg2.progress?.pickedUpOdometer === "number", "no seed carries a reading");

/**
 * ⛔⛔ The positive control for "never invented".
 *
 * On the three real scenarios every confirmable odometer happens to have no
 * reading to leak, so the check above cannot fail however the field is wired —
 * it is vacuous. This builds the one state that WOULD leak: an editable pick-up
 * odometer on the leg that does carry a reading. If someone ever gives that
 * field a `prefillFrom`, this is what catches it.
 */
const leakControl = {
  ...buildPrefilledValues(caseFor(["pickup"], RIDE_2), ride(RIDE_2), leg2),
};
check("an editable odometer stays blank even where a reading exists",
  (leakControl.pickupOdometer ?? "") === "",
  `"${leakControl.pickupOdometer}" leaked from a recorded ${leg2.progress?.pickedUpOdometer}`);
check("...and the control really does hold a reading to leak",
  typeof leg2.progress?.pickedUpOdometer === "number" &&
    (buildPrefilledValues(caseFor(["dropoff"], RIDE_2), ride(RIDE_2), leg2).pickupOdometer ?? "") !== "",
  "the same field is blank when READ-ONLY too, so the control proves nothing");

// The order checker must be capable of firing.
const warnControl = getTimeOrderWarnings(
  caseFor(["pickup"], RIDE_1).fields,
  { ...valuesFor(["pickup"], RIDE_1), pickupTime: "00:01" },
  SWIPE_TIME_SEQUENCE
);
check("...and the order checker fires when a time really is impossible",
  Object.keys(warnControl).length > 0, "the sequence checker is inert");

// A confirmed time is proposed from the trail where the trail can speak.
const r1 = valuesFor(["pickup", "dropoff"], RIDE_1);
check("ride 1's pick-up time is proposed from the trail",
  /^\d{2}:\d{2}$/.test(r1.pickupTime ?? ""), `"${r1.pickupTime}"`);
const r2 = valuesFor(["dropoff"], RIDE_2);
check("ride 2's drop-off time is proposed from the trail",
  /^\d{2}:\d{2}$/.test(r2.dropOffTime ?? ""), `"${r2.dropOffTime}"`);
check("ride 2's recorded pick-up time comes through",
  /^\d{2}:\d{2}$/.test(r2.pickupTime ?? ""), `"${r2.pickupTime}"`);

// Submit must hinge on the answers the scenario actually asks for.
for (const scenario of SCENARIOS) {
  const supportCase = caseFor(scenario.asks, scenario.rideId);
  const values = valuesFor(scenario.asks, scenario.rideId);
  const filled: Record<string, string> = { ...values, reason: "Phone died mid-trip." };
  for (const id of scenario.editable) {
    if (!filled[id]) filled[id] = id.endsWith("Odometer") ? "48220" : "14:30";
  }
  // The "where were you" fields appear only on an unconfirmable end.
  for (const field of supportCase.fields) {
    if (field.required && !filled[field.id]) filled[field.id] = "main entrance";
  }
  check(`${scenario.name}: blocked before the answers are given`,
    !canSubmitCase(supportCase.fields, values), "submit was open with blanks");
  check(`${scenario.name}: submittable once they are`,
    canSubmitCase(supportCase.fields, filled), "submit stayed blocked");
}

// ═══════════════════════════════════════════════════════════════════
section("6. The confirmed answers become marks, and the outcome sticks");

resetSessionSwipes();
check("the overlay starts empty", sessionSwipeCount() === 0, `${sessionSwipeCount()}`);
check("...and nothing starts signature-missing",
  !isSignatureMissing(leg1.id), "a leg started flagged");

check('a time input converts back to a clock face',
  fromTimeInputValue("11:20") === "11:20 AM" &&
    fromTimeInputValue("14:05") === "2:05 PM" &&
    fromTimeInputValue("00:30") === "12:30 AM",
  `${fromTimeInputValue("11:20")} / ${fromTimeInputValue("14:05")} / ${fromTimeInputValue("00:30")}`);

/**
 * ⛔⛔ The 1a chain end to end: swipe the drop-off properly, then confirm the
 * pick-up. Both have to land on the leg, or the driver files a correction and
 * their own screen still shows the leg unswiped.
 */
recordSessionSwipe(leg1.id, "droppedOffAt", "11:51 AM", 48229);
recordSessionSwipe(leg1.id, "pickedUpAt", "11:20 AM", 48213);
const after1a = withSessionSwipes(leg1);
check("1a: the drop-off mark and reading both land",
  after1a.progress?.droppedOffAt === "11:51 AM" &&
    after1a.progress?.droppedOffOdometer === 48229,
  `${String(after1a.progress?.droppedOffAt)} / ${String(after1a.progress?.droppedOffOdometer)}`);
check("1a: the confirmed pick-up lands as a mark",
  after1a.progress?.pickedUpAt === "11:20 AM" &&
    after1a.progress?.pickedUpOdometer === 48213,
  `${String(after1a.progress?.pickedUpAt)} / ${String(after1a.progress?.pickedUpOdometer)}`);
check("1a: the leg is now complete",
  getMissingAnchors(after1a).length === 0, `${getMissingAnchors(after1a).join(",")}`);
check("1a: and the SEED is untouched",
  leg1.progress?.pickedUpAt == null, "the overlay mutated the seed");
check("1a: the leg-options registry sees it too",
  getLegOptions("in-progress").find((o) => o.legId === leg1.id)?.leg.progress?.pickedUpAt ===
    "11:20 AM",
  "the second reader of the seed is stale");

markSignatureMissing(leg1.id);
check("the signature outcome is recorded", isSignatureMissing(leg1.id), "not flagged");
check("...and does not leak to the other leg",
  !isSignatureMissing(leg2.id), "the flag leaked across legs");
resetSessionSwipes();
check("resetting clears both", sessionSwipeCount() === 0 && !isSignatureMissing(leg1.id), "");

// A swipe made NOW is stamped from the leg's own trail, not the device clock.
for (const id of [RIDE_1, RIDE_2]) {
  const stamp = swipeClockFor(firstLeg(id));
  check(`${id} stamps a swipe from its own trail`,
    stamp !== null && toMinutes(stamp) > toMinutes(firstLeg(id).progress?.startedAt ?? ""),
    `${String(stamp)} vs en-route ${String(firstLeg(id).progress?.startedAt)}`);
}
check("a leg with no trail has no stamp to offer",
  swipeClockFor({ ...leg1, locationRecords: [] }) === null, "a stamp was invented");

// ═══════════════════════════════════════════════════════════════════
section("7. Negative controls — the other cases are untouched");

const noShowCase = buildSupportFormCase({ includeIssues: [ISSUE_RIDER_NO_SHOW] });
const MISSED_ONLY = [
  "enRouteTime", "pickupTime", "pickupOdometer", "dropOffTime", "dropoffOdometer",
  "pickupWhere", "dropoffWhere", "attachment",
];
const leaked = MISSED_ONLY.filter((id) => noShowCase.fields.some((f) => f.id === id));
check("no Missed Swipe field reaches a no-show build",
  leaked.length === 0, `${leaked.join(",")} of ${MISSED_ONLY.length}`);
check("...and the no-show build is not simply empty",
  noShowCase.fields.length > 5, `${noShowCase.fields.length} fields`);
check("a no-show build declares the WAIT sequence",
  noShowCase.timeSequence === WAIT_TIME_SEQUENCE, `${noShowCase.timeSequence?.join(",")}`);
check("a Missed Swipe build declares the SWIPE sequence",
  caseFor(["pickup"], RIDE_1).timeSequence === SWIPE_TIME_SEQUENCE, "");
check("the swipe sequence holds times only, in swipe order",
  SWIPE_TIME_SEQUENCE.join(",") === "enRouteTime,pickupTime,dropOffTime",
  SWIPE_TIME_SEQUENCE.join(","));

const ungated = caseFor(["pickup", "dropoff"], RIDE_1).fields
  .filter((f) => MISSED_ONLY.includes(f.id))
  .filter((f) => !f.showIf);
check("every Missed Swipe field is gated on the issue",
  ungated.length === 0, `${ungated.map((f) => f.id).join(",")}`);
check("...and there were some to check",
  caseFor(["pickup", "dropoff"], RIDE_1).fields.filter((f) => MISSED_ONLY.includes(f.id)).length >= 5,
  "");
check("the anchor→mark map is the production sequence",
  MARK_FOR_ANCHOR.pickup === "pickedUpAt" && MARK_FOR_ANCHOR.dropoff === "droppedOffAt", "");

// ═══════════════════════════════════════════════════════════════════
section("8. Wiring — greps run on code, not on the comments about it");

const LAYOUT = readFileSync("components/driver/ride-detail-layout.tsx", "utf8");
const FORM = readFileSync("components/support/missed-swipe-form.tsx", "utf8");
const SHEET = readFileSync("components/driver/drop-off-swipe-sheet.tsx", "utf8");
check("the ride detail source was read", LAYOUT.length > 2000, `${LAYOUT.length} chars`);
check("the form source was read", FORM.length > 1000, `${FORM.length} chars`);
check("the drop-off sheet source was read", SHEET.length > 1000, `${SHEET.length} chars`);

/** Comments stripped: a grep for an ABSENT string otherwise matches its own rationale. */
const CODE = LAYOUT.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
check("stripping comments left the code behind",
  CODE.length > LAYOUT.length * 0.3 && CODE.length < LAYOUT.length,
  `${CODE.length} of ${LAYOUT.length} chars`);

check("the swipe tap is what consults the geofence",
  CODE.includes("swipeNeedsConfirming(activeLeg,"), "the trigger is not on the swipe");
/** ⛔⛔ The correction the user asked for: nothing opens on page load. */
check("nothing raises the flow on mount",
  !/useEffect\([^)]*\)[\s\S]{0,400}setPromptOpen\(true\)/.test(CODE),
  "a prompt still opens itself when the ride is opened");
check("the manual claim link is gone",
  !/I already made this swipe/.test(CODE), "the link is still rendered");
check("the drop-off steps are a real sheet",
  CODE.includes("<DropOffSwipeSheet"), "no drop-off sheet is mounted");
/**
 * ⛔⛔ The sheet takes the MEMBER's signature, so it belongs only on the path
 * where the member is still in the car. Ride 2's member is long gone: sending
 * that swipe to the sheet would ask the driver to produce a signature from
 * someone who is not there, when the honest outcome is that it is missing for
 * good. The postponed branch is the ONLY one that opens it.
 */
check("only the postponed path opens the signature sheet",
  /pickupPostponed && nextSwipe === "drop-off"[\s\S]{0,120}setDropOffOpen\(true\)/.test(CODE),
  "the sheet is not gated on the postponed path");
check("...and an unpostponed drop-off goes straight to the form",
  /nextSwipe === "drop-off" && swipeNeedsConfirming[\s\S]{0,400}fileMissedSwipe\(activeLeg, null\)/.test(CODE),
  "ride 2 is sent to the signature sheet");
check("the sheet is opened from exactly one place",
  (CODE.match(/setDropOffOpen\(true\)/g) ?? []).length === 1,
  `${(CODE.match(/setDropOffOpen\(true\)/g) ?? []).length} call sites`);
check("the drop-off sheet takes an odometer AND a signature",
  SHEET.includes("SignaturePad") && SHEET.includes('type="number"'),
  "the normal drop-off capture is incomplete");
check("the drop-off records both",
  CODE.includes('recordSwipe(leg, "droppedOffAt", odometerReading)'),
  "the reading is not stored with the mark");
check("the question set is routed, never hardcoded",
  CODE.includes("routeMissedSwipe({") && !/setMissedSwipeAsks\(\s*\[\s*"pickup"/.test(CODE),
  "a literal anchor list is still passed");
check("confirmed answers are written back as marks",
  FORM.includes("recordSwipe(") && FORM.includes("MARK_FOR_ANCHOR[anchor]"),
  "the form files a correction its own leg never sees");
check("the signature outcome is recorded on submit",
  FORM.includes("markSignatureMissing(leg.id)"), "the outcome is never recorded");
check("Missed Swipe is the case that keeps Pending",
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
