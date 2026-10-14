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
  DEFAULT_DEMO_MODE,
  DEMO_MODES,
  demoFocus,
  type DemoFocus,
  type DemoMode,
} from "../lib/solutions/demo-mode";
import {
  NO_SHOW_PICKUP_TIME_MINUTES,
  NO_SHOW_POST_PICKUP_MINUTES,
  NO_SHOW_RADIUS_MILES,
  NO_SHOW_AS_IS_PAIR,
  NO_SHOW_TREATMENTS,
  NO_SHOW_TYPES,
  NO_SHOW_WAIT_MINUTES,
  type NoShowType,
  postPickupAvailableAt,
  postPickupRefusalCopy,
  postPickupThresholdMinutes,
  answerEarnsWaiver,
  CONTACT_RELATION_OPTIONS,
  noShowFormFor,
  resolveNoShow,
  SPOKE_WITH_CONTACT,
  SPOKE_WITH_MEMBER,
  SPOKE_WITH_NOBODY,
  SPOKE_WITH_OPTIONS,
  treatmentFor,
  waivesPresenceWait,
  walkLocationRecords,
  CLIENT_WAIT_MINUTES,
  LEAVE_WARNING_LEAVE,
  LEAVE_WARNING_STAY,
  LEAVE_WARNING_TITLE,
  REFUSAL_DISMISS_PRODUCTION,
  REFUSAL_DISMISS_PROPOSED,
  leaveWarningBody,
  refusalDismissLabel,
  requiredWaitMinutes,
  type NoShowDemoRow,
} from "../lib/driver-data/no-show-rules";
import { mockInProgressTrips } from "../lib/driver-data/mock-trips";
import { buildSupportFormCase } from "../lib/support-data/case-registry";
import { ISSUE_CANCEL_AT_DOOR, ISSUE_RIDER_NO_SHOW } from "../lib/support-data/issue-types";
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

/**
 * The plain mirror — no focus, so no side, and `treatmentFor` returns the
 * ride's own matrix row exactly as it did before B3a.
 *
 * ⛔ Every check written before the Now/Fixed split uses this, and that is the
 * claim: they go on asserting what the seeded demo has always asserted. §9 is
 * the only place that drives the production side.
 */
const PLAIN_MIRROR: DemoFocus = demoFocus(null, DEFAULT_DEMO_MODE);

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
  const t = treatmentFor(trip, PLAIN_MIRROR);
  check(`${trip.noShowDemo} never offers the form`, !t.offerForm);
  check(`${trip.noShowDemo} uses production copy`, t.copy === "production");
}

// ── No refusing ride may be untagged ─────────────────────────────
/**
 * Rides that refuse a no-show while belonging to ANOTHER slice.
 *
 * ⚠️ A literal list, declared here, never derived from `noShowDemo` being
 * absent — deriving it would make the check assert "every untagged ride is
 * untagged" and pass forever. These three are the Missed Swipe seeds (slice 03):
 * their location records are tens of minutes old, so the no-show walk finds
 * nothing in its 20-minute lookback and falls through to the form. That is the
 * right answer for a ride nobody is filing a no-show on, and tagging them with a
 * comparison-matrix row they do not demonstrate would be worse than exempting
 * them.
 */
const OTHER_SLICE_RIDES = new Set([
  "1049800381",
  "1049800382",
  /**
   * ⚠️ Row 14's advance send-back ride (`13b`), added 2026-10-12. It carries no
   * `locationRecords` at all, so the no-show walk finds nothing in its lookback
   * and falls through to the form — the same shape as the Missed Swipe seeds
   * and for the same reason. Nobody files a no-show on it; it exists to show a
   * send-back that attracts no penalty.
   *
   * ⛔ Its sibling `1049800394` (`13a`) is deliberately NOT here: that leg is
   * `wait-for-call`, so the no-show rule never reaches this branch for it. An
   * id in this set that never refuses would inflate the carve-out while
   * exercising nothing, which the count below exists to catch.
   */
  "1049800395",
  /**
   * ⚠️ Row 14's standing-order ride (`13c`), added 2026-10-13 — same shape as
   * `13b`: no `locationRecords`, so the no-show walk finds nothing and falls
   * through to the form. Nobody files a no-show on it; it exists to show what
   * sending back a standing order costs.
   */
  "1049800396",
]);

let refusing = 0;
let exempted = 0;
for (const trip of mockInProgressTrips) {
  const leg = activeLeg(trip);
  if (!leg) continue;
  const outcome = resolveNoShow(trip, leg, PLAIN_MIRROR, 0);
  if (outcome.kind === "timer" || outcome.kind === "form") {
    if (OTHER_SLICE_RIDES.has(trip.id)) {
      exempted += 1;
      continue;
    }
    refusing += 1;
    check(`refusing ride ${trip.id} is tagged`, Boolean(trip.noShowDemo),
      `${outcome.kind} with no noShowDemo`);
  }
}
check("some ride actually refuses", refusing > 0, `${refusing}`);
// The exemption must stay a narrow carve-out, not a hole. If a Missed Swipe ride
// stops refusing — or one is deleted — this says so rather than quietly
// shrinking the population the check above runs on.
check("every exempt ride is still exercised", exempted === 3,
  `${exempted} of ${OTHER_SLICE_RIDES.size} exempt ids refuse (1049800382 is past pick-up, so no-show never applies)`);

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
  const out = resolveNoShow(timerRide, leg, PLAIN_MIRROR, 0);
  check("3.1 refuses with a timer", out.kind === "timer", out.kind);
  check("3.1 refuses on presence, not the pick-up time",
    out.kind === "timer" && out.reason === "presence",
    out.kind === "timer" ? out.reason : out.kind);
  check("3.1 shows a countdown", treatmentFor(timerRide, PLAIN_MIRROR).showTimer);
  // ⚠️ The invariant that matters most: a form here would be a way to skip the wait.
  check("3.1 offers NO form", !treatmentFor(timerRide, PLAIN_MIRROR).offerForm);
}

if (formRide) {
  const leg = activeLeg(formRide)!;
  const walk = walkLocationRecords(leg.locationRecords ?? []);
  check("4.1 does not pass the presence walk", !walk.ok);
  check("4.1 has no near run — the driver has left",
    walk.ok === false && walk.nearRunOldestAge === null,
    `nearRunOldestAge=${walk.ok === false ? walk.nearRunOldestAge : "n/a"}`);
  const out = resolveNoShow(formRide, leg, PLAIN_MIRROR, 0);
  check("4.1 opens the form", out.kind === "form", out.kind);
  check("4.1 opens it because the driver is not at the pick-up",
    out.kind === "form" && out.gap === "not_at_pickup",
    out.kind === "form" ? out.gap : out.kind);
  check("4.1 actually offers the form", treatmentFor(formRide, PLAIN_MIRROR).offerForm);
}

