/**
 * Rider No-Show guardrail checks.
 *
 * ⚠️ This branch has no test framework, so `bun run typecheck` was the only
 * automated gate — and a guardrail is exactly the thing a typechecker cannot
 * verify. Run with `bun scripts/verify-no-show.ts`.
 *
 * Every check that loops over a filtered set asserts its DENOMINATOR first. A
 * check that agrees with nothing is not a passing check.
 */
import { readFileSync } from "node:fs";
import {
  NO_SHOW_PICKUP_TIME_MINUTES,
  NO_SHOW_POST_PICKUP_MINUTES,
  NO_SHOW_RADIUS_MILES,
  NO_SHOW_TREATMENTS,
  NO_SHOW_TYPES,
  NO_SHOW_WAIT_MINUTES,
  postPickupAvailableAt,
  postPickupRefusalCopy,
  postPickupThresholdMinutes,
  resolveNoShow,
  treatmentFor,
  walkLocationRecords,
  type NoShowDemoRow,
} from "../lib/driver-data/no-show-rules";
import { mockInProgressTrips } from "../lib/driver-data/mock-trips";
import { buildSupportFormCase } from "../lib/support-data/case-registry";
import { ISSUE_RIDER_NO_SHOW } from "../lib/support-data/issue-types";
import { canSubmitCase } from "../lib/support/field-rules";
import {
  findAnyForTrip,
  findPendingForTrip,
  showsPendingState,
} from "../lib/support/request-visibility";

let passed = 0;
const failures: string[] = [];
function check(label: string, condition: boolean, detail = "") {
  if (condition) passed += 1;
  else failures.push(`${label}${detail ? ` — ${detail}` : ""}`);
}

const activeLeg = (trip: (typeof mockInProgressTrips)[number]) =>
  trip.legs.find((leg) => leg.type === "est-pickup");
const tagged = mockInProgressTrips.filter((trip) => trip.noShowDemo);

// ── The seed is EXACTLY the two demo scenarios ─────────────────────────
// ⚠️ Narrowed 2026-09-09. This used to assert that EVERY declared treatment row
// had a ride — the nine-row comparison matrix. The demo is now two rides, one per
// user story, so the assertion is INVERTED: the expected set is declared here as a
// literal, and the seed must match it exactly. Declaring it rather than deriving it
// from the seed is the point — a set derived from the thing it checks cannot fail.
const EXPECTED_ROWS = ["3.1", "4.1"] as const;
const seededRows = new Set(tagged.map((t) => t.noShowDemo as NoShowDemoRow));
check("the seed carries exactly the expected rows",
  seededRows.size === EXPECTED_ROWS.length &&
    EXPECTED_ROWS.every((r) => seededRows.has(r as NoShowDemoRow)),
  [...seededRows].sort().join(",") || "none");
for (const row of seededRows) {
  check(`seeded row ${row} is a declared treatment`,
    Object.prototype.hasOwnProperty.call(NO_SHOW_TREATMENTS, row));
}
check("there are rows to check", seededRows.size > 0, `${seededRows.size}`);

// ── As-is rows: none are seeded now, and that is DECLARED ────────────────
// The rule still applies if one ever returns: an as-is row reproduces production,
// so it must not offer the form or use revised copy. ⚠️ Row 5 was always exempt from
// BOTH — production's "no location points" message is unreachable, so there is no
// as-is behaviour to reproduce. Exempting it from the copy check but not the form
// check is what this script caught on its very first run; the pairing is kept.
const AS_IS_EXEMPT = new Set(["5"]);
const asIs = tagged.filter((t) => !String(t.noShowDemo).includes("."));
check("the demo seeds no as-is rows", asIs.length === 0,
  asIs.map((t) => t.noShowDemo).join(","));
for (const trip of asIs) {
  if (AS_IS_EXEMPT.has(String(trip.noShowDemo))) continue;
  const t = treatmentFor(trip);
  check(`${trip.noShowDemo} never offers the form`, !t.offerForm);
  check(`${trip.noShowDemo} uses production copy`, t.copy === "production");
}

// ── No refusing ride may be untagged ─────────────────────────────
let refusing = 0;
for (const trip of mockInProgressTrips) {
  const leg = activeLeg(trip);
  if (!leg) continue;
  const outcome = resolveNoShow(trip, leg, 0);
  if (outcome.kind === "timer" || outcome.kind === "form") {
    refusing += 1;
    check(`refusing ride ${trip.id} is tagged`, Boolean(trip.noShowDemo),
      `${outcome.kind} with no noShowDemo`);
  }
}
check("some ride actually refuses", refusing > 0, `${refusing}`);

