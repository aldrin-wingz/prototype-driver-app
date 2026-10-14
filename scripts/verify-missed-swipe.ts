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
import { promptChoices } from "../components/support/missed-swipe-prompt";
import {
  anchorMatched,
  getMissingAnchors,
  getUnrecordedSwipes,
  insideGeofence,
  leavesMemberSignatureMissing,
  MARK_FOR_ANCHOR,
  MISSED_SWIPE_RADIUS_MILES,
  matchAnchor,
  offeredSwipe,
  routeMissedSwipe,
  swipeClockFor,
  swipeNeedsConfirming,
  type SwipeAnchor,
  routeDropOffSwipe,
  type DropOffRoute,
  MISSED_SWIPE_SOLUTIONS,
  routeSwipeTap,
  swipeTooFarBody,
  SWIPE_TOO_FAR_DISMISS,
  SWIPE_TOO_FAR_PHONE,
  SWIPE_TOO_FAR_PLACE,
  SWIPE_TOO_FAR_PROVENANCE,
  SWIPE_TOO_FAR_TITLE,
  type SwipeTapRoute,
} from "../lib/driver-data/missed-swipe-rules";
import { demoFocus, DEMO_MODES, type DemoMode } from "../lib/solutions/demo-mode";
import { SOLUTIONS } from "../lib/solutions/catalogue";
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
import { tripContextFor, NOT_SUPPLIED } from "../lib/support-data/trip-context";
import {
  isMemberSignatureMissing,
  markMemberSignatureMissing,
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
  /**
   * ⛔⛔ **Recorded, therefore NOT a field.** This column used to be
   * `readOnly` — the same ids, rendered prefilled and locked. Since
   * 2026-10-14 (user direction) the form asks only for what the app does not
   * already hold, so these must be ABSENT from the built case. The facts
   * themselves moved to the sheet's `Current leg details` block, which §4b
   * asserts — absence here is only honest if presence there is true.
   */
  absent: string[];
  memberSignatureMissing: boolean;
  /**
   * The form collects the driver's own signature, which IS recoverable.
   *
   * ⚠️ **`true` on every scenario now.** It used to track
   * `memberSignatureMissing` — the driver signed exactly when the member's
   * could not be taken. Every support form now ends with a driver signature
   * (user direction, 2026-10-14), including 1a, where the real Stage 05 takes
   * both signatures and this form only reconstructs the pick-up. Kept as a
   * declared column rather than removed, so the day it stops being universal
   * the table is where that is written down.
   */
  asksDriverSignature: boolean;
}> = [
  {
    name: "1a · pick-up only",
    rideId: RIDE_1,
    asks: ["pickup"],
    editable: ["pickupTime", "pickupOdometer"],
    absent: ["enRouteTime", "dropOffTime", "dropoffOdometer"],
    memberSignatureMissing: false,
    asksDriverSignature: true,
  },
  {
    name: "1b · both ends",
    rideId: RIDE_1,
    asks: ["pickup", "dropoff"],
    editable: ["pickupTime", "pickupOdometer", "dropOffTime", "dropoffOdometer"],
    absent: ["enRouteTime"],
    memberSignatureMissing: true,
    asksDriverSignature: true,
  },
  {
    name: "2 · drop-off only",
    rideId: RIDE_2,
    asks: ["dropoff"],
    editable: ["dropOffTime", "dropoffOdometer"],
    absent: ["enRouteTime", "pickupTime", "pickupOdometer"],
    memberSignatureMissing: true,
    asksDriverSignature: true,
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
  // ⚠️ Row 09's scenario ride (`09a`, AMARA OKONKWO onboard). Added to this
  // DECLARED set rather than left to fall through — an undeclared ride here is
  // a ride whose swipe behaviour nobody decided. It carries no `locationRecords`
  // at all, so the trail has nothing to challenge the drop-off with, which is
  // the same reason `1049800376` is quiet.
  "1049800393": "none",   // no trail
  // ⚠️ Row 13's two send-back rides (`13a` short-notice, `13b` advance). Both
  // accepted and unstarted with no `locationRecords`, so the next swipe is the
  // START and there is no trail to challenge it with. Declared rather than left
  // to fall through — an undeclared ride here is one whose swipe behaviour
  // nobody decided.
  "1049800394": "none",
  "1049800395": "none",
  // Row 13's standing-order ride (`13c`) — same shape as the two above.
  "1049800396": "none",
  // ⚠️ Row 20's second scenario ride (`20b`), the one with the pick-up already
  // made. It carries no `locationRecords`, so the trail has nothing to challenge
  // the drop-off with. Declared rather than left to fall through — an undeclared
  // ride here is one whose swipe behaviour nobody decided.
  "1049800401": "none",
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
    Object.values(EXPECTED_TRIGGER).filter((v) => v === "none").length === 9,
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

/**
 * ⛔⛔ **`aboard` has no `null` any more, and the drop-off row flipped.**
 *
 * This table used to carry three `null` rows for "the driver was not asked",
 * and a `[dropoff] aboard=true → form:dropoff` row under a comment calling it
 * *"nonsense the UI never asks — a missed drop-off cannot have the member still
 * aboard"*. Both of those were consequences of the drop-off skipping the
 * question. It does not skip it any more: the trail failing to place a drop-off
 * means either the leg ended somewhere else OR the driver is still driving, and
 * only the driver can say which. So `null` is unrepresentable and that last row
 * is now the interesting one.
 */
const ROUTE_TABLE: Array<{ missing: SwipeAnchor[]; aboard: boolean; expect: string }> = [
  { missing: [], aboard: false, expect: "nothing-missing" },
  { missing: [], aboard: true, expect: "nothing-missing" },
  { missing: ["pickup", "dropoff"], aboard: true, expect: "postpone" },
  { missing: ["pickup", "dropoff"], aboard: false, expect: "form:pickup,dropoff" },
  { missing: ["pickup"], aboard: true, expect: "postpone" },
  { missing: ["pickup"], aboard: false, expect: "form:pickup,dropoff" },
  { missing: ["dropoff"], aboard: false, expect: "form:dropoff" },
  // ⭐ The leg is still running: nothing to reconstruct, nothing to unblock.
  // ⛔ NOT `postpone` — postponing would unblock a swipe already on offer and
  // write an intention about a leg still in motion.
  { missing: ["dropoff"], aboard: true, expect: "not-yet" },
];
const describe = (r: ReturnType<typeof routeMissedSwipe>) =>
  r.kind === "form" ? `form:${r.asks.join(",")}` : r.kind;
for (const row of ROUTE_TABLE) {
  const actual = describe(routeMissedSwipe({ missing: row.missing, memberAboard: row.aboard }));
  check(`[${row.missing.join("+") || "none"}] aboard=${row.aboard} → ${row.expect}`,
    actual === row.expect, `got ${actual}`);
}
check("the route table is complete", ROUTE_TABLE.length === 8, `${ROUTE_TABLE.length}`);
check("all four route kinds occur",
  new Set(ROUTE_TABLE.map((r) => r.expect.split(":")[0])).size === 4,
  `${[...new Set(ROUTE_TABLE.map((r) => r.expect.split(":")[0]))].sort().join(", ")}`);
/**
 * ⛔⛔ **The question has to matter at BOTH ends.** It only ever mattered at the
 * pick-up before, and this check only ever looked there — so the drop-off could
 * have been wired to ask and then ignore the answer, and nothing here would
 * have noticed.
 */
const ASK_MATTERS: SwipeAnchor[][] = [["pickup"], ["dropoff"]];
const inert = ASK_MATTERS.filter(
  (missing) =>
    describe(routeMissedSwipe({ missing, memberAboard: true })) ===
    describe(routeMissedSwipe({ missing, memberAboard: false })),
);
check("the member question changes the route at both ends of the leg",
  inert.length === 0,
  inert.length
    ? `asking is theatre for: ${inert.map((m) => m.join("+")).join(", ")}`
    : `${ASK_MATTERS.length} of ${ASK_MATTERS.length} ends branch on the answer`);

/**
 * ⛔⛔ The signature outcome, per scenario — and it is TWO signatures.
 *
 * `CAP-098` shows production's Stage 05 taking a Driver AND a Member signature.
 * The member's cannot be recovered once they have left; the driver's always can,
 * because they are the one filing. An earlier version read the screen as one
 * "member signature" pad and recorded BOTH as lost.
 */
for (const scenario of SCENARIOS) {
  check(`${scenario.name}: member signature missing = ${scenario.memberSignatureMissing}`,
    leavesMemberSignatureMissing(scenario.asks) === scenario.memberSignatureMissing,
    `got ${leavesMemberSignatureMissing(scenario.asks)}`);

  const hasDriverField = caseFor(scenario.asks, scenario.rideId).fields.some(
    (f) => f.id === "signature"
  );
  check(`${scenario.name}: driver signature asked = ${scenario.asksDriverSignature}`,
    hasDriverField === scenario.asksDriverSignature, `got ${hasDriverField}`);
}
check("the member-signature outcome differs across the three",
  SCENARIOS.filter((s) => s.memberSignatureMissing).length === 2,
  `${SCENARIOS.filter((s) => s.memberSignatureMissing).length} of ${SCENARIOS.length}`);
/** ⛔ The two must track each other: a lost member signature is exactly when the
 *  driver's is worth collecting. If they ever diverge, one of them is wrong. */
/**
 * ⚠️ **This used to pair the two halves of Stage 05** — "a lost member
 * signature always asks for the driver's" — and it held because the driver's
 * was asked for exactly when the member's was lost. Every support form now ends
 * with a driver signature (user direction, 2026-10-14), so one side of that
 * pairing is constant and comparing them would pass vacuously.
 *
 * ⛔ The halves are asserted separately instead: the driver always signs, and
 * the member's is lost on SOME scenarios and not others — which is the property
 * that still varies and still decides what the form records.
 */
check("the driver signs on every scenario",
  SCENARIOS.every((s) => s.asksDriverSignature),
  `${SCENARIOS.filter((s) => s.asksDriverSignature).length} of ${SCENARIOS.length}`);
check("...while the member's signature is lost on some and not others",
  new Set(SCENARIOS.map((s) => s.memberSignatureMissing)).size === 2,
  "every scenario agrees about the member's signature, so the rule is not being tested");

/** ⛔ It must be LAST — the driver signs for what is above it. */
for (const scenario of SCENARIOS) {
  const fields = caseFor(scenario.asks, scenario.rideId).fields;
  check(`${scenario.name}: the driver signature is the last field`,
    fields[fields.length - 1]?.id === "signature",
    `last is ${fields[fields.length - 1]?.id}`);
}

// The unblock: it moves the BUTTON, never the record.
/**
 * ⚠️ Driven on row 03's PROPOSAL side. B3e gated this function — production
 * fills the marks left to right and will not offer the drop-off until the
 * pick-up exists, and lifting that block is the proposal. §12 drives the other
 * side and asserts the unblock is gone there.
 */
const PROPOSING = demoFocus("missed-swipe", "fixed");
const OFFERED: Array<[("start" | "pick-up" | "drop-off" | null), boolean, string | null]> = [
  ["pick-up", true, "drop-off"], ["pick-up", false, "pick-up"],
  ["drop-off", true, "drop-off"], ["drop-off", false, "drop-off"],
  ["start", true, "start"], ["start", false, "start"],
  [null, true, null], [null, false, null],
];
for (const [next, postponed, expected] of OFFERED) {
  check(`offeredSwipe(${next}, postponed=${postponed}) === ${expected}`,
    offeredSwipe(next, postponed, PROPOSING) === expected, `got ${offeredSwipe(next, postponed, PROPOSING)}`);
}
check("postponement changes exactly one of the eight",
  OFFERED.filter(([n, p]) => offeredSwipe(n, p, PROPOSING) !== n).length === 1, "");
check("postponing invents no pick-up time",
  leg1.progress?.pickedUpAt === null, `seed holds ${String(leg1.progress?.pickedUpAt)}`);

// ═══════════════════════════════════════════════════════════════════
section("4. Only what the app did NOT record is asked");

function fieldsOf(asks: SwipeAnchor[], rideId: string) {
  const supportCase = caseFor(asks, rideId);
  const values = valuesFor(asks, rideId);
  return supportCase.fields.filter((f) => isFieldVisible(f, values));
}

/**
 * ⛔⛔ **The rule inverted on 2026-10-14 and this section inverted with it.**
 *
 * It used to assert that all five swipe fields render on every scenario, the
 * settled ones locked. The user's direction is the opposite: *"remove any
 * fields that are already recorded and only keep the fields with the ones we
 * have not."* So the declared column is now ABSENT, and the load-bearing claim
 * is that no recorded value is asked for twice.
 *
 * ⚠️ The five ids are still declared here as the full swipe record, because the
 * two halves have to partition it — a scenario that listed neither `dropOffTime`
 * as editable nor as absent would otherwise go unmeasured.
 */
const SWIPE_RECORD = [
  "enRouteTime", "pickupTime", "pickupOdometer", "dropOffTime", "dropoffOdometer",
];
for (const scenario of SCENARIOS) {
  check(`${scenario.name}: the declared columns partition the whole record`,
    [...scenario.editable, ...scenario.absent].sort().join(",") ===
      [...SWIPE_RECORD].sort().join(","),
    `${scenario.editable.length} + ${scenario.absent.length} of ${SWIPE_RECORD.length}`);
}
check("every scenario was built", SCENARIOS.length === 3, `${SCENARIOS.length}`);

// ⛔⛔ The rule the user asked for, asserted both ways on every scenario.
for (const scenario of SCENARIOS) {
  const fields = fieldsOf(scenario.asks, scenario.rideId);
  const byId = new Map(fields.map((f) => [f.id, f]));

  const missing = scenario.editable.filter((id) => !byId.has(id));
  check(`${scenario.name}: ${scenario.editable.length} unrecorded field(s) are asked`,
    missing.length === 0, `not rendered: ${missing.join(",")}`);

  const wronglyLocked = scenario.editable.filter(
    (id) => byId.get(id)?.lockWhenPrefilled === true
  );
  check(`${scenario.name}: ...and every one of them accepts input`,
    wronglyLocked.length === 0, `locked: ${wronglyLocked.join(",")}`);

  const stillAsked = scenario.absent.filter((id) => byId.has(id));
  check(`${scenario.name}: ${scenario.absent.length} recorded field(s) are not asked at all`,
    stillAsked.length === 0, `still rendered: ${stillAsked.join(",")}`);

  // Both sets must be non-empty, or one half of the rule is untested.
  check(`${scenario.name}: the split is real`,
    scenario.editable.length > 0 && scenario.absent.length > 0,
    `${scenario.editable.length} / ${scenario.absent.length}`);
}
/**
 * ⛔ **Nothing on a Missed Swipe is locked any more** — the locked variants were
 * the recorded ones and they are gone. Asserted over the whole built case, not
 * just the five declared ids: a lock reintroduced on any swipe field would mean
 * a recorded value had crept back in as a dead input, which is exactly what was
 * removed.
 */
/**
 * ⚠️ `issue` and `legId` are the sheet's own context header — what you are
 * filing and against which leg — and they lock because the entry point already
 * settled them. Declared as a literal allow-list rather than filtered out
 * quietly, so a third locked field is a failure and not an exemption.
 */
const LOCKED_CONTEXT = ["issue", "legId"];
for (const scenario of SCENARIOS) {
  const locked = fieldsOf(scenario.asks, scenario.rideId)
    .filter((f) => f.lockWhenPrefilled === true)
    .map((f) => f.id);
  check(`${scenario.name}: nothing but the context header is a locked restatement`,
    locked.join(",") === LOCKED_CONTEXT.join(","),
    `locked: ${locked.join(",")}`);
}
// The three scenarios must genuinely differ, or one case is being tested thrice.
const signatures = SCENARIOS.map((s) => s.editable.join(","));
check("the three scenarios have three different editable sets",
  new Set(signatures).size === 3, signatures.join(" | "));

// Each odometer sits with its own time — on the ends that are asked about.
for (const scenario of SCENARIOS) {
  const ids = fieldsOf(scenario.asks, scenario.rideId).map((f) => f.id);
  const pairs: Array<[string, string]> = [
    ["pickupTime", "pickupOdometer"],
    ["dropOffTime", "dropoffOdometer"],
  ];
  const present = pairs.filter(([time]) => ids.includes(time));
  const wrong = present.filter(([time, odo]) => ids.indexOf(odo) !== ids.indexOf(time) + 1);
  check(`${scenario.name}: each odometer follows its own time (${present.length} pair(s))`,
    wrong.length === 0 && present.length === scenario.asks.length,
    ids.join(","));
}

/* --- 4b. The recorded facts are still on screen, one block up ------------ */
/**
 * ⛔⛔ **This is the half that makes §4's absence honest.**
 *
 * Dropping the recorded fields is only a simplification if the driver can
 * still see them. They are printed by `tripContextFor` in the sheet's
 * `Current leg details` block — so for every scenario, every value the form
 * stopped asking for must appear THERE, with its real value and not a dash.
 *
 * ⛔ `enRouteTime` is the exception, and it is a real gap rather than a pass:
 * the en-route mark is not one of the eight requested rows, so it is now shown
 * nowhere on this form. Declared as a literal so it is a decision on the record
 * rather than a hole the check cannot see.
 */
const NOT_SHOWN_ANYWHERE = ["enRouteTime"];
/** Form field id → the `Current leg details` row that now carries it. */
const CONTEXT_ROW_FOR: Record<string, string> = {
  pickupTime: "Actual pick-up time",
  pickupOdometer: "Pick-up odometer",
  dropOffTime: "Actual drop-off time",
  dropoffOdometer: "Drop-off odometer",
};
/**
 * ⚠️ **1a's drop-off is recorded by the swipe the driver just made**, not by
 * the seed — that scenario IS "postponed the pick-up, swiped the drop-off
 * live, now confirming". `getLegOptions` reads the session overlay, so the
 * block sees it exactly as the sheet does. Reset immediately after, so §6
 * still starts from an empty overlay and asserts so.
 */
resetSessionSwipes();
recordSessionSwipe(leg1.id, "droppedOffAt", "11:51 AM", 48229);
let contextChecked = 0;
for (const scenario of SCENARIOS) {
  const option = getLegOptions("in-progress").find(
    (o) => o.legId === firstLeg(scenario.rideId).id
  );
  check(`${scenario.name}: the sheet can build its context block`, Boolean(option), "no leg option");
  if (!option) continue;
  const rows = tripContextFor(option).legRows;
  const dropped = scenario.absent
    .filter((id) => !NOT_SHOWN_ANYWHERE.includes(id))
    .filter((id) => {
      contextChecked += 1;
      const row = rows.find((r) => r.label === CONTEXT_ROW_FOR[id]);
      return !row || row.absent === true || row.value === NOT_SUPPLIED;
    });
  check(`${scenario.name}: every recorded value it stopped asking for is shown above`,
    dropped.length === 0, `missing from the context block: ${dropped.join(",")}`);
}
resetSessionSwipes();
/** ⛔ Non-vacuity: the loop above must have had something to look for. */
check("...and the context check actually examined some values",
  contextChecked === 4,
  `${contextChecked} recorded value(s) across ${SCENARIOS.length} scenario(s)`);
check("the one mark shown nowhere is declared, and it is the en-route mark",
  NOT_SHOWN_ANYWHERE.length === 1 && NOT_SHOWN_ANYWHERE[0] === "enRouteTime" &&
    SCENARIOS.every((s) => s.absent.includes("enRouteTime")),
  NOT_SHOWN_ANYWHERE.join(","));

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

  // ⛔ ...and a recorded one is no longer prefilled either, because the field
  // is gone. §4b is what asserts the value is still on screen; here the claim
  // is only that nothing recorded leaks back in as a form VALUE, which is what
  // would happen if one of the dropped fields were quietly restored.
  const resurrected = scenario.absent.filter((id) => (values[id] ?? "") !== "");
  check(`${scenario.name}: no recorded value comes back as a form value`,
    resurrected.length === 0, `prefilled: ${resurrected.join(",")}`);

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
/**
 * ⚠️ The companion used to prove the control by showing the SAME field filled
 * when it was read-only. There is no read-only variant any more, so the control
 * is proved the only way left: the leg genuinely holds a reading, and the field
 * is genuinely built and asked for.
 */
check("...and the control really does hold a reading to leak, into a real field",
  typeof leg2.progress?.pickedUpOdometer === "number" &&
    caseFor(["pickup"], RIDE_2).fields.some((f) => f.id === "pickupOdometer"),
  "nothing to leak into, so the control proves nothing");

/**
 * The order checker must be capable of firing.
 *
 * ⛔⛔ **Built on 1b, and that is a consequence worth naming.** It used to run
 * on 1a against the prefilled `enRouteTime`. With the recorded fields gone, a
 * scenario asking about ONE end has only one time on the form and nothing to
 * compare it against — so the warning now fires only where both ends are asked
 * for. `SWIPE_TIME_SEQUENCE` still names all three in true order and
 * `orderedTimeFields` skips the ones the case does not render, so nothing is
 * wrong; it is simply bounded by less. Flagged to the user, not papered over.
 */
const warnControl = getTimeOrderWarnings(
  caseFor(["pickup", "dropoff"], RIDE_1).fields,
  { ...valuesFor(["pickup", "dropoff"], RIDE_1), pickupTime: "23:30", dropOffTime: "00:01" },
  SWIPE_TIME_SEQUENCE
);
check("...and the order checker fires when a time really is impossible",
  Object.keys(warnControl).length > 0, "the sequence checker is inert");
/** ⛔ The bound that was lost, stated as a literal rather than left implicit. */
const BOUNDED_SCENARIOS = ["1b · both ends"];
const bounded = SCENARIOS.filter((sc) => {
  const fields = caseFor(sc.asks, sc.rideId).fields;
  return SWIPE_TIME_SEQUENCE.filter((id) => fields.some((f) => f.id === id)).length > 1;
});
check("exactly one scenario still has two times to compare",
  bounded.map((b) => b.name).join(",") === BOUNDED_SCENARIOS.join(","),
  `${bounded.map((b) => b.name).join(", ") || "none"} of ${SCENARIOS.length}`);

// A confirmed time is proposed from the trail where the trail can speak.
const r1 = valuesFor(["pickup", "dropoff"], RIDE_1);
check("ride 1's pick-up time is proposed from the trail",
  /^\d{2}:\d{2}$/.test(r1.pickupTime ?? ""), `"${r1.pickupTime}"`);
const r2 = valuesFor(["dropoff"], RIDE_2);
check("ride 2's drop-off time is proposed from the trail",
  /^\d{2}:\d{2}$/.test(r2.dropOffTime ?? ""), `"${r2.dropOffTime}"`);
check("ride 2's recorded pick-up time is NOT asked for again",
  !("pickupTime" in r2) && !caseFor(["dropoff"], RIDE_2).fields.some((f) => f.id === "pickupTime"),
  `"${r2.pickupTime}"`);

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
  !isMemberSignatureMissing(leg1.id), "a leg started flagged");

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

markMemberSignatureMissing(leg1.id);
check("the signature outcome is recorded", isMemberSignatureMissing(leg1.id), "not flagged");
check("...and does not leak to the other leg",
  !isMemberSignatureMissing(leg2.id), "the flag leaked across legs");
resetSessionSwipes();
check("resetting clears both", sessionSwipeCount() === 0 && !isMemberSignatureMissing(leg1.id), "");

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
  // ⚠️ `driverSignature` left this list when the signature became shared — it
  // is no longer a Missed Swipe field, so finding it in a no-show build is now
  // correct rather than a leak.
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
/**
 * ⛔⛔ **SUPERSEDED, deliberately.** This asserted the opposite: that the
 * no-show's `signature` and Missed Swipe's `driverSignature` were DIFFERENT
 * ids, because "a shared one would make a no-show attestation and a drop-off
 * attestation the same stored value under two different pieces of copy".
 *
 * ⭐ The reason was the two pieces of copy, and there is now one. Every form
 * ends with the same `Driver Signature` field, so the same stored value under
 * the same label is the intended outcome rather than a collision. Six cases
 * previously asked for nothing at all.
 *
 * ⚠️ Rewritten rather than deleted, so the reversal is on the record where the
 * old claim was.
 */
const SIGNING_CASES = [
  ["no-show", noShowCase],
  ["missed swipe, drop-off", caseFor(["dropoff"], RIDE_2)],
  ["missed swipe, both ends", caseFor(["pickup", "dropoff"], RIDE_1)],
] as const;
const signatureIds = new Set(
  SIGNING_CASES.flatMap(([, c]) => c.fields.filter((f) => f.type === "signature").map((f) => f.id)),
);
check("every case signs with the SAME field, not one of its own",
  signatureIds.size === 1 && signatureIds.has("signature"),
  `${[...signatureIds].join(", ") || "none"} across ${SIGNING_CASES.length} cases`);
check("...and exactly one signature per case, at the end",
  SIGNING_CASES.every(([, c]) => {
    const sigs = c.fields.filter((f) => f.type === "signature");
    return sigs.length === 1 && c.fields[c.fields.length - 1].id === "signature";
  }),
  SIGNING_CASES.map(([n, c]) => `${n}:${c.fields.filter((f) => f.type === "signature").length}`).join(" "));

check("the anchor→mark map is the production sequence",
  MARK_FOR_ANCHOR.pickup === "pickedUpAt" && MARK_FOR_ANCHOR.dropoff === "droppedOffAt", "");

// ═══════════════════════════════════════════════════════════════════
section("8. Wiring — greps run on code, not on the comments about it");

const LAYOUT = readFileSync("components/driver/ride-detail-layout.tsx", "utf8");
const FORM = readFileSync("components/support/missed-swipe-form.tsx", "utf8");
const ODO = readFileSync("components/driver/odometer-reading-dialog.tsx", "utf8");
const SIG = readFileSync("components/driver/ride-signature-screen.tsx", "utf8");
check("the ride detail source was read", LAYOUT.length > 2000, `${LAYOUT.length} chars`);
check("the form source was read", FORM.length > 1000, `${FORM.length} chars`);
check("the odometer source was read", ODO.length > 1000, `${ODO.length} chars`);
check("the signature source was read", SIG.length > 1000, `${SIG.length} chars`);

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
/**
 * ⛔⛔ Stage 04 → 05, replicated rather than invented.
 *
 * The first version was one drawer combining an odometer field and a single
 * "member signature" pad. `CAP-095` and `CAP-098` show two separate surfaces: a
 * native odometer alert, then a full-screen two-signature capture. The library
 * held both the whole time, indexed as `CAP-094`–`CAP-099`.
 */
check("the odometer popup is mounted",
  CODE.includes("<OdometerReadingDialog"), "no odometer popup");
check("the Ride Signature screen is mounted",
  CODE.includes("<RideSignatureScreen"), "no signature screen");
check("the invented combined sheet is gone",
  !/DropOffSwipeSheet/.test(CODE), "the drawer is still mounted");
check("the odometer comes BEFORE the signature",
  CODE.indexOf("setOdometerOpen(true)") < CODE.indexOf("setSignatureOpen(true)"),
  "Stage 05 runs before Stage 04 Step 2");
check("the mark lands only once the signature is submitted",
  /handleSignatureSubmit[\s\S]{0,400}recordSwipe\(leg, "droppedOffAt"/.test(CODE),
  "the drop-off is recorded before Stage 05 completes");
/**
 * ⛔⛔ The sheet takes the MEMBER's signature, so it belongs only on the path
 * where the member is still in the car. Ride 2's member is long gone: sending
 * that swipe to the sheet would ask the driver to produce a signature from
 * someone who is not there, when the honest outcome is that it is missing for
 * good. The postponed branch is the ONLY one that opens it.
 */
/**
 * ⛔⛔ **The truth table, not a call-site count.**
 *
 * This was three source regexes: the steps are gated on `pickupPostponed`, an
 * unpostponed drop-off goes to the form, and `setOdometerOpen(true)` appears
 * exactly once. All three were PROXIES for one guarantee — Stage 05 never runs
 * with the member out of the car — and the proxy broke on 2026-10-12 when an
 * ordinary drop-off legitimately started running the steps too. The check
 * failed while the guarantee held, which is the worst kind of failure: it
 * argues for weakening the check.
 *
 * `routeDropOffSwipe` is the rule now, in lib, and this enumerates every input
 * it has.
 */
const DROPOFF_ROUTES: Array<{
  pickupPostponed: boolean;
  trailChallengesDropOff: boolean;
  expect: DropOffRoute;
  why: string;
}> = [
  {
    pickupPostponed: true, trailChallengesDropOff: false, expect: "steps",
    why: "1a — the driver said the member is in the car",
  },
  {
    pickupPostponed: true, trailChallengesDropOff: true, expect: "steps",
    why: "1a, trail disagreeing — a human already answered what it is guessing at",
  },
  {
    pickupPostponed: false, trailChallengesDropOff: true, expect: "not-live",
    why: "ride 2 — the trail cannot place them, so this tap is not a live drop-off",
  },
  {
    pickupPostponed: false, trailChallengesDropOff: false, expect: "steps",
    why: "an ordinary drop-off — production's own sequence",
  },
];
for (const row of DROPOFF_ROUTES) {
  check(
    `drop-off routing: postponed=${row.pickupPostponed} challenged=${row.trailChallengesDropOff} -> ${row.expect}`,
    routeDropOffSwipe(row) === row.expect,
    `${row.why} — got ${routeDropOffSwipe(row)}`,
  );
}
check("the routing table covers every input, and both outcomes occur",
  DROPOFF_ROUTES.length === 4 &&
    DROPOFF_ROUTES.some((r) => r.expect === "steps") &&
    DROPOFF_ROUTES.some((r) => r.expect === "not-live"),
  `${DROPOFF_ROUTES.length} of 4 combinations`);
/**
 * ⛔⛔ **The guarantee itself**, stated once: there is NO input on which the
 * member's signature is asked for when the trail says they already left and no
 * human has said otherwise.
 */
check("Stage 05 is never reached with the member gone and nobody vouching",
  !DROPOFF_ROUTES.some(
    (r) => !r.pickupPostponed && r.trailChallengesDropOff && routeDropOffSwipe(r) === "steps",
  ),
  "a path reaches the member's signature pad after they have left");
/**
 * And the screen still goes through the rule rather than around it.
 *
 * ⚠️ **B3e moved the call one level in.** The screen now asks `routeSwipeTap`,
 * which decides the SIDE as well, and that function calls `routeDropOffSwipe`
 * rather than restating it — so the member-signature guarantee above is still
 * what the screen reaches. Both links are asserted, because either one going
 * missing would leave the guarantee true in `lib/` and unreached in the app.
 */
const RULES_SRC = readFileSync("lib/driver-data/missed-swipe-rules.ts", "utf8");
check("the ride detail routes swipes through the rule, not an inline branch",
  CODE.includes("routeSwipeTap({") &&
    !/nextSwipe === "drop-off" && swipeNeedsConfirming/.test(CODE) &&
    !CODE.includes("routeDropOffSwipe("),
  "the branch is still inline, or the screen reaches past routeSwipeTap");
check("...and that rule still defers to routeDropOffSwipe for the drop-off",
  /routeDropOffSwipe\(\{ pickupPostponed, trailChallengesDropOff \}\)/.test(RULES_SRC),
  "routeSwipeTap restates the member-signature rule instead of calling it");
/** Element-level, straight off the captures. */
check("the odometer popup carries production's own copy",
  ODO.includes("Odometer Reading") &&
    ODO.includes("Please input your odometer reading:") &&
    ODO.includes("Cancel") && ODO.includes("Submit"),
  "the popup does not match CAP-095");
/**
 * ⚠️ Asserted as PANEL LABELS, not as bare strings. The first version grepped
 * for "Member Signature" anywhere in the file — which still matched the
 * explanatory copy in the member-absent branch, so renaming the panel to
 * "Rider Signature" left the check green. `CAP-098` says Driver / Member.
 */
check("the signature screen takes BOTH panels, labelled as captured",
  SIG.includes('label="Driver Signature"') &&
    SIG.includes('label="Member Signature"') &&
    SIG.includes("Ride Signature"),
  "CAP-098 shows two panels under one Ride Signature header");
check("each panel owns its own Clear",
  (SIG.match(/onClear/g) ?? []).length >= 2 && SIG.includes("showFooter={false}"),
  "the pad's built-in footer is standing in for the captured Clear links");
check("the drop-off records the reading with the mark",
  CODE.includes('recordSwipe(leg, "droppedOffAt", dropOffReading'),
  "the reading is not stored with the mark");
check("the question set is routed, never hardcoded",
  CODE.includes("routeMissedSwipe({") && !/setMissedSwipeAsks\(\s*\[\s*"pickup"/.test(CODE),
  "a literal anchor list is still passed");
check("confirmed answers are written back as marks",
  FORM.includes("recordSwipe(") && FORM.includes("MARK_FOR_ANCHOR[anchor]"),
  "the form files a correction its own leg never sees");
check("the MEMBER signature outcome is recorded on submit",
  FORM.includes("markMemberSignatureMissing(leg.id)"), "the outcome is never recorded");
/**
 * ⛔⛔ **No context callout on ANY form, as of 2026-10-14.**
 *
 * Missed Swipe dropped its own in 2026-10-09 — three tinted variants restating
 * at block level what the fields already said at field level — and this check
 * asserted the other two cases KEPT theirs. They no longer do: the sheet's
 * heading is now one constant with the Issue type field directly under it, so
 * a tinted box between them is the thing that was removed.
 *
 * ⚠️ Widened from "this form" to "every form" rather than deleted. The
 * narrow version would now pass on a repo where the whole mechanism is gone,
 * which is a check describing a decision nobody can break.
 */
const FORM_SOURCES = (
  ["missed-swipe", "rider-no-show", "cancel-at-door", "cannot-reach-member",
   "rider-declined", "send-back-reason", "auto-assign-request", "trip-change",
   "add-leg"] as const
).map((name) => `components/support/${name}-form.tsx`);
const stillCalling = FORM_SOURCES.filter((f) => /callout=/.test(readFileSync(f, "utf8")));
check("no support form passes a context callout",
  stillCalling.length === 0 && FORM_SOURCES.length === 9,
  stillCalling.length ? stillCalling.join(", ") : `0 of ${FORM_SOURCES.length} forms`);
check("...and the sheet has no way to render one",
  !/SupportCallout/.test(readFileSync("components/support/support-form-sheet.tsx", "utf8")) &&
    !/SupportCallout/.test(readFileSync("types/support.ts", "utf8")),
  "the callout type is still reachable");
/**
 * ⛔⛔ **Inverted, 2026-10-14.** This used to assert the per-field help SURVIVED
 * the callout's removal — "at least 3 fields still carry helpText". The grey
 * descriptor under every question has now gone too, by user direction, so the
 * old assertion is false by decision and the new rule is the opposite one:
 * `helpText` renders for exactly one field type.
 *
 * ⚠️ The property is kept rather than deleted because `notice` fields use it as
 * their BODY — an amber block that IS its text, not a description of a question
 * above it. Keeping the property without this check is the trap: someone sets
 * helpText on a text field, sees nothing, and cannot tell why.
 */
const swipeFields = caseFor(["pickup", "dropoff"], RIDE_2).fields;
const strayHelp = swipeFields.filter((f) => f.helpText && f.type !== "notice");
check("only a notice carries helpText — no field descriptors are left",
  strayHelp.length === 0 && swipeFields.length > 5,
  strayHelp.length
    ? `${strayHelp.map((f) => `${f.id} (${f.type})`).join(", ")}`
    : `0 of ${swipeFields.length} fields`);

check("Missed Swipe is the case that keeps Pending",
  FORM.includes("appTracksStatus: true"), "appTracksStatus is not true");
check("the no-show form still is not",
  !readFileSync("components/support/rider-no-show-form.tsx", "utf8").includes("appTracksStatus: true"),
  "Pending leaked back into Rider No-Show");

// ═══════════════════════════════════════════════════════════════════
section("9. Row 03's Now — production refuses the swipe, and says so");
// ═══════════════════════════════════════════════════════════════════
/**
 * B3e. Until now this slice showed its own proposal in BOTH modes: a swipe from
 * outside the geofence opened our 1a/1b prompt whatever side was selected, so
 * row 03 demonstrated its fix as the status quo. That is the mistake row 02
 * shipped and the user found.
 *
 * ⛔⛔ **It is a BLOCK, not a warning, and the plan said otherwise.** The plan
 * recorded `CAP-326` as "a warning, not a block — the driver can still swipe and
 * is told the money is at risk", read off the body's "Trip payment may be
 * denied". Reading the capture says no, three ways: the TITLE is *Unable to
 * complete action*; this slice's own measured data has 2,521 legs a month
 * ending with NEITHER mark after an en-route swipe; and the premise of the case
 * — production cannot record a missed swipe, so the driver calls — only holds
 * if the tap is refused. Corrected 2026-10-14.
 */
const TOO_FAR_SRC = readFileSync("components/driver/swipe-too-far-dialog.tsx", "utf8");
/** ⚠️ Same stripping §8 uses — a grep for an ABSENT string otherwise matches
    the comment explaining its absence, and this file documents its traps. */
const TOO_FAR_CODE = TOO_FAR_SRC
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "");
check("the refusal dialog source was read, and stripping left code behind",
  TOO_FAR_SRC.length > 800 &&
    TOO_FAR_CODE.length > TOO_FAR_SRC.length * 0.2 &&
    TOO_FAR_CODE.length < TOO_FAR_SRC.length,
  `${TOO_FAR_CODE.length} of ${TOO_FAR_SRC.length} chars`);

/**
 * Every catalogue row's id, for the fingerprint sweep below.
 *
 * ⚠️ Read from the catalogue so the sweep cannot silently shrink, and its
 * SIZE is asserted against a declared literal so the catalogue cannot shrink
 * either without someone noticing here.
 */
const CATALOGUE_IDS = SOLUTIONS.map((row) => row.id);

/* --- 9a. The copy, against the capture ---------------------------------- */
/**
 * ⛔ `CAP-326` word for word, declared HERE as a literal. Comparing the module
 * to a constant the module exports would be comparing it to itself.
 */
const CAP_326_BODY =
  "You are too far away from the scheduled drop-off location. " +
  "Trip payment may be denied. Please contact support if assistance is required. " +
  "+1 (888) 545-4309";
check("the drop-off refusal is CAP-326 word for word",
  swipeTooFarBody("dropoff") === CAP_326_BODY,
  `got ${JSON.stringify(swipeTooFarBody("dropoff"))}`);
check("...and the title says the action did NOT happen",
  SWIPE_TOO_FAR_TITLE === "Unable to complete action",
  `got ${JSON.stringify(SWIPE_TOO_FAR_TITLE)}`);
check("...and it ends in production's own phone number",
  SWIPE_TOO_FAR_PHONE === "+1 (888) 545-4309" &&
    swipeTooFarBody("dropoff").endsWith(SWIPE_TOO_FAR_PHONE),
  `got ${SWIPE_TOO_FAR_PHONE}`);
/**
 * ⛔⛔ The pick-up half is the same sentence with ONE word changed. Asserted as
 * a diff rather than as two literals: two copies of a sentence are two chances
 * to drift, and a second literal here would hide a reworded first.
 */
const pickupBody = swipeTooFarBody("pickup");
const diffWords = CAP_326_BODY.split(" ").filter(
  (word, i) => word !== pickupBody.split(" ")[i],
);
check("the pick-up refusal differs from the captured one by exactly one word",
  diffWords.length === 1 &&
    diffWords[0] === "drop-off" &&
    pickupBody.split(" ").length === CAP_326_BODY.split(" ").length &&
    pickupBody.includes("pick-up") &&
    !pickupBody.includes("drop-off"),
  `${diffWords.length} word(s) differ: ${diffWords.join(", ")}`);
/**
 * ⛔⛔ **And that word is INFERRED, not captured.** D2 admits capture-backed or
 * user-confirmed PRODUCTION only; "the user agreed it is probably the same" is
 * an assumption about wording, not a sighting of it. The flag is what stops the
 * fold-in audit treating this like `CAP-326` itself.
 */
check("the inferred half is flagged as inferred, and the captured half as captured",
  SWIPE_TOO_FAR_PROVENANCE.pickup === "inferred" &&
    SWIPE_TOO_FAR_PROVENANCE.dropoff === "captured",
  `pickup=${SWIPE_TOO_FAR_PROVENANCE.pickup} dropoff=${SWIPE_TOO_FAR_PROVENANCE.dropoff}`);
check("...and exactly one of the two ends is still unshot",
  Object.values(SWIPE_TOO_FAR_PROVENANCE).filter((p) => p === "inferred").length === 1 &&
    Object.keys(SWIPE_TOO_FAR_PROVENANCE).length === 2,
  `${Object.values(SWIPE_TOO_FAR_PROVENANCE).join("/")}`);
/** ⛔ Nothing softened, nothing added — production offers no way forward. */
const SOFTENING = /we can help|sorry|try again|contact us|support can/i;
check("nothing is softened or added to production's sentence",
  !SOFTENING.test(swipeTooFarBody("pickup")) &&
    !SOFTENING.test(swipeTooFarBody("dropoff")) &&
    SWIPE_TOO_FAR_DISMISS === "OK",
  "our voice reached production's refusal");

/* --- 9b. The route, both sides ------------------------------------------ */
/**
 * ⛔ Declared as literals, answers included, over row 03's own focus. The two
 * production-refusal rows are the ones that did not exist before B3e.
 */
type TapCase = {
  why: string;
  nextSwipe: "start" | "pick-up" | "drop-off" | null;
  pickupPostponed: boolean;
  trailChallengesPickup: boolean;
  trailChallengesDropOff: boolean;
  mode: DemoMode;
  want: SwipeTapRoute;
};
const TAP_CASES: TapCase[] = [
  { why: "⭐ pick-up, outside the fence, today", nextSwipe: "pick-up", pickupPostponed: false, trailChallengesPickup: true, trailChallengesDropOff: false, mode: "now", want: { kind: "production-refusal", anchor: "pickup" } },
  { why: "⭐ pick-up, outside the fence, proposed", nextSwipe: "pick-up", pickupPostponed: false, trailChallengesPickup: true, trailChallengesDropOff: false, mode: "fixed", want: { kind: "ask-member-aboard", anchor: "pickup" } },
  { why: "pick-up, inside the fence, today", nextSwipe: "pick-up", pickupPostponed: false, trailChallengesPickup: false, trailChallengesDropOff: false, mode: "now", want: { kind: "production-action" } },
  { why: "pick-up, inside the fence, proposed", nextSwipe: "pick-up", pickupPostponed: false, trailChallengesPickup: false, trailChallengesDropOff: false, mode: "fixed", want: { kind: "production-action" } },
  { why: "⭐ drop-off, outside the fence, today", nextSwipe: "drop-off", pickupPostponed: false, trailChallengesPickup: false, trailChallengesDropOff: true, mode: "now", want: { kind: "production-refusal", anchor: "dropoff" } },
  { why: "⭐ drop-off, outside the fence, proposed — ASKS now, it used to go straight to the form", nextSwipe: "drop-off", pickupPostponed: false, trailChallengesPickup: false, trailChallengesDropOff: true, mode: "fixed", want: { kind: "ask-member-aboard", anchor: "dropoff" } },
  { why: "an ordinary drop-off runs production's own steps, today", nextSwipe: "drop-off", pickupPostponed: false, trailChallengesPickup: false, trailChallengesDropOff: false, mode: "now", want: { kind: "drop-off-steps" } },
  { why: "...and on the proposal side too", nextSwipe: "drop-off", pickupPostponed: false, trailChallengesPickup: false, trailChallengesDropOff: false, mode: "fixed", want: { kind: "drop-off-steps" } },
  { why: "1a — a human vouched, so the trail does not matter", nextSwipe: "drop-off", pickupPostponed: true, trailChallengesPickup: false, trailChallengesDropOff: true, mode: "fixed", want: { kind: "drop-off-steps" } },
  { why: "the start swipe is production's, on both sides", nextSwipe: "start", pickupPostponed: false, trailChallengesPickup: true, trailChallengesDropOff: true, mode: "now", want: { kind: "production-action" } },
  { why: "...and nothing offered is nothing to route", nextSwipe: null, pickupPostponed: false, trailChallengesPickup: true, trailChallengesDropOff: true, mode: "fixed", want: { kind: "production-action" } },
];
const tapWrong = TAP_CASES.filter((c) => {
  const got = routeSwipeTap({
    nextSwipe: c.nextSwipe,
    pickupPostponed: c.pickupPostponed,
    trailChallengesPickup: c.trailChallengesPickup,
    trailChallengesDropOff: c.trailChallengesDropOff,
    focus: demoFocus("missed-swipe", c.mode),
  });
  return JSON.stringify(got) !== JSON.stringify(c.want);
});
check("every swipe tap routes where it is declared to",
  tapWrong.length === 0,
  tapWrong.map((c) => c.why).join("; "));
/**
 * ⛔⛔ Non-vacuity. A table whose every row expected `production-action` would
 * pass over a rule that had lost both of row 03's sides.
 */
const tapKinds = new Set(TAP_CASES.map((c) => c.want.kind));
check("...and that table reaches every route, on both sides",
  tapKinds.size === 4 &&
    tapKinds.has("production-refusal") &&
    tapKinds.has("ask-member-aboard") &&
    tapKinds.has("drop-off-steps") &&
    tapKinds.has("production-action") &&
    new Set(TAP_CASES.map((c) => c.mode)).size === DEMO_MODES.length,
  `${tapKinds.size} of 4 route(s): ${[...tapKinds].sort().join(", ")}`);
/**
 * ⛔ Both ends of the leg, on both sides of the comparison.
 *
 * ⚠️ `ask-member-aboard` joined this check when the drop-off started asking.
 * Before that the proposal reached one anchor and production reached two, and
 * a reader could have taken the asymmetry for a rule rather than a gap.
 */
const anchorsFor = (kind: SwipeTapRoute["kind"]) =>
  new Set(
    TAP_CASES.filter((c) => c.want.kind === kind).map(
      (c) => (c.want as { anchor: SwipeAnchor }).anchor,
    ),
  );
const bothEnds = (["production-refusal", "ask-member-aboard"] as const).filter((kind) => {
  const a = anchorsFor(kind);
  return a.size === 2 && a.has("pickup") && a.has("dropoff");
});
check("...and BOTH ends of the leg are refused today and asked about in the proposal",
  bothEnds.length === 2,
  `refusal: ${[...anchorsFor("production-refusal")].sort().join("+")} · ask: ${[...anchorsFor("ask-member-aboard")].sort().join("+")}`);

/* --- 9c. Nobody else's row borrows this -------------------------------- */
/**
 * ⛔⛔ The fingerprint sweep. Our two proposal routes must be reachable ONLY
 * from row 03 on the proposal side, and from the plain mirror where every
 * proposal shows. A gate that let row 01 open the missed-swipe prompt would
 * make a no-show demo show a swipe feature.
 */
const OURS = new Set(["ask-member-aboard"]);
let sweepCount = 0;
const borrowed: string[] = [];
const FOCUS_ROWS: Array<string | null> = [...CATALOGUE_IDS, null];
for (const id of FOCUS_ROWS) {
  for (const mode of DEMO_MODES) {
    for (const nextSwipe of ["pick-up", "drop-off"] as const) {
      sweepCount += 1;
      const route = routeSwipeTap({
        nextSwipe,
        pickupPostponed: false,
        trailChallengesPickup: true,
        trailChallengesDropOff: true,
        focus: demoFocus(id, mode),
      });
      const mayShow = id === null || (id === "missed-swipe" && mode === "fixed");
      if (OURS.has(route.kind) !== mayShow) {
        borrowed.push(`${id ?? "no focus"}/${mode}/${nextSwipe} -> ${route.kind}`);
      }
    }
  }
}
check("the proposal is reachable only from row 03 and the plain mirror",
  borrowed.length === 0,
  `${borrowed.length} of ${sweepCount} wrong — ${borrowed.slice(0, 5).join(", ")}`);
check("...and that sweep is the size it claims",
  sweepCount === FOCUS_ROWS.length * DEMO_MODES.length * 2 && FOCUS_ROWS.length === 27,
  `${FOCUS_ROWS.length} focus(es) x ${DEMO_MODES.length} mode(s) x 2 swipe(s) = ${sweepCount}`);
/** ⛔ ...and every other row sees production's refusal, not nothing at all. */
const strangerRoutes = new Set(
  CATALOGUE_IDS.filter((id) => id !== "missed-swipe").flatMap((id) =>
    DEMO_MODES.map(
      (mode) =>
        routeSwipeTap({
          nextSwipe: "pick-up",
          pickupPostponed: false,
          trailChallengesPickup: true,
          trailChallengesDropOff: false,
          focus: demoFocus(id, mode),
        }).kind,
    ),
  ),
);
check("...and a stranger's row gets production's refusal, not a dead tap",
  strangerRoutes.size === 1 && strangerRoutes.has("production-refusal"),
  `${[...strangerRoutes].join(", ")}`);

/* --- 9d. The unblock is gated ------------------------------------------ */
/**
 * ⛔⛔ **`offeredSwipe` is the dead end in one function.** Production fills the
 * marks left to right and will not offer DROP OFF MEMBER until the pick-up
 * exists — that block is why missing the pick-up costs the drop-off too, and
 * why 14 legs in a month miss only the pick-up. Lifting it is the proposal.
 *
 * Ungated, a demo that postponed a pick-up and then flipped to `"now"` would
 * keep the unblocked button: row 03's fix, shown as the status quo.
 */
const UNBLOCK_CASES: Array<[string | null, DemoMode, string | null]> = [
  ["missed-swipe", "fixed", "drop-off"],
  ["missed-swipe", "now", "pick-up"],
  ["rider-no-show", "fixed", "pick-up"],
  ["rider-no-show", "now", "pick-up"],
  [null, "now", "drop-off"],
  [null, "fixed", "drop-off"],
];
const unblockWrong = UNBLOCK_CASES.filter(
  ([id, mode, want]) => offeredSwipe("pick-up", true, demoFocus(id, mode)) !== want,
);
check("the unblock only lifts production's block on row 03's proposal side",
  unblockWrong.length === 0,
  unblockWrong.map(([id, mode]) => `${id ?? "no focus"}/${mode}`).join(", "));
check("...and that table saw the button both moved and left alone",
  UNBLOCK_CASES.some(([, , w]) => w === "drop-off") &&
    UNBLOCK_CASES.some(([, , w]) => w === "pick-up"),
  "every case expects the same answer");

/* --- 9e. The dialog is production's, and terminal ---------------------- */
check("the refusal dialog reads its words from lib, not its own copy",
  TOO_FAR_CODE.includes("SWIPE_TOO_FAR_TITLE") &&
    TOO_FAR_CODE.includes("swipeTooFarBody(") &&
    TOO_FAR_CODE.includes("SWIPE_TOO_FAR_DISMISS") &&
    !/You are too far away/.test(TOO_FAR_CODE),
  "the dialog hand-writes production's sentence");
check("...and it offers one dismissal and no way forward",
  (TOO_FAR_CODE.match(/<AlertDialogAction/g) ?? []).length === 1 &&
    !/AlertDialogCancel/.test(TOO_FAR_CODE),
  "a second action reached a refusal production ends");
/**
 * ⚠️ The ANCHOR is the open state. A separate boolean could disagree with it —
 * open with no anchor renders the sentence with a blank where the end of the
 * leg should be, which reads as a copy bug rather than a state bug.
 */
check("...and the anchor is the open state, so the two cannot disagree",
  /anchor:\s*SwipeAnchor \| null/.test(TOO_FAR_CODE) &&
    /open=\{anchor !== null\}/.test(TOO_FAR_CODE),
  "a separate open flag could disagree with the anchor");
/**
 * ⛔⛔ A TAG, not a prefix. `includes("<SwipeTooFarDialog")` also matches
 * `<SwipeTooFarDialogUnmounted` — found by a break test 2026-10-14, which
 * renamed the mount and watched the check stay green. The terminator is what
 * makes it a mount rather than a string that starts like one.
 */
check("the ride detail mounts it, and the prompt beside it",
  /<SwipeTooFarDialog[\s/>]/.test(CODE) && /<MissedSwipePrompt[\s/>]/.test(CODE),
  "one of the two sides is not on screen");
/** ⛔ And the screen does not decide the side for itself. */
check("...and the screen asks the rule which side to show, rather than deciding",
  CODE.includes("focus: demo") && !/showsProposal\(/.test(CODE),
  "the screen re-decides the mode");

// ═══════════════════════════════════════════════════════════════════
section("10. The question is asked at both ends, and means different things");

/**
 * ⛔⛔ **The drop-off used to skip this question**, on the reasoning that a
 * missed drop-off "can only mean one thing". It means two, and the app cannot
 * tell them apart — so a driver still on the road with the member aboard, who
 * tapped early, was handed a form asking them to reconstruct the leg they were
 * driving. These checks are about the question existing at both ends AND the
 * two ends not being the same screen with the same consequence.
 */
const ANCHORS: SwipeAnchor[] = ["pickup", "dropoff"];
const prompts = ANCHORS.map((a) => ({ anchor: a, ...promptChoices(a) }));

check("both ends of the leg have a question to ask",
  prompts.length === 2 && prompts.every((p) => p.choices.length === 2),
  prompts.map((p) => `${p.anchor}:${p.choices.length}`).join(" "));

/** ⛔ The same two ANSWERS at both ends — the branch is the consequence. */
const answerSets = prompts.map((p) => p.choices.map((c) => c.answer).sort().join("+"));
check("...offering the same two answers, because the difference is what follows",
  new Set(answerSets).size === 1 && answerSets[0] === "member-aboard+ride-over",
  answerSets.join(" vs "));

/**
 * ⛔⛔ **Non-vacuity, and this is the one that matters.** Parameterising the
 * sheet by anchor is decorative unless the two anchors actually read
 * differently — a drop-off tap showing *"You're not at the pick-up any more"*
 * is the bug the parameter exists to prevent, and it would pass every check
 * above.
 */
const copyFor = (p: (typeof prompts)[number]) =>
  [p.reason, ...p.choices.map((c) => c.title)].join("¶");
check("...and the two ends do not read the same",
  copyFor(prompts[0]) !== copyFor(prompts[1]),
  "both anchors render identical copy — the parameter is decorative");
/**
 * ⛔⛔ **No subtext under any answer** — user direction, 2026-10-14: *"no more
 * subtext, instead just 'You are not at the Pickup Location / Is the member
 * still with you?'"*. Each answer used to carry a second line describing what
 * the app would do next; four lines of prose for a two-way question, and a
 * promise made before the driver had answered.
 *
 * ⚠️ Asserted on the DATA, not on the markup: `Choice` no longer has a second
 * copy property, so the only way one comes back is a new field — which this
 * fails on, because it sweeps every own key of every choice against a declared
 * allow-list.
 */
const CHOICE_KEYS = ["answer", "icon", "title", "tone"];
const extraKeys = prompts.flatMap((p) =>
  p.choices.flatMap((c) => Object.keys(c).filter((k) => !CHOICE_KEYS.includes(k))),
);
check("no answer carries a second line of copy",
  extraKeys.length === 0 &&
    prompts.every((p) => p.choices.every((c) => Object.keys(c).length === CHOICE_KEYS.length)),
  `extra key(s): ${[...new Set(extraKeys)].join(",") || "none"}`);
/**
 * ⛔ And the reason line is the short explicit one, not the old sentence that
 * explained the recording problem. Checked as a shape — one short sentence
 * naming the location — rather than as a literal, because the literal is two
 * lines further up this same file and two copies of a string are two chances to
 * drift.
 */
for (const p of prompts) {
  check(`the ${p.anchor} reason is one short explicit line`,
    /^You are not at the (pick-up|drop-off) location\.$/.test(p.reason),
    `"${p.reason}"`);
}
check("...and neither explains the recording problem any more",
  prompts.every((p) => !/record|happened|any more/i.test(p.reason)),
  prompts.map((p) => p.reason).join(" | "));
/** ⛔ The question itself is unchanged and is the same at both ends. */
check("both ends still ask the same question",
  prompts.every((p) => p.question === "Is the member still with you?"),
  prompts.map((p) => p.question).join(" vs "));

const pickupReason = promptChoices("pickup").reason;
const dropoffReason = promptChoices("dropoff").reason;
check("...each naming its OWN end of the leg",
  pickupReason.includes("pick-up") && !pickupReason.includes("drop-off") &&
    dropoffReason.includes("drop-off") && !dropoffReason.includes("pick-up"),
  `pickup: "${pickupReason.slice(0, 40)}…" dropoff: "${dropoffReason.slice(0, 40)}…"`);

/**
 * ⛔ The sheet is opened BY the anchor, not by a boolean beside it. Two fields
 * can disagree, and the disagreement here is the pick-up's wording after a
 * drop-off tap — invisible to every check above, because the copy itself would
 * still be correct.
 */
/**
 * ⚠️ Comments stripped, the same way §8 does it — this file documents its own
 * traps in comments right beside the code that avoids them, so a grep for an
 * ABSENT string otherwise matches the paragraph explaining its absence.
 */
const PROMPT_SRC = readFileSync("components/support/missed-swipe-prompt.tsx", "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "");
check("stripping the prompt's comments left the code behind",
  PROMPT_SRC.includes("export function MissedSwipePrompt") && PROMPT_SRC.length > 800,
  `${PROMPT_SRC.length} chars after stripping`);
check("the prompt's open state IS the anchor",
  /anchor: SwipeAnchor \| null/.test(PROMPT_SRC) &&
    /open=\{anchor !== null\}/.test(PROMPT_SRC) &&
    // ⚠️ Anchored to the start of a line: an unanchored `open: boolean` also
    // matches `onOpenChange: (open: boolean) => void`, which is the callback's
    // PARAMETER, not a prop. The first version of this check failed on it.
    !/^\s*open\??: boolean/m.test(PROMPT_SRC),
  "a separate open flag has come back");
check("...and the screen passes one, rather than holding a boolean",
  /<MissedSwipePrompt[\s\S]{0,120}anchor=\{promptAnchor\}/.test(CODE) &&
    !/promptOpen/.test(CODE),
  "the screen still carries promptOpen");

/**
 * ⛔⛔ The screen must not re-derive the consequence. It used to branch on
 * `answer === "member-aboard"` itself and call `postponePickup` — a second copy
 * of the rule, and one that is WRONG for the drop-off, where the same answer
 * means carry on.
 */
check("the screen reads routeMissedSwipe for every outcome, including doing nothing",
  /case "not-yet":/.test(CODE) &&
    /case "postpone":/.test(CODE) &&
    !/if \(answer === "member-aboard"\)/.test(CODE),
  "the member-aboard branch is back in the screen");

console.log(
  failures.length === 0
    ? `\n✓ ${passed} checks passed`
    : `\n✗ ${failures.length} failed of ${passed + failures.length}\n` +
      failures.map((f) => `  · ${f}`).join("\n")
);
process.exit(failures.length === 0 ? 0 : 1);