// ⚠️ The two rides must genuinely DIVERGE, or the pair proves nothing.
if (timerRide && formRide) {
  const a = resolveNoShow(timerRide, activeLeg(timerRide)!, PLAIN_MIRROR, 0);
  const b = resolveNoShow(formRide, activeLeg(formRide)!, PLAIN_MIRROR, 0);
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
    postPickupThresholdMinutes(indiana, PLAIN_MIRROR) === NO_SHOW_POST_PICKUP_MINUTES,
    `${postPickupThresholdMinutes(indiana, PLAIN_MIRROR)}`);
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
    postPickupThresholdMinutes(elsewhere, PLAIN_MIRROR) === NO_SHOW_PICKUP_TIME_MINUTES,
    `${postPickupThresholdMinutes(elsewhere, PLAIN_MIRROR)} — PRD says this should be null`);

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

// ── The no-show type IS a branch — the captured contract ───────────────────
/**
 * ⛔ **This section replaces its own opposite, and the replacement is forced by
 * evidence.** Until 2026-10-09 it asserted that the type was a label and never a
 * branch: nine checks that grepped four source files for `=== "Cancel At Door"`
 * and asserted `resolveNoShow.length === 2`.
 *
 * ⚠️ **Eight of those nine did not fire** when the branch was deliberately and
 * completely restored. They were written to catch a literal comparison, and the
 * branch came back as a keyed record lookup — invisible to every one of them.
 * Only the per-type-constant name check tripped, and only by accident of naming.
 * A shape check guards the shape it imagined, not the behaviour it was named
 * for. Everything below asserts BEHAVIOUR, and counts its denominator.
 */
check("all three production types are offered", NO_SHOW_TYPES.length === 3,
  NO_SHOW_TYPES.join("/"));
check("Cancel At Door is one of them",
  NO_SHOW_TYPES.some((t) => /cancel at door/i.test(t)), NO_SHOW_TYPES.join("/"));

/**
 * The contract, read off `CAP-232`/`CAP-233`/`CAP-234` and DECLARED here as
 * literals. Never derived from `NO_SHOW_TYPE_FORMS` — an expectation computed
 * from the thing it checks cannot fail.
 */
const EXPECTED_FORMS: Record<string, {
  extra: string | null; helper: boolean; signature: string; waives: boolean;
}> = {
  "Member Not Home":  { extra: null,         helper: false, signature: "Driver Signature", waives: false },
  "Cancel At Door":   { extra: "Spoke with", helper: false, signature: "Member Signature", waives: true  },
  "Member Not Ready": { extra: null,         helper: true,  signature: "Driver Signature", waives: false },
};
check("the expectation covers every offered type",
  Object.keys(EXPECTED_FORMS).length === NO_SHOW_TYPES.length &&
    NO_SHOW_TYPES.every((t) => t in EXPECTED_FORMS),
  `${Object.keys(EXPECTED_FORMS).length} expected vs ${NO_SHOW_TYPES.length} offered`);

for (const type of NO_SHOW_TYPES) {
  const want = EXPECTED_FORMS[type];
  const got = noShowFormFor(type);
  check(`${type} — extra field matches the capture`,
    (got.extraField?.label ?? null) === want.extra,
    `${got.extraField?.label ?? "none"} vs ${want.extra ?? "none"}`);
  check(`${type} — helper line matches the capture`,
    Boolean(got.helper) === want.helper, got.helper ?? "none");
  check(`${type} — signature label matches the capture`,
    got.signatureLabel === want.signature, got.signatureLabel);
  check(`${type} — waiver matches the proposal`,
    waivesPresenceWait(type, PLAIN_MIRROR) === want.waives, `${waivesPresenceWait(type, PLAIN_MIRROR)}`);
}

/**
 * ⚠️ The per-type checks above all pass if the record says the SAME thing three
 * times and the expectation agrees. These counts are what make it a branch: each
 * trait must belong to exactly one of the three.
 */
const withExtra = NO_SHOW_TYPES.filter((t) => noShowFormFor(t).extraField);
const withHelper = NO_SHOW_TYPES.filter((t) => noShowFormFor(t).helper);
const memberSigned = NO_SHOW_TYPES.filter(
  (t) => noShowFormFor(t).signatureLabel === "Member Signature");
const waiving = NO_SHOW_TYPES.filter((t) => waivesPresenceWait(t, PLAIN_MIRROR));
check("exactly one type adds a field", withExtra.length === 1,
  `${withExtra.length} of ${NO_SHOW_TYPES.length}: ${withExtra.join(",") || "none"}`);
check("exactly one type carries a helper line", withHelper.length === 1,
  `${withHelper.length} of ${NO_SHOW_TYPES.length}: ${withHelper.join(",") || "none"}`);
check("exactly one type takes the MEMBER's signature", memberSigned.length === 1,
  `${memberSigned.length} of ${NO_SHOW_TYPES.length}: ${memberSigned.join(",") || "none"}`);
check("exactly one type waives the presence wait", waiving.length === 1,
  `${waiving.length} of ${NO_SHOW_TYPES.length}: ${waiving.join(",") || "none"}`);
check("and the one that waives is the one that asks who they spoke with",
  waiving.length === 1 && waiving[0] === withExtra[0], `${waiving[0]} vs ${withExtra[0]}`);

// `CAP-229`: before any type is picked, the pad already reads "Driver Signature".
check("the pre-selection default is the captured empty state",
  noShowFormFor("").signatureLabel === "Driver Signature" &&
    noShowFormFor("").extraField === null && noShowFormFor("").helper === null,
  noShowFormFor("").signatureLabel);
// ⚠️ The waiver must not be reachable by an unknown string.
check("an unrecognised type waives nothing", !waivesPresenceWait("Cancelled At Door", PLAIN_MIRROR));
check("and neither does an empty one", !waivesPresenceWait("", PLAIN_MIRROR));