// ── The two stories, one ride each ──────────────────────────────
// These replace the matrix checks. They assert the branch each ride demonstrates,
// which is exactly what `PRD - Rider No-Show.md` specifies — timer if the driver IS
// at the pick-up, form if they are NOT. ⚠️ Both must FAIL the presence walk, or they
// would file and neither story would be reachable.
const timerRide = tagged.find((t) => t.noShowDemo === "3.1");
const formRide = tagged.find((t) => t.noShowDemo === "4.1");
check("the timer ride (3.1) is seeded", Boolean(timerRide));
check("the form ride (4.1) is seeded", Boolean(formRide));

if (timerRide) {
  const leg = activeLeg(timerRide)!;
  const walk = walkLocationRecords(leg.locationRecords ?? []);
  check("3.1 does not pass the presence walk", !walk.ok);
  check("3.1 is still near the pick-up now", walk.ok === false && walk.nearRunOldestAge !== null,
    `nearRunOldestAge=${walk.ok === false ? walk.nearRunOldestAge : "n/a"}`);
  const out = resolveNoShow(timerRide, leg, 0);
  check("3.1 refuses with a timer", out.kind === "timer", out.kind);
  check("3.1 refuses on presence, not the pick-up time",
    out.kind === "timer" && out.reason === "presence",
    out.kind === "timer" ? out.reason : out.kind);
  check("3.1 shows a countdown", treatmentFor(timerRide).showTimer);
  // ⚠️ The invariant that matters most: a form here would be a way to skip the wait.
  check("3.1 offers NO form", !treatmentFor(timerRide).offerForm);
}

if (formRide) {
  const leg = activeLeg(formRide)!;
  const walk = walkLocationRecords(leg.locationRecords ?? []);
  check("4.1 does not pass the presence walk", !walk.ok);
  check("4.1 has no near run — the driver has left",
    walk.ok === false && walk.nearRunOldestAge === null,
    `nearRunOldestAge=${walk.ok === false ? walk.nearRunOldestAge : "n/a"}`);
  const out = resolveNoShow(formRide, leg, 0);
  check("4.1 opens the form", out.kind === "form", out.kind);
  check("4.1 opens it because the driver is not at the pick-up",
    out.kind === "form" && out.gap === "not_at_pickup",
    out.kind === "form" ? out.gap : out.kind);
  check("4.1 actually offers the form", treatmentFor(formRide).offerForm);
}

// ⚠️ The two rides must genuinely DIVERGE, or the pair proves nothing.
if (timerRide && formRide) {
  const a = resolveNoShow(timerRide, activeLeg(timerRide)!, 0);
  const b = resolveNoShow(formRide, activeLeg(formRide)!, 0);
  check("the two demo rides reach different outcomes", a.kind !== b.kind,
    `${a.kind} vs ${b.kind}`);
}

// ── The pick-up-time rule ───────────────────────────────────
// ⚠️ The PROPOSAL to standardize Indiana's +15 across every market was WITHDRAWN
// 2026-09-09, and scenarios 6 / 6.1 / WV1 / WV1.1 went with it. But WellTrans
// Indiana's +15 is LIVE PRODUCTION and this code still implements it, so the
// coverage stays — driven from a synthetic trip rather than a seeded ride, since no
// demo ride exercises it any more. Built by spreading a real trip so every required
// property is real; a hand-built `as Trip` fixture would silence missing fields.
const anyTrip = mockInProgressTrips[0];
check("there is a trip to build fixtures from", Boolean(anyTrip));
if (anyTrip) {
  const indiana = { ...anyTrip, client: "WellTrans", market: "IN" as const, noShowDemo: undefined };
  const elsewhere = { ...anyTrip, client: "Verida", market: "GA" as const, noShowDemo: undefined };
  check("WellTrans Indiana still waits 15 minutes",
    postPickupThresholdMinutes(indiana) === NO_SHOW_POST_PICKUP_MINUTES,
    `${postPickupThresholdMinutes(indiana)}`);
  // ⚠️⚠️ A DECLARED DIVERGENCE, not an assertion of intent.
  // `PRD - Rider No-Show.md` withdrew the universal pick-up-time gate on 2026-09-09:
  // only WellTrans Indiana has a wait, and no other market gains one. The CODE has not
  // caught up — `treatmentFor`'s default carries `pickupTimeGate: true`, so an untagged
  // ride outside Indiana still resolves to a 0-minute gate rather than no gate at all.
  //
  // It is unobservable in this demo (both seeded rides are tagged, and neither seeds
  // `minutesSinceScheduledPickup`, so `0 < 0` is false and no timer fires), which is
  // exactly why it needs a check rather than a comment. This asserts what the code DOES
  // so the divergence cannot be forgotten: when the default is flipped to `false`, this
  // fails, and whoever flips it will read this note and know the PRD already expects it.
  check("⚠️ untagged non-Indiana still carries the WITHDRAWN universal gate",
    postPickupThresholdMinutes(elsewhere) === NO_SHOW_PICKUP_TIME_MINUTES,
    `${postPickupThresholdMinutes(elsewhere)} — PRD says this should be null`);

  const anyLeg = activeLeg(anyTrip);
  check("the fixture trip has a leg", Boolean(anyLeg));
  if (anyLeg) {
    const zeroAt = postPickupAvailableAt(anyLeg, NO_SHOW_PICKUP_TIME_MINUTES);
    const zero = postPickupRefusalCopy({
      copy: "revised",
      remainingMinutes: 4,
      availableAt: zeroAt,
      thresholdMinutes: NO_SHOW_PICKUP_TIME_MINUTES,
    });
    // ⚠️ The bug this guards: reusing Indiana's string at threshold 0 produces
    // "wait at least 0 minutes after the scheduled pickup time".
    check("pick-up-time copy never says 0 minutes", !/\b0 minutes\b/.test(zero), zero);
    check("pick-up-time copy names the unlock time",
      Boolean(zeroAt) && zero.includes(String(zeroAt)), zero);
    check("pick-up-time copy states the location rule",
      zero.includes(String(NO_SHOW_RADIUS_MILES)) &&
        zero.includes(String(NO_SHOW_WAIT_MINUTES)), zero);

    const fifteen = postPickupRefusalCopy({
      copy: "production",
      remainingMinutes: 9,
      availableAt: null,
      thresholdMinutes: NO_SHOW_POST_PICKUP_MINUTES,
    });
    check("Indiana copy keeps production's wording",
      fifteen.includes(`at least ${NO_SHOW_POST_PICKUP_MINUTES} minutes`) &&
        fifteen.includes("minute(s) remaining"), fifteen);
    check("the two thresholds get different sentences", zero !== fifteen);
  }
}

