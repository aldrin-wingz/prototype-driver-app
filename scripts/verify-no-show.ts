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

let passed = 0;
const failures: string[] = [];
function check(label: string, condition: boolean, detail = "") {
  if (condition) passed += 1;
  else failures.push(`${label}${detail ? ` — ${detail}` : ""}`);
}

const activeLeg = (trip: (typeof mockInProgressTrips)[number]) =>
  trip.legs.find((leg) => leg.type === "est-pickup");
const tagged = mockInProgressTrips.filter((trip) => trip.noShowDemo);

// ── The matrix is complete and reachable ────────────────────────────────────
check("every treatment row is seeded on a ride", true);
const seededRows = new Set(tagged.map((t) => t.noShowDemo as NoShowDemoRow));
for (const row of Object.keys(NO_SHOW_TREATMENTS) as NoShowDemoRow[]) {
  check(`row ${row} has a ride`, seededRows.has(row));
}
check("there are rows to check", seededRows.size > 0, `${seededRows.size}`);

// ── The as-is rows must not misrepresent production ─────────────────────────
const asIs = tagged.filter((t) => !String(t.noShowDemo).includes("."));
check("as-is rows exist", asIs.length > 0, `${asIs.length}`);
// ⚠️ Row 5 is the one exception, and it is exempt from BOTH checks. Production's
// own message for "no location points" is unreachable — `canNoshow` inserts a
// location row before it queries — so there is no as-is behaviour to reproduce
// and the row IS the correction. Exempting it from the copy check but not the
// form check is what this script caught on its first run.
const AS_IS_EXEMPT = new Set(["5"]);
let asIsChecked = 0;
for (const trip of asIs) {
  if (AS_IS_EXEMPT.has(String(trip.noShowDemo))) continue;
  const t = treatmentFor(trip);
  asIsChecked += 1;
  check(`${trip.noShowDemo} never offers the form`, !t.offerForm);
  check(`${trip.noShowDemo} uses production copy`, t.copy === "production");
}
check("as-is rows were actually checked", asIsChecked > 0, `${asIsChecked}`);

// ── No refusing ride may be untagged ────────────────────────────────────────
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

// ── The pick-up-time gate: the new rule ─────────────────────────────────────
// ⚠️ THE denominator that matters. Before scenario 6 was seeded,
// `minutesSinceScheduledPickup` was undefined everywhere outside Indiana, so a
// 0-minute threshold passed every ride and this whole rule fired zero times.
let pickupGateFired = 0;
for (const trip of tagged) {
  const leg = activeLeg(trip);
  if (!leg) continue;
  const outcome = resolveNoShow(trip, leg, 0);
  const threshold = postPickupThresholdMinutes(trip);
  if (
    outcome.kind === "timer" &&
    outcome.reason === "post-pickup" &&
    threshold === NO_SHOW_PICKUP_TIME_MINUTES
  ) {
    pickupGateFired += 1;
  }
}
check("the pick-up-time gate fires on at least one ride", pickupGateFired > 0,
  `fired ${pickupGateFired} times`);

// The pair: same situation, opposite outcome, and the difference is the gate.
const six = tagged.find((t) => t.noShowDemo === "6");
const sixOne = tagged.find((t) => t.noShowDemo === "6.1");
check("scenario 6 pair is seeded", Boolean(six && sixOne));
if (six && sixOne) {
  const legA = activeLeg(six)!;
  const legB = activeLeg(sixOne)!;
  // Both must pass presence, or the pair tests the wrong rule.
  check("6 passes the presence walk", walkLocationRecords(legA.locationRecords ?? []).ok);
  check("6.1 passes the presence walk", walkLocationRecords(legB.locationRecords ?? []).ok);
  // Both must actually be before their pick-up.
  check("6 is seeded before the pick-up", (legA.minutesSinceScheduledPickup ?? 0) < 0);
  check("6.1 is seeded before the pick-up", (legB.minutesSinceScheduledPickup ?? 0) < 0);
  // And the outcomes must diverge.
  const outA = resolveNoShow(six, legA, 0);
  const outB = resolveNoShow(sixOne, legB, 0);
  check("6 files today (as-is)", outA.kind === "files", outA.kind);
  check("6.1 is refused (finalised)", outB.kind === "timer", outB.kind);
  check("6.1 refuses on the pick-up time, not presence",
    outB.kind === "timer" && outB.reason === "post-pickup",
    outB.kind === "timer" ? outB.reason : outB.kind);
  // ⚠️ The two candidate answers must NOT agree on the data, or the pair proves
  // nothing about the gate.
  check("the pair genuinely diverges", outA.kind !== outB.kind);
}

// ── The refusal copy is a sentence in both markets ──────────────────────────
const gaLeg = six ? activeLeg(six)! : null;
if (gaLeg) {
  const zero = postPickupRefusalCopy({
    copy: "revised",
    remainingMinutes: 4,
    availableAt: postPickupAvailableAt(gaLeg, NO_SHOW_PICKUP_TIME_MINUTES),
    thresholdMinutes: NO_SHOW_PICKUP_TIME_MINUTES,
  });
  // ⚠️ The bug this guards: reusing Indiana's string at threshold 0 produces
  // "wait at least 0 minutes after the scheduled pickup time".
  check("pick-up-time copy never says 0 minutes", !/\b0 minutes\b/.test(zero), zero);
  check("pick-up-time copy names the pick-up time", zero.includes("11:00 AM"), zero);
  check("pick-up-time copy states the location rule",
    zero.includes(String(NO_SHOW_RADIUS_MILES)) &&
      zero.includes(String(NO_SHOW_WAIT_MINUTES)), zero);

  const fifteen = postPickupRefusalCopy({
    copy: "production",
    remainingMinutes: 9,
    availableAt: null,
    thresholdMinutes: NO_SHOW_POST_PICKUP_MINUTES,
  });
  // Production's exact shape, kept because the driver recognises it.
  check("Indiana copy keeps production's wording",
    fifteen.includes(`at least ${NO_SHOW_POST_PICKUP_MINUTES} minutes`) &&
      fifteen.includes("minute(s) remaining"), fifteen);
  check("the two markets get different sentences", zero !== fifteen);
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

console.log(
  failures.length === 0
    ? `✓ ${passed} checks passed`
    : `✗ ${failures.length} failed of ${passed + failures.length}\n` +
      failures.map((f) => `  · ${f}`).join("\n")
);
process.exit(failures.length === 0 ? 0 : 1);