// ── The waiver: what it DOES ───────────────────────────────────────────────
if (timerRide) {
  const leg = activeLeg(timerRide)!;
  // Positive control: this ride is a timer, which is the whole premise.
  check("3.1 with no type chosen is still a timer",
    resolveNoShow(timerRide, leg, PLAIN_MIRROR, 0, null).kind === "timer",
    resolveNoShow(timerRide, leg, PLAIN_MIRROR, 0, null).kind);

  const byType = NO_SHOW_TYPES.map(
    (t) => ({ t, out: resolveNoShow(timerRide, leg, PLAIN_MIRROR, 0, t) }));
  const files = byType.filter((r) => r.out.kind === "files");
  check("exactly one type gets past the ten-minute wait here",
    files.length === 1,
    byType.map((r) => `${r.t}: ${r.out.kind}`).join(" | "));
  check("and it is Cancel At Door",
    files.length === 1 && files[0].t === "Cancel At Door", files[0]?.t ?? "none");

  const cad = resolveNoShow(timerRide, leg, PLAIN_MIRROR, 0, "Cancel At Door");
  check("the waived filing is FLAGGED as waived",
    cad.kind === "files" && cad.presenceWaitWaived,
    cad.kind === "files" ? `${cad.presenceWaitWaived}` : cad.kind);
  /**
   * ⚠️ It must report what the app actually SAW, not the ten minutes it never
   * observed — otherwise the submit copy claims evidence that does not exist.
   */
  check("it reports the observed time, which is short of the wait",
    cad.kind === "files" && cad.qualifyingMinutes > 0 &&
      cad.qualifyingMinutes < NO_SHOW_WAIT_MINUTES,
    cad.kind === "files" ? `${cad.qualifyingMinutes}` : cad.kind);
}

// ── The waiver: what it must NOT do ────────────────────────────────────────
/**
 * ⚠️ These four are the reason the waiver is safe to ship. It waives the
 * DURATION of the wait and nothing else; a Cancel At Door is not a skeleton key.
 */
if (formRide) {
  const leg = activeLeg(formRide)!;
  const cad = resolveNoShow(formRide, leg, PLAIN_MIRROR, 0, "Cancel At Door");
  check("a driver who has LEFT still cannot file a Cancel At Door",
    cad.kind === "form", cad.kind);
  check("and is told the real reason", cad.kind === "form" && cad.gap === "not_at_pickup",
    cad.kind === "form" ? cad.gap : cad.kind);
}
if (timerRide) {
  const leg = activeLeg(timerRide)!;
  const noFix = resolveNoShow(timerRide, { ...leg, locationRecords: [] }, PLAIN_MIRROR, 0, "Cancel At Door");
  check("a phone with no location still cannot file a Cancel At Door",
    noFix.kind === "form" && noFix.gap === "no_location_data",
    noFix.kind === "form" ? noFix.gap : noFix.kind);

  // The pick-up-time gate is a DIFFERENT rung and the waiver does not reach it.
  const indiana = { ...timerRide, client: "WellTrans", market: "IN" as const, noShowDemo: undefined };
  const notDueYet = { ...leg, minutesSinceScheduledPickup: 0 };
  const gated = resolveNoShow(indiana, notDueYet, PLAIN_MIRROR, 0, "Cancel At Door");
  check("a Cancel At Door on a ride that is not due yet is still refused",
    gated.kind === "timer" && gated.reason === "post-pickup",
    gated.kind === "timer" ? gated.reason : gated.kind);
}

/**
 * The SUPPORT form stays type-agnostic, and that is not a contradiction.
 *
 * ⚠️ Two different artifacts. The production SCREEN branches on the type; the
 * support form is the escape hatch offered after a refusal, and it asks the same
 * "what happened" questions whatever the driver had selected. The 2026-09-07
 * decision conflated the two, which is part of how it went wrong.
 */
const perType = NO_SHOW_TYPES.map((type) => {
  const built = buildSupportFormCase({ includeIssues: [ISSUE_RIDER_NO_SHOW] });
  return { type, ids: built.fields.map((f) => f.id).join(",") };
});
check("the support form has fields to compare", perType.every((p) => p.ids.length > 0),
  perType.map((p) => p.ids.length).join(","));
check("every type builds the same SUPPORT form field set",
  new Set(perType.map((p) => p.ids)).size === 1,
  perType.map((p) => `${p.type}: ${p.ids}`).join(" | "));

// The screen renders from the contract rather than from its own literals.
const SCREEN = readFileSync("components/driver/member-no-show-screen.tsx", "utf8");
const FORM_SRC = readFileSync("components/support/rider-no-show-form.tsx", "utf8");
// Positive controls: a source scan that read an empty string would pass silently.
check("the screen source was read", SCREEN.length > 0, `${SCREEN.length} chars`);
check("the form source was read", FORM_SRC.length > 0, `${FORM_SRC.length} chars`);
check("the screen reads the signature label from the contract",
  SCREEN.includes("typeForm.signatureLabel"), "not found");
check("the screen does not hardcode a signature heading",
  !/>\s*(Driver|Member) Signature\s*</.test(SCREEN), "hardcoded heading");
check("the screen passes the type to the guardrail",
  /resolveNoShow\(trip, activeLeg, demo, elapsed, noShowType\)/.test(SCREEN), "not wired");
// ⚠️ The waiver paths must END in the questions, not in a filing or a dialog.
check("Submit opens the Cancel at Door form on the waiver paths",
  /usingWaiver[\s\S]{0,200}setCancelAtDoorOpen\(true\)/.test(SCREEN), "not wired");
/**
 * ⚠️ Added because a mutation got through: hardcoding `atPickup={false}` left
 * every check green while asking a driver standing at the door to reconstruct
 * times they never needed. The variant is a DECISION and needs its own check.
 */
check("the form variant is computed, not hardcoded",
  /atPickup=\{cancelAtDoorAtPickup\}/.test(SCREEN), "variant hardcoded");
check("and it is computed from whether the app placed the driver there",
  /setCancelAtDoorAtPickup\(outcome\.kind === "files"\)/.test(SCREEN), "not derived");
check("⛔ a refused waiver re-resolves WITHOUT the type",
  /waiver-refused[\s\S]{0,400}resolveNoShow\(trip, activeLeg, demo, elapsed, null\)/.test(SCREEN),
  "would show the waived outcome back to a driver who just lost the waiver");

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
  signatureTakenElsewhere: false,
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

// ── Cancel at Door — the two questions the waiver rests on ─────────────────
/**
 * ⛔⛔ The waiver is a CLAIM that a member came out and refused. These checks
 * hold the line that the claim is actually asked for, and that answering it
 * honestly can take the waiver away again.
 */
check("three ways to answer who was at the door", SPOKE_WITH_OPTIONS.length === 3,
  SPOKE_WITH_OPTIONS.map((o) => o.value).join(","));
check("one of them is nobody", SPOKE_WITH_OPTIONS.some((o) => o.value === SPOKE_WITH_NOBODY),
  SPOKE_WITH_OPTIONS.map((o) => o.value).join(","));

const earning = SPOKE_WITH_OPTIONS.filter((o) => answerEarnsWaiver(o.value));
check("exactly two of the three answers earn the waiver", earning.length === 2,
  `${earning.length} of ${SPOKE_WITH_OPTIONS.length}: ${earning.map((o) => o.value).join(",")}`);