// ── The no-show type is a LABEL, not a branch ───────────────────────────────
check("all three production types are offered", NO_SHOW_TYPES.length === 3,
  NO_SHOW_TYPES.join("/"));
check("Cancel At Door is one of them",
  NO_SHOW_TYPES.some((t) => /cancel at door/i.test(t)), NO_SHOW_TYPES.join("/"));

/**
 * ⚠️ The invariant that matters, and it needs a source scan to be falsifiable.
 *
 * "All three types behave the same" is true by CONSTRUCTION right now —
 * `resolveNoShow` does not take the type and the form builder does not either —
 * so asserting it against the running code proves nothing and would keep passing
 * the day somebody adds the branch back. What can fail is the SHAPE: a
 * comparison against a type string anywhere in the rules or the form, and an
 * extra parameter on the resolver.
 */
const RULES_SRC = readFileSync("lib/driver-data/no-show-rules.ts", "utf8");
const SCREEN_SRC = readFileSync("components/driver/member-no-show-screen.tsx", "utf8");
const FORM_SRC = readFileSync("components/support/rider-no-show-form.tsx", "utf8");
const REGISTRY_SRC = readFileSync("lib/support-data/case-registry.ts", "utf8");

// Positive control: the scan can find the list it is looking for values from.
check("the scan reads the real rules file", RULES_SRC.includes("NO_SHOW_TYPES"));

for (const [name, src] of [
  ["rules", RULES_SRC],
  ["no-show screen", SCREEN_SRC],
  ["form wrapper", FORM_SRC],
  ["case registry", REGISTRY_SRC],
] as const) {
  // Strip comments first — these files legitimately DISCUSS Cancel At Door at
  // length, explaining that it is not branched on. Scanning raw text would trip
  // on the very notes that document the rule.
  const code = src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  for (const type of NO_SHOW_TYPES) {
    /**
     * ⚠️ Looks for a COMPARISON, not a mention. The first version of this check
     * searched for the bare literal and failed on the rules file — which is where
     * `NO_SHOW_TYPES` is DECLARED. A declaration is not a branch, and a check
     * that cannot tell them apart can only be satisfied by deleting the list.
     */
    const compared = new RegExp(
      `(?:===|!==|==(?!=)|!=(?!=)|case)\\s*"${type.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`
    );
    check(`${name} never compares against "${type}"`, !compared.test(code),
      `literal comparison in ${name}`);
  }
  // A named constant is the other way one comes back.
  check(`${name} declares no per-type constant`,
    !/NO_SHOW_TYPE_[A-Z_]+/.test(code), name);
}

// ⚠️ Arity 2, not 3: `Function.length` counts only the parameters BEFORE the
// first defaulted one, and `elapsedMinutes = 0` is defaulted. Getting this wrong
// is how a shape check passes for the wrong reason — here it failed loudly, but
// an off-by-one in the permissive direction would not have.
check("resolveNoShow takes no no-show type", resolveNoShow.length === 2,
  `arity ${resolveNoShow.length}`);