check("the member earns it", answerEarnsWaiver(SPOKE_WITH_MEMBER));
check("a point of contact earns it", answerEarnsWaiver(SPOKE_WITH_CONTACT));
check("⛔ nobody at the door earns NOTHING", !answerEarnsWaiver(SPOKE_WITH_NOBODY));
check("an unanswered question earns nothing", !answerEarnsWaiver(""));
check("and an unknown answer earns nothing", !answerEarnsWaiver("the dispatcher"));

/**
 * ⚠️ The two rules must be able to DISAGREE, or asking is theatre. The type
 * routes the driver to the questions; the answer decides the outcome.
 */
check("the route and the verdict are independent rules",
  waivesPresenceWait("Cancel At Door", PLAIN_MIRROR) && !answerEarnsWaiver(SPOKE_WITH_NOBODY));

check("the relation options are a real list", CONTACT_RELATION_OPTIONS.length >= 4,
  `${CONTACT_RELATION_OPTIONS.length}`);
check("no relation option is a person's name",
  CONTACT_RELATION_OPTIONS.every((o) => /^[A-Z][a-z]+( or [a-z]+| [a-z]+)*$/.test(o.label)),
  CONTACT_RELATION_OPTIONS.map((o) => o.label).join(" | "));

// ── The two variants ask different things ─────────────────────────────────
/**
 * ⚠️ `signatureTakenElsewhere: true` on both, MIRRORING `cancel-at-door-form`.
 * Every support form now ends with a driver signature; this one does not,
 * because the Member No-Show screen — its only entry point — already took one.
 * A check below pins that the real caller agrees, so this mirror cannot drift
 * into testing a form the app does not build.
 */
const cadAtPickup = buildSupportFormCase({
  includeIssues: [ISSUE_CANCEL_AT_DOOR],
  askWaitTimes: false,
  signatureTakenElsewhere: true,
});
const cadAway = buildSupportFormCase({
  includeIssues: [ISSUE_CANCEL_AT_DOOR],
  askWaitTimes: true,
  signatureTakenElsewhere: true,
});
/**
 * ⛔⛔ **The suppression belongs to the SCREEN, not to the case.** Cancel at
 * Door is reached only from the Member No-Show screen, which signs first; the
 * no-show form is reached from there AND standalone from More Options, so it
 * suppresses only on the first path. Asserted against the real call sites,
 * because this file otherwise builds its own cases and would never notice a
 * caller that stopped passing it.
 */
const CAD_SRC = readFileSync("components/support/cancel-at-door-form.tsx", "utf8");
const NO_SHOW_SRC = readFileSync("components/support/rider-no-show-form.tsx", "utf8");
check("Cancel at Door never asks for a second signature",
  /signatureTakenElsewhere: true/.test(CAD_SRC),
  "the form would ask again after the screen already signed");
check("...while the no-show form suppresses only on the path that signed",
  /signatureTakenElsewhere: !standalone/.test(NO_SHOW_SRC),
  "the no-show form suppresses unconditionally, so the standalone entry never signs");
const atPickupIds = cadAtPickup.fields.map((f) => f.id);
const awayIds = cadAway.fields.map((f) => f.id);

check("the at-pick-up variant has fields", atPickupIds.length > 0, `${atPickupIds.length}`);
check("both variants ask who was at the door",
  atPickupIds.includes("spokeWithWho") && awayIds.includes("spokeWithWho"),
  `${atPickupIds.join(",")} || ${awayIds.join(",")}`);
check("⚠️ a driver standing at the door is NOT asked to reconstruct times",
  !atPickupIds.includes("waitedFrom") && !atPickupIds.includes("leftAt"),
  atPickupIds.join(","));
check("a driver who has left IS asked when they arrived and left",
  awayIds.includes("waitedFrom") && awayIds.includes("leftAt"),
  awayIds.join(","));
// ⚠️ The pair must genuinely differ, or `askWaitTimes` is doing nothing.
check("the two variants are different forms",
  atPickupIds.join(",") !== awayIds.join(","),
  `${atPickupIds.length} vs ${awayIds.length} fields`);

// Rider No-Show keeps its own shape — the new block must not leak into it.
const plainNoShow = buildSupportFormCase({ includeIssues: [ISSUE_RIDER_NO_SHOW] });
const plainIds = plainNoShow.fields.map((f) => f.id);
check("Rider No-Show still asks its four questions",
  ["waitedFrom", "leftAt", "waitedWhere", "knocked"].every((id) => plainIds.includes(id)),
  plainIds.join(","));
check("and the Cancel at Door block did not leak into it",
  !plainIds.includes("spokeWithWho") || plainNoShow.fields
    .find((f) => f.id === "spokeWithWho")?.showIf?.equals.includes(ISSUE_RIDER_NO_SHOW) === false,
  plainIds.join(","));

const relationField = cadAtPickup.fields.find((f) => f.id === "spokeWithRelation");
check("the relation question exists", Boolean(relationField));
check("and is asked only for a point of contact",
  relationField?.showIf?.field === "spokeWithWho" &&
    relationField?.showIf?.equals.join(",") === SPOKE_WITH_CONTACT,
  `${relationField?.showIf?.field}=${relationField?.showIf?.equals.join(",")}`);

// ── The submit gate is reachable on both variants ─────────────────────────
// ⚠️ An unreachable gate is worse than a missing field: the form looks complete
// and the Submit button never lights.
const CAD_BASE = { issue: ISSUE_CANCEL_AT_DOOR, noShowType: "Cancel At Door", legId: "1049800373" };
check("the at-pick-up form submits with the member",
  canSubmitCase(cadAtPickup.fields, { ...CAD_BASE, spokeWithWho: SPOKE_WITH_MEMBER }));
check("⚠️ a point of contact cannot submit without saying who they are",
  !canSubmitCase(cadAtPickup.fields, { ...CAD_BASE, spokeWithWho: SPOKE_WITH_CONTACT }));
check("and can once they do",
  canSubmitCase(cadAtPickup.fields, {
    ...CAD_BASE, spokeWithWho: SPOKE_WITH_CONTACT, spokeWithRelation: CONTACT_RELATION_OPTIONS[0].value,
  }));
check("nobody-at-the-door is a submittable answer, not a dead end",
  canSubmitCase(cadAtPickup.fields, { ...CAD_BASE, spokeWithWho: SPOKE_WITH_NOBODY }));
check("the form is blocked with the question unanswered",
  !canSubmitCase(cadAtPickup.fields, CAD_BASE));
check("the away form needs its times too",
  !canSubmitCase(cadAway.fields, { ...CAD_BASE, spokeWithWho: SPOKE_WITH_MEMBER }));
check("and submits once they are given",
  canSubmitCase(cadAway.fields, {
    ...CAD_BASE, spokeWithWho: SPOKE_WITH_MEMBER, waitedFrom: "10:31", leftAt: "10:56",
  }));

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

// ═════════════════════════════════════════════════════════════════════════
// What happens NOW — catalogue rows 01 and 02, production's side
// ═════════════════════════════════════════════════════════════════════════
/**
 * ⭐ The point of the slice: the same ride, on the same screen, showing what a
 * driver hits today instead of what we propose. Everything above this line runs
 * through `PLAIN_MIRROR` and is unchanged by it.
 *
 * ⛔⛔ The failure this section exists to catch is the quiet one: a "Now" that
 * is really the proposal with its new copy deleted. Production refuses AND
 * stops, and it has no pick-up-time rule outside Indiana — so Now has to differ
 * in OUTCOME, not only in wording.
 */
const NOW: DemoFocus = demoFocus("rider-no-show", "now");
const FIXED_01: DemoFocus = demoFocus("rider-no-show", "fixed");
const NOW_02: DemoFocus = demoFocus("cancel-at-door", "now");
/** A row that owns neither — a reviewer who wandered in from somewhere else. */
const STRANGER: DemoFocus = demoFocus("add-leg-request", "now");

// ── 9a · the pairing map is total, and points only at production rows ────
const ALL_ROWS = Object.keys(NO_SHOW_TREATMENTS) as NoShowDemoRow[];
const DECLARED_ROWS = 9;
check(
  `the matrix has the declared ${DECLARED_ROWS} rows`,
  ALL_ROWS.length === DECLARED_ROWS,
  `${ALL_ROWS.length}`
);
const unpaired = ALL_ROWS.filter((row) => !NO_SHOW_AS_IS_PAIR[row]);
check(
  "every row knows what production does in its place",
  unpaired.length === 0,
  `${ALL_ROWS.length - unpaired.length} of ${ALL_ROWS.length} paired${unpaired.length ? " — missing " + unpaired.join(",") : ""}`
);
/**
 * ⛔ Every target must be an as-is row. ⚠️ Row 5 is the ONE exemption and it is
 * declared, not inferred: production's "no location points" message is
 * unreachable, so there is no production screen to point at.
 */
const PAIR_EXEMPT = new Set<NoShowDemoRow>(["5"]);
const pointsAtProposal = ALL_ROWS.filter((row) => {
  const target = NO_SHOW_AS_IS_PAIR[row];
  return !PAIR_EXEMPT.has(target) && String(target).includes(".");
});
check(
  "...and every one of them points at a production row",
  pointsAtProposal.length === 0,
  `${ALL_ROWS.length - pointsAtProposal.length} of ${ALL_ROWS.length}${pointsAtProposal.length ? " — " + pointsAtProposal.join(",") : ""}`
);
/** ⛔ Non-vacuity: the map must actually MOVE something, or it is an identity. */
const moved = ALL_ROWS.filter((row) => NO_SHOW_AS_IS_PAIR[row] !== row);
check(
  "...and the map moves the proposal rows rather than being an identity",
  moved.length === 4,
  `${moved.length} of ${ALL_ROWS.length} move — ${moved.join(",")}`
);

// ── 9b · Now never speaks in our voice ───────────────────────────────────
/**
 * ⛔⛔ `not_at_pickup` and `no_location_data` are flagged in `no-show-rules.ts`
 * as OURS — corrections production has never shown anyone. One sweep over every
 * seeded ride and both owning rows, rather than four greps for four strings.
 */
let voiceSwept = 0;
const spokeOurVoice: string[] = [];
for (const trip of mockInProgressTrips) {
  for (const focus of [NOW, NOW_02, STRANGER]) {
    voiceSwept += 1;
    const t = treatmentFor(trip, focus);
    if (t.copy !== "production") spokeOurVoice.push(`${trip.id}/${focus.solutionId}: copy=${t.copy}`);
    if (t.offerForm) spokeOurVoice.push(`${trip.id}/${focus.solutionId}: offers the form`);
  }
}
check(
  "Now uses production's wording and offers no way forward",
  spokeOurVoice.length === 0,
  `${spokeOurVoice.length} wrong of ${voiceSwept} (ride x focus)${spokeOurVoice.length ? " — " + spokeOurVoice.slice(0, 4).join("; ") : ""}`
);
check(
  "...and that sweep saw more than a handful of rides",
  voiceSwept === mockInProgressTrips.length * 3 && mockInProgressTrips.length > 5,
  `${mockInProgressTrips.length} ride(s) x 3 focus(es)`
);

// ── 9c · the toggle is not decorative on these two rows ──────────────────
/**
 * ⛔ A fingerprint across all four flags, per seeded ride. Without this the
 * slice could ship with Now and Fixed identical on both demo rides and every
 * other check here would still pass.
 */
const fingerprint = (t: ReturnType<typeof treatmentFor>) =>
  `${t.copy}/${t.showTimer}/${t.offerForm}/${t.pickupTimeGate}`;
for (const trip of tagged) {
  const now = treatmentFor(trip, NOW);
  const fixed = treatmentFor(trip, FIXED_01);
  check(
    `${trip.noShowDemo} shows something different on each side`,
    fingerprint(now) !== fingerprint(fixed),
    `now=${fingerprint(now)} fixed=${fingerprint(fixed)}`
  );
  check(
    `...and ${trip.noShowDemo}'s Now is its declared as-is row`,
    fingerprint(now) === fingerprint(NO_SHOW_TREATMENTS[NO_SHOW_AS_IS_PAIR[trip.noShowDemo!]]),
    `${trip.noShowDemo} -> ${NO_SHOW_AS_IS_PAIR[trip.noShowDemo!]}`
  );
}
check(
  "the two demo rides are both actually present for that pair",
  tagged.length === 2,
  `${tagged.length} tagged ride(s): ${tagged.map((t) => t.noShowDemo).join(",")}`
);

// ── 9d · Fixed and the plain mirror are untouched ────────────────────────
/**
 * ⛔ The other half of the claim. Every seeded ride's Fixed side, and the plain
 * mirror, must still be the ride's own matrix row — which is what the 170
 * checks above assert, stated here once as a sweep so a regression names itself.
 */
const driftedFixed = tagged.filter(
  (trip) =>
    fingerprint(treatmentFor(trip, FIXED_01)) !==
      fingerprint(NO_SHOW_TREATMENTS[trip.noShowDemo!]) ||
    fingerprint(treatmentFor(trip, PLAIN_MIRROR)) !==
      fingerprint(NO_SHOW_TREATMENTS[trip.noShowDemo!])
);
check(
  "Fixed and the plain mirror still show the ride's own row",
  driftedFixed.length === 0,
  `${tagged.length - driftedFixed.length} of ${tagged.length} ride(s) unchanged`
);