// And the form is the same four questions whichever type is carried in.
const perType = NO_SHOW_TYPES.map((type) => {
  const built = buildSupportFormCase({ includeIssues: [ISSUE_RIDER_NO_SHOW] });
  return { type, ids: built.fields.map((f) => f.id).join(",") };
});
check("every type builds the same field set",
  new Set(perType.map((p) => p.ids)).size === 1,
  perType.map((p) => `${p.type}: ${p.ids}`).join(" | "));

// ── The form asks four questions and no attachment ─────────────────────────
const form = buildSupportFormCase({ includeIssues: [ISSUE_RIDER_NO_SHOW] });
const ids = form.fields.map((f) => f.id);
check("the form has fields", ids.length > 0, `${ids.length}`);
for (const gone of ["contactProof", "cancelToldBy", "cancelProof"]) {
  check(`the form no longer asks ${gone}`, !ids.includes(gone), ids.join(","));
}
check("no field is a file upload",
  !form.fields.some((f) => f.type === "file"),
  form.fields.filter((f) => f.type === "file").map((f) => f.id).join(","));
for (const kept of ["waitedFrom", "leftAt", "waitedWhere", "knocked"]) {
  check(`the form still asks ${kept}`, ids.includes(kept), ids.join(","));
}
// ⚠️ With the attachment gone, the submit gate must be satisfiable by the four
// answers alone — an unreachable gate is worse than a missing field.
const standalone = buildSupportFormCase({
  includeIssues: [ISSUE_RIDER_NO_SHOW],
  askNoShowType: true,
  askSignature: true,
});
const filled: Record<string, string> = {
  issue: ISSUE_RIDER_NO_SHOW,
  noShowType: NO_SHOW_TYPES[0],
  legId: "1049800386",
  waitedFrom: "10:31",
  leftAt: "10:56",
  waitedWhere: "Bus shelter out front",
  knocked: "no",
  signature: "signed",
};
check("the form can be submitted", canSubmitCase(standalone.fields, filled));
// And is genuinely blocked without one of them, or the gate means nothing.
const { waitedWhere: _omit, ...missing } = filled;
check("the form is blocked when a required answer is missing",
  !canSubmitCase(standalone.fields, missing));

// ── A submitted no-show shows the driver NOTHING afterwards ──────────────
/**
 * ⚠️ The PRD removed Rider No-Show's Pending state on 2026-09-08, when the
 * destination became Zendesk. The prototype had built the banner, the
 * PENDING SUPPORT REVIEW pill and the My Rides → Pending tab, and all three are
 * recorded as superseded — "never write it as spec".
 *
 * The invariant is awkward to state and worth stating anyway: the app keeps the
 * record, because the driver DID submit and the requests tray will need it,
 * while showing no status for it. Both halves are asserted — deleting the
 * record would also empty the pending lookup and would sail through a check
 * that only looked for absence.
 */
const NO_SHOW_REQUEST = { tripId: "1049800377", appTracksStatus: false };
const TRACKED_REQUEST = { tripId: "1049800377", appTracksStatus: true };

check("a no-show request shows no pending state", !showsPendingState(NO_SHOW_REQUEST));
check(
  "a no-show request is still RECORDED, not dropped",
  findAnyForTrip([NO_SHOW_REQUEST], "1049800377") !== undefined
);
check(
  "the ride surfaces see nothing for it",
  findPendingForTrip([NO_SHOW_REQUEST], "1049800377") === undefined
);
/** The negative control: the rule must still be able to return something. */
check(
  "a tracked request DOES surface, so the rule is not dead",
  findPendingForTrip([TRACKED_REQUEST], "1049800377") !== undefined
);
/** Mixed store — the untracked one must be SKIPPED, not merely sorted last. */
check(
  "an untracked request is skipped rather than ordered last",
  findPendingForTrip(
    [NO_SHOW_REQUEST, { tripId: "other", appTracksStatus: true }],
    "1049800377"
  ) === undefined
);

/**
 * ⚠️ The checks above prove the RULE is right. This one proves the no-show form
 * actually uses it — without which flipping one literal in the form would
 * restore the superseded Pending state with every check still green.
 */
check(
  "the no-show form declares itself untracked",
  /appTracksStatus:\s*false/.test(FORM_SRC),
  "expected `appTracksStatus: false` in rider-no-show-form.tsx"
);
check(
  "and never claims to be tracked",
  !/appTracksStatus:\s*true/.test(FORM_SRC),
  "rider-no-show-form.tsx sets appTracksStatus true — that restores Pending"
);

console.log(
  failures.length === 0
    ? `✓ ${passed} checks passed`
    : `✗ ${failures.length} failed of ${passed + failures.length}\n` +
      failures.map((f) => `  · ${f}`).join("\n")
);
process.exit(failures.length === 0 ? 0 : 1);