// ── 9e · ⭐ Now differs in OUTCOME, not only in wording ──────────────────
/**
 * ⛔⛔ The flag that makes this more than a copy swap. Production has no
 * pick-up-time rule outside Indiana, so an UNTAGGED Georgia ride files before
 * the ride is due today and is refused in the shipped app. Matrix row `"6"` is
 * the standing evidence; this applies it to every untagged ride.
 */
const untagged = mockInProgressTrips.find((t) => !t.noShowDemo && t.market !== "IN");
check(
  "an untagged ride outside Indiana exists to test the gate on",
  untagged !== undefined,
  untagged ? `${untagged.id} (${untagged.market})` : "NONE — the check below is vacuous"
);
if (untagged) {
  check(
    "Now has no pick-up-time gate — production's early filing goes through",
    postPickupThresholdMinutes(untagged, NOW) === null,
    `${postPickupThresholdMinutes(untagged, NOW)}`
  );
  check(
    "...while Fixed enforces it, which is the new guardrail",
    postPickupThresholdMinutes(untagged, FIXED_01) === NO_SHOW_PICKUP_TIME_MINUTES,
    `${postPickupThresholdMinutes(untagged, FIXED_01)}`
  );
  check(
    "...and Indiana's fifteen minutes is production, so it survives Now",
    postPickupThresholdMinutes(
      { ...untagged, client: "WellTrans", market: "IN" as const },
      NOW
    ) === NO_SHOW_POST_PICKUP_MINUTES,
    `${postPickupThresholdMinutes({ ...untagged, client: "WellTrans", market: "IN" as const }, NOW)}`
  );
}

// ── 9e2 · \u2b50\u2b50 Cancel At Door waits in Now, exactly like every other type ──
/**
 * \u26d4\u26d4 **Reported by the user, 2026-10-14: Now let a Cancel At Door through
 * to the form.** The ten-minute waiver is row 02's whole proposal, and it was
 * ungated \u2014 so the prototype was demonstrating its own proposal as the status
 * quo, on the one row whose argument IS that waiver.
 *
 * \u26a0\ufe0f The lesson is narrower than "a missing gate". `resolveNoShow` had already
 * been given the focus; this rung simply never read it. **Threading a parameter
 * is not the same as using it**, and a signature change that typechecks proves
 * only that the value arrived.
 *
 * So this sweeps the OUTCOME over every type, rather than asserting the
 * predicate: production has one message for all of them, and the check says so
 * in those terms.
 */
const CAD_RIDE = tagged.find((t) => t.noShowDemo === "3.1");
check(
  "the short-of-ten-minutes ride is seeded, so the sweep below is not empty",
  CAD_RIDE !== undefined,
  CAD_RIDE ? `${CAD_RIDE.id} (${CAD_RIDE.noShowDemo})` : "MISSING"
);
if (CAD_RIDE) {
  const cadLeg = activeLeg(CAD_RIDE)!;
  const NOW_02_OWNER: DemoFocus = demoFocus("cancel-at-door", "now");
  const FIXED_02: DemoFocus = demoFocus("cancel-at-door", "fixed");

  /** \u26d4 Every type, one message. That is what production does. */
  const nowOutcomes = NO_SHOW_TYPES.map((type) => ({
    type,
    kind: resolveNoShow(CAD_RIDE, cadLeg, NOW_02_OWNER, 0, type).kind,
  }));
  const slipped = nowOutcomes.filter((o) => o.kind !== "timer");
  check(
    "in Now every no-show type gets the same ten-minute refusal",
    slipped.length === 0,
    `${nowOutcomes.length - slipped.length} of ${nowOutcomes.length} refuse${slipped.length ? " \u2014 through: " + slipped.map((o) => `${o.type}=${o.kind}`).join(", ") : ""}`
  );
  check(
    "...and that sweep covered every seeded type",
    nowOutcomes.length === NO_SHOW_TYPES.length && NO_SHOW_TYPES.length >= 3,
    `${NO_SHOW_TYPES.length} type(s): ${NO_SHOW_TYPES.join(", ")}`
  );

  /** \u26d4 The other half: the waiver must still WORK, or this is a deletion. */
  check(
    "...while Proposed lets Cancel At Door through, which is row 02's argument",
    resolveNoShow(CAD_RIDE, cadLeg, FIXED_02, 0, "Cancel At Door").kind === "files",
    resolveNoShow(CAD_RIDE, cadLeg, FIXED_02, 0, "Cancel At Door").kind
  );
  check(
    "...and the other types still wait on the Proposed side too",
    NO_SHOW_TYPES.filter((t) => t !== "Cancel At Door").every(
      (t) => resolveNoShow(CAD_RIDE, cadLeg, FIXED_02, 0, t).kind === "timer"
    ),
    NO_SHOW_TYPES.filter((t) => t !== "Cancel At Door")
      .map((t) => `${t}=${resolveNoShow(CAD_RIDE, cadLeg, FIXED_02, 0, t).kind}`).join(", ")
  );

  /**
   * \u26d4 Row 01's focus does not carry row 02's waiver. The two rows share a
   * screen and a refusal matrix; they do not share each other's proposals.
   */
  check(
    "row 01's focus does not hand out row 02's waiver",
    resolveNoShow(CAD_RIDE, cadLeg, demoFocus("rider-no-show", "fixed"), 0, "Cancel At Door").kind === "timer",
    resolveNoShow(CAD_RIDE, cadLeg, demoFocus("rider-no-show", "fixed"), 0, "Cancel At Door").kind
  );
  /** \u26a0\ufe0f ...and the plain mirror still does, because it shows every proposal. */
  check(
    "...while the plain mirror still shows it, unchanged from before",
    resolveNoShow(CAD_RIDE, cadLeg, PLAIN_MIRROR, 0, "Cancel At Door").kind === "files",
    resolveNoShow(CAD_RIDE, cadLeg, PLAIN_MIRROR, 0, "Cancel At Door").kind
  );
}

// ── 9f · a stranger's focus shows production too ─────────────────────────
/**
 * ⚠️ "A proposal belongs to its own build", applied here. A reviewer walking
 * row 21 who wanders into Member No-Show must not meet rows 01/02's proposal on
 * the way past.
 */
const leakedToStranger = tagged.filter(
  (trip) => fingerprint(treatmentFor(trip, STRANGER)) !== fingerprint(treatmentFor(trip, NOW))
);
check(
  "another row's focus shows production, not rows 01/02's proposal",
  leakedToStranger.length === 0,
  `${tagged.length - leakedToStranger.length} of ${tagged.length} ride(s) show production`
);


/* ===========================================================================
   Dismissing the refusal — what it is called, and what it costs
   =========================================================================== */

/**
 * ⛔⛔ **`OK` is a CAPTURED string.** `s-06c` and `s-06d` both show production's
 * refusal with one button reading `OK`, and tapping it does nothing but close.
 * Renaming it `Close` and putting a consequence behind it is row 01's proposal,
 * so it is gated — and these checks are what stop it leaking onto the side of
 * the comparison that is supposed to be today.
 */
const PROPOSAL_ROWS: NoShowDemoRow[] = ["3.1", "4.1", "5", "6.1", "WV1.1"];
const AS_IS_ROWS = (Object.keys(NO_SHOW_TREATMENTS) as NoShowDemoRow[]).filter(
  (row) => !PROPOSAL_ROWS.includes(row)
);
check(
  "the matrix splits into as-is and proposal rows, and both exist",
  AS_IS_ROWS.length === 4 &&
    PROPOSAL_ROWS.length === 5 &&
    AS_IS_ROWS.length + PROPOSAL_ROWS.length === Object.keys(NO_SHOW_TREATMENTS).length,
  `${AS_IS_ROWS.length} as-is + ${PROPOSAL_ROWS.length} proposal of ${Object.keys(NO_SHOW_TREATMENTS).length}`
);
const confirmLeaks = AS_IS_ROWS.filter((row) => NO_SHOW_TREATMENTS[row].confirmLeaving);
check(
  "no as-is row asks the driver to confirm — production's OK just closes",
  confirmLeaks.length === 0,
  confirmLeaks.length ? confirmLeaks.join(", ") : `0 of ${AS_IS_ROWS.length} as-is rows`
);
const confirmMissing = PROPOSAL_ROWS.filter((row) => !NO_SHOW_TREATMENTS[row].confirmLeaving);
check(
  "...and every proposal row does, so the flag is not decorative",
  confirmMissing.length === 0,
  confirmMissing.length ? confirmMissing.join(", ") : `${PROPOSAL_ROWS.length} of ${PROPOSAL_ROWS.length}`
);

/** ⛔ The label follows the flag, and only the flag. Driven, not grepped. */
const labelPairs = [false, true].map((confirmLeaving) =>
  refusalDismissLabel({
    copy: "production",
    showTimer: false,
    offerForm: false,
    confirmLeaving,
    pickupTimeGate: true,
  })
);
check(
  "the dismissal is OK without the confirmation and Close with it",
  labelPairs[0] === REFUSAL_DISMISS_PRODUCTION &&
    labelPairs[1] === REFUSAL_DISMISS_PROPOSED &&
    // ⚠️ No `labelPairs[0] !== labelPairs[1]` here: TypeScript narrows both to
    // literal types and rejects the comparison as having no overlap — which is
    // itself the proof that the two constants differ.
    REFUSAL_DISMISS_PRODUCTION === "OK",
  `${labelPairs.join(" / ")}`
);

/**
 * ⛔⛔ The sweep that matters: on the production side of the comparison, over
 * every seeded ride, the button is still the captured one.
 */
const nowLabels = mockInProgressTrips.map((trip) => ({
  id: trip.id,
  label: refusalDismissLabel(treatmentFor(trip, { solutionId: "rider-no-show", mode: "now" })),
}));
const renamed = nowLabels.filter((r) => r.label !== REFUSAL_DISMISS_PRODUCTION);
check(
  "every ride still shows the captured OK on the production side",
  renamed.length === 0,
  renamed.length
    ? renamed.map((r) => `${r.id}=${r.label}`).join(", ")
    : `${nowLabels.length} of ${nowLabels.length} rides`
);
/** ...and the proposal side actually differs somewhere, or the gate is moot. */
const fixedLabels = new Set(
  tagged.map((trip) =>
    refusalDismissLabel(treatmentFor(trip, { solutionId: "rider-no-show", mode: "fixed" }))
  )
);
check(
  "...and the proposal side renames it, so the gate is doing work",
  fixedLabels.has(REFUSAL_DISMISS_PROPOSED),
  `${tagged.length} tagged ride(s) → ${[...fixedLabels].join(", ")}`
);

/**
 * The wait the warning attributes to the client.
 *
 * ⛔⛔ **The copy says "{Client} requires N minutes", so a RULE has to say it
 * too.** Interpolating `NO_SHOW_WAIT_MINUTES` into a sentence that names the
 * client would be a claim with nothing behind it. `CLIENT_WAIT_MINUTES` is the
 * rule and it is deliberately EMPTY — the measured wait is the same for every
 * client in the seed and nobody has evidence of one that differs.
 */
check(
  "no client-specific wait has been invented",
  Object.keys(CLIENT_WAIT_MINUTES).length === 0,
  `${Object.keys(CLIENT_WAIT_MINUTES).length} override(s): ${Object.keys(CLIENT_WAIT_MINUTES).join(", ")}`
);
const clients = [...new Set(mockInProgressTrips.map((t) => t.client))];
const oddWaits = mockInProgressTrips.filter(
  (t) => requiredWaitMinutes(t) !== NO_SHOW_WAIT_MINUTES
);
check(
  "every seeded client resolves to the standard wait",
  oddWaits.length === 0 && clients.length > 1,
  `${clients.length} client(s) — ${clients.join(", ")} — all at ${NO_SHOW_WAIT_MINUTES} min`
);

/**
 * ⛔ The warning names THIS ride's client and THIS ride's number. A body that
 * hardcoded either would pass a "does it mention a client" grep and be wrong on
 * every ride but one.
 */
const bodyWrong = mockInProgressTrips.filter((trip) => {
  const body = leaveWarningBody(trip);
  return (
    !body.includes(trip.client) ||
    !body.includes(`${requiredWaitMinutes(trip)} minutes`)
  );
});
check(
  "the warning names the ride's own client and wait",
  bodyWrong.length === 0,
  bodyWrong.length
    ? bodyWrong.map((t) => t.id).join(", ")
    : `${mockInProgressTrips.length} of ${mockInProgressTrips.length} — e.g. "${leaveWarningBody(mockInProgressTrips[0])}"`
);
const distinctBodies = new Set(mockInProgressTrips.map(leaveWarningBody));
check(
  "...and it is not one fixed sentence for every ride",
  distinctBodies.size > 1,
  `${distinctBodies.size} distinct body(ies) across ${mockInProgressTrips.length} rides`
);

/**
 * ⛔⛔ **A warning, not a block, and both ways out must exist.** One answer puts
 * the refusal back — countdown and all — and the other closes. A confirmation
 * whose friendly answer is a dead end is one nobody reads twice; a
 * confirmation with no way past is a block the app has no grounds to impose.
 */
const SCREEN_CODE = SCREEN.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
check(
  "stripping the screen's comments left the code behind",
  SCREEN_CODE.includes("export function MemberNoShowScreen") && SCREEN_CODE.length > 2000,
  `${SCREEN_CODE.length} chars after stripping, from ${SCREEN.length} raw`
);
check(
  "the screen offers both ways out of the confirmation",
  SCREEN_CODE.includes("{LEAVE_WARNING_STAY}") &&
    SCREEN_CODE.includes("{LEAVE_WARNING_LEAVE}"),
  `"${LEAVE_WARNING_STAY}" / "${LEAVE_WARNING_LEAVE}"`
);
/**
 * ⛔ Staying must restore the SAME refusal. Re-deriving it would re-run
 * `resolveNoShow` against a clock that has moved, so the dialog that came back
 * would be a different one from the one dismissed — a countdown that jumped.
 */
check(
  "...and staying restores the refusal it was holding, rather than re-deriving it",
  /setLeaving\(refusal\)/.test(SCREEN_CODE) && /setRefusal\(back\)/.test(SCREEN_CODE),
  "the refusal is rebuilt instead of carried across"
);
/** ⛔ No hand-written OK: the label is the rule's, on both sides. */
check(
  "the dismissal label comes from the rule, not from the markup",
  /refusalDismissLabel\(treatment\)/.test(SCREEN_CODE) &&
    !/>\s*OK\s*</.test(SCREEN_CODE) &&
    SCREEN_CODE.includes("{LEAVE_WARNING_TITLE}"),
  "a literal OK is still in the markup"
);

/* ===========================================================================
   The countdown and the dismissal are independent
   =========================================================================== */

/**
 * ⛔⛔ **This section exists because a screenshot said the countdown was gone.**
 *
 * It was not — the full cycle renders it, and the sweep below says no reachable
 * state loses it. But the countdown is decided by `refusal?.kind === "timer" &&
 * treatment.showTimer` **in JSX**, and when `confirmLeaving` was added right
 * beside it, checks were written for the new label and the new confirmation and
 * NOTHING was written for the line they sit next to. A rule inline in JSX is a
 * rule no check can reach; that is the oldest trap in this repo and it was
 * walked into one commit ago.
 *
 * ⭐ The load-bearing one is the last: the reported shape — production's
 * wording, `Close`, no countdown, no form — is asserted UNREACHABLE. If it ever
 * becomes reachable, this fails rather than a screenshot having to find it.
 */
type RefusalShape = {
  id: string;
  demo: string;
  mode: DemoMode;
  type: NoShowType;
  kind: string;
  timerLine: boolean;
  formButton: boolean;
  dismiss: string;
};
const shapes: RefusalShape[] = [];
for (const trip of mockInProgressTrips) {
  const leg = activeLeg(trip);
  if (!leg) continue;
  for (const mode of DEMO_MODES) {
    const focus = { solutionId: "rider-no-show", mode };
    const treatment = treatmentFor(trip, focus);
    for (const type of NO_SHOW_TYPES) {
      const outcome = resolveNoShow(trip, leg, focus, 0, type);
      if (outcome.kind === "files") continue;
      shapes.push({
        id: trip.id,
        demo: trip.noShowDemo ?? "-",
        mode,
        type,
        kind: outcome.kind,
        // ⚠️ The two conditions the dialog renders on, restated here ONCE and
        // driven — not grepped out of the markup.
        timerLine: outcome.kind === "timer" && treatment.showTimer,
        formButton: outcome.kind === "form" && treatment.offerForm,
        dismiss: refusalDismissLabel(treatment),
      });
    }
  }
}
/**
 * ⚠️ Declared, and the first version of this was a GUESS — `> 100`, carried
 * over from a wider sweep that walked three focuses and every pool. It failed
 * on the real number, which is the floor doing the one thing a floor is good
 * for. The literals below are the measured shape: 12 seeded in-progress rides
 * × 2 sides × 3 no-show types, of which 60 refuse and the rest file.
 */
const EXPECTED_COMBINATIONS = 12 * DEMO_MODES.length * NO_SHOW_TYPES.length;
const EXPECTED_REFUSING = 60;
check(
  "the refusal sweep covers both sides of every seeded ride",
  shapes.length === EXPECTED_REFUSING &&
    new Set(shapes.map((r) => r.mode)).size === DEMO_MODES.length &&
    new Set(shapes.map((r) => r.kind)).size === 3,
  `${shapes.length} refusing of ${EXPECTED_COMBINATIONS} combination(s), kinds: ${[...new Set(shapes.map((r) => r.kind))].sort().join(", ")}`
);

/** ⛔ Every timer refusal on the proposal side keeps its countdown. */
const timerStates = shapes.filter((r) => r.kind === "timer" && r.mode === "fixed" && r.demo !== "-");
const silentTimers = timerStates.filter((r) => !r.timerLine);
check(
  "every tagged timer refusal on the proposal side carries its countdown",
  silentTimers.length === 0 && timerStates.length > 0,
  silentTimers.length
    ? silentTimers.map((r) => `${r.id}/${r.type}`).join(", ")
    : `${timerStates.length} of ${timerStates.length} timer state(s)`
);

/** ⛔ ...and production's still does not, which is what the gate is for. */
const nowTimers = shapes.filter((r) => r.kind === "timer" && r.mode === "now");
check(
  "...and production's refusal still has none",
  nowTimers.length > 0 && nowTimers.every((r) => !r.timerLine),
  `${nowTimers.filter((r) => !r.timerLine).length} of ${nowTimers.length} production timer state(s) are silent`
);

/**
 * ⭐⭐ **The reported shape, asserted unreachable.**
 *
 * `Close` is the proposal's dismissal, so a refusal showing it must also be
 * showing something production's does not — a countdown or a way forward. A
 * `Close` with neither is the proposal wearing production's dialog: the driver
 * is told to wait and not told how long, and then asked to confirm leaving a
 * wait whose length they cannot see.
 */
const hollow = shapes.filter((r) => r.dismiss === "Close" && !r.timerLine && !r.formButton);
check(
  "no refusal offers Close without either a countdown or a way forward",
  hollow.length === 0,
  hollow.length
    ? hollow.slice(0, 5).map((r) => `${r.id}/${r.demo}/${r.mode}/${r.type}`).join(", ")
    : `0 of ${shapes.length} refusing states`
);
/** ⛔ And the converse, so the check above cannot pass by nothing saying Close. */
const closers = shapes.filter((r) => r.dismiss === "Close");
check(
  "...and Close is reached, so that sweep is not vacuous",
  closers.length > 0 && closers.length < shapes.length,
  `${closers.length} of ${shapes.length} refusing states show Close`
);

console.log(
  failures.length === 0
    ? `✓ ${passed} checks passed`
    : `✗ ${failures.length} failed of ${passed + failures.length}\n` +
      failures.map((f) => `  · ${f}`).join("\n")
);
process.exit(failures.length === 0 ? 0 : 1);
